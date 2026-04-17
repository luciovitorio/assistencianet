'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAuditLog } from '@/lib/audit/audit-log'
import { getAdminContext } from '@/lib/auth/admin-context'
import { getCompanyContext } from '@/lib/auth/company-context'
import { firstRelation } from '@/lib/supabase/relations'
import {
  createLowStockNotificationForTransition,
  getPartAvailabilitySnapshots,
} from '@/lib/stock/low-stock-notifications'
import {
  stockEntradaSchema,
  stockAjusteSchema,
  stockTransferenciaSchema,
  type StockEntradaSchema,
  type StockAjusteSchema,
  type StockTransferenciaSchema,
} from '@/lib/validations/stock'

const revalidateStockPage = () => revalidatePath('/dashboard/estoque')
const revalidatePartsPage = () => revalidatePath('/dashboard/pecas')

const getActionErrorMessage = (error: unknown, fallback: string) => {
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

// ── Helpers ──────────────────────────────────────────────────────────────────

async function verifyBranch(supabase: Awaited<ReturnType<typeof createClient>>, branchId: string, companyId: string) {
  const { data, error } = await supabase
    .from('branches')
    .select('id, name')
    .eq('id', branchId)
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .single()

  if (error || !data) throw new Error('Filial não encontrada.')
  return data
}

async function verifyPart(supabase: Awaited<ReturnType<typeof createClient>>, partId: string, companyId: string) {
  const { data, error } = await supabase
    .from('parts')
    .select('id, name, unit, supplier_id, min_stock')
    .eq('id', partId)
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .single()

  if (error || !data) throw new Error('Peça não encontrada.')
  return data
}

async function verifySupplier(
  supabase: Awaited<ReturnType<typeof createClient>>,
  supplierId: string,
  companyId: string,
) {
  const { data, error } = await supabase
    .from('suppliers')
    .select('id, name')
    .eq('id', supplierId)
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .single()

  if (error || !data) throw new Error('Fornecedor não encontrado.')
  return data
}

// ── createStockEntrada ────────────────────────────────────────────────────────
// Registra o recebimento de peças em uma filial (entrada de estoque).

export async function createStockEntrada(data: StockEntradaSchema) {
  try {
    const { companyId, user } = await getAdminContext('estoque')
    const parsed = stockEntradaSchema.safeParse(data)

    if (!parsed.success) {
      return { error: parsed.error.issues[0].message }
    }

    const supabase = await createClient()
    const [branch, part, supplier] = await Promise.all([
      verifyBranch(supabase, parsed.data.branch_id, companyId),
      verifyPart(supabase, parsed.data.part_id, companyId),
      parsed.data.supplier_id
        ? verifySupplier(supabase, parsed.data.supplier_id, companyId)
        : Promise.resolve(null),
    ])

    const { data: movement, error } = await supabase
      .from('stock_movements')
      .insert({
        company_id: companyId,
        branch_id: parsed.data.branch_id,
        part_id: parsed.data.part_id,
        movement_type: 'entrada',
        quantity: parsed.data.quantity,
        unit_cost: parsed.data.unit_cost ?? null,
        supplier_id: parsed.data.supplier_id || null,
        invoice_date: parsed.data.invoice_date || null,
        entry_date: parsed.data.entry_date,
        notes: parsed.data.notes?.trim() || null,
        reference_type: 'manual',
        created_by: user.id,
      })
      .select('id')
      .single()

    if (error) throw error

    await createAuditLog({
      action: 'create',
      entityType: 'stock_movement',
      entityId: movement.id,
      companyId,
      summary: `Entrada de ${parsed.data.quantity} un. de "${part.name}" na filial "${branch.name}".`,
      metadata: {
        movement_type: 'entrada',
        quantity: parsed.data.quantity,
        unit_cost: parsed.data.unit_cost ?? null,
        part_id: parsed.data.part_id,
        branch_id: parsed.data.branch_id,
        supplier_id: parsed.data.supplier_id || null,
        supplier_name: supplier?.name ?? null,
        invoice_date: parsed.data.invoice_date || null,
        entry_date: parsed.data.entry_date,
        set_as_default_supplier: parsed.data.set_as_default_supplier,
      },
    })

    let warning: string | undefined

    if (
      parsed.data.set_as_default_supplier &&
      supplier &&
      part.supplier_id !== supplier.id
    ) {
      const { error: updatePartError } = await supabase
        .from('parts')
        .update({ supplier_id: supplier.id })
        .eq('id', part.id)
        .eq('company_id', companyId)
        .is('deleted_at', null)

      if (updatePartError) {
        warning = 'A entrada foi registrada, mas não foi possível atualizar o fornecedor padrão da peça.'
      } else {
        await createAuditLog({
          action: 'update',
          entityType: 'part',
          entityId: part.id,
          companyId,
          summary: `Fornecedor padrão da peça "${part.name}" atualizado para "${supplier.name}".`,
          metadata: {
            previous_supplier_id: part.supplier_id,
            new_supplier_id: supplier.id,
            new_supplier_name: supplier.name,
            source: 'stock_entry',
            stock_movement_id: movement.id,
          },
        })

        revalidatePartsPage()
      }
    }

    revalidateStockPage()
    return { success: true, warning }
  } catch (error: unknown) {
    return { error: getActionErrorMessage(error, 'Erro ao registrar entrada de estoque.') }
  }
}

// ── createStockAjuste ─────────────────────────────────────────────────────────
// Ajusta o saldo de estoque de uma peça para a quantidade real contada.
// Armazena o delta (new_quantity − current_stock) como movimentação assinada.

export async function createStockAjuste(data: StockAjusteSchema) {
  try {
    const { companyId, user } = await getAdminContext('estoque')
    const parsed = stockAjusteSchema.safeParse(data)
    const entryDate = new Date().toISOString().slice(0, 10)

    if (!parsed.success) {
      return { error: parsed.error.issues[0].message }
    }

    const delta = parsed.data.new_quantity - parsed.data.current_stock

    if (delta === 0) {
      return { error: 'A nova quantidade é igual ao estoque atual. Nenhuma alteração necessária.' }
    }

    const supabase = await createClient()
    const [branch, part] = await Promise.all([
      verifyBranch(supabase, parsed.data.branch_id, companyId),
      verifyPart(supabase, parsed.data.part_id, companyId),
    ])
    const partSnapshots = await getPartAvailabilitySnapshots(
      supabase,
      companyId,
      parsed.data.branch_id,
      [parsed.data.part_id],
    )
    const stockSnapshot = partSnapshots.get(parsed.data.part_id)
    const reservedStock = stockSnapshot?.reservedStock ?? 0
    const previousAvailableStock = stockSnapshot?.availableStock ?? parsed.data.current_stock
    const currentAvailableStock = parsed.data.new_quantity - reservedStock

    const { data: movement, error } = await supabase
      .from('stock_movements')
      .insert({
        company_id: companyId,
        branch_id: parsed.data.branch_id,
        part_id: parsed.data.part_id,
        movement_type: 'ajuste',
        quantity: delta,
        entry_date: entryDate,
        notes: parsed.data.notes?.trim() || null,
        reference_type: 'manual',
        created_by: user.id,
      })
      .select('id')
      .single()

    if (error) throw error

    await createAuditLog({
      action: 'update',
      entityType: 'stock_movement',
      entityId: movement.id,
      companyId,
      summary: `Ajuste de estoque de "${part.name}" na filial "${branch.name}": ${parsed.data.current_stock} → ${parsed.data.new_quantity} (delta: ${delta > 0 ? '+' : ''}${delta}).`,
      metadata: {
        movement_type: 'ajuste',
        delta,
        previous_stock: parsed.data.current_stock,
        new_stock: parsed.data.new_quantity,
        entry_date: entryDate,
        part_id: parsed.data.part_id,
        branch_id: parsed.data.branch_id,
      },
    })

    await createLowStockNotificationForTransition({
      supabase,
      companyId,
      branchId: parsed.data.branch_id,
      branchName: branch.name,
      partId: part.id,
      partName: part.name,
      minStock: part.min_stock,
      previousAvailableStock,
      currentAvailableStock,
    })

    revalidateStockPage()
    return { success: true }
  } catch (error: unknown) {
    return { error: getActionErrorMessage(error, 'Erro ao ajustar estoque.') }
  }
}

// ── createStockTransferencia ──────────────────────────────────────────────────
// Transfere um lote de peças de uma filial para outra em uma única transação.
// Insere transferencia_saida (negativo) na origem e transferencia_entrada
// (positivo) no destino via RPC atômica. Bloqueia se o saldo disponível
// (físico − reservado) for insuficiente na filial de origem.

export async function createStockTransferencia(data: StockTransferenciaSchema) {
  try {
    const { companyId, user } = await getAdminContext('estoque')
    const parsed = stockTransferenciaSchema.safeParse(data)

    if (!parsed.success) {
      return { error: parsed.error.issues[0].message }
    }

    const supabase = await createClient()
    const [fromBranch, toBranch, part] = await Promise.all([
      verifyBranch(supabase, parsed.data.from_branch_id, companyId),
      verifyBranch(supabase, parsed.data.to_branch_id, companyId),
      verifyPart(supabase, parsed.data.part_id, companyId),
    ])

    // Verifica se o saldo disponível (físico − reservado) é suficiente
    const snapshots = await getPartAvailabilitySnapshots(
      supabase,
      companyId,
      parsed.data.from_branch_id,
      [parsed.data.part_id],
    )
    const snapshot = snapshots.get(parsed.data.part_id)
    const previousAvailableStock = snapshot?.availableStock ?? 0

    if (parsed.data.quantity > previousAvailableStock) {
      return {
        error: `Saldo disponível insuficiente na filial de origem. Disponível: ${previousAvailableStock} ${part.unit}.`,
      }
    }

    const entryDate = new Date().toISOString().slice(0, 10)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: rpcResult, error } = await (supabase as any).rpc('create_stock_transfer', {
      p_company_id: companyId,
      p_from_branch_id: parsed.data.from_branch_id,
      p_to_branch_id: parsed.data.to_branch_id,
      p_part_id: parsed.data.part_id,
      p_quantity: parsed.data.quantity,
      p_notes: parsed.data.notes?.trim() || null,
      p_entry_date: entryDate,
      p_created_by: user.id,
    })

    if (error) throw error

    const { saida_id } = (rpcResult as { saida_id: string; entrada_id: string }[])[0]

    await createAuditLog({
      action: 'create',
      entityType: 'stock_movement',
      entityId: saida_id,
      companyId,
      summary: `Transferência de ${parsed.data.quantity} un. de "${part.name}": "${fromBranch.name}" → "${toBranch.name}".`,
      metadata: {
        movement_type: 'transferencia',
        quantity: parsed.data.quantity,
        part_id: parsed.data.part_id,
        from_branch_id: parsed.data.from_branch_id,
        from_branch_name: fromBranch.name,
        to_branch_id: parsed.data.to_branch_id,
        to_branch_name: toBranch.name,
      },
    })

    await createLowStockNotificationForTransition({
      supabase,
      companyId,
      branchId: parsed.data.from_branch_id,
      branchName: fromBranch.name,
      partId: part.id,
      partName: part.name,
      minStock: part.min_stock,
      previousAvailableStock,
      currentAvailableStock: previousAvailableStock - parsed.data.quantity,
    })

    revalidateStockPage()
    return { success: true }
  } catch (error: unknown) {
    return { error: getActionErrorMessage(error, 'Erro ao realizar transferência de estoque.') }
  }
}

