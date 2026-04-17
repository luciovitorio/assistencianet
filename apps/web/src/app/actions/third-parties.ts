'use server'

import { revalidatePath } from 'next/cache'
import { createClient as createSupabaseClient } from '@/lib/supabase/server'
import { createAuditLog } from '@/lib/audit/audit-log'
import { getAdminContext } from '@/lib/auth/admin-context'
import { buildArchivedUniqueFieldValue } from '@/lib/soft-delete/archive-unique-field'
import { thirdPartySchema, type ThirdPartySchema } from '@/lib/validations/third-party'

const DUPLICATE_THIRD_PARTY_DOCUMENT_ERROR = 'Já existe uma terceirizada ativa com este CPF/CNPJ.'
const THIRD_PARTIES_ACTIVE_DOCUMENT_UNIQUE_INDEX = 'third_parties_active_document_unique_idx'

const normalizeOptionalValue = (value: string | null | undefined) => {
  const normalized = value?.trim()
  return normalized ? normalized : null
}

const isDuplicateDocumentError = (error: unknown) =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  error.code === '23505' &&
  'message' in error &&
  typeof error.message === 'string' &&
  error.message.includes(THIRD_PARTIES_ACTIVE_DOCUMENT_UNIQUE_INDEX)

const getActionErrorMessage = (error: unknown, fallback: string) => {
  if (isDuplicateDocumentError(error)) return DUPLICATE_THIRD_PARTY_DOCUMENT_ERROR

  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message
  }

  if (error instanceof Error) return error.message
  return fallback
}

const revalidatePage = () => revalidatePath('/dashboard/terceiros')

export async function createThirdParty(data: ThirdPartySchema) {
  try {
    const { companyId } = await getAdminContext('terceiros')
    const parsed = thirdPartySchema.safeParse(data)

    if (!parsed.success) {
      return { error: parsed.error.issues[0].message }
    }

    const supabase = await createSupabaseClient()

    const { data: created, error } = await supabase
      .from('third_parties')
      .insert({
        company_id: companyId,
        name: parsed.data.name.trim(),
        type: parsed.data.type,
        document: normalizeOptionalValue(parsed.data.document),
        phone: normalizeOptionalValue(parsed.data.phone),
        email: normalizeOptionalValue(parsed.data.email),
        default_return_days: parsed.data.default_return_days ?? null,
        notes: normalizeOptionalValue(parsed.data.notes),
        active: parsed.data.active,
      })
      .select('id, name')
      .single()

    if (error) throw error

    await createAuditLog({
      action: 'create',
      entityType: 'third_party',
      entityId: created.id,
      companyId,
      summary: `Terceirizada "${created.name}" cadastrada.`,
      metadata: { type: parsed.data.type, active: parsed.data.active },
    })

    revalidatePage()
    return { success: true }
  } catch (error: unknown) {
    return { error: getActionErrorMessage(error, 'Erro ao cadastrar terceirizada') }
  }
}

export async function updateThirdParty(id: string, data: ThirdPartySchema) {
  try {
    const { companyId } = await getAdminContext('terceiros')
    const parsed = thirdPartySchema.safeParse(data)

    if (!parsed.success) {
      return { error: parsed.error.issues[0].message }
    }

    const supabase = await createSupabaseClient()

    const { data: current, error: currentError } = await supabase
      .from('third_parties')
      .select('id, name')
      .eq('id', id)
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .single()

    if (currentError || !current) throw new Error('Terceirizada não encontrada.')

    const { error } = await supabase
      .from('third_parties')
      .update({
        name: parsed.data.name.trim(),
        type: parsed.data.type,
        document: normalizeOptionalValue(parsed.data.document),
        phone: normalizeOptionalValue(parsed.data.phone),
        email: normalizeOptionalValue(parsed.data.email),
        default_return_days: parsed.data.default_return_days ?? null,
        notes: normalizeOptionalValue(parsed.data.notes),
        active: parsed.data.active,
      })
      .eq('id', id)
      .eq('company_id', companyId)
      .is('deleted_at', null)

    if (error) throw error

    await createAuditLog({
      action: 'update',
      entityType: 'third_party',
      entityId: id,
      companyId,
      summary: `Terceirizada "${current.name}" atualizada.`,
      metadata: { type: parsed.data.type, active: parsed.data.active },
    })

    revalidatePage()
    return { success: true }
  } catch (error: unknown) {
    return { error: getActionErrorMessage(error, 'Erro ao atualizar terceirizada') }
  }
}

export async function deleteThirdParty(id: string) {
  try {
    const { companyId, user } = await getAdminContext('terceiros')
    const supabase = await createSupabaseClient()

    const { data: tp, error: tpError } = await supabase
      .from('third_parties')
      .select('id, name, document')
      .eq('id', id)
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .single()

    if (tpError || !tp) throw new Error('Terceirizada não encontrada.')

    const deletedAt = new Date().toISOString()
    const archivedDocument = tp.document
      ? buildArchivedUniqueFieldValue(tp.document, tp.id, deletedAt)
      : null

    const { error } = await supabase
      .from('third_parties')
      .update({
        active: false,
        document: archivedDocument,
        deleted_at: deletedAt,
        deleted_by: user.id,
      })
      .eq('id', id)
      .eq('company_id', companyId)
      .is('deleted_at', null)

    if (error) throw error

    await createAuditLog({
      action: 'soft_delete',
      entityType: 'third_party',
      entityId: tp.id,
      companyId,
      summary: `Terceirizada "${tp.name}" removida da listagem.`,
      metadata: { deleted_at: deletedAt },
    })

    revalidatePage()
    return { success: true }
  } catch (error: unknown) {
    if (error instanceof Error) return { error: error.message }
    return { error: 'Erro ao excluir terceirizada' }
  }
}
