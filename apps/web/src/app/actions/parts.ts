'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAuditLog } from '@/lib/audit/audit-log'
import { getAdminContext } from '@/lib/auth/admin-context'
import { partSchema, type PartSchema } from '@/lib/validations/part'

const DUPLICATE_PART_SKU_ERROR = 'Já existe uma peça ativa com este SKU.'
const PARTS_ACTIVE_SKU_UNIQUE_INDEX = 'parts_active_sku_unique_idx'

const normalizeOptional = (value: string | null | undefined) => {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

const revalidatePartsPage = () => {
  revalidatePath('/dashboard/pecas')
}

const isDuplicateSkuError = (error: unknown) =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  error.code === '23505' &&
  'message' in error &&
  typeof error.message === 'string' &&
  error.message.includes(PARTS_ACTIVE_SKU_UNIQUE_INDEX)

const getActionErrorMessage = (error: unknown, fallback: string) => {
  if (isDuplicateSkuError(error)) {
    return DUPLICATE_PART_SKU_ERROR
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

export async function createPart(data: PartSchema) {
  try {
    const { companyId } = await getAdminContext('pecas')
    const parsed = partSchema.safeParse(data)

    if (!parsed.success) {
      return { error: parsed.error.issues[0].message }
    }

    const supabase = await createClient()

    const { data: created, error } = await supabase
      .from('parts')
      .insert({
        name: parsed.data.name.trim(),
        sku: normalizeOptional(parsed.data.sku),
        category: parsed.data.category,
        unit: parsed.data.unit,
        supplier_id: parsed.data.supplier_id || null,
        cost_price: parsed.data.cost_price ?? null,
        sale_price: parsed.data.sale_price ?? null,
        min_stock: parsed.data.min_stock,
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
      entityType: 'part',
      entityId: created.id,
      companyId,
      summary: `Peça "${created.name}" cadastrada.`,
      metadata: {
        category: created.category,
        active: created.active,
      },
    })

    revalidatePartsPage()
    return { success: true }
  } catch (error: unknown) {
    return { error: getActionErrorMessage(error, 'Erro ao cadastrar peça') }
  }
}

export async function updatePart(id: string, data: PartSchema) {
  try {
    const { companyId } = await getAdminContext('pecas')
    const parsed = partSchema.safeParse(data)

    if (!parsed.success) {
      return { error: parsed.error.issues[0].message }
    }

    const supabase = await createClient()

    const { data: current, error: currentError } = await supabase
      .from('parts')
      .select('id, name')
      .eq('id', id)
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .single()

    if (currentError || !current) {
      throw new Error('Peça não encontrada.')
    }

    const { error } = await supabase
      .from('parts')
      .update({
        name: parsed.data.name.trim(),
        sku: normalizeOptional(parsed.data.sku),
        category: parsed.data.category,
        unit: parsed.data.unit,
        supplier_id: parsed.data.supplier_id || null,
        cost_price: parsed.data.cost_price ?? null,
        sale_price: parsed.data.sale_price ?? null,
        min_stock: parsed.data.min_stock,
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
      entityType: 'part',
      entityId: id,
      companyId,
      summary: `Peça "${current.name}" atualizada.`,
      metadata: {
        category: parsed.data.category,
        active: parsed.data.active,
      },
    })

    revalidatePartsPage()
    return { success: true }
  } catch (error: unknown) {
    return { error: getActionErrorMessage(error, 'Erro ao atualizar peça') }
  }
}

export async function deletePart(id: string) {
  try {
    const { companyId, user } = await getAdminContext('pecas')
    const supabase = await createClient()

    const { data: part, error: partError } = await supabase
      .from('parts')
      .select('id, name')
      .eq('id', id)
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .single()

    if (partError || !part) {
      throw new Error('Peça não encontrada.')
    }

    const deletedAt = new Date().toISOString()
    const { error } = await supabase
      .from('parts')
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
      entityType: 'part',
      entityId: part.id,
      companyId,
      summary: `Peça "${part.name}" removida da listagem.`,
      metadata: { deleted_at: deletedAt },
    })

    revalidatePartsPage()
    return { success: true }
  } catch (error: unknown) {
    if (error instanceof Error) {
      return { error: error.message }
    }

    return { error: 'Erro ao excluir peça' }
  }
}
