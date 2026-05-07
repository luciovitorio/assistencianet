'use server'

import { createClient } from '@/lib/supabase/server'
import { getAdminContext } from '@/lib/auth/admin-context'
import { assertBillingFeature } from '@/lib/billing/entitlements'

const END_OF_DAY = 'T23:59:59.999Z'
const roundMoney = (v: number) => Math.round(v * 100) / 100

export type ReportBranch = { id: string; name: string }
export type ReportTechnician = { id: string; name: string }

export type SpecificReportFilter = {
  startDate: string
  endDate: string
  branchId?: string
}

const getActionError = (error: unknown) =>
  error instanceof Error ? error.message : 'Erro ao carregar relatório.'

// ---------------------------------------------------------------------------
// OS em Aberto / Atrasadas
// ---------------------------------------------------------------------------

const OPEN_STATUSES = [
  'aberta', 'em_analise', 'aguardando_envio',
  'aguardando_aprovacao', 'aprovado', 'reprovado',
  'aguardando_peca', 'enviado_terceiro', 'em_reparo', 'pronto',
] as const

export type OpenOsRow = {
  id: string
  number: number
  status: string
  device_type: string
  device_brand: string | null
  device_model: string | null
  created_at: string
  estimated_delivery: string | null
  client_name: string | null
  branch_name: string | null
  technician_name: string | null
  is_overdue: boolean
}

export type OpenOsReportData = {
  branches: ReportBranch[]
  technicians: ReportTechnician[]
  rows: OpenOsRow[]
  total: number
  overdue: number
}

export async function getOpenOsReport(
  filters?: Pick<SpecificReportFilter, 'branchId'>,
): Promise<{ data: OpenOsReportData | null; error?: string }> {
  try {
    const { companyId } = await getAdminContext('financeiro')
    const supabase = await createClient()
    await assertBillingFeature(supabase, companyId, 'advanced_reports')

    let osQuery = supabase
      .from('service_orders')
      .select('id, number, status, device_type, device_brand, device_model, created_at, estimated_delivery, technician_id, clients(name), branches(name)')
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .in('status', [...OPEN_STATUSES])
      .order('created_at', { ascending: false })
      .limit(2000)

    if (filters?.branchId) osQuery = osQuery.eq('branch_id', filters.branchId)

    const [{ data: ordersData, error: ordersError }, branchesRes, techRes] = await Promise.all([
      osQuery,
      supabase.from('branches').select('id, name').eq('company_id', companyId).is('deleted_at', null).order('name'),
      supabase.from('employees').select('id, name').eq('company_id', companyId).is('deleted_at', null).order('name'),
    ])

    if (ordersError) throw ordersError

    const techMap = new Map<string, string>((techRes.data ?? []).map((e: any) => [e.id, e.name]))
    const today = new Date().toISOString().slice(0, 10)

    const rows: OpenOsRow[] = (ordersData ?? []).map((os: any) => ({
      id: os.id,
      number: os.number,
      status: os.status,
      device_type: os.device_type,
      device_brand: os.device_brand,
      device_model: os.device_model,
      created_at: os.created_at,
      estimated_delivery: os.estimated_delivery,
      client_name: os.clients?.name ?? null,
      branch_name: os.branches?.name ?? null,
      technician_name: os.technician_id ? (techMap.get(os.technician_id) ?? null) : null,
      is_overdue: !!os.estimated_delivery && os.estimated_delivery.slice(0, 10) < today,
    }))

    return {
      data: {
        branches: branchesRes.data ?? [],
        technicians: techRes.data ?? [],
        rows,
        total: rows.length,
        overdue: rows.filter((r) => r.is_overdue).length,
      },
    }
  } catch (error) {
    return { data: null, error: getActionError(error) }
  }
}

// ---------------------------------------------------------------------------
// Orçamentos — Conversão
// ---------------------------------------------------------------------------

export type EstimateConversionRow = {
  id: string
  service_order_number: number
  status: string
  total_amount: number
  client_name: string | null
  branch_name: string | null
  sent_at: string | null
  approved_at: string | null
  rejected_at: string | null
  created_at: string
}

