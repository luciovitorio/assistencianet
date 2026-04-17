'use server'

import { revalidatePath } from 'next/cache'
import { createClient as createSupabaseClient } from '@/lib/supabase/server'
import { createAuditLog } from '@/lib/audit/audit-log'
import { getAdminContext } from '@/lib/auth/admin-context'
import { buildArchivedUniqueFieldValue } from '@/lib/soft-delete/archive-unique-field'
import { supplierSchema, type SupplierSchema } from '@/lib/validations/supplier'

const DUPLICATE_SUPPLIER_DOCUMENT_ERROR = 'Já existe um fornecedor ativo com este CPF/CNPJ.'
const SUPPLIERS_ACTIVE_DOCUMENT_UNIQUE_INDEX = 'suppliers_active_document_unique_idx'

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
}: Pick<SupplierSchema, 'street' | 'number' | 'complement' | 'city' | 'state' | 'zip_code'>) => {
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

const revalidateSuppliersPage = () => {
  revalidatePath('/dashboard/fornecedores')
}

const isDuplicateSupplierDocumentError = (error: unknown) =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  error.code === '23505' &&
  'message' in error &&
  typeof error.message === 'string' &&
  error.message.includes(SUPPLIERS_ACTIVE_DOCUMENT_UNIQUE_INDEX)

const getActionErrorMessage = (error: unknown, fallback: string) => {
  if (isDuplicateSupplierDocumentError(error)) {
    return DUPLICATE_SUPPLIER_DOCUMENT_ERROR
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

export async function createSupplier(data: SupplierSchema) {
  try {
    const { companyId } = await getAdminContext('fornecedores')
    const parsed = supplierSchema.safeParse(data)

    if (!parsed.success) {
      return { error: parsed.error.issues[0].message }
    }

    const supabase = await createSupabaseClient()

    const { data: createdSupplier, error } = await supabase
      .from('suppliers')
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
        company_id: companyId,
      })
      .select('id, name, origin_branch_id, active')
      .single()

    if (error) {
      throw error
    }

    await createAuditLog({
      action: 'create',
      entityType: 'supplier',
      entityId: createdSupplier.id,
      companyId,
      summary: `Fornecedor "${createdSupplier.name}" cadastrado.`,
      metadata: {
        origin_branch_id: createdSupplier.origin_branch_id,
        active: createdSupplier.active,
      },
    })

    revalidateSuppliersPage()
    return { success: true }
  } catch (error: unknown) {
    return { error: getActionErrorMessage(error, 'Erro ao cadastrar fornecedor') }
  }
}

export async function updateSupplier(id: string, data: SupplierSchema) {
  try {
    const { companyId } = await getAdminContext('fornecedores')
    const parsed = supplierSchema.safeParse(data)

    if (!parsed.success) {
      return { error: parsed.error.issues[0].message }
    }

    const supabase = await createSupabaseClient()
    const { data: currentSupplier, error: currentSupplierError } = await supabase
      .from('suppliers')
      .select('id, name')
      .eq('id', id)
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .single()

    if (currentSupplierError || !currentSupplier) {
      throw new Error('Fornecedor não encontrado.')
    }

    const { error } = await supabase
      .from('suppliers')
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
      })
      .eq('id', id)
      .eq('company_id', companyId)
      .is('deleted_at', null)

    if (error) {
      throw error
    }

    await createAuditLog({
      action: 'update',
      entityType: 'supplier',
      entityId: id,
      companyId,
      summary: `Fornecedor "${currentSupplier.name}" atualizado.`,
      metadata: {
        origin_branch_id: parsed.data.origin_branch_id,
        active: parsed.data.active,
      },
    })

    revalidateSuppliersPage()
    return { success: true }
  } catch (error: unknown) {
    return { error: getActionErrorMessage(error, 'Erro ao atualizar fornecedor') }
  }
}

export async function deleteSupplier(id: string) {
  try {
    const { companyId, user } = await getAdminContext('fornecedores')
    const supabase = await createSupabaseClient()

    const { data: supplier, error: supplierError } = await supabase
      .from('suppliers')
      .select('id, name, document')
      .eq('id', id)
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .single()

    if (supplierError || !supplier) {
      throw new Error('Fornecedor não encontrado.')
    }

    const deletedAt = new Date().toISOString()
    const archivedDocument = buildArchivedUniqueFieldValue(supplier.document, supplier.id, deletedAt)
    const { error } = await supabase
      .from('suppliers')
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
      entityType: 'supplier',
      entityId: supplier.id,
      companyId,
      summary: `Fornecedor "${supplier.name}" removido da listagem.`,
      metadata: {
        deleted_at: deletedAt,
        original_document: supplier.document,
      },
    })

    revalidateSuppliersPage()
    return { success: true }
  } catch (error: unknown) {
    if (error instanceof Error) {
      return { error: error.message }
    }

    return { error: 'Erro ao excluir fornecedor' }
  }
}
