'use server'

import { revalidatePath } from 'next/cache'
import { createClient as createSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createAuditLog } from '@/lib/audit/audit-log'
import { getAdminContext } from '@/lib/auth/admin-context'
import { getCompanyContext } from '@/lib/auth/company-context'
import { buildArchivedUniqueFieldValue } from '@/lib/soft-delete/archive-unique-field'
import { clientSchema, type ClientSchema } from '@/lib/validations/client'
import {
  normalizeOptionalValue,
  buildAddress,
  createUniqueIndexChecker,
  extractActionError,
} from '@/lib/server/utils'

const checkDuplicateClientDocument = createUniqueIndexChecker(
  'clients_active_document_unique_idx',
  'Já existe um cliente ativo com este CPF/CNPJ.',
)

const getActionErrorMessage = (error: unknown, fallback: string) =>
  extractActionError(error, fallback, checkDuplicateClientDocument)

const revalidateClientsPage = () => {
  revalidatePath('/dashboard/clientes')
}

const sanitizeSearchTerm = (value: string) =>
  value.trim().replace(/[,%]/g, ' ').replace(/\s+/g, ' ').slice(0, 80)

const mergeClientSearchResults = (
  ...groups: Array<Array<{ id: string; name: string; phone: string | null; document: string | null }>>
) => Array.from(new Map(groups.flat().map((client) => [client.id, client])).values())

export async function createClient(data: ClientSchema) {
  try {
    const { companyId } = await getCompanyContext()
    const parsed = clientSchema.safeParse(data)

    if (!parsed.success) {
      return { error: parsed.error.issues[0].message }
    }

    const supabase = await createSupabaseClient()

    const { data: createdClient, error } = await supabase
      .from('clients')
      .insert({
        name: parsed.data.name.trim(),
        document: parsed.data.document.trim(),
        phone: parsed.data.phone.trim(),
        email: normalizeOptionalValue(parsed.data.email),
        zip_code: normalizeOptionalValue(parsed.data.zip_code),
        street: normalizeOptionalValue(parsed.data.street),
        number: normalizeOptionalValue(parsed.data.number),
        complement: normalizeOptionalValue(parsed.data.complement),
        city: normalizeOptionalValue(parsed.data.city),
        state: normalizeOptionalValue(parsed.data.state)?.toUpperCase() ?? null,
        address: buildAddress(parsed.data),
        notes: normalizeOptionalValue(parsed.data.notes),
        origin_branch_id: parsed.data.origin_branch_id,
        active: parsed.data.active,
        classification: parsed.data.classification,
        classification_manual: parsed.data.classification_manual,
        company_id: companyId,
      })
      .select('id, name, origin_branch_id, active')
      .single()

    if (error) {
      throw error
    }

    await createAuditLog({
      action: 'create',
      entityType: 'client',
      entityId: createdClient.id,
      companyId,
      summary: `Cliente "${createdClient.name}" cadastrado.`,
      metadata: {
        origin_branch_id: createdClient.origin_branch_id,
        active: createdClient.active,
      },
    })

    revalidateClientsPage()
    return {
      success: true,
      client: {
        id: createdClient.id,
        name: createdClient.name,
        phone: parsed.data.phone,
        document: parsed.data.document,
      },
    }
  } catch (error: unknown) {
    return { error: getActionErrorMessage(error, 'Erro ao cadastrar cliente') }
  }
}

