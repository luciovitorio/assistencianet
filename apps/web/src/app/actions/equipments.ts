'use server'

import { revalidatePath } from 'next/cache'
import { createAuditLog } from '@/lib/audit/audit-log'
import { getAdminContext } from '@/lib/auth/admin-context'
import { getCompanyContext } from '@/lib/auth/company-context'
import { createClient } from '@/lib/supabase/server'
import { equipmentSchema, type EquipmentSchema } from '@/lib/validations/equipment'

const EQUIPMENT_DUPLICATE_INDEX = 'equipment_models_active_identity_unique_idx'
const DUPLICATE_EQUIPMENT_ERROR = 'Já existe um equipamento ativo com esse tipo, fabricante, modelo e voltagem.'

const normalizeOptional = (value: string | null | undefined) => {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

const revalidateEquipments = () => {
  revalidatePath('/dashboard/equipamentos')
  revalidatePath('/dashboard/ordens-de-servico')
  revalidatePath('/dashboard/ordens-de-servico/nova')
}

const sanitizeSearchTerm = (value: string) =>
  value.trim().replace(/[,%]/g, ' ').replace(/\s+/g, ' ').slice(0, 80)

const isDuplicateEquipmentError = (error: unknown) =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  error.code === '23505' &&
  'message' in error &&
  typeof error.message === 'string' &&
  error.message.includes(EQUIPMENT_DUPLICATE_INDEX)

const getActionErrorMessage = (error: unknown, fallback: string) => {
  if (isDuplicateEquipmentError(error)) return DUPLICATE_EQUIPMENT_ERROR

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

export async function createEquipment(data: EquipmentSchema) {
  try {
    const { companyId } = await getAdminContext('equipamentos')
    const parsed = equipmentSchema.safeParse(data)

    if (!parsed.success) {
      return { error: parsed.error.issues[0].message }
    }

    const supabase = await createClient()
    const { data: created, error } = await supabase
      .from('equipment_models')
      .insert({
        company_id: companyId,
        type: parsed.data.type.trim(),
        manufacturer: parsed.data.manufacturer.trim(),
        model: parsed.data.model.trim(),
        voltage: normalizeOptional(parsed.data.voltage),
        notes: normalizeOptional(parsed.data.notes),
        active: parsed.data.active,
      })
      .select('id, type, manufacturer, model, active')
      .single()

    if (error) throw error

    await createAuditLog({
      action: 'create',
      entityType: 'equipment',
      entityId: created.id,
      companyId,
      summary: `Equipamento "${created.manufacturer} ${created.model}" cadastrado.`,
      metadata: {
        type: created.type,
        active: created.active,
      },
    })

    revalidateEquipments()
    return {
      success: true,
      equipment: {
        id: created.id,
        type: created.type,
        manufacturer: created.manufacturer,
        model: created.model,
        voltage: normalizeOptional(parsed.data.voltage),
      },
    }
  } catch (error: unknown) {
    return { error: getActionErrorMessage(error, 'Erro ao cadastrar equipamento.') }
  }
}

export async function searchEquipmentModelsForServiceOrder(search: string) {
  try {
    const { companyId } = await getCompanyContext()
    const supabase = await createClient()
    const term = sanitizeSearchTerm(search)
    const selectColumns = 'id, type, manufacturer, model, voltage'

    let query = supabase
      .from('equipment_models')
      .select(selectColumns)
      .eq('company_id', companyId)
      .eq('active', true)
      .is('deleted_at', null)

    if (term) {
      query = query.or(
        `type.ilike.%${term}%,manufacturer.ilike.%${term}%,model.ilike.%${term}%,voltage.ilike.%${term}%`,
      )
    }

    const { data, error } = await query
      .order('type', { ascending: true })
      .order('manufacturer', { ascending: true })
      .order('model', { ascending: true })
      .limit(term ? 12 : 8)

    if (error) throw error

    return { equipments: data ?? [] }
  } catch (error: unknown) {
    return { error: getActionErrorMessage(error, 'Erro ao buscar equipamentos.') }
  }
}

export async function updateEquipment(id: string, data: EquipmentSchema) {
  try {
    const { companyId } = await getAdminContext('equipamentos')
    const parsed = equipmentSchema.safeParse(data)

    if (!parsed.success) {
      return { error: parsed.error.issues[0].message }
    }

    const supabase = await createClient()
    const { data: current, error: currentError } = await supabase
      .from('equipment_models')
      .select('id, type, manufacturer, model')
      .eq('id', id)
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .single()

    if (currentError || !current) {
      throw new Error('Equipamento não encontrado.')
    }

    const { error } = await supabase
      .from('equipment_models')
      .update({
        type: parsed.data.type.trim(),
        manufacturer: parsed.data.manufacturer.trim(),
        model: parsed.data.model.trim(),
        voltage: normalizeOptional(parsed.data.voltage),
        notes: normalizeOptional(parsed.data.notes),
        active: parsed.data.active,
      })
      .eq('id', id)
      .eq('company_id', companyId)
      .is('deleted_at', null)

    if (error) throw error

    await createAuditLog({
      action: 'update',
      entityType: 'equipment',
      entityId: id,
      companyId,
      summary: `Equipamento "${current.manufacturer} ${current.model}" atualizado.`,
      metadata: {
        before: {
          type: current.type,
          manufacturer: current.manufacturer,
          model: current.model,
        },
        after: {
          type: parsed.data.type,
          manufacturer: parsed.data.manufacturer,
          model: parsed.data.model,
          active: parsed.data.active,
        },
      },
    })

    revalidateEquipments()
    return {
      success: true,
      equipment: {
        id,
        type: parsed.data.type.trim(),
        manufacturer: parsed.data.manufacturer.trim(),
        model: parsed.data.model.trim(),
        voltage: normalizeOptional(parsed.data.voltage),
      },
    }
  } catch (error: unknown) {
    return { error: getActionErrorMessage(error, 'Erro ao atualizar equipamento.') }
  }
}

export async function deleteEquipment(id: string) {
  try {
    const { companyId, user } = await getAdminContext('equipamentos')
    const supabase = await createClient()
    const { data: equipment, error: equipmentError } = await supabase
      .from('equipment_models')
      .select('id, manufacturer, model')
      .eq('id', id)
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .single()

    if (equipmentError || !equipment) {
      throw new Error('Equipamento não encontrado.')
    }

    const deletedAt = new Date().toISOString()
    const { error } = await supabase
      .from('equipment_models')
      .update({
        active: false,
        deleted_at: deletedAt,
        deleted_by: user.id,
      })
      .eq('id', id)
      .eq('company_id', companyId)
      .is('deleted_at', null)

    if (error) throw error

    await createAuditLog({
      action: 'soft_delete',
      entityType: 'equipment',
      entityId: equipment.id,
      companyId,
      summary: `Equipamento "${equipment.manufacturer} ${equipment.model}" removido da listagem.`,
      metadata: { deleted_at: deletedAt },
    })

    revalidateEquipments()
    return { success: true }
  } catch (error: unknown) {
    return { error: getActionErrorMessage(error, 'Erro ao excluir equipamento.') }
  }
}
