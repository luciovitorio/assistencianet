'use server'

import { revalidatePath } from 'next/cache'
import { createClient as createSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createAuditLog } from '@/lib/audit/audit-log'
import { getAdminContext } from '@/lib/auth/admin-context'
import { getCompanyContext } from '@/lib/auth/company-context'
import { buildArchivedUniqueFieldValue } from '@/lib/soft-delete/archive-unique-field'
import { clientSchema, type ClientSchema } from '@/lib/validations/client'

const DUPLICATE_CLIENT_DOCUMENT_ERROR = 'Já existe um cliente ativo com este CPF/CNPJ.'
const CLIENTS_ACTIVE_DOCUMENT_UNIQUE_INDEX = 'clients_active_document_unique_idx'

const normalizeOptionalValue = (value: string | null | undefined) => {
  const normalized = value?.trim()
  return normalized ? normalized : null
}

const buildAddress = ({
  street,
  number,
  complement,
  city,
  state,
  zip_code,
}: Pick<ClientSchema, 'street' | 'number' | 'complement' | 'city' | 'state' | 'zip_code'>) => {
  const line = [street?.trim(), number?.trim()].filter(Boolean).join(', ')
  const location = [city?.trim(), state?.trim()].filter(Boolean).join(' - ')
  const parts = [
    line || null,
    complement?.trim() || null,
    location || null,
    zip_code?.trim() || null,
  ].filter(Boolean)

  return parts.length > 0 ? parts.join(' | ') : null
}

const revalidateClientsPage = () => {
  revalidatePath('/dashboard/clientes')
}

const sanitizeSearchTerm = (value: string) =>
  value.trim().replace(/[,%]/g, ' ').replace(/\s+/g, ' ').slice(0, 80)

const mergeClientSearchResults = (
  ...groups: Array<Array<{ id: string; name: string; phone: string | null; document: string | null }>>
) => Array.from(new Map(groups.flat().map((client) => [client.id, client])).values())

const isDuplicateClientDocumentError = (error: unknown) =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  error.code === '23505' &&
  'message' in error &&
  typeof error.message === 'string' &&
  error.message.includes(CLIENTS_ACTIVE_DOCUMENT_UNIQUE_INDEX)

const getActionErrorMessage = (error: unknown, fallback: string) => {
  if (isDuplicateClientDocumentError(error)) {
    return DUPLICATE_CLIENT_DOCUMENT_ERROR
  }

  if (error instanceof Error) {
    return error.message
  }

  return fallback
}

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
