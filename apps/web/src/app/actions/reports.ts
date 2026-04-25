'use server'

import { createClient } from '@/lib/supabase/server'
import { getAdminContext } from '@/lib/auth/admin-context'

export type ReportBranchOption = {
  id: string
  name: string
}

export type ReportRankRow = {
  id: string
  label: string
  detail?: string
  value: number
  amount?: number
}

export type BranchComparisonRow = {
  branch_id: string
  branch_name: string
  revenue: number
  expenses: number
  open_receivables: number
  service_orders: number
  net_result: number
}

export type BusinessReportsData = {
  branches: ReportBranchOption[]
  serviceOrders: {
    opened: number
    completed: number
    averageExecutionDays: number | null
    refusalRate: number
    byTechnician: ReportRankRow[]
    byDeviceType: ReportRankRow[]
  }
  financial: {
    revenue: number
    averageTicket: number
    serviceGrossProfit: number
    partsGrossProfit: number
    partsCost: number
    openReceivables: number
    netMargin: number | null
    expensesByCategory: ReportRankRow[]
    branchComparison: BranchComparisonRow[]
  }
  stock: {
    lowOrZeroItems: number
    zeroItems: number
    inventoryValue: number
    stagnantItems: number
    partsCostByServiceOrder: number
    criticalByBranch: ReportRankRow[]
    mostUsedParts: ReportRankRow[]
    stagnantParts: ReportRankRow[]
  }
}

type ReportsFilters = {
  startDate: string
  endDate: string
  branchId?: string
}

type ServiceOrderRow = {
  id: string
  status: string
  technician_id: string | null
  device_type: string
  device_brand: string | null
  device_model: string | null
  created_at: string
  completed_at: string | null
  branch_id: string | null
  equipment_models: { voltage: string | null } | null
}

type EstimateRow = {
  id: string
  service_order_id: string
  status: string
  approved_at: string | null
  rejected_at: string | null
  total_amount: number
}

type EstimateItemRow = {
  estimate_id: string
  service_order_id: string
  item_type: string
  line_total: number
  part_id: string | null
  quantity: number
}

type PartRow = {
  id: string
  name: string
  min_stock: number
  cost_price: number | null
  active: boolean
  deleted_at: string | null
}

type StockMovementRow = {
  part_id: string
  branch_id: string
  movement_type: string
  quantity: number
  unit_cost: number | null
  entry_date: string
  reference_type: string | null
  reference_id: string | null
}

type ReservationRow = {
  part_id: string
  branch_id: string
  quantity: number
}

type CashEntryRow = {
  id: string
  branch_id: string | null
  estimate_id: string | null
  service_order_id: string
  net_amount: number
  created_at: string
}

type BillRow = {
  branch_id: string
  category: string
  amount: number
  due_date: string
  status: string
  paid_at: string | null
}

const END_OF_DAY = 'T23:59:59.999Z'
const STAGNANT_DAYS = 90

const CATEGORY_LABELS: Record<string, string> = {
  aluguel: 'Aluguel',
  energia: 'Energia',
  agua: 'Água',
  internet: 'Internet',
  telefone: 'Telefone',
  fornecedor: 'Fornecedor',
  imposto: 'Imposto',
  folha: 'Folha',
  manutencao: 'Manutenção',
  marketing: 'Marketing',
  outro: 'Outro',
}

const roundMoney = (value: number) => Math.round(value * 100) / 100

const getActionErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error) return error.message
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as { message: unknown }).message)
  }
  return fallback
}

const isWithinDate = (date: string | null, startDate: string, endDate: string) => {
  if (!date) return false
  const day = date.slice(0, 10)
  return day >= startDate && day <= endDate
}

const incrementCount = (map: Map<string, number>, key: string, quantity = 1) => {
  map.set(key, (map.get(key) ?? 0) + quantity)
}

const stockPositionKey = (partId: string, branchId: string) => `${partId}:${branchId}`

