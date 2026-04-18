import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Page } from '@playwright/test'
import {
  E2E_EMAIL,
  createAuthUser,
  createBranch,
  getE2ECompanyId,
  getUserIdByEmail,
  cleanupUserByEmail,
  withDb,
} from './filiais-fixtures'

export const E2E_EMPLOYEE_PREFIX = 'E2E Funcionário'
export const E2E_EMPLOYEE_BRANCH_PREFIX = 'E2E Func Filial'
export const EMPLOYEE_EMAIL_PREFIX = 'e2e-funcionarios-'
export const EMPLOYEE_PASSWORD = 'E2eFuncionarios@2026!'

export type EmployeeRole = 'admin' | 'atendente' | 'tecnico'

export type EmployeeSeed = {
  id: string
  company_id: string
  branch_id: string | null
  user_id: string | null
  name: string
  role: EmployeeRole
  email: string | null
  phone: string | null
  cpf: string | null
  active: boolean
  labor_rate: string | null
  deleted_at: string | null
  deleted_by: string | null
}

export type EmployeeBranchSet = {
  primary: { id: string; name: string }
  secondary: { id: string; name: string }
  inactive: { id: string; name: string }
  deleted: { id: string; name: string }
}

type EmployeeInput = {
  name: string
  role?: EmployeeRole
  branchId?: string | null
  userId?: string | null
  email?: string | null
  phone?: string | null
  cpf?: string | null
  active?: boolean
  laborRate?: number | null
  createdAt?: string | null
  deletedAt?: string | null
  deletedBy?: string | null
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

export async function cleanupEmployeeE2EArtifacts() {
  await withDb(async (client) => {
    const users = await client.query<{ email: string }>('SELECT email FROM auth.users WHERE email LIKE $1', [
      `${EMPLOYEE_EMAIL_PREFIX}%@assistencianet.test`,
    ])

    for (const user of users.rows) {
      await cleanupUserByEmail(user.email)
    }

    const companyId = await getE2ECompanyId()

    await client.query('UPDATE public.employees SET deleted_by = NULL WHERE company_id = $1 AND deleted_by IS NOT NULL', [
      companyId,
    ])
    await client.query(
      `DELETE FROM public.audit_logs
       WHERE company_id = $1
         AND entity_type IN ('employee', 'auth')
         AND (
           summary LIKE $2
           OR summary LIKE $3
           OR metadata::text LIKE $4
         )`,
      [companyId, `%${E2E_EMPLOYEE_PREFIX}%`, '%e2e-funcionarios-%', `%${EMPLOYEE_EMAIL_PREFIX}%`],
    )
    await client.query(
      `DELETE FROM public.employees
       WHERE company_id = $1
         AND (
           name LIKE $2
           OR email LIKE $3
         )`,
      [companyId, `${E2E_EMPLOYEE_PREFIX}%`, `${EMPLOYEE_EMAIL_PREFIX}%`],
    )
    await client.query('DELETE FROM public.branches WHERE company_id = $1 AND name LIKE $2', [
      companyId,
      `${E2E_EMPLOYEE_BRANCH_PREFIX}%`,
    ])
  })
}

export async function resetEmployeeE2EData() {
  await cleanupEmployeeE2EArtifacts()
  const companyId = await getE2ECompanyId()
  const deletedBy = await getUserIdByEmail(E2E_EMAIL)
  const primary = await createBranch(companyId, {
    name: `${E2E_EMPLOYEE_BRANCH_PREFIX} Centro`,
    active: true,
    created_at: '2026-02-01T10:00:00Z',
  })
  const secondary = await createBranch(companyId, {
    name: `${E2E_EMPLOYEE_BRANCH_PREFIX} Norte`,
    active: true,
    created_at: '2026-02-02T10:00:00Z',
  })
  const inactive = await createBranch(companyId, {
    name: `${E2E_EMPLOYEE_BRANCH_PREFIX} Inativa`,
    active: false,
    created_at: '2026-02-03T10:00:00Z',
  })
  const deleted = await createBranch(companyId, {
    name: `${E2E_EMPLOYEE_BRANCH_PREFIX} Excluída`,
    active: true,
    created_at: '2026-02-04T10:00:00Z',
  })

  await withDb((client) =>
    client.query('UPDATE public.branches SET active = false, deleted_at = now(), deleted_by = $2 WHERE id = $1', [
      deleted.id,
      deletedBy,
    ]),
  )

  return {
    companyId,
    branches: {
      primary: { id: primary.id, name: primary.name },
      secondary: { id: secondary.id, name: secondary.name },
      inactive: { id: inactive.id, name: inactive.name },
      deleted: { id: deleted.id, name: deleted.name },
    },
  }
}

export async function createEmployeeRecord(companyId: string, input: EmployeeInput) {
  return withDb(async (client) => {
    const result = await client.query<EmployeeSeed>(
      `INSERT INTO public.employees
         (company_id, branch_id, user_id, name, role, email, phone, cpf, active, labor_rate, created_at, deleted_at, deleted_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, COALESCE($11::timestamptz, now()), $12, $13)
       RETURNING id, company_id, branch_id, user_id, name, role, email, phone, cpf, active, labor_rate, deleted_at, deleted_by`,
      [
        companyId,
        input.branchId ?? null,
        input.userId ?? null,
        input.name,
        input.role ?? 'atendente',
        input.email ?? null,
        input.phone ?? null,
        input.cpf ?? null,
        input.active ?? true,
        input.laborRate ?? null,
        'createdAt' in input ? input.createdAt : null,
        input.deletedAt ?? null,
        input.deletedBy ?? null,
      ],
    )

    return result.rows[0]
  })
}

export async function createEmployeeWithAccess(
  companyId: string,
  input: Omit<EmployeeInput, 'userId' | 'email'> & { email: string },
) {
  const user = await createAuthUser(input.email, EMPLOYEE_PASSWORD, input.name)
  const { error } = await adminClient().auth.admin.updateUserById(user.id, {
    app_metadata: {
      role: input.role ?? 'atendente',
      company_id: companyId,
    },
  })

  if (error) throw error

  const employee = await createEmployeeRecord(companyId, {
    ...input,
    email: input.email,
    userId: user.id,
  })

  return { user, employee }
}

export async function createAuthOnlyUser(email: string, name = 'E2E Auth Existente') {
  return createAuthUser(email, EMPLOYEE_PASSWORD, name)
}

export async function getEmployeeByName(companyId: string, name: string) {
  return withDb(async (client) => {
    const result = await client.query<EmployeeSeed>(
      `SELECT id, company_id, branch_id, user_id, name, role, email, phone, cpf, active, labor_rate, deleted_at, deleted_by
       FROM public.employees
       WHERE company_id = $1 AND name = $2
       ORDER BY created_at DESC
       LIMIT 1`,
      [companyId, name],
    )

    return result.rows[0] ?? null
  })
}

export async function getEmployeeById(employeeId: string) {
  return withDb(async (client) => {
    const result = await client.query<EmployeeSeed>(
      `SELECT id, company_id, branch_id, user_id, name, role, email, phone, cpf, active, labor_rate, deleted_at, deleted_by
       FROM public.employees
       WHERE id = $1
       LIMIT 1`,
      [employeeId],
    )

    return result.rows[0] ?? null
  })
}

export async function listVisibleEmployees(companyId: string) {
  return withDb(async (client) => {
    const result = await client.query<EmployeeSeed>(
      `SELECT id, company_id, branch_id, user_id, name, role, email, phone, cpf, active, labor_rate, deleted_at, deleted_by
       FROM public.employees
       WHERE company_id = $1 AND deleted_at IS NULL
       ORDER BY name ASC`,
      [companyId],
    )

    return result.rows
  })
}

export async function softDeleteEmployee(employeeId: string, deletedBy: string) {
  await withDb((client) =>
    client.query(
      'UPDATE public.employees SET active = false, deleted_at = now(), deleted_by = $2, user_id = NULL WHERE id = $1',
      [employeeId, deletedBy],
    ),
  )
}

export async function getLatestEmployeeAudit(companyId: string, entityId: string, action: string) {
  return withDb(async (client) => {
    const result = await client.query<{ action: string; summary: string; metadata: Record<string, unknown> | null }>(
      `SELECT action, summary, metadata
       FROM public.audit_logs
       WHERE company_id = $1
         AND entity_type = 'employee'
         AND entity_id = $2
         AND action = $3
       ORDER BY created_at DESC
       LIMIT 1`,
      [companyId, entityId, action],
    )

    return result.rows[0] ?? null
  })
}

export async function getAuthUserByEmail(email: string) {
  const { data, error } = await adminClient().auth.admin.listUsers({ page: 1, perPage: 200 })
  if (error) throw error
  return data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase()) ?? null
}

