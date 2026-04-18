import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { Client } from 'pg'
import type { Page } from '@playwright/test'

export const PG_URL = process.env.SUPABASE_DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
export const E2E_EMAIL = 'e2e-owner@assistencianet.test'
export const E2E_PASSWORD = 'E2eTest@2026!'
export const E2E_BRANCH_PREFIX = 'E2E Filial'
export const EXTRA_EMAIL_PREFIX = 'e2e-filiais-'
export const EXTRA_PASSWORD = 'E2eFiliais@2026!'

export type BranchSeed = {
  id: string
  company_id: string
  name: string
  is_main: boolean | null
  city: string | null
  state: string | null
  phone: string | null
  active: boolean | null
  deleted_at: string | null
  deleted_by: string | null
}

export type TestUser = {
  id: string
  email: string
  password: string
}

export type TestCompany = {
  id: string
  ownerId: string
}

type CreateBranchInput = {
  name: string
  is_main?: boolean | null
  city?: string | null
  state?: string | null
  phone?: string | null
  address?: string | null
  zip_code?: string | null
  active?: boolean | null
  created_at?: string | null
}

export async function withDb<T>(callback: (client: Client) => Promise<T>) {
  const client = new Client({ connectionString: PG_URL })
  await client.connect()

  try {
    return await callback(client)
  } finally {
    await client.end()
  }
}

function adminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.test')
  }

  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export async function login(page: Page, email: string, password = EXTRA_PASSWORD) {
  await page.context().clearCookies()
  await page.goto('/login')
  await page.getByLabel('E-mail').fill(email)
  await page.locator('input[name="password"]').fill(password)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 15_000 })
}

export async function getE2ECompanyId() {
  return withDb(async (client) => {
    const result = await client.query<{ id: string }>(
      `SELECT companies.id
       FROM public.companies
       INNER JOIN auth.users ON auth.users.id = companies.owner_id
       WHERE auth.users.email = $1
       LIMIT 1`,
      [E2E_EMAIL],
    )

    if (!result.rows[0]?.id) {
      throw new Error(`Empresa E2E não encontrada para ${E2E_EMAIL}`)
    }

    return result.rows[0].id
  })
}

export async function getUserIdByEmail(email: string) {
  return withDb(async (client) => {
    const result = await client.query<{ id: string }>('SELECT id FROM auth.users WHERE email = $1 LIMIT 1', [email])
    return result.rows[0]?.id ?? null
  })
}

export async function cleanupCompany(companyId: string) {
  await withDb(async (client) => {
    await client.query('DELETE FROM public.companies WHERE id = $1', [companyId])
  })
}

export async function cleanupUserByEmail(email: string) {
  await withDb(async (client) => {
    const users = await client.query<{ id: string }>('SELECT id FROM auth.users WHERE email = $1', [email])
    for (const user of users.rows) {
      const companyIds = await client.query<{ id: string }>('SELECT id FROM public.companies WHERE owner_id = $1', [
        user.id,
      ])

      for (const company of companyIds.rows) {
        await client.query('DELETE FROM public.companies WHERE id = $1', [company.id])
      }

      await client.query('UPDATE public.branches SET deleted_by = NULL WHERE deleted_by = $1', [user.id])
      await client.query('UPDATE public.clients SET deleted_by = NULL WHERE deleted_by = $1', [user.id])
      await client.query('UPDATE public.employees SET deleted_by = NULL WHERE deleted_by = $1', [user.id])
      await client.query('UPDATE public.service_order_estimates SET deleted_by = NULL WHERE deleted_by = $1', [user.id])
      await client.query('UPDATE public.service_orders SET deleted_by = NULL WHERE deleted_by = $1', [user.id])
      await client.query('UPDATE public.services SET deleted_by = NULL WHERE deleted_by = $1', [user.id])
      await client.query('UPDATE public.suppliers SET deleted_by = NULL WHERE deleted_by = $1', [user.id])
      await client.query('UPDATE public.third_parties SET deleted_by = NULL WHERE deleted_by = $1', [user.id])
      await client.query('DELETE FROM public.employees WHERE user_id = $1', [user.id])
      await client.query('DELETE FROM public.profiles WHERE id = $1', [user.id])
      await client.query('DELETE FROM auth.users WHERE id = $1', [user.id])
    }
  })
}

