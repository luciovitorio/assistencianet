import type { Page } from '@playwright/test'
import {
  E2E_EMAIL,
  createBranch,
  getE2ECompanyId,
  getUserIdByEmail,
  withDb,
} from './filiais-fixtures'

export const E2E_CLIENT_PREFIX = 'E2E Cliente'
export const E2E_CLIENT_BRANCH_PREFIX = 'E2E Cli Filial'
export const CLIENT_NOTES_PREFIX = 'obs-e2e-clientes'

export type ClientClassification = 'novo' | 'recorrente' | 'vip' | 'inadimplente'

export type ClientSeed = {
  id: string
  company_id: string
  origin_branch_id: string | null
  name: string
  document: string | null
  phone: string | null
  email: string | null
  address: string | null
  zip_code: string | null
  street: string | null
  number: string | null
  complement: string | null
  city: string | null
  state: string | null
  notes: string | null
  active: boolean
  classification: ClientClassification
  classification_manual: boolean
  deleted_at: string | null
  deleted_by: string | null
}

export type ClientBranchSet = {
  primary: { id: string; name: string }
  secondary: { id: string; name: string }
  inactive: { id: string; name: string }
}

type ClientInput = {
  name: string
  branchId?: string | null
  document?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
  zipCode?: string | null
  street?: string | null
  number?: string | null
  complement?: string | null
  city?: string | null
  state?: string | null
  notes?: string | null
  active?: boolean
  classification?: ClientClassification
  classificationManual?: boolean
  createdAt?: string | null
  deletedAt?: string | null
  deletedBy?: string | null
}

export async function cleanupClientE2EArtifacts() {
  await withDb(async (client) => {
    const companyId = await getE2ECompanyId()

    await client.query(
      `DELETE FROM public.audit_logs
         WHERE company_id = $1
           AND entity_type = 'client'
           AND (summary LIKE $2 OR metadata::text LIKE $3)`,
      [companyId, `%${E2E_CLIENT_PREFIX}%`, `%${E2E_CLIENT_PREFIX}%`],
    )
    await client.query(
      `DELETE FROM public.clients
         WHERE company_id = $1
           AND (name LIKE $2 OR document LIKE $3 OR notes LIKE $4)`,
      [companyId, `${E2E_CLIENT_PREFIX}%`, `%[deleted:%`, `${CLIENT_NOTES_PREFIX}%`],
    )
    await client.query('DELETE FROM public.branches WHERE company_id = $1 AND name LIKE $2', [
      companyId,
      `${E2E_CLIENT_BRANCH_PREFIX}%`,
    ])
  })
}

export async function resetClientE2EData() {
  await cleanupClientE2EArtifacts()
  const companyId = await getE2ECompanyId()
  const deletedBy = await getUserIdByEmail(E2E_EMAIL)

  const primary = await createBranch(companyId, {
    name: `${E2E_CLIENT_BRANCH_PREFIX} Centro`,
    active: true,
    created_at: '2026-02-01T10:00:00Z',
  })
  const secondary = await createBranch(companyId, {
    name: `${E2E_CLIENT_BRANCH_PREFIX} Norte`,
    active: true,
    created_at: '2026-02-02T10:00:00Z',
  })
  const inactive = await createBranch(companyId, {
    name: `${E2E_CLIENT_BRANCH_PREFIX} Inativa`,
    active: false,
    created_at: '2026-02-03T10:00:00Z',
  })

  return {
    companyId,
    deletedBy,
    branches: {
      primary: { id: primary.id, name: primary.name },
      secondary: { id: secondary.id, name: secondary.name },
      inactive: { id: inactive.id, name: inactive.name },
    } as ClientBranchSet,
  }
}

export async function createClientRecord(companyId: string, input: ClientInput) {
  return withDb(async (client) => {
    const result = await client.query<ClientSeed>(
      `INSERT INTO public.clients
         (company_id, origin_branch_id, name, document, phone, email, address,
          zip_code, street, number, complement, city, state, notes,
          active, classification, classification_manual, created_at, deleted_at, deleted_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
               $15, $16, $17, COALESCE($18::timestamptz, now()), $19, $20)
       RETURNING id, company_id, origin_branch_id, name, document, phone, email, address,
                 zip_code, street, number, complement, city, state, notes,
                 active, classification, classification_manual, deleted_at, deleted_by`,
      [
        companyId,
        input.branchId ?? null,
        input.name,
        input.document ?? null,
        input.phone ?? null,
        input.email ?? null,
        input.address ?? null,
        input.zipCode ?? null,
        input.street ?? null,
        input.number ?? null,
        input.complement ?? null,
        input.city ?? null,
        input.state ?? null,
        input.notes ?? null,
        input.active ?? true,
        input.classification ?? 'novo',
        input.classificationManual ?? false,
        input.createdAt ?? null,
        input.deletedAt ?? null,
        input.deletedBy ?? null,
      ],
    )
    return result.rows[0]
  })
}

export async function getClientById(clientId: string) {
  return withDb(async (client) => {
    const result = await client.query<ClientSeed>(
      `SELECT id, company_id, origin_branch_id, name, document, phone, email, address,
              zip_code, street, number, complement, city, state, notes,
              active, classification, classification_manual, deleted_at, deleted_by
         FROM public.clients WHERE id = $1 LIMIT 1`,
      [clientId],
    )
    return result.rows[0] ?? null
  })
}

export async function getClientByName(companyId: string, name: string) {
  return withDb(async (client) => {
    const result = await client.query<ClientSeed>(
      `SELECT id, company_id, origin_branch_id, name, document, phone, email, address,
              zip_code, street, number, complement, city, state, notes,
              active, classification, classification_manual, deleted_at, deleted_by
         FROM public.clients
        WHERE company_id = $1 AND name = $2
        ORDER BY created_at DESC
        LIMIT 1`,
      [companyId, name],
    )
    return result.rows[0] ?? null
  })
}

export async function getLatestClientAudit(
  companyId: string,
  entityId: string,
  action: string,
) {
  return withDb(async (client) => {
    const result = await client.query<{
      action: string
      summary: string
      metadata: Record<string, unknown> | null
    }>(
      `SELECT action, summary, metadata
         FROM public.audit_logs
        WHERE company_id = $1
          AND entity_type = 'client'
          AND entity_id = $2
          AND action = $3
        ORDER BY created_at DESC
        LIMIT 1`,
      [companyId, entityId, action],
    )
    return result.rows[0] ?? null
  })
}

export async function softDeleteClient(clientId: string, deletedBy: string) {
  await withDb(async (client) => {
    const current = await client.query<{ document: string | null }>(
      `SELECT document FROM public.clients WHERE id = $1 LIMIT 1`,
      [clientId],
    )
    const original = current.rows[0]?.document ?? null
    const archived = original ? `${original} [deleted:${Date.now()}:${clientId.slice(0, 8)}]` : null
    await client.query(
      `UPDATE public.clients
          SET deleted_at = now(),
              deleted_by = $2,
              active = false,
              document = $3
        WHERE id = $1`,
      [clientId, deletedBy, archived],
    )
  })
}

export function uniqueClientName(suffix: string) {
  return `${E2E_CLIENT_PREFIX} ${suffix} ${Date.now()}`
}

/**
 * Gera um CPF que combina `${timestamp}${random}` — únicos entre runs mas válidos
 * apenas como "11 dígitos" (não validamos dígitos verificadores no schema do cliente).
 */
export function uniqueDocument() {
  return String(Date.now()).padStart(11, '0').slice(-11)
}

export async function openClientsPage(page: Page) {
  await page.goto('/dashboard/clientes')
}