const topCountRows = (
  counts: Map<string, number>,
  labels: Map<string, string>,
  fallbackLabel: string,
  limit = 6,
  details?: Map<string, string>,
): ReportRankRow[] =>
  [...counts.entries()]
    .map(([id, value]) => ({
      id,
      label: labels.get(id) ?? fallbackLabel,
      detail: details?.get(id),
      value,
    }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, 'pt-BR'))
    .slice(0, limit)

const toBranchId = (branchId?: string) => {
  if (!branchId || branchId === 'all') return undefined
  return branchId
}

const getMovementCost = (movement: StockMovementRow, partById: Map<string, PartRow>) => {
  const quantity = Math.abs(Number(movement.quantity))
  const unitCost = Number(movement.unit_cost ?? partById.get(movement.part_id)?.cost_price ?? 0)
  return quantity * unitCost
}

const buildServiceOrderPartsCostMap = (
  movements: StockMovementRow[],
  partById: Map<string, PartRow>,
  serviceOrderIds?: Set<string>,
) => {
  const costByServiceOrder = new Map<string, number>()

  for (const movement of movements) {
    if (
      movement.reference_type !== 'service_order' ||
      movement.movement_type !== 'saida' ||
      !movement.reference_id ||
      (serviceOrderIds && !serviceOrderIds.has(movement.reference_id))
    ) {
      continue
    }

    incrementCount(costByServiceOrder, movement.reference_id, getMovementCost(movement, partById))
  }

  return costByServiceOrder
}

export async function getBusinessReports(
  filters: ReportsFilters,
): Promise<{ data: BusinessReportsData | null; error?: string }> {
  try {
    const branchId = toBranchId(filters.branchId)
    const { companyId } = await getAdminContext('financeiro')
    const supabase = await createClient()

    const { data: branchesData, error: branchesError } = await supabase
      .from('branches')
      .select('id, name')
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .order('name', { ascending: true })

    if (branchesError) throw branchesError

    const branches = (branchesData ?? []) as ReportBranchOption[]

    const [
      serviceOrders,
      completedOrders,
      estimates,
      cashEntries,
      parts,
      stockMovements,
      reservations,
      bills,
      employees,
    ] = await Promise.all([
      fetchOpenedServiceOrders(supabase, companyId, filters.startDate, filters.endDate, branchId),
      fetchCompletedServiceOrders(supabase, companyId, filters.startDate, filters.endDate, branchId),
      fetchEstimates(supabase, companyId),
      fetchCashEntries(supabase, companyId, filters.startDate, filters.endDate, branchId),
      fetchParts(supabase, companyId),
      fetchStockMovements(supabase, companyId, branchId),
      fetchReservations(supabase, companyId, branchId),
      fetchBills(supabase, companyId, filters.startDate, filters.endDate, branchId),
      fetchTechnicians(supabase, companyId),
    ])

    const serviceOrderBranch = new Map<string, string | null>()
    for (const os of [...serviceOrders, ...completedOrders]) {
      serviceOrderBranch.set(os.id, os.branch_id)
    }

    const technicianLabels = new Map(employees.map((employee) => [employee.id, employee.name]))
    const serviceOrdersMetrics = buildServiceOrderMetrics({
      serviceOrders,
      completedOrders,
      estimates,
      serviceOrderBranch,
      technicianLabels,
      startDate: filters.startDate,
      endDate: filters.endDate,
      branchId,
    })

    const partById = new Map(parts.map((part) => [part.id, part]))
    const stockMetricParts = parts.filter((part) => part.active && !part.deleted_at)
    const estimateIds = cashEntries
      .map((entry) => entry.estimate_id)
      .filter((id): id is string => Boolean(id))
    const estimateItems = await fetchEstimateItems(supabase, companyId, estimateIds)
    const paidServiceOrderIds = new Set(cashEntries.map((entry) => entry.service_order_id))
    const openReceivables = await fetchOpenReceivables(
      supabase,
      companyId,
      branchId,
    )

    const stockMetrics = buildStockMetrics({
      parts: stockMetricParts,
      partById,
      branches,
      movements: stockMovements,
      reservations,
      startDate: filters.startDate,
      endDate: filters.endDate,
      branchId,
    })
    const paidOrderPartsCostByServiceOrder = buildServiceOrderPartsCostMap(
      stockMovements,
      partById,
      paidServiceOrderIds,
    )

    const financialMetrics = buildFinancialMetrics({
      cashEntries,
      estimateItems,
      partById,
      bills,
      openReceivables,
      serviceOrders,
      branches,
      paidOrderPartsCostByServiceOrder,
    })

    return {
      data: {
        branches,
        serviceOrders: serviceOrdersMetrics,
        financial: financialMetrics,
        stock: stockMetrics,
      },
    }
  } catch (error) {
    return {
      data: null,
      error: getActionErrorMessage(error, 'Erro ao calcular relatórios.'),
    }
  }
}

