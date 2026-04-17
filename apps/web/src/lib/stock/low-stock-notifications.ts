import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'

type SupabaseServerClient = SupabaseClient<Database>

type StockAlertLevel = 'ok' | 'baixo' | 'zerado'

export interface PartAvailabilitySnapshot {
  partId: string
  partName: string
  minStock: number
  currentStock: number
  reservedStock: number
  availableStock: number
}

export function getStockAlertLevel(availableStock: number, minStock: number): StockAlertLevel {
  if (availableStock <= 0) return 'zerado'
  if (availableStock < minStock) return 'baixo'
  return 'ok'
}

export async function getPartAvailabilitySnapshots(
  supabase: SupabaseServerClient,
  companyId: string,
  branchId: string,
  partIds: string[],
): Promise<Map<string, PartAvailabilitySnapshot>> {
  if (partIds.length === 0) return new Map()

  const uniquePartIds = [...new Set(partIds)]

  const [{ data: parts, error: partsError }, { data: movements, error: movementsError }, { data: reservations, error: reservationsError }] =
    await Promise.all([
      supabase
        .from('parts')
        .select('id, name, min_stock')
        .eq('company_id', companyId)
        .is('deleted_at', null)
        .in('id', uniquePartIds),
      supabase
        .from('stock_movements')
        .select('part_id, quantity')
        .eq('company_id', companyId)
        .eq('branch_id', branchId)
        .in('part_id', uniquePartIds),
      supabase
        .from('stock_reservations')
        .select('part_id, quantity')
        .eq('company_id', companyId)
        .eq('branch_id', branchId)
        .eq('status', 'ativa')
        .in('part_id', uniquePartIds),
    ])

  if (partsError) throw partsError
  if (movementsError) throw movementsError
  if (reservationsError) throw reservationsError

  const currentStockByPart = new Map<string, number>()
  for (const movement of movements ?? []) {
    currentStockByPart.set(
      movement.part_id,
      (currentStockByPart.get(movement.part_id) ?? 0) + movement.quantity,
    )
  }

  const reservedStockByPart = new Map<string, number>()
  for (const reservation of reservations ?? []) {
    reservedStockByPart.set(
      reservation.part_id,
      (reservedStockByPart.get(reservation.part_id) ?? 0) + reservation.quantity,
    )
  }

  const snapshots = new Map<string, PartAvailabilitySnapshot>()
  for (const part of parts ?? []) {
    const currentStock = currentStockByPart.get(part.id) ?? 0
    const reservedStock = reservedStockByPart.get(part.id) ?? 0
    snapshots.set(part.id, {
      partId: part.id,
      partName: part.name,
      minStock: part.min_stock,
      currentStock,
      reservedStock,
      availableStock: currentStock - reservedStock,
    })
  }

  return snapshots
}

export async function createLowStockNotificationForTransition({
  supabase,
  companyId,
  branchId,
  branchName,
  partId,
  partName,
  minStock,
  previousAvailableStock,
  currentAvailableStock,
}: {
  supabase: SupabaseServerClient
  companyId: string
  branchId: string
  branchName: string
  partId: string
  partName: string
  minStock: number
  previousAvailableStock: number
  currentAvailableStock: number
}) {
  const previousLevel = getStockAlertLevel(previousAvailableStock, minStock)
  const currentLevel = getStockAlertLevel(currentAvailableStock, minStock)

  if (currentLevel === 'ok' || previousLevel === currentLevel) {
    return
  }

  const type = currentLevel === 'zerado' ? 'estoque_zerado' : 'estoque_baixo'

  const { data: existingNotification, error: existingNotificationError } = await supabase
    .from('notifications')
    .select('id')
    .eq('company_id', companyId)
    .eq('branch_id', branchId)
    .eq('part_id', partId)
    .eq('type', type)
    .is('read_at', null)
    .limit(1)
    .maybeSingle()

  if (existingNotificationError) throw existingNotificationError

  if (existingNotification) {
    return
  }

  if (currentLevel === 'zerado') {
    await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('company_id', companyId)
      .eq('branch_id', branchId)
      .eq('part_id', partId)
      .eq('type', 'estoque_baixo')
      .is('read_at', null)
  }

  const title =
    currentLevel === 'zerado'
      ? `Estoque zerado em ${branchName}`
      : `Estoque baixo em ${branchName}`

  const body =
    currentLevel === 'zerado'
      ? `"${partName}" ficou sem saldo disponível. Mínimo configurado: ${minStock}.`
      : `"${partName}" entrou em estoque baixo com saldo disponível de ${currentAvailableStock}. Mínimo configurado: ${minStock}.`

  const { error: insertError } = await supabase.from('notifications').insert({
    company_id: companyId,
    type,
    title,
    body,
    part_id: partId,
    branch_id: branchId,
  })

  if (insertError) throw insertError
}
