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

type RpcResult = {
  kpis: {
    open_service_orders: number
    delivered_service_orders: number
    revenue: number
    operational_expenses: number
    paid_order_count: number
  }
  branch_performance: Array<{
    branch_id: string
    branch_name: string
    open_orders: number
    delivered_orders: number
    revenue: number
    expenses: number
    net_result: number
  }>
  recent_orders: Array<{
    id: string
    number: number
    status: string
    device_type: string
    device_brand: string | null
    device_model: string | null
    created_at: string
    client_name: string | null
    client_phone: string | null
    branch_name: string | null
  }>
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

    const { data: rpcData, error: rpcError } = await supabase.rpc('get_dashboard_overview', {
      p_company_id: companyId,
      p_start_date: period.startDate,
      p_end_date: periodEnd,
      p_open_statuses: OPEN_SERVICE_ORDER_STATUSES,
    })

    if (rpcError) throw rpcError

    const result = rpcData as RpcResult

    const revenue = roundMoney(Number(result.kpis.revenue))
    const operationalExpenses = roundMoney(Number(result.kpis.operational_expenses))
    const paidOrderCount = Number(result.kpis.paid_order_count)

    const branchPerformance: DashboardBranchPerformanceRow[] = result.branch_performance.map((bp) => ({
      branch_id: bp.branch_id,
      branch_name: bp.branch_name,
      open_orders: Number(bp.open_orders),
      delivered_orders: Number(bp.delivered_orders),
      revenue: roundMoney(Number(bp.revenue)),
      expenses: roundMoney(Number(bp.expenses)),
      net_result: roundMoney(Number(bp.net_result)),
    }))

    const recentServiceOrders: DashboardRecentServiceOrder[] = result.recent_orders.map((order) => {
      const device = [order.device_type, order.device_brand, order.device_model]
        .filter(Boolean)
        .join(' ')

      return {
        id: order.id,
        number: order.number,
        status: order.status,
        client_name: order.client_name ?? 'Cliente sem nome',
        client_phone: order.client_phone ?? null,
        device: device || 'Equipamento não informado',
        branch_name: order.branch_name ?? 'Filial não informada',
        created_at: order.created_at,
      }
    })

    return {
      data: {
        period,
        kpis: {
          openServiceOrders: Number(result.kpis.open_service_orders),
          deliveredServiceOrders: Number(result.kpis.delivered_service_orders),
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