export async function cleanupExtraE2EUsers() {
  await withDb(async (client) => {
    const users = await client.query<{ email: string }>('SELECT email FROM auth.users WHERE email LIKE $1', [
      `${EXTRA_EMAIL_PREFIX}%@assistencianet.test`,
    ])
    for (const user of users.rows) {
      await cleanupUserByEmail(user.email)
    }
  })
}

export async function createAuthUser(email: string, password = EXTRA_PASSWORD, name = 'E2E Filiais') {
  await cleanupUserByEmail(email)
  const { data, error } = await adminClient().auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
  })

  if (error) throw error
  if (!data.user?.id) throw new Error(`Usuário ${email} não foi criado.`)

  await withDb((client) =>
    client.query('INSERT INTO public.profiles (id, name) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name', [
      data.user!.id,
      name,
    ]),
  )

  return { id: data.user.id, email, password }
}

export async function createCompanyForOwner(
  ownerId: string,
  name: string,
  options: { onboardingCompleted?: boolean; onboardingStep?: number } = {},
) {
  return withDb(async (client) => {
    const result = await client.query<{ id: string }>(
      `INSERT INTO public.companies (name, cnpj, owner_id, onboarding_step, onboarding_completed)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [
        name,
        `00.000.000/${Math.floor(Math.random() * 9000 + 1000)}-99`,
        ownerId,
        options.onboardingStep ?? (options.onboardingCompleted === false ? 2 : 3),
        options.onboardingCompleted ?? true,
      ],
    )

    return { id: result.rows[0].id, ownerId }
  })
}

export async function createCompanyWithOwner(
  email: string,
  companyName: string,
  options: { onboardingCompleted?: boolean; onboardingStep?: number } = {},
) {
  const user = await createAuthUser(email)
  const company = await createCompanyForOwner(user.id, companyName, options)
  return { user, company }
}

export async function createEmployeeUser(params: {
  email: string
  companyId: string
  branchId?: string | null
  role: 'admin' | 'atendente' | 'tecnico'
  name?: string
}) {
  const user = await createAuthUser(params.email, EXTRA_PASSWORD, params.name ?? `E2E ${params.role}`)
  await withDb((client) =>
    client.query(
      `INSERT INTO public.employees (company_id, branch_id, user_id, name, role, email, active)
       VALUES ($1, $2, $3, $4, $5, $6, true)`,
      [params.companyId, params.branchId ?? null, user.id, params.name ?? `E2E ${params.role}`, params.role, params.email],
    ),
  )
  const { error } = await adminClient().auth.admin.updateUserById(user.id, {
    app_metadata: {
      company_id: params.companyId,
      role: params.role,
    },
  })

  if (error) throw error

  return user
}

export async function resetE2EBranches() {
  const companyId = await getE2ECompanyId()

  await withDb(async (client) => {
    await client.query('DELETE FROM public.employees WHERE company_id = $1 AND email LIKE $2', [
      companyId,
      `${EXTRA_EMAIL_PREFIX}%`,
    ])
    await client.query(
      `DELETE FROM public.audit_logs
       WHERE company_id = $1
         AND entity_type = 'branch'
         AND summary LIKE $2`,
      [companyId, `Filial "${E2E_BRANCH_PREFIX}%`],
    )
    await client.query('DELETE FROM public.branches WHERE company_id = $1 AND name LIKE $2', [
      companyId,
      `${E2E_BRANCH_PREFIX}%`,
    ])
    await client.query(
      `INSERT INTO public.branches (company_id, name, is_main, active)
       SELECT $1, 'Filial Principal', true, true
       WHERE NOT EXISTS (
         SELECT 1 FROM public.branches
         WHERE company_id = $1 AND name = 'Filial Principal' AND deleted_at IS NULL
       )`,
      [companyId],
    )
  })

  return companyId
}