async function fetchOpenedServiceOrders(
  supabase: Awaited<ReturnType<typeof createClient>>,
  companyId: string,
  startDate: string,
  endDate: string,
  branchId?: string,
) {
  let query = supabase
    .from('service_orders')
    .select('id, status, technician_id, device_type, device_brand, device_model, created_at, completed_at, branch_id, equipment_models(voltage)')
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .gte('created_at', startDate)
    .lte('created_at', endDate + END_OF_DAY)
    .order('created_at', { ascending: false })
    .limit(2000)

  if (branchId) query = query.eq('branch_id', branchId)

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as ServiceOrderRow[]
}

async function fetchCompletedServiceOrders(
  supabase: Awaited<ReturnType<typeof createClient>>,
  companyId: string,
  startDate: string,
  endDate: string,
  branchId?: string,
) {
  let query = supabase
    .from('service_orders')
    .select('id, status, technician_id, device_type, device_brand, device_model, created_at, completed_at, branch_id, equipment_models(voltage)')
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .not('completed_at', 'is', null)
    .gte('completed_at', startDate)
    .lte('completed_at', endDate + END_OF_DAY)
    .order('completed_at', { ascending: false })
    .limit(2000)

  if (branchId) query = query.eq('branch_id', branchId)

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as ServiceOrderRow[]
}

async function fetchEstimates(
  supabase: Awaited<ReturnType<typeof createClient>>,
  companyId: string,
) {
  const { data, error } = await supabase
    .from('service_order_estimates')
    .select('id, service_order_id, status, approved_at, rejected_at, total_amount')
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .in('status', ['aprovado', 'recusado'])
    .limit(3000)

  if (error) throw error
  return (data ?? []) as EstimateRow[]
}

async function fetchCashEntries(
  supabase: Awaited<ReturnType<typeof createClient>>,
  companyId: string,
  startDate: string,
  endDate: string,
  branchId?: string,
) {
  let query = supabase
    .from('cash_entries')
    .select('id, branch_id, estimate_id, service_order_id, net_amount, created_at')
    .eq('company_id', companyId)
    .gte('created_at', startDate)
    .lte('created_at', endDate + END_OF_DAY)
    .order('created_at', { ascending: false })
    .limit(2000)

  if (branchId) query = query.eq('branch_id', branchId)

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as CashEntryRow[]
}

async function fetchEstimateItems(
  supabase: Awaited<ReturnType<typeof createClient>>,
  companyId: string,
  estimateIds: string[],
) {
  const uniqueIds = [...new Set(estimateIds)]
  if (uniqueIds.length === 0) return []

  const { data, error } = await supabase
    .from('service_order_estimate_items')
    .select('estimate_id, service_order_id, item_type, line_total, part_id, quantity')
    .eq('company_id', companyId)
    .in('estimate_id', uniqueIds)
    .limit(3000)

  if (error) throw error
  return (data ?? []) as EstimateItemRow[]
}

async function fetchParts(
  supabase: Awaited<ReturnType<typeof createClient>>,
  companyId: string,
) {
  const { data, error } = await supabase
    .from('parts')
    .select('id, name, min_stock, cost_price, active, deleted_at')
    .eq('company_id', companyId)
    .limit(2000)

  if (error) throw error
  return (data ?? []) as PartRow[]
}

