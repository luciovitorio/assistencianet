'use server'

import { createClient } from '@/lib/supabase/server'
import { getAdminContext } from '@/lib/auth/admin-context'
import { firstRelation } from '@/lib/supabase/relations'

export type TechnicianProductionRow = {
  technician_id: string
  technician_name: string
  branch_name: string | null
  labor_rate: number | null
  os_count: number
  total_labor: number
}

export type TechnicianProductionSummary = {
  total_os: number
  total_labor: number
  technicians_with_rate: number
  technicians_without_rate: number
}

type BranchRelation = { name: string } | { name: string }[] | null

export async function getTechnicianProduction(
  startDate: string,
  endDate: string,
): Promise<{ data: TechnicianProductionRow[] | null; error?: string }> {
  try {
    const { companyId } = await getAdminContext('financeiro')
    const supabase = await createClient()

    // Busca técnicos ativos com suas OS concluídas no período
    const { data: technicians, error: techError } = await supabase
      .from('employees')
      .select('id, name, labor_rate, branch_id, branches(name)')
      .eq('company_id', companyId)
      .or('role.eq.tecnico,is_owner.eq.true')
      .is('deleted_at', null)
      .order('name', { ascending: true })

    if (techError) throw techError

    if (!technicians || technicians.length === 0) {
      return { data: [] }
    }

    // Conta OS concluídas por técnico no período usando completed_at —
    // registrado no momento em que a OS é marcada como "pronta",
    // independente de quando o cliente retira o equipamento.
    // OS já incluídas em um fechamento ativo (technician_payout_items.active=true)
    // são excluídas para que um segundo fechamento no mesmo período pegue apenas
    // as OS novas.
    const { data: osRows, error: osError } = await supabase
      .from('service_orders')
      .select('id, technician_id')
      .eq('company_id', companyId)
      .in('status', ['pronto', 'finalizado'])
      .is('deleted_at', null)
      .gte('completed_at', startDate)
      .lte('completed_at', endDate + 'T23:59:59.999Z')
      .not('technician_id', 'is', null)

    if (osError) throw osError

    const osIds = (osRows ?? []).map((o) => o.id)
    let takenSet = new Set<string>()

    if (osIds.length > 0) {
      const { data: takenRows, error: takenError } = await supabase
        .from('technician_payout_items')
        .select('service_order_id')
        .in('service_order_id', osIds)
        .eq('active', true)

      if (takenError) throw takenError
      takenSet = new Set((takenRows ?? []).map((r) => r.service_order_id))
    }

    const countByTechnician: Record<string, number> = {}
    for (const os of osRows ?? []) {
      if (!os.technician_id) continue
      if (takenSet.has(os.id)) continue
      countByTechnician[os.technician_id] = (countByTechnician[os.technician_id] ?? 0) + 1
    }

    const rows: TechnicianProductionRow[] = technicians.map((t) => {
      const osCount = countByTechnician[t.id] ?? 0
      const laborRate = t.labor_rate ? Number(t.labor_rate) : null
      const totalLabor = laborRate != null ? osCount * laborRate : 0
      const branch = firstRelation(t.branches as BranchRelation)

      return {
        technician_id: t.id,
        technician_name: t.name,
        branch_name: branch?.name ?? null,
        labor_rate: laborRate,
        os_count: osCount,
        total_labor: totalLabor,
      }
    })

    return { data: rows }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao buscar produção de técnicos'
    return { data: null, error: message }
  }
}

export async function getTechnicianProductionSummary(
  rows: TechnicianProductionRow[],
): Promise<TechnicianProductionSummary> {
  return {
    total_os: rows.reduce((acc, r) => acc + r.os_count, 0),
    total_labor: rows.reduce((acc, r) => acc + r.total_labor, 0),
    technicians_with_rate: rows.filter((r) => r.labor_rate != null).length,
    technicians_without_rate: rows.filter((r) => r.labor_rate == null).length,
  }
}