export async function deleteAllBranches(companyId: string) {
  await withDb((client) => client.query('DELETE FROM public.branches WHERE company_id = $1', [companyId]))
}

export async function createBranch(
  companyId: string,
  overrides: CreateBranchInput,
) {
  return withDb(async (client) => {
    const result = await client.query<BranchSeed>(
      `INSERT INTO public.branches (company_id, name, is_main, city, state, phone, address, zip_code, active, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, COALESCE($10::timestamptz, now()))
       RETURNING id, company_id, name, is_main, city, state, phone, active, deleted_at, deleted_by`,
      [
        companyId,
        overrides.name,
        overrides.is_main ?? false,
        overrides.city ?? null,
        overrides.state ?? null,
        overrides.phone ?? null,
        'address' in overrides ? overrides.address : null,
        'zip_code' in overrides ? overrides.zip_code : null,
        overrides.active ?? true,
        'created_at' in overrides ? overrides.created_at : null,
      ],
    )

    return result.rows[0]
  })
}

export async function createEmployee(companyId: string, branchId: string, name = 'Funcionário vinculado') {
  return withDb(async (client) => {
    const result = await client.query<{ id: string }>(
      `INSERT INTO public.employees (company_id, branch_id, name, role, active, email)
       VALUES ($1, $2, $3, 'atendente', true, $4)
       RETURNING id`,
      [companyId, branchId, name, `${name.toLowerCase().replace(/\s+/g, '.')}@assistencianet.test`],
    )

    return result.rows[0].id
  })
}

export async function softDeleteBranch(branchId: string, deletedBy: string) {
  await withDb((client) =>
    client.query('UPDATE public.branches SET active = false, deleted_at = now(), deleted_by = $2 WHERE id = $1', [
      branchId,
      deletedBy,
    ]),
  )
}

export async function findBranchByName(companyId: string, name: string) {
  return withDb(async (client) => {
    const result = await client.query<BranchSeed>(
      `SELECT id, company_id, name, is_main, city, state, phone, active, deleted_at, deleted_by
       FROM public.branches
       WHERE company_id = $1 AND name = $2
       ORDER BY created_at DESC
       LIMIT 1`,
      [companyId, name],
    )

    return result.rows[0] ?? null
  })
}

export async function listVisibleBranches(companyId: string) {
  return withDb(async (client) => {
    const result = await client.query<BranchSeed>(
      `SELECT id, company_id, name, is_main, city, state, phone, active, deleted_at, deleted_by
       FROM public.branches
       WHERE company_id = $1 AND deleted_at IS NULL
       ORDER BY created_at ASC, id ASC`,
      [companyId],
    )

    return result.rows
  })
}

export async function getLatestBranchAudit(companyId: string, entityId: string, action: string) {
  return withDb(async (client) => {
    const result = await client.query<{ action: string; summary: string }>(
      `SELECT action, summary
       FROM public.audit_logs
       WHERE company_id = $1
         AND entity_type = 'branch'
         AND entity_id = $2
         AND action = $3
       ORDER BY created_at DESC
       LIMIT 1`,
      [companyId, entityId, action],
    )

    return result.rows[0] ?? null
  })
}

export async function countBranchesByPrefix(companyId: string, prefix: string) {
  return withDb(async (client) => {
    const result = await client.query<{ count: string }>(
      `SELECT COUNT(*) AS count
       FROM public.branches
       WHERE company_id = $1 AND name LIKE $2 AND deleted_at IS NULL`,
      [companyId, `${prefix}%`],
    )

    return Number(result.rows[0]?.count ?? 0)
  })
}

export function uniqueBranchName(suffix: string) {
  return `${E2E_BRANCH_PREFIX} ${suffix} ${Date.now()}`
}

export async function delayNextMutation(page: Page, delayMs = 750) {
  let delayed = false
  await page.route('**/*', async (route) => {
    const request = route.request()
    if (!delayed && request.method() === 'POST') {
      delayed = true
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
    await route.continue()
  })
}
