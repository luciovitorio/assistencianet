'use server'

import { getAdminContext } from '@/lib/auth/admin-context'
import { createClient } from '@/lib/supabase/server'

export type DashboardBranchPerformanceRow = {
  branch_id: string
  branch_name: string
  open_orders: number
  delivered_orders: number
  revenue: number
  expenses: number
  net_result: number
}

export type DashboardRecentServiceOrder = {
  id: string
  number: number
  status: string
  client_name: string
  client_phone: string | null
  device: string
  branch_name: string
  created_at: string
}

export type DashboardOverviewData = {
  period: {
    startDate: string
    endDate: string
    label: string
  }
  kpis: {
    openServiceOrders: number
    deliveredServiceOrders: number
    revenue: number
    operationalExpenses: number
    netResult: number
    averageTicket: number
  }
  branchPerformance: DashboardBranchPerformanceRow[]
  recentServiceOrders: DashboardRecentServiceOrder[]
}

type BranchRow = {
  id: string
  name: string
}

type ServiceOrderBranchRow = {
  id: string
  branch_id: string | null
}

type CashEntryRow = {
  id: string
  branch_id: string | null
  service_order_id: string
  net_amount: number
}

type BillRow = {
  id: string
  branch_id: string
  amount: number
}

type RecentServiceOrderRow = {
  id: string
  number: number
  status: string
  device_type: string
  device_brand: string | null
  device_model: string | null
  created_at: string
  clients: { name: string; phone: string | null } | { name: string; phone: string | null }[] | null
  branches: { name: string } | { name: string }[] | null
}

const OPEN_SERVICE_ORDER_STATUSES = [
  'aguardando',
  'em_analise',
  'aguardando_aprovacao',
  'aprovado',
  'reprovado',
  'aguardando_peca',
  'enviado_terceiro',
  'pronto',
]

const END_OF_DAY = 'T23:59:59.999Z'

const formatDateKey = (date: Date) => {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

const formatShortDate = (dateKey: string) => dateKey.split('-').reverse().join('/')

const getCurrentMonthPeriod = () => {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const startDate = formatDateKey(start)
  const endDate = formatDateKey(now)

  return {
    startDate,
    endDate,
    label: `${formatShortDate(startDate)} a ${formatShortDate(endDate)}`,
  }
}

const roundMoney = (value: number) => Math.round(value * 100) / 100

const incrementCount = (map: Map<string, number>, key: string | null | undefined, quantity = 1) => {
  if (!key) return
  map.set(key, (map.get(key) ?? 0) + quantity)
}

const sumMoney = <TRow extends { [key: string]: unknown }>(
  rows: TRow[],
  field: keyof TRow,
) => rows.reduce((total, row) => total + Number(row[field] ?? 0), 0)

const firstRelation = <TRow>(value: TRow | TRow[] | null | undefined) => {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

const getActionErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error) return error.message
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as { message: unknown }).message)
  }
  return fallback
}

