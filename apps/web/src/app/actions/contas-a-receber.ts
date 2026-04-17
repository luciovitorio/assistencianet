'use server'

import { createClient } from '@/lib/supabase/server'
import { getAdminContext } from '@/lib/auth/admin-context'
import { firstRelation } from '@/lib/supabase/relations'

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type ContaAReceberRow = {
  id: string
  number: number
  client_name: string
  device_type: string
  device_brand: string | null
  device_model: string | null
  branch_id: string
  branch_name: string
  amount: number
  grupo: 'pronto' | 'fiado'
  // Para o grupo 'pronto': dias desde que ficou pronto (não tem delivered_at)
  // Para o grupo 'fiado': dias desde a entrega
  reference_date: string
  days_waiting: number
}

export type ContasAReceberSummary = {
  totalPronto: number
  totalFiado: number
  countPronto: number
  countFiado: number
}

type NameRelation = { name: string } | { name: string }[] | null

const getActionErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error) return error.message
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as { message: unknown }).message)
  }
  return fallback
}

// ── getContasAReceber ─────────────────────────────────────────────────────────
// Retorna dois grupos:
//  - 'pronto': OS com status = 'pronto' (equipamento pronto, aguardando retirada)
//  - 'fiado':  OS com status = 'finalizado' e payment_status = 'pendente'
//              (equipamento entregue mas não pago)
//
// O valor de cada OS é obtido do orçamento aprovado (service_order_estimates
// com status = 'aprovado'). Se não houver orçamento aprovado, amount = 0.

export async function getContasAReceber(
  branchId?: string,
): Promise<{ data: ContaAReceberRow[] | null; error?: string }> {
  try {
    const { companyId } = await getAdminContext('financeiro')
    const supabase = await createClient()
    const today = new Date().toISOString().slice(0, 10)

    let query = supabase
      .from('service_orders')
      .select(
        `
        id,
        number,
        status,
        payment_status,
        delivered_at,
        branch_id,
        device_type,
        device_brand,
        device_model,
        branches!branch_id(name),
        clients!client_id(name),
        service_order_estimates(status, total_amount)
        `,
      )
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .in('status', ['pronto', 'finalizado'])
      .order('created_at', { ascending: false })
      .limit(300)

    if (branchId) {
      query = query.eq('branch_id', branchId)
    }

    const { data, error } = await query

    if (error) throw error

    const today_ts = new Date(today).getTime()
    const rows: ContaAReceberRow[] = []

    for (const os of data ?? []) {
      // Filtra o grupo correto
      const isPronte = os.status === 'pronto'
      const isFiado = os.status === 'finalizado' && os.payment_status === 'pendente'
      if (!isPronte && !isFiado) continue
      if (!os.branch_id) continue

      // Valor do orçamento aprovado
      const estimates = (os.service_order_estimates ?? []) as { status: string; total_amount: number }[]
      const approved = estimates.find((e) => e.status === 'aprovado')
      const amount = approved ? Number(approved.total_amount) : 0

      // Data de referência e dias de espera
      const refDateStr: string = isFiado && os.delivered_at
        ? os.delivered_at.slice(0, 10)
        : today
      const refTs = new Date(refDateStr).getTime()
      const daysWaiting = Math.floor((today_ts - refTs) / (1000 * 60 * 60 * 24))

      const branchData = firstRelation(os.branches as NameRelation)
      const clientData = firstRelation(os.clients as NameRelation)

      rows.push({
        id: os.id,
        number: os.number,
        client_name: clientData?.name ?? '—',
        device_type: os.device_type ?? '—',
        device_brand: os.device_brand ?? null,
        device_model: os.device_model ?? null,
        branch_id: os.branch_id,
        branch_name: branchData?.name ?? '—',
        amount,
        grupo: isPronte ? 'pronto' : 'fiado',
        reference_date: refDateStr,
        days_waiting: daysWaiting,
      })
    }

    return { data: rows }
  } catch (error: unknown) {
    return { error: getActionErrorMessage(error, 'Erro ao buscar contas a receber.'), data: null }
  }
}

// ── getContasAReceberSummary ──────────────────────────────────────────────────

export async function getContasAReceberSummary(
  branchId?: string,
): Promise<{ data: ContasAReceberSummary | null; error?: string }> {
  const result = await getContasAReceber(branchId)
  if (result.error || !result.data) {
    return { error: result.error, data: null }
  }

  let totalPronto = 0
  let totalFiado = 0
  let countPronto = 0
  let countFiado = 0

  for (const row of result.data) {
    if (row.grupo === 'pronto') {
      totalPronto += row.amount
      countPronto++
    } else {
      totalFiado += row.amount
      countFiado++
    }
  }

  return {
    data: {
      totalPronto: Math.round(totalPronto * 100) / 100,
      totalFiado: Math.round(totalFiado * 100) / 100,
      countPronto,
      countFiado,
    },
  }
}
