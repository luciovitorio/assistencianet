import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'
import {
  createLowStockNotificationForTransition,
  getPartAvailabilitySnapshots,
} from '@/lib/stock/low-stock-notifications'

export type ReserveEstimatePartsResult = {
  nextStatus: 'aprovado' | 'aguardando_peca'
  message: string | null
}

/**
 * Tenta reservar as peças do orçamento no estoque da filial.
 * - Se não há peças ou já existem reservas ativas, devolve `aprovado`.
 * - Se falta estoque, devolve `aguardando_peca` com mensagem descritiva.
 * - Caso contrário, cria as reservas e dispara notificações de estoque baixo.
 */
export const reserveEstimatePartsIfAvailable = async (
  supabase: SupabaseClient<Database>,
  companyId: string,
  serviceOrderId: string,
  _serviceOrderNumber: number,
  branchId: string | null,
  estimateId: string,
): Promise<ReserveEstimatePartsResult> => {
  if (!branchId) {
    return { nextStatus: 'aprovado', message: null }
  }

  const { data: activeReservations } = await supabase
    .from('stock_reservations')
    .select('id')
    .eq('estimate_id', estimateId)
    .eq('company_id', companyId)
    .eq('status', 'ativa')

  if (activeReservations && activeReservations.length > 0) {
    return { nextStatus: 'aprovado', message: null }
  }

  const { data: partItems, error: partItemsError } = await supabase
    .from('service_order_estimate_items')
    .select('part_id, quantity')
    .eq('estimate_id', estimateId)
    .eq('company_id', companyId)
    .eq('item_type', 'peca')

  if (partItemsError) throw partItemsError

  const requiredQuantityByPart = new Map<string, number>()
  for (const item of partItems ?? []) {
    if (!item.part_id) continue

    requiredQuantityByPart.set(
      item.part_id,
      (requiredQuantityByPart.get(item.part_id) ?? 0) + Math.ceil(item.quantity),
    )
  }

  if (requiredQuantityByPart.size === 0) {
    return { nextStatus: 'aprovado', message: null }
  }

  const partSnapshots = await getPartAvailabilitySnapshots(
    supabase,
    companyId,
    branchId,
    [...requiredQuantityByPart.keys()],
  )

  const stockIssues: string[] = []
  for (const [partId, requestedQuantity] of requiredQuantityByPart.entries()) {
    const snapshot = partSnapshots.get(partId)
    const availableStock = snapshot?.availableStock ?? 0

    if (availableStock < requestedQuantity) {
      stockIssues.push(
        `${snapshot?.partName ?? 'Peça'}: disponível ${availableStock}, necessário ${requestedQuantity}`,
      )
    }
  }

  if (stockIssues.length > 0) {
    return {
      nextStatus: 'aguardando_peca',
      message: `Cliente aprovou, mas faltam peças para seguir: ${stockIssues.join('; ')}.`,
    }
  }

  const reservationItems = [...requiredQuantityByPart.entries()].map(([partId, quantity]) => ({
    company_id: companyId,
    branch_id: branchId,
    part_id: partId,
    estimate_id: estimateId,
    service_order_id: serviceOrderId,
    quantity,
  }))

  const { error: reservationError } = await supabase
    .from('stock_reservations')
    .insert(reservationItems)

  if (reservationError) throw reservationError

  const { data: branch } = await supabase
    .from('branches')
    .select('name')
    .eq('id', branchId)
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .maybeSingle()

  await Promise.all(
    [...requiredQuantityByPart.entries()].map(([partId, reservedQuantity]) => {
      const snapshot = partSnapshots.get(partId)

      if (!snapshot) return Promise.resolve()

      return createLowStockNotificationForTransition({
        supabase,
        companyId,
        branchId,
        branchName: branch?.name ?? 'estoque',
        partId,
        partName: snapshot.partName,
        minStock: snapshot.minStock,
        previousAvailableStock: snapshot.availableStock,
        currentAvailableStock: snapshot.availableStock - reservedQuantity,
      })
    }),
  )

  return { nextStatus: 'aprovado', message: null }
}