export async function getDashboardOverview(): Promise<{
  data: DashboardOverviewData | null
  error?: string
}> {
  try {
    const { companyId } = await getAdminContext('financeiro')
    const supabase = await createClient()
    const period = getCurrentMonthPeriod()
    const periodEnd = period.endDate + END_OF_DAY

    const [
      branchesResult,
      openOrdersResult,
      deliveredOrdersResult,
      cashEntriesResult,
      billsResult,
      recentOrdersResult,
    ] = await Promise.all([
      supabase
        .from('branches')
        .select('id, name')
        .eq('company_id', companyId)
        .is('deleted_at', null)
        .eq('active', true)
        .order('name', { ascending: true }),
      supabase
        .from('service_orders')
        .select('id, branch_id')
        .eq('company_id', companyId)
        .is('deleted_at', null)
        .in('status', OPEN_SERVICE_ORDER_STATUSES)
        .limit(5000),
      supabase
        .from('service_orders')
        .select('id, branch_id')
        .eq('company_id', companyId)
        .is('deleted_at', null)
        .eq('status', 'finalizado')
        .not('delivered_at', 'is', null)
        .gte('delivered_at', period.startDate)
        .lte('delivered_at', periodEnd)
        .limit(5000),
      supabase
        .from('cash_entries')
        .select('id, branch_id, service_order_id, net_amount')
        .eq('company_id', companyId)
        .gte('created_at', period.startDate)
        .lte('created_at', periodEnd)
        .limit(5000),
      supabase
        .from('bills')
        .select('id, branch_id, amount')
        .eq('company_id', companyId)
        .is('deleted_at', null)
        .gte('due_date', period.startDate)
        .lte('due_date', period.endDate)
        .limit(5000),
      supabase
        .from('service_orders')
        .select(
          'id, number, status, device_type, device_brand, device_model, created_at, clients(name, phone), branches(name)',
        )
        .eq('company_id', companyId)
        .is('deleted_at', null)
        .order('number', { ascending: false })
        .limit(6),
    ])

    if (branchesResult.error) throw branchesResult.error
    if (openOrdersResult.error) throw openOrdersResult.error
    if (deliveredOrdersResult.error) throw deliveredOrdersResult.error
    if (cashEntriesResult.error) throw cashEntriesResult.error
    if (billsResult.error) throw billsResult.error
    if (recentOrdersResult.error) throw recentOrdersResult.error

    const branches = (branchesResult.data ?? []) as BranchRow[]
    const openOrders = (openOrdersResult.data ?? []) as ServiceOrderBranchRow[]
    const deliveredOrders = (deliveredOrdersResult.data ?? []) as ServiceOrderBranchRow[]
    const cashEntries = (cashEntriesResult.data ?? []) as CashEntryRow[]
    const bills = (billsResult.data ?? []) as BillRow[]

    const openOrdersByBranch = new Map<string, number>()
    const deliveredOrdersByBranch = new Map<string, number>()
    const revenueByBranch = new Map<string, number>()
    const expensesByBranch = new Map<string, number>()

    for (const order of openOrders) {
      incrementCount(openOrdersByBranch, order.branch_id)
    }

    for (const order of deliveredOrders) {
      incrementCount(deliveredOrdersByBranch, order.branch_id)
    }

    for (const entry of cashEntries) {
      incrementCount(revenueByBranch, entry.branch_id, Number(entry.net_amount))
    }

    for (const bill of bills) {
      incrementCount(expensesByBranch, bill.branch_id, Number(bill.amount))
    }

    const revenue = roundMoney(sumMoney(cashEntries, 'net_amount'))
    const operationalExpenses = roundMoney(sumMoney(bills, 'amount'))
    const paidOrderCount = new Set(cashEntries.map((entry) => entry.service_order_id)).size

    const branchPerformance = branches
      .map((branch) => {
        const branchRevenue = revenueByBranch.get(branch.id) ?? 0
        const branchExpenses = expensesByBranch.get(branch.id) ?? 0

        return {
          branch_id: branch.id,
          branch_name: branch.name,
          open_orders: openOrdersByBranch.get(branch.id) ?? 0,
          delivered_orders: deliveredOrdersByBranch.get(branch.id) ?? 0,
          revenue: roundMoney(branchRevenue),
          expenses: roundMoney(branchExpenses),
          net_result: roundMoney(branchRevenue - branchExpenses),
        }
      })
      .sort((a, b) => b.revenue - a.revenue || b.open_orders - a.open_orders)

    const recentServiceOrders = ((recentOrdersResult.data ?? []) as RecentServiceOrderRow[]).map(
      (order) => {
        const client = firstRelation(order.clients)
        const branch = firstRelation(order.branches)
        const device = [order.device_type, order.device_brand, order.device_model]
          .filter(Boolean)
          .join(' ')

        return {
          id: order.id,
          number: order.number,
          status: order.status,
          client_name: client?.name ?? 'Cliente sem nome',
          client_phone: client?.phone ?? null,
          device: device || 'Equipamento não informado',
          branch_name: branch?.name ?? 'Filial não informada',
          created_at: order.created_at,
        }
      },
    )

    return {
      data: {
        period,
        kpis: {
          openServiceOrders: openOrders.length,
          deliveredServiceOrders: deliveredOrders.length,
          revenue,
          operationalExpenses,
          netResult: roundMoney(revenue - operationalExpenses),
          averageTicket: paidOrderCount > 0 ? roundMoney(revenue / paidOrderCount) : 0,
        },
        branchPerformance,
        recentServiceOrders,
      },
    }
  } catch (error) {
    return {
      data: null,
      error: getActionErrorMessage(error, 'Erro ao carregar a dashboard.'),
    }
  }
}