async function fetchStockMovements(
  supabase: Awaited<ReturnType<typeof createClient>>,
  companyId: string,
  branchId?: string,
) {
  let query = supabase
    .from('stock_movements')
    .select('part_id, branch_id, movement_type, quantity, unit_cost, entry_date, reference_type, reference_id')
    .eq('company_id', companyId)
    .limit(5000)

  if (branchId) query = query.eq('branch_id', branchId)

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as StockMovementRow[]
}

async function fetchReservations(
  supabase: Awaited<ReturnType<typeof createClient>>,
  companyId: string,
  branchId?: string,
) {
  let query = supabase
    .from('stock_reservations')
    .select('part_id, branch_id, quantity')
    .eq('company_id', companyId)
    .eq('status', 'ativa')
    .limit(5000)

  if (branchId) query = query.eq('branch_id', branchId)

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as ReservationRow[]
}

async function fetchBills(
  supabase: Awaited<ReturnType<typeof createClient>>,
  companyId: string,
  startDate: string,
  endDate: string,
  branchId?: string,
) {
  let query = supabase
    .from('bills')
    .select('branch_id, category, amount, due_date, status, paid_at')
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .eq('status', 'pago')
    .not('paid_at', 'is', null)
    .gte('paid_at', startDate)
    .lte('paid_at', endDate + END_OF_DAY)
    .order('paid_at', { ascending: true })

  if (branchId) query = query.eq('branch_id', branchId)

  const { data, error } = await query.limit(2000)
  if (error) throw error
  return (data ?? []) as BillRow[]
}

async function fetchTechnicians(
  supabase: Awaited<ReturnType<typeof createClient>>,
  companyId: string,
) {
  const { data, error } = await supabase
    .from('employees')
    .select('id, name')
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .or('role.eq.tecnico,is_owner.eq.true')
    .order('name', { ascending: true })

  if (error) throw error
  return data ?? []
}

async function fetchOpenReceivables(
  supabase: Awaited<ReturnType<typeof createClient>>,
  companyId: string,
  branchId?: string,
) {
  let query = supabase
    .from('service_orders')
    .select('id, status, payment_status, service_order_estimates(status, total_amount)')
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .in('status', ['pronto', 'finalizado'])
    .limit(2000)

  if (branchId) query = query.eq('branch_id', branchId)

  const { data, error } = await query
  if (error) throw error

  return (data ?? []).reduce((total, os) => {
    const isOpen = os.status === 'pronto' || (os.status === 'finalizado' && os.payment_status === 'pendente')
    if (!isOpen) return total
    const estimates = (os.service_order_estimates ?? []) as { status: string; total_amount: number }[]
    const approved = estimates.find((estimate) => estimate.status === 'aprovado')
    return total + Number(approved?.total_amount ?? 0)
  }, 0)
}