export type EstimateConversionSummary = {
  total: number
  approved: number
  rejected: number
  pending: number
  conversionRate: number
  rejectionRate: number
  averageTicket: number
  totalApprovedAmount: number
}

export type EstimatesConversionReportData = {
  branches: ReportBranch[]
  summary: EstimateConversionSummary
  rows: EstimateConversionRow[]
}

export async function getEstimatesConversionReport(
  filters: SpecificReportFilter,
): Promise<{ data: EstimatesConversionReportData | null; error?: string }> {
  try {
    const { companyId } = await getAdminContext('financeiro')
    const supabase = await createClient()
    await assertBillingFeature(supabase, companyId, 'advanced_reports')

    const [estimatesRes, branchesRes] = await Promise.all([
      supabase
        .from('service_order_estimates')
        .select('id, status, total_amount, sent_at, approved_at, rejected_at, created_at, service_orders(number, branch_id, clients(name), branches(name))')
        .eq('company_id', companyId)
        .is('deleted_at', null)
        .gte('created_at', filters.startDate)
        .lte('created_at', filters.endDate + END_OF_DAY)
        .order('created_at', { ascending: false })
        .limit(3000),
      supabase.from('branches').select('id, name').eq('company_id', companyId).is('deleted_at', null).order('name'),
    ])

    if (estimatesRes.error) throw estimatesRes.error

    const all = (estimatesRes.data ?? []) as any[]
    const filtered = filters.branchId
      ? all.filter((e) => e.service_orders?.branch_id === filters.branchId)
      : all

    const rows: EstimateConversionRow[] = filtered.map((e) => ({
      id: e.id,
      service_order_number: e.service_orders?.number ?? 0,
      status: e.status,
      total_amount: Number(e.total_amount),
      client_name: e.service_orders?.clients?.name ?? null,
      branch_name: e.service_orders?.branches?.name ?? null,
      sent_at: e.sent_at,
      approved_at: e.approved_at,
      rejected_at: e.rejected_at,
      created_at: e.created_at,
    }))

    const approved = rows.filter((r) => r.status === 'aprovado')
    const rejected = rows.filter((r) => r.status === 'recusado')
    const pending = rows.filter((r) => !['aprovado', 'recusado'].includes(r.status))
    const totalApprovedAmount = approved.reduce((s, r) => s + r.total_amount, 0)

    return {
      data: {
        branches: branchesRes.data ?? [],
        summary: {
          total: rows.length,
          approved: approved.length,
          rejected: rejected.length,
          pending: pending.length,
          conversionRate: rows.length > 0 ? (approved.length / rows.length) * 100 : 0,
          rejectionRate: rows.length > 0 ? (rejected.length / rows.length) * 100 : 0,
          averageTicket: approved.length > 0 ? roundMoney(totalApprovedAmount / approved.length) : 0,
          totalApprovedAmount: roundMoney(totalApprovedAmount),
        },
        rows,
      },
    }
  } catch (error) {
    return { data: null, error: getActionError(error) }
  }
}

// ---------------------------------------------------------------------------
// Equipamentos mais atendidos
// ---------------------------------------------------------------------------

export type EquipmentRankRow = {
  key: string
  device_type: string
  device_brand: string | null
  device_model: string | null
  count: number
  completed: number
}

export type EquipmentsReportData = {
  branches: ReportBranch[]
  rows: EquipmentRankRow[]
  total_os: number
}

