/**
 * Global Setup — Playwright E2E
 *
 * Executa UMA VEZ antes de todos os testes:
 *   1. Garante que o usuário de teste existe no banco local (via pg)
 *   2. Faz login via UI na página /login
 *   3. Salva o estado de autenticação (cookies) em .auth/session.json
 *
 * Todos os testes subsequentes reutilizam essa sessão (sem login repetido).
 */
import { test as setup } from '@playwright/test'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { Client } from 'pg'
import path from 'path'
import fs from 'fs'

const AUTH_FILE = path.join(__dirname, '../../../../.auth/session.json')

// Credenciais do usuário de teste E2E
const E2E_EMAIL = 'e2e-owner@assistencianet.test'
const E2E_PASSWORD = 'E2eTest@2026!'
const E2E_COMPANY_NAME = 'Empresa E2E Tests'
const E2E_CNPJ = '00.000.000/0001-99'

const PG_URL = process.env.SUPABASE_DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

function adminClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.test')
  }

  return createSupabaseClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

async function criarOuAtualizarUsuarioAuth(existingUserId?: string) {
  const supabaseAdmin = adminClient()

  if (existingUserId) {
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(existingUserId, {
      email: E2E_EMAIL,
      password: E2E_PASSWORD,
      email_confirm: true,
      user_metadata: { name: 'E2E Owner' },
    })

    if (error) {
      throw error
    }

    if (!data.user?.id) {
      throw new Error('A API admin do Supabase não retornou o usuário E2E atualizado.')
    }

    return data.user.id
  }

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: E2E_EMAIL,
    password: E2E_PASSWORD,
    email_confirm: true,
    user_metadata: { name: 'E2E Owner' },
  })

  if (error) {
    throw error
  }

  if (!data.user?.id) {
    throw new Error('A API admin do Supabase não retornou o usuário E2E criado.')
  }

  return data.user.id
}

async function garantirUsuarioTeste() {
  const client = new Client({ connectionString: PG_URL })
  await client.connect()

  try {
    const existingUser = await client.query<{ id: string }>('SELECT id FROM auth.users WHERE email = $1 LIMIT 1', [
      E2E_EMAIL,
    ])
    const userId = await criarOuAtualizarUsuarioAuth(existingUser.rows[0]?.id)

    // Profile
    await client.query(
      `INSERT INTO public.profiles (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`,
      [userId, 'E2E Owner'],
    )

    // Empresa de testes idempotente
    const companyResult = await client.query<{ id: string }>(
      `INSERT INTO public.companies
         (name, cnpj, owner_id, onboarding_step, onboarding_completed)
       VALUES ($1, $2, $3, 3, true)
       ON CONFLICT (owner_id)
       DO UPDATE SET
         name = EXCLUDED.name,
         cnpj = EXCLUDED.cnpj,
         onboarding_step = 3,
         onboarding_completed = true
       RETURNING id`,
      [E2E_COMPANY_NAME, E2E_CNPJ, userId],
    )
    const companyId = companyResult.rows[0].id

    // Filial principal idempotente
    await client.query(
      `INSERT INTO public.branches (company_id, name, is_main, active)
       SELECT $1, 'Filial Principal', true, true
       WHERE NOT EXISTS (
         SELECT 1 FROM public.branches
         WHERE company_id = $1 AND name = 'Filial Principal' AND deleted_at IS NULL
       )`,
      [companyId],
    )

    // Employee admin vinculado à empresa idempotente
    await client.query(
      `UPDATE public.employees
       SET name = 'E2E Owner',
           role = 'admin',
           active = true,
           deleted_at = NULL,
           deleted_by = NULL,
           updated_at = now()
       WHERE company_id = $1 AND user_id = $2`,
      [companyId, userId],
    )

    await client.query(
      `INSERT INTO public.employees (company_id, user_id, name, role, email, active)
       SELECT $1, $2, 'E2E Owner', 'admin', $3, true
       WHERE NOT EXISTS (
         SELECT 1 FROM public.employees
         WHERE company_id = $1 AND user_id = $2
       )`,
      [companyId, userId, E2E_EMAIL],
    )

    console.log(`[setup] Usuário de teste pronto: ${E2E_EMAIL} (company: ${companyId})`)
    return userId
  } finally {
    await client.end()
  }
}

setup('autenticar usuário de teste', async ({ page }) => {
  // Garante que o .auth/ existe
  const authDir = path.dirname(AUTH_FILE)
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true })
  }

  // 1. Garante usuário no banco
  await garantirUsuarioTeste()

  // 2. Faz login via UI
  await page.goto('/login')

  // Aguarda o campo de email estar visível
  await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 10_000 })

  await page.fill('input[type="email"], input[name="email"]', E2E_EMAIL)
  await page.fill('input[type="password"], input[name="password"]', E2E_PASSWORD)

  // Clica em "Entrar" (o seletor pode precisar de ajuste conforme o HTML real)
  await page.click('button[type="submit"]')

  // Aguarda redirecionamento pós-login (dashboard ou onboarding)
  await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 15_000 })

  // 3. Salva a sessão
  await page.context().storageState({ path: AUTH_FILE })
  console.log('[setup] Sessão salva em', AUTH_FILE)
})