function buildServiceOrderMetrics({
  serviceOrders,
  completedOrders,
  estimates,
  serviceOrderBranch,
  technicianLabels,
  startDate,
  endDate,
  branchId,
}: {
  serviceOrders: ServiceOrderRow[]
  completedOrders: ServiceOrderRow[]
  estimates: EstimateRow[]
  serviceOrderBranch: Map<string, string | null>
  technicianLabels: Map<string, string>
  startDate: string
  endDate: string
  branchId?: string
}) {
  const byTechnician = new Map<string, number>()
  const byDeviceType = new Map<string, number>()
  const deviceLabels = new Map<string, string>()
  const deviceDetails = new Map<string, string>()

  for (const order of serviceOrders) {
    incrementCount(byTechnician, order.technician_id ?? 'sem-tecnico')

    const typePart = order.device_type.trim().toLocaleLowerCase('pt-BR')
    const brandPart = order.device_brand?.trim().toLocaleLowerCase('pt-BR') ?? ''
    const modelPart = order.device_model?.trim().toLocaleLowerCase('pt-BR') ?? ''
    const voltagePart = order.equipment_models?.voltage?.trim().toLocaleLowerCase('pt-BR') ?? ''
    const deviceKey = [typePart, brandPart, modelPart, voltagePart].join('|')

    incrementCount(byDeviceType, deviceKey)
    deviceLabels.set(deviceKey, order.device_type)

    const detail = [order.device_brand, order.device_model, order.equipment_models?.voltage]
      .filter(Boolean)
      .join(' • ')
    if (detail) deviceDetails.set(deviceKey, detail)
  }

  const completedWithDuration = completedOrders.filter((order) => order.completed_at)
  const totalDurationDays = completedWithDuration.reduce((total, order) => {
    const startedAt = new Date(order.created_at).getTime()
    const completedAt = new Date(order.completed_at!).getTime()
    return total + Math.max(0, (completedAt - startedAt) / (1000 * 60 * 60 * 24))
  }, 0)

  const consideredEstimates = estimates.filter((estimate) => {
    const eventDate = estimate.status === 'recusado' ? estimate.rejected_at : estimate.approved_at
    const matchesPeriod = isWithinDate(eventDate, startDate, endDate)
    const matchesBranch = !branchId || serviceOrderBranch.get(estimate.service_order_id) === branchId
    return matchesPeriod && matchesBranch
  })
  const refused = consideredEstimates.filter((estimate) => estimate.status === 'recusado').length
  const refusalRate = consideredEstimates.length > 0 ? (refused / consideredEstimates.length) * 100 : 0

  technicianLabels.set('sem-tecnico', 'Sem técnico')

  return {
    opened: serviceOrders.length,
    completed: completedOrders.length,
    averageExecutionDays:
      completedWithDuration.length > 0
        ? Math.round((totalDurationDays / completedWithDuration.length) * 10) / 10
        : null,
    refusalRate: Math.round(refusalRate * 10) / 10,
    byTechnician: topCountRows(byTechnician, technicianLabels, 'Sem técnico'),
    byDeviceType: topCountRows(byDeviceType, deviceLabels, 'Sem tipo', 6, deviceDetails),
  }
}