export async function getEquipmentsReport(
  filters: SpecificReportFilter,
): Promise<{ data: EquipmentsReportData | null; error?: string }> {
  try {
    const { companyId } = await getAdminContext('financeiro')
    const supabase = await createClient()
    await assertBillingFeature(supabase, companyId, 'advanced_reports')

    let osQuery = supabase
      .from('service_orders')
      .select('status, device_type, device_brand, device_model')
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .gte('created_at', filters.startDate)
      .lte('created_at', filters.endDate + END_OF_DAY)
      .not('status', 'eq', 'cancelado')
      .limit(2000)

    if (filters.branchId) osQuery = osQuery.eq('branch_id', filters.branchId)

    const [osRes, branchesRes] = await Promise.all([
      osQuery,
      supabase.from('branches').select('id, name').eq('company_id', companyId).is('deleted_at', null).order('name'),
    ])

    if (osRes.error) throw osRes.error

    const counts = new Map<string, { type: string; brand: string | null; model: string | null; count: number; completed: number }>()

    for (const os of (osRes.data ?? []) as any[]) {
      const type = os.device_type || 'Não informado'
      const brand = os.device_brand || null
      const model = os.device_model || null
      const key = [type, brand ?? '', model ?? ''].join('|').toLocaleLowerCase('pt-BR')
      const cur = counts.get(key) ?? { type, brand, model, count: 0, completed: 0 }
      cur.count++
      if (os.status === 'finalizado') cur.completed++
      counts.set(key, cur)
    }

    const rows: EquipmentRankRow[] = [...counts.entries()]
      .map(([key, v]) => ({ key, device_type: v.type, device_brand: v.brand, device_model: v.model, count: v.count, completed: v.completed }))
      .sort((a, b) => b.count - a.count)

    return {
      data: { branches: branchesRes.data ?? [], rows, total_os: (osRes.data ?? []).length },
    }
  } catch (error) {
    return { data: null, error: getActionError(error) }
  }
}

// ---------------------------------------------------------------------------
// Recorrência de Clientes
// ---------------------------------------------------------------------------

export type ClientRecurrenceRow = {
  client_id: string
  client_name: string
  os_count: number
  completed_count: number
  first_os_at: string
  last_os_at: string
}

export type ClientRecurrenceReportData = {
  branches: ReportBranch[]
  rows: ClientRecurrenceRow[]
  total_clients: number
  recurrent_clients: number
}

export async function getClientRecurrenceReport(
  filters: SpecificReportFilter,
): Promise<{ data: ClientRecurrenceReportData | null; error?: string }> {
  try {
    const { companyId } = await getAdminContext('financeiro')
    const supabase = await createClient()
    await assertBillingFeature(supabase, companyId, 'advanced_reports')

    let osQuery = supabase
      .from('service_orders')
      .select('status, created_at, client_id, clients(name)')
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .gte('created_at', filters.startDate)
      .lte('created_at', filters.endDate + END_OF_DAY)
      .not('status', 'eq', 'cancelado')
      .limit(2000)

    if (filters.branchId) osQuery = osQuery.eq('branch_id', filters.branchId)

    const [osRes, branchesRes] = await Promise.all([
      osQuery,
      supabase.from('branches').select('id, name').eq('company_id', companyId).is('deleted_at', null).order('name'),
    ])

    if (osRes.error) throw osRes.error

    const clientMap = new Map<string, { name: string; count: number; completed: number; first: string; last: string }>()

    for (const os of (osRes.data ?? []) as any[]) {
      if (!os.client_id) continue
      const cur = clientMap.get(os.client_id) ?? {
        name: os.clients?.name ?? 'Cliente não identificado',
        count: 0, completed: 0,
        first: os.created_at, last: os.created_at,
      }
      cur.count++
      if (os.status === 'finalizado') cur.completed++
      if (os.created_at < cur.first) cur.first = os.created_at
      if (os.created_at > cur.last) cur.last = os.created_at
      clientMap.set(os.client_id, cur)
    }

    const rows: ClientRecurrenceRow[] = [...clientMap.entries()]
      .map(([id, v]) => ({
        client_id: id,
        client_name: v.name,
        os_count: v.count,
        completed_count: v.completed,
        first_os_at: v.first,
        last_os_at: v.last,
      }))
      .sort((a, b) => b.os_count - a.os_count)

    return {
      data: {
        branches: branchesRes.data ?? [],
        rows,
        total_clients: clientMap.size,
        recurrent_clients: rows.filter((r) => r.os_count >= 2).length,
      },
    }
  } catch (error) {
    return { data: null, error: getActionError(error) }
  }
}