export async function countAuthUsersByEmail(email: string) {
  const { data, error } = await adminClient().auth.admin.listUsers({ page: 1, perPage: 200 })
  if (error) throw error
  return data.users.filter((user) => user.email?.toLowerCase() === email.toLowerCase()).length
}

export async function deleteAuthUserByEmail(email: string) {
  const user = await getAuthUserByEmail(email)
  if (!user) return

  const { error } = await adminClient().auth.admin.deleteUser(user.id)
  if (error) throw error
}

export async function countEmployeesByPrefix(companyId: string, prefix: string) {
  return withDb(async (client) => {
    const result = await client.query<{ count: string }>(
      `SELECT COUNT(*) AS count
       FROM public.employees
       WHERE company_id = $1 AND name LIKE $2 AND deleted_at IS NULL`,
      [companyId, `${prefix}%`],
    )

    return Number(result.rows[0]?.count ?? 0)
  })
}

export function uniqueEmployeeName(suffix: string) {
  return `${E2E_EMPLOYEE_PREFIX} ${suffix} ${Date.now()}`
}

export async function loginAsEmployee(page: Page, email: string, password = EMPLOYEE_PASSWORD) {
  await page.context().clearCookies()
  await page.goto('/login')
  await page.evaluate(() => {
    localStorage.clear()
    sessionStorage.clear()
  })
  await page.reload()
  await page.getByLabel('E-mail').fill(email)
  await page.locator('input[name="password"]').fill(password)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 15_000 })
}