function buildFinancialMetrics({
  cashEntries,
  estimateItems,
  partById,
  bills,
  openReceivables,
  serviceOrders,
  branches,
  paidOrderPartsCostByServiceOrder,
}: {
  cashEntries: CashEntryRow[]
  estimateItems: EstimateItemRow[]
  partById: Map<string, PartRow>
  bills: BillRow[]
  openReceivables: number
  serviceOrders: ServiceOrderRow[]
  branches: ReportBranchOption[]
  paidOrderPartsCostByServiceOrder: Map<string, number>
}) {
  const revenue = cashEntries.reduce((total, entry) => total + Number(entry.net_amount), 0)
  const paidOrderCount = new Set(cashEntries.map((entry) => entry.service_order_id)).size
  const expenses = bills.reduce((total, bill) => total + Number(bill.amount), 0)
  const expensesByCategory = new Map<string, number>()
  const revenueByBranch = new Map<string, number>()
  const expensesByBranch = new Map<string, number>()
  const ordersByBranch = new Map<string, number>()

  for (const entry of cashEntries) {
    if (entry.branch_id) {
      incrementCount(revenueByBranch, entry.branch_id, Number(entry.net_amount))
    }
  }

  for (const bill of bills) {
    const amount = Number(bill.amount)
    incrementCount(expensesByCategory, bill.category, amount)
    incrementCount(expensesByBranch, bill.branch_id, amount)
  }

  for (const order of serviceOrders) {
    if (order.branch_id) incrementCount(ordersByBranch, order.branch_id)
  }

  let serviceGrossProfit = 0
  const partRevenueByServiceOrder = new Map<string, number>()
  const estimatedPartCostByServiceOrder = new Map<string, number>()

  for (const item of estimateItems) {
    const lineTotal = Number(item.line_total)
    if (item.item_type !== 'peca') {
      serviceGrossProfit += lineTotal
      continue
    }

    const unitCost = item.part_id ? Number(partById.get(item.part_id)?.cost_price ?? 0) : 0
    const itemCost = unitCost * Number(item.quantity)
    incrementCount(partRevenueByServiceOrder, item.service_order_id, lineTotal)
    incrementCount(estimatedPartCostByServiceOrder, item.service_order_id, itemCost)
  }

  let partsGrossProfit = 0
  let partsCost = 0
  for (const [serviceOrderId, partRevenue] of partRevenueByServiceOrder.entries()) {
    const partCost = paidOrderPartsCostByServiceOrder.has(serviceOrderId)
      ? (paidOrderPartsCostByServiceOrder.get(serviceOrderId) ?? 0)
      : (estimatedPartCostByServiceOrder.get(serviceOrderId) ?? 0)

    partsCost += partCost
    partsGrossProfit += partRevenue - partCost
  }

  const branchComparison = branches.map((branch) => {
    const branchRevenue = revenueByBranch.get(branch.id) ?? 0
    const branchExpenses = expensesByBranch.get(branch.id) ?? 0
    return {
      branch_id: branch.id,
      branch_name: branch.name,
      revenue: roundMoney(branchRevenue),
      expenses: roundMoney(branchExpenses),
      open_receivables: 0,
      service_orders: ordersByBranch.get(branch.id) ?? 0,
      net_result: roundMoney(branchRevenue - branchExpenses),
    }
  })

  return {
    revenue: roundMoney(revenue),
    averageTicket: paidOrderCount > 0 ? roundMoney(revenue / paidOrderCount) : 0,
    serviceGrossProfit: roundMoney(serviceGrossProfit),
    partsGrossProfit: roundMoney(partsGrossProfit),
    partsCost: roundMoney(partsCost),
    openReceivables: roundMoney(openReceivables),
    netMargin: revenue > 0 ? Math.round(((revenue - expenses) / revenue) * 1000) / 10 : null,
    expensesByCategory: [...expensesByCategory.entries()]
      .map(([category, amount]) => ({
        id: category,
        label: CATEGORY_LABELS[category] ?? category,
        value: 0,
        amount: roundMoney(amount),
      }))
      .sort((a, b) => (b.amount ?? 0) - (a.amount ?? 0)),
    branchComparison: branchComparison
      .filter((branch) => branch.revenue > 0 || branch.expenses > 0 || branch.service_orders > 0)
      .sort((a, b) => b.revenue - a.revenue || a.branch_name.localeCompare(b.branch_name, 'pt-BR')),
  }
}