// ── getPartMovements ──────────────────────────────────────────────────────────
// Retorna o histórico de movimentações de uma peça (todos da empresa ou por filial).
// Acessível a todos os membros da empresa.

export type PartMovement = {
  id: string
  movement_type: string
  quantity: number
  unit_cost: number | null
  supplier_id: string | null
  invoice_date: string | null
  entry_date: string | null
  notes: string | null
  reference_type: string | null
  created_at: string
  branch_id: string
  profiles: { name: string } | null
  suppliers: { name: string } | null
}

type RelationValue<T> = T | T[] | null

type PartMovementQueryRow = Omit<PartMovement, 'profiles' | 'suppliers'> & {
  profiles: RelationValue<{ name: string }>
  suppliers: RelationValue<{ name: string }>
}

const normalizePartMovement = (row: PartMovementQueryRow): PartMovement => ({
  ...row,
  profiles: firstRelation(row.profiles),
  suppliers: firstRelation(row.suppliers),
})

export async function getPartMovements(
  partId: string,
  branchId?: string,
): Promise<{ data: PartMovement[] | null; error?: string }> {
  try {
    const { companyId } = await getCompanyContext()
    const supabase = await createClient()

    let query = supabase
      .from('stock_movements')
      .select('id, movement_type, quantity, unit_cost, supplier_id, invoice_date, entry_date, notes, reference_type, created_at, branch_id, profiles!created_by(name), suppliers(name)')
      .eq('company_id', companyId)
      .eq('part_id', partId)
      .order('created_at', { ascending: false })
      .limit(200)

    if (branchId) {
      query = query.eq('branch_id', branchId)
    }

    const { data, error } = await query

    if (error) throw error

    return { data: ((data ?? []) as PartMovementQueryRow[]).map(normalizePartMovement) }
  } catch (error: unknown) {
    return { error: getActionErrorMessage(error, 'Erro ao buscar histórico de movimentos.'), data: null }
  }
}