export async function searchClientsForServiceOrder(search: string) {
  try {
    const { companyId } = await getCompanyContext()
    const supabase = await createSupabaseClient()
    const term = sanitizeSearchTerm(search)
    const numericTerm = term.replace(/\D/g, '')

    const baseSelect = 'id, name, phone, document'

    if (!term) {
      const { data, error } = await supabase
        .from('clients')
        .select(baseSelect)
        .eq('company_id', companyId)
        .eq('active', true)
        .is('deleted_at', null)
        .order('name', { ascending: true })
        .limit(8)

      if (error) throw error
      return { clients: data ?? [] }
    }

    const { data: nameMatches, error: nameError } = await supabase
      .from('clients')
      .select(baseSelect)
      .eq('company_id', companyId)
      .eq('active', true)
      .is('deleted_at', null)
      .or(`name.ilike.${term}%,name.ilike.% ${term}%`)
      .order('name', { ascending: true })
      .limit(12)

    if (nameError) throw nameError

    if (numericTerm.length < 3) {
      return { clients: nameMatches ?? [] }
    }

    const { data: numericMatches, error: numericError } = await supabase
      .from('clients')
      .select(baseSelect)
      .eq('company_id', companyId)
      .eq('active', true)
      .is('deleted_at', null)
      .or(`phone.ilike.%${numericTerm}%,document.ilike.%${numericTerm}%`)
      .order('name', { ascending: true })
      .limit(12)

    if (numericError) throw numericError

    return { clients: mergeClientSearchResults(nameMatches ?? [], numericMatches ?? []).slice(0, 12) }
  } catch (error: unknown) {
    return { error: getActionErrorMessage(error, 'Erro ao buscar clientes.') }
  }
}

export async function updateClient(id: string, data: ClientSchema) {
  try {
    const { companyId } = await getAdminContext('clientes')
    const parsed = clientSchema.safeParse(data)

    if (!parsed.success) {
      return { error: parsed.error.issues[0].message }
    }

    const supabase = await createSupabaseClient()
    const { data: currentClient, error: currentClientError } = await supabase
      .from('clients')
      .select('id, name')
      .eq('id', id)
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .single()

    if (currentClientError || !currentClient) {
      throw new Error('Cliente não encontrado.')
    }

    const { error } = await supabase
      .from('clients')
      .update({
        name: parsed.data.name.trim(),
        document: parsed.data.document.trim(),
        phone: parsed.data.phone.trim(),
        email: normalizeOptionalValue(parsed.data.email),
        zip_code: normalizeOptionalValue(parsed.data.zip_code),
        street: normalizeOptionalValue(parsed.data.street),
        number: normalizeOptionalValue(parsed.data.number),
        complement: normalizeOptionalValue(parsed.data.complement),
        city: normalizeOptionalValue(parsed.data.city),
        state: normalizeOptionalValue(parsed.data.state)?.toUpperCase() ?? null,
        address: buildAddress(parsed.data),
        notes: normalizeOptionalValue(parsed.data.notes),
        origin_branch_id: parsed.data.origin_branch_id,
        active: parsed.data.active,
        classification: parsed.data.classification,
        classification_manual: parsed.data.classification_manual,
      })
      .eq('id', id)
      .eq('company_id', companyId)
      .is('deleted_at', null)

    if (error) {
      throw error
    }

    await createAuditLog({
      action: 'update',
      entityType: 'client',
      entityId: id,
      companyId,
      summary: `Cliente "${currentClient.name}" atualizado.`,
      metadata: {
        origin_branch_id: parsed.data.origin_branch_id,
        active: parsed.data.active,
      },
    })

    revalidateClientsPage()
    return { success: true }
  } catch (error: unknown) {
    return { error: getActionErrorMessage(error, 'Erro ao atualizar cliente') }
  }
}

const CLOSED_SERVICE_ORDER_STATUSES = ['finalizado', 'cancelado']

export async function deleteClient(id: string) {
  try {
    const { companyId, user } = await getAdminContext('clientes')
    const supabase = await createSupabaseClient()

    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, name, document')
      .eq('id', id)
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .single()

    if (clientError || !client) {
      throw new Error('Cliente não encontrado.')
    }

    const { count: openOsCount } = await supabase
      .from('service_orders')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', id)
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .not('status', 'in', `(${CLOSED_SERVICE_ORDER_STATUSES.join(',')})`)

    if (openOsCount && openOsCount > 0) {
      throw new Error(
        `Não é possível excluir este cliente pois possui ${openOsCount} ordem${openOsCount > 1 ? 's' : ''} de serviço em aberto.`,
      )
    }

    const deletedAt = new Date().toISOString()
    const archivedDocument = buildArchivedUniqueFieldValue(client.document, client.id, deletedAt)
    const admin = createAdminClient()
    const { error } = await admin
      .from('clients')
      .update({
        active: false,
        document: archivedDocument,
        deleted_at: deletedAt,
        deleted_by: user.id,
      })
      .eq('id', id)
      .eq('company_id', companyId)
      .is('deleted_at', null)

    if (error) {
      throw error
    }

    await createAuditLog({
      action: 'soft_delete',
      entityType: 'client',
      entityId: client.id,
      companyId,
      summary: `Cliente "${client.name}" removido da listagem.`,
      metadata: {
        deleted_at: deletedAt,
        original_document: client.document,
      },
    })

    revalidateClientsPage()
    return { success: true }
  } catch (error: unknown) {
    return { error: getActionErrorMessage(error, 'Erro ao excluir cliente') }
  }
}

