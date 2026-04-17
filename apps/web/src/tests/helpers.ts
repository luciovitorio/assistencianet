/**
 * Utilitários compartilhados entre suites de teste.
 * Funções para criar e limpar dados de teste no banco local.
 * 
 * Usa Postgres direto (pg) para bypass de RLS em seeds de teste.
 */
import { testClient } from './setup'
import { Client } from 'pg'

// ─── PG Client (bypass RLS) ──────────────────────────────────────────────────

const DB_URL = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'

export async function withPg<T>(fn: (client: Client) => Promise<T>): Promise<T> {
  const client = new Client({ connectionString: DB_URL })
  await client.connect()
  try {
    return await fn(client)
  } finally {
    await client.end()
  }
}

// ─── Tipos mínimos para seed ───────────────────────────────────────────────

export type SeedCompany = {
  id: string
  name: string
}

export type SeedBranch = {
  id: string
  company_id: string
  name: string
}

// ─── Helpers de Seed ────────────────────────────────────────────────────────

/**
 * Cria um usuário fictício diretamente no auth.users + profiles via Postgres (bypass total).
 * Necessário pois:
 *   companies.owner_id → profiles.id → auth.users.id
 */
export async function createTestAuthUser(email = 'test@assistencianet.test'): Promise<string> {
  return withPg(async (pg) => {
    // Verifica se já existe (de run anterior)
    const existing = await pg.query<{ id: string }>(
      'SELECT id FROM auth.users WHERE email = $1 LIMIT 1',
      [email],
    )
    if (existing.rows.length > 0) {
      const userId = existing.rows[0].id
      await pg.query(
        `INSERT INTO public.profiles (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`,
        [userId, 'Test User'],
      )
      return userId
    }

    // 1. Insere em auth.users
    const authResult = await pg.query<{ id: string }>(
      `INSERT INTO auth.users
         (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, role, aud, instance_id)
       VALUES
         (gen_random_uuid(), $1, 'test_only_not_real', now(), now(), now(), 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000')
       RETURNING id`,
      [email],
    )
    const userId = authResult.rows[0].id

    // 2. Insere em profiles (companies.owner_id referencia profiles.id)
    await pg.query(
      `INSERT INTO public.profiles (id, name) VALUES ($1, $2)
       ON CONFLICT (id) DO NOTHING`,
      [userId, 'Test User'],
    )

    return userId
  })
}

/**
 * Cria uma empresa de teste diretamente via SQL (bypass RLS).
 */
export async function createTestCompany(ownerId: string, name = 'Empresa Teste'): Promise<SeedCompany> {
  return withPg(async (pg) => {
    const result = await pg.query<{ id: string; name: string }>(
      `INSERT INTO public.companies (name, cnpj, owner_id)
       VALUES ($1, $2, $3)
       RETURNING id, name`,
      [name, '00.000.000/0001-00', ownerId],
    )
    return result.rows[0]
  })
}

/**
 * Cria uma filial vinculada a uma empresa via SQL (bypass RLS).
 */
export async function createTestBranch(companyId: string, name = 'Filial Principal'): Promise<SeedBranch> {
  return withPg(async (pg) => {
    const result = await pg.query<{ id: string; company_id: string; name: string }>(
      `INSERT INTO public.branches (company_id, name)
       VALUES ($1, $2)
       RETURNING id, company_id, name`,
      [companyId, name],
    )
    return result.rows[0]
  })
}

/**
 * Remove TODOS os dados de uma empresa de teste via SQL (bypass RLS).
 * Deve ser chamado no afterAll() de cada suite.
 */
export async function cleanupCompany(companyId: string, ownerId?: string) {
  await withPg(async (pg) => {
    // A ordem importa! Remover dependentes antes do pai.
    await pg.query('DELETE FROM public.stock_movements WHERE company_id = $1', [companyId])
    await pg.query('DELETE FROM public.stock_reservations WHERE company_id = $1', [companyId])
    await pg.query('DELETE FROM public.parts WHERE company_id = $1', [companyId])
    await pg.query('DELETE FROM public.cash_entries WHERE company_id = $1', [companyId])
    await pg.query('DELETE FROM public.service_order_estimate_items WHERE company_id = $1', [companyId])
    await pg.query('DELETE FROM public.service_order_estimates WHERE company_id = $1', [companyId])
    await pg.query('DELETE FROM public.service_orders WHERE company_id = $1', [companyId])
    await pg.query('DELETE FROM public.bills WHERE company_id = $1', [companyId])
    await pg.query('DELETE FROM public.branches WHERE company_id = $1', [companyId])
    await pg.query('DELETE FROM public.companies WHERE id = $1', [companyId])
    if (ownerId) {
      await pg.query('DELETE FROM public.profiles WHERE id = $1', [ownerId])
      await pg.query('DELETE FROM auth.users WHERE id = $1', [ownerId])
    }
  })
}