// ---------------------------------------------------------------------------
// Comparativo de Filiais
// ---------------------------------------------------------------------------

export type BranchDetailRow = {
  branch_id: string
  branch_name: string
  os_opened: number
  os_completed: number
  os_canceled: number
  os_in_progress: number
  avg_execution_days: number | null
  revenue: number
}

export type BranchComparisonReportData = {
  rows: BranchDetailRow[]
  period_total_os: number
  period_total_revenue: number
}

export async function getBranchComparisonReport(
  filters: SpecificReportFilter,
): Promise<{ data: BranchComparisonReportData | null; error?: string }> {
  try {
    const { companyId } = await getAdminContext('financeiro')
    const supabase = await createClient()
    await assertBillingFeature(supabase, companyId, 'advanced_reports')

    const [osRes, cashRes, branchesRes] = await Promise.all([
      supabase
        .from('service_orders')
        .select('status, branch_id, created_at, completed_at')
        .eq('company_id', companyId)
        .is('deleted_at', null)
        .gte('created_at', filters.startDate)
        .lte('created_at', filters.endDate + END_OF_DAY)
        .limit(2000),
      supabase
        .from('cash_entries')
        .select('branch_id, net_amount')
        .eq('company_id', companyId)
        .gte('created_at', filters.startDate)
        .lte('created_at', filters.endDate + END_OF_DAY)
        .limit(2000),
      supabase.from('branches').select('id, name').eq('company_id', companyId).is('deleted_at', null).order('name'),
    ])

    if (osRes.error) throw osRes.error
    if (cashRes.error) throw cashRes.error

    type Stats = { opened: number; completed: number; canceled: number; in_progress: number; exec_days: number; exec_count: number; revenue: number }
    const init = (): Stats => ({ opened: 0, completed: 0, canceled: 0, in_progress: 0, exec_days: 0, exec_count: 0, revenue: 0 })
    const stats = new Map<string, Stats>()

    for (const os of (osRes.data ?? []) as any[]) {
      if (!os.branch_id) continue
      const s = stats.get(os.branch_id) ?? init()
      s.opened++
      if (os.status === 'cancelado') s.canceled++
      else if (os.status === 'finalizado') {
        s.completed++
        if (os.completed_at) {
          const days = (new Date(os.completed_at).getTime() - new Date(os.created_at).getTime()) / 86_400_000
          s.exec_days += Math.max(0, days)
          s.exec_count++
        }
      } else if ((OPEN_STATUSES as readonly string[]).includes(os.status)) {
        s.in_progress++
      }
      stats.set(os.branch_id, s)
    }

    for (const entry of (cashRes.data ?? []) as any[]) {
      if (!entry.branch_id) continue
      const s = stats.get(entry.branch_id) ?? init()
      s.revenue += Number(entry.net_amount)
      stats.set(entry.branch_id, s)
    }

    const rows: BranchDetailRow[] = (branchesRes.data ?? [])
      .map((branch: any) => {
        const s = stats.get(branch.id)
        return {
          branch_id: branch.id,
          branch_name: branch.name,
          os_opened: s?.opened ?? 0,
          os_completed: s?.completed ?? 0,
          os_canceled: s?.canceled ?? 0,
          os_in_progress: s?.in_progress ?? 0,
          avg_execution_days: s && s.exec_count > 0 ? Math.round((s.exec_days / s.exec_count) * 10) / 10 : null,
          revenue: roundMoney(s?.revenue ?? 0),
        }
      })
      .filter((r) => r.os_opened > 0 || r.revenue > 0)
      .sort((a, b) => b.os_opened - a.os_opened)

    return {
      data: {
        rows,
        period_total_os: rows.reduce((s, r) => s + r.os_opened, 0),
        period_total_revenue: roundMoney(rows.reduce((s, r) => s + r.revenue, 0)),
      },
    }
  } catch (error) {
    return { data: null, error: getActionError(error) }
  }
}