export type ClientServiceOrder = {
  id: string
  number: number
  status: string
  device_type: string | null
  device_brand: string | null
  device_model: string | null
  created_at: string
  amount_paid: number | null
  payment_status: string | null
}

export type ClientWarranty = {
  id: string
  number: number
  device_type: string | null
  device_brand: string | null
  device_model: string | null
  warranty_expires_at: string | null
}

export type ClientProfileClient = {
  id: string
  name: string
  document: string | null
  phone: string | null
  email: string | null
  zip_code: string | null
  street: string | null
  number: string | null
  complement: string | null
  city: string | null
  state: string | null
  notes: string | null
  active: boolean
  classification: string
  origin_branch_id: string | null
  created_at: string
}

export type ClientProfileData = {
  client: ClientProfileClient
  branchName: string | null
  stats: {
    total: number
    open: number
    totalPaid: number
    lastOrderDate: string | null
  }
  serviceOrders: ClientServiceOrder[]
  warranties: ClientWarranty[]
}

const OPEN_STATUSES = new Set([
  'aberta', 'em_analise', 'aguardando_envio', 'aguardando_aprovacao',
  'aprovado', 'aguardando_peca', 'enviado_terceiro', 'em_reparo', 'pronto',
])

const ORDER_PAGE_SIZE = 50

export async function getClientProfile(id: string): Promise<ClientProfileData | null> {
  try {
    const { companyId } = await getCompanyContext()
    const supabase = await createSupabaseClient()
    const today = new Date().toISOString().slice(0, 10)

    // All three queries fire in parallel — no waterfall.
    // Branch name comes via join on clients (no extra round-trip).
    // Stats aggregated in DB via RPC (no app-side reduce/filter).
    // Orders paginated to ORDER_PAGE_SIZE rows.
    const [clientResult, ordersResult, warrantiesResult, statsResult] = await Promise.all([
      supabase
        .from('clients')
        .select('id, name, document, phone, email, zip_code, street, number, complement, city, state, notes, active, classification, origin_branch_id, created_at, branches!origin_branch_id(name)')
        .eq('id', id)
        .eq('company_id', companyId)
        .is('deleted_at', null)
        .single(),
      supabase
        .from('service_orders')
        .select('id, number, status, device_type, device_brand, device_model, created_at, amount_paid, payment_status')
        .eq('client_id', id)
        .eq('company_id', companyId)
        .is('deleted_at', null)
        .order('number', { ascending: false })
        .limit(ORDER_PAGE_SIZE),
      supabase
        .from('service_orders')
        .select('id, number, device_type, device_brand, device_model, warranty_expires_at')
        .eq('client_id', id)
        .eq('company_id', companyId)
        .is('deleted_at', null)
        .not('warranty_expires_at', 'is', null)
        .gte('warranty_expires_at', today)
        .order('warranty_expires_at'),
      supabase.rpc('get_client_stats', {
        p_client_id: id,
        p_company_id: companyId,
      }),
    ])

    if (clientResult.error || !clientResult.data) return null

    const { branches: branchJoin, ...clientFields } = clientResult.data
    const branchName = Array.isArray(branchJoin)
      ? (branchJoin[0]?.name ?? null)
      : ((branchJoin as { name: string } | null)?.name ?? null)

    const statsRow = statsResult.data?.[0]

    return {
      client: clientFields,
      branchName,
      stats: {
        total: Number(statsRow?.total_orders ?? 0),
        open: Number(statsRow?.open_orders ?? 0),
        totalPaid: Number(statsRow?.total_paid ?? 0),
        lastOrderDate: statsRow?.last_order_at ?? null,
      },
      serviceOrders: ordersResult.data ?? [],
      warranties: warrantiesResult.data ?? [],
    }
  } catch {
    return null
  }
}
