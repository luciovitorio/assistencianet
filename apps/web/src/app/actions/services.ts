'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAuditLog } from '@/lib/audit/audit-log'
import { getAdminContext } from '@/lib/auth/admin-context'
import { serviceSchema, type ServiceSchema } from '@/lib/validations/service'

const DUPLICATE_SERVICE_CODE_ERROR = 'Já existe um serviço ativo com este código.'
const SERVICES_ACTIVE_CODE_UNIQUE_INDEX = 'services_active_code_unique_idx'

const normalizeOptional = (value: string | null | undefined) => {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

const revalidateServicesPage = () => {
  revalidatePath('/dashboard/servicos')
}

const isDuplicateCodeError = (error: unknown) =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  error.code === '23505' &&
  'message' in error &&
  typeof error.message === 'string' &&
  error.message.includes(SERVICES_ACTIVE_CODE_UNIQUE_INDEX)

const getActionErrorMessage = (error: unknown, fallback: string) => {
  if (isDuplicateCodeError(error)) {
    return DUPLICATE_SERVICE_CODE_ERROR
  }

  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message
  }

  if (error instanceof Error) {
    return error.message
  }

  return fallback
}

export async function createService(data: ServiceSchema) {
  try {
    const { companyId } = await getAdminContext('servicos')
    const parsed = serviceSchema.safeParse(data)

    if (!parsed.success) {
      return { error: parsed.error.issues[0].message }
    }

    const supabase = await createClient()

    const { data: created, error } = await supabase
      .from('services')
      .insert({
        name: parsed.data.name.trim(),
        code: normalizeOptional(parsed.data.code),
        category: parsed.data.category,
        price: parsed.data.price ?? null,
        estimated_duration_minutes: parsed.data.estimated_duration_minutes ?? null,
        notes: normalizeOptional(parsed.data.notes),
        active: parsed.data.active,
        company_id: companyId,
      })
      .select('id, name, category, active')
      .single()

    if (error) {
      throw error
    }

    await createAuditLog({
      action: 'create',
      entityType: 'service',
      entityId: created.id,
      companyId,
      summary: `Serviço "${created.name}" cadastrado.`,
      metadata: {
        category: created.category,
        active: created.active,
      },
    })

    revalidateServicesPage()
    return { success: true }
  } catch (error: unknown) {
    return { error: getActionErrorMessage(error, 'Erro ao cadastrar serviço') }
  }
}

export async function updateService(id: string, data: ServiceSchema) {
  try {
    const { companyId } = await getAdminContext('servicos')
    const parsed = serviceSchema.safeParse(data)

    if (!parsed.success) {
      return { error: parsed.error.issues[0].message }
    }

    const supabase = await createClient()

    const { data: current, error: currentError } = await supabase
      .from('services')
      .select('id, name')
      .eq('id', id)
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .single()

    if (currentError || !current) {
      throw new Error('Serviço não encontrado.')
    }

    const { error } = await supabase
      .from('services')
      .update({
        name: parsed.data.name.trim(),
        code: normalizeOptional(parsed.data.code),
        category: parsed.data.category,
        price: parsed.data.price ?? null,
        estimated_duration_minutes: parsed.data.estimated_duration_minutes ?? null,
        notes: normalizeOptional(parsed.data.notes),
        active: parsed.data.active,
      })
      .eq('id', id)
      .eq('company_id', companyId)
      .is('deleted_at', null)

    if (error) {
      throw error
    }

    await createAuditLog({
      action: 'update',
      entityType: 'service',
      entityId: id,
      companyId,
      summary: `Serviço "${current.name}" atualizado.`,
      metadata: {
        category: parsed.data.category,
        active: parsed.data.active,
      },
    })

    revalidateServicesPage()
    return { success: true }
  } catch (error: unknown) {
    return { error: getActionErrorMessage(error, 'Erro ao atualizar serviço') }
  }
}

export async function deleteService(id: string) {
  try {
    const { companyId, user } = await getAdminContext('servicos')
    const supabase = await createClient()

    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select('id, name')
      .eq('id', id)
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .single()

    if (serviceError || !service) {
      throw new Error('Serviço não encontrado.')
    }

    const deletedAt = new Date().toISOString()
    const { error } = await supabase
      .from('services')
      .update({
        active: false,
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
      entityType: 'service',
      entityId: service.id,
      companyId,
      summary: `Serviço "${service.name}" removido da listagem.`,
      metadata: { deleted_at: deletedAt },
    })

    revalidateServicesPage()
    return { success: true }
  } catch (error: unknown) {
    if (error instanceof Error) {
      return { error: error.message }
    }

    return { error: 'Erro ao excluir serviço' }
  }
}