function buildStockMetrics({
  parts,
  partById,
  branches,
  movements,
  reservations,
  startDate,
  endDate,
  branchId,
}: {
  parts: PartRow[]
  partById: Map<string, PartRow>
  branches: ReportBranchOption[]
  movements: StockMovementRow[]
  reservations: ReservationRow[]
  startDate: string
  endDate: string
  branchId?: string
}) {
  const currentByPart = new Map<string, number>()
  const currentByPosition = new Map<string, number>()
  const reservedByPart = new Map<string, number>()
  const reservedByPosition = new Map<string, number>()
  const lastMovementByPart = new Map<string, string>()
  const usedByPart = new Map<string, number>()
  const costByPart = new Map<string, number>()
  const partLabels = new Map(parts.map((part) => [part.id, part.name]))
  const branchLabels = new Map(branches.map((branch) => [branch.id, branch.name]))

  let partsCostByServiceOrder = 0

  for (const movement of movements) {
    const quantityChange = Number(movement.quantity)
    incrementCount(currentByPart, movement.part_id, quantityChange)
    incrementCount(currentByPosition, stockPositionKey(movement.part_id, movement.branch_id), quantityChange)
    const lastDate = lastMovementByPart.get(movement.part_id)
    if (!lastDate || movement.entry_date > lastDate) {
      lastMovementByPart.set(movement.part_id, movement.entry_date)
    }

    const isPeriodMovement = movement.entry_date >= startDate && movement.entry_date <= endDate
    const isServiceOrderExit =
      isPeriodMovement &&
      movement.reference_type === 'service_order' &&
      Number(movement.quantity) < 0

    if (!isServiceOrderExit) continue

    const quantity = Math.abs(Number(movement.quantity))
    const totalCost = getMovementCost(movement, partById)

    incrementCount(usedByPart, movement.part_id, quantity)
    incrementCount(costByPart, movement.part_id, totalCost)
    partsCostByServiceOrder += totalCost
  }

  for (const reservation of reservations) {
    const reservedQuantity = Number(reservation.quantity)
    incrementCount(reservedByPart, reservation.part_id, reservedQuantity)
    incrementCount(reservedByPosition, stockPositionKey(reservation.part_id, reservation.branch_id), reservedQuantity)
  }

  let lowOrZeroItems = 0
  let zeroItems = 0
  let inventoryValue = 0
  const criticalByBranch = new Map<string, { lowOrZero: number; zero: number }>()

  const scopedBranches = branchId
    ? branches.filter((branch) => branch.id === branchId)
    : branches

  for (const branch of scopedBranches) {
    for (const part of parts) {
      const position = stockPositionKey(part.id, branch.id)
      const currentStock = currentByPosition.get(position) ?? 0
      const availableStock = currentStock - (reservedByPosition.get(position) ?? 0)

      if (availableStock <= 0) {
        zeroItems++
        lowOrZeroItems++
        const current = criticalByBranch.get(branch.id) ?? { lowOrZero: 0, zero: 0 }
        criticalByBranch.set(branch.id, {
          lowOrZero: current.lowOrZero + 1,
          zero: current.zero + 1,
        })
      } else if (availableStock < part.min_stock) {
        lowOrZeroItems++
        const current = criticalByBranch.get(branch.id) ?? { lowOrZero: 0, zero: 0 }
        criticalByBranch.set(branch.id, {
          lowOrZero: current.lowOrZero + 1,
          zero: current.zero,
        })
      }
    }
  }

  for (const part of parts) {
    const currentStock = currentByPart.get(part.id) ?? 0
    inventoryValue += Math.max(0, currentStock) * Number(part.cost_price ?? 0)
  }

  const staleLimit = new Date()
  staleLimit.setDate(staleLimit.getDate() - STAGNANT_DAYS)
  const staleDate = staleLimit.toISOString().slice(0, 10)

  const stagnantParts = parts
    .map((part) => ({
      id: part.id,
      label: part.name,
      detail: lastMovementByPart.get(part.id)
        ? `Último movimento em ${lastMovementByPart.get(part.id)!.split('-').reverse().join('/')}`
        : 'Sem movimento registrado',
      value: lastMovementByPart.get(part.id) ? 1 : 0,
    }))
    .filter((part) => {
      const lastDate = lastMovementByPart.get(part.id)
      return !lastDate || lastDate < staleDate
    })
    .slice(0, 8)

  return {
    lowOrZeroItems,
    zeroItems,
    inventoryValue: roundMoney(inventoryValue),
    stagnantItems: stagnantParts.length,
    partsCostByServiceOrder: roundMoney(partsCostByServiceOrder),
    criticalByBranch: [...criticalByBranch.entries()]
      .map(([id, totals]) => ({
        id,
        label: branchLabels.get(id) ?? 'Filial',
        detail: `${totals.zero.toLocaleString('pt-BR')} zerado${totals.zero === 1 ? '' : 's'}`,
        value: totals.lowOrZero,
      }))
      .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, 'pt-BR'))
      .slice(0, 8),
    mostUsedParts: [...usedByPart.entries()]
      .map(([partId, quantity]) => ({
        id: partId,
        label: partLabels.get(partId) ?? 'Peça sem cadastro',
        value: quantity,
        amount: roundMoney(costByPart.get(partId) ?? 0),
      }))
      .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, 'pt-BR'))
      .slice(0, 8),
    stagnantParts,
  }
}
