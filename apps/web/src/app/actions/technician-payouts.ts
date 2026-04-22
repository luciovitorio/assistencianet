'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAuditLog } from '@/lib/audit/audit-log'
import { getAdminContext } from '@/lib/auth/admin-context'
import { firstRelation } from '@/lib/supabase/relations'
import {
  payoutCreateSchema,
  payoutMarkAsPaidSchema,
  type PayoutCreateSchema,
  type PayoutMarkAsPaidSchema,
  type PayoutStatus,
} from '@/lib/validations/technician-payout'

const revalidatePayoutPages = () => {
  revalidatePath('/dashboard/financeiro/producao-tecnicos')
  revalidatePath('/dashboard/financeiro/producao-tecnicos/fechamentos')
  revalidatePath('/dashboard/financeiro/contas-a-pagar')
}

const getActionErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error) return error.message
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as { message?: unknown }).message === 'string'
  ) {
    return (error as { message: string }).message
  }
  return fallback
}

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type PayoutRow = {
  id: string
  receipt_number: string
  technician_id: string
  technician_name: string
  period_start: string
  period_end: string
  os_count: number
  total_amount: number
  status: PayoutStatus
  bill_id: string | null
  created_at: string
  paid_at: string | null
  notes: string | null
}

export type PayoutItemRow = {
  id: string
  service_order_id: string
  os_number: string
  client_name: string
  completed_at: string
  labor_rate: number
  active: boolean
}

export type PayoutDetail = PayoutRow & {
  company_name: string
  company_cnpj: string | null
  company_phone: string | null
  company_email: string | null
  technician_cpf: string | null
  technician_phone: string | null
  branch_name: string | null
  branch_city: string | null
  branch_state: string | null
  items: PayoutItemRow[]
  bill_status: string | null
  bill_paid_at: string | null
  bill_payment_method: string | null
}

type RelationValue<T> = T | T[] | null

// ── createPayouts ────────────────────────────────────────────────────────────
// Cria um fechamento por técnico listado em `lines`, dentro do período informado.
// Cada fechamento congela as OS concluídas no período e gera um lançamento em
// Contas a Pagar (category='folha') vinculado ao payout pelo bill_id.

export async function createPayouts(data: PayoutCreateSchema) {
  try {
    const { companyId, user } = await getAdminContext('financeiro')
    const parsed = payoutCreateSchema.safeParse(data)

    if (!parsed.success) {
      return { error: parsed.error.issues[0].message }
    }

    if (parsed.data.period_start > parsed.data.period_end) {
      return { error: 'A data inicial não pode ser maior que a data final.' }
    }

    const supabase = await createClient()

    // Precisa de uma filial default para o bill (branch_id é NOT NULL).
    const { data: firstBranch, error: branchError } = await supabase
      .from('branches')
      .select('id')
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (branchError) throw branchError
    if (!firstBranch) {
      return { error: 'Cadastre pelo menos uma filial antes de gerar fechamentos.' }
    }

    const created: Array<{ payoutId: string; receiptNumber: string; technicianName: string }> = []
    const skipped: Array<{ technicianName: string; reason: string }> = []

    for (const line of parsed.data.lines) {
      // 1. Busca dados do técnico (nome + labor_rate atual + branch)
      const { data: technician, error: techError } = await supabase
        .from('employees')
        .select('id, name, labor_rate, branch_id')
        .eq('id', line.technician_id)
        .eq('company_id', companyId)
        .is('deleted_at', null)
        .maybeSingle()

      if (techError) throw techError
      if (!technician) {
        skipped.push({ technicianName: '—', reason: 'Técnico não encontrado.' })
        continue
      }

      // 2. Busca OS elegíveis (concluídas no período, sem payout ativo)
      const { data: eligibleOs, error: osError } = await supabase
        .from('service_orders')
        .select('id, number, completed_at, client_id, clients(name)')
        .eq('company_id', companyId)
        .eq('technician_id', line.technician_id)
        .in('status', ['pronto', 'finalizado'])
        .is('deleted_at', null)
        .gte('completed_at', parsed.data.period_start)
        .lte('completed_at', parsed.data.period_end + 'T23:59:59.999Z')
        .order('completed_at', { ascending: true })

      if (osError) throw osError

      if (!eligibleOs || eligibleOs.length === 0) {
        skipped.push({ technicianName: technician.name, reason: 'Sem OS concluídas no período.' })
        continue
      }

      // 3. Filtra OS que já estão em payout ativo (UNIQUE INDEX garante, mas pré-filtramos pra evitar erro)
      const osIds = eligibleOs.map((os) => os.id)
      const { data: alreadyTaken, error: takenError } = await supabase
        .from('technician_payout_items')
        .select('service_order_id')
        .in('service_order_id', osIds)
        .eq('active', true)

      if (takenError) throw takenError

      const takenSet = new Set((alreadyTaken ?? []).map((r) => r.service_order_id))
      const freshOs = eligibleOs.filter((os) => !takenSet.has(os.id))

      if (freshOs.length === 0) {
        skipped.push({
          technicianName: technician.name,
          reason: 'Todas as OS do período já estão em fechamentos anteriores.',
        })
        continue
      }

      const laborRate = technician.labor_rate ? Number(technician.labor_rate) : 0
      const totalAmount = Number(line.total_amount)

      // 4. Gera número de recibo via RPC
      const { data: receiptNumber, error: numberError } = await supabase.rpc(
        'generate_technician_payout_number',
        { p_company_id: companyId },
      )

      if (numberError) throw numberError
      if (!receiptNumber || typeof receiptNumber !== 'string') {
        skipped.push({ technicianName: technician.name, reason: 'Falha ao gerar número do recibo.' })
        continue
      }

      // 5. Cria o payout (sem bill_id ainda)
      const { data: createdPayout, error: payoutError } = await supabase
        .from('technician_payouts')
        .insert({
          company_id: companyId,
          technician_id: technician.id,
          receipt_number: receiptNumber,
          period_start: parsed.data.period_start,
          period_end: parsed.data.period_end,
          os_count: freshOs.length,
          labor_rate_snapshot: laborRate,
          total_amount: totalAmount,
          status: 'aberto',
          notes: line.notes?.trim() || null,
          created_by: user.id,
        })
        .select('id')
        .single()

      if (payoutError) throw payoutError

      const payoutId = createdPayout.id

      // 6. Cria os items (snapshot das OS)
      type OsRow = {
        id: string
        number: number | string
        completed_at: string | null
        clients: RelationValue<{ name: string }>
      }
      const itemsToInsert = (freshOs as unknown as OsRow[]).map((os) => ({
        payout_id: payoutId,
        service_order_id: os.id,
        os_number: String(os.number ?? ''),
        client_name: firstRelation(os.clients)?.name ?? '—',
        completed_at: os.completed_at!,
        labor_rate: laborRate,
        active: true,
      }))

      const { error: itemsError } = await supabase
        .from('technician_payout_items')
        .insert(itemsToInsert)

      if (itemsError) {
        // Rollback manual do payout
        await supabase.from('technician_payouts').delete().eq('id', payoutId)
        throw itemsError
      }

      // 7. Cria o bill (contas a pagar)
      const branchIdForBill = technician.branch_id ?? firstBranch.id
      const { data: createdBill, error: billError } = await supabase
        .from('bills')
        .insert({
          company_id: companyId,
          branch_id: branchIdForBill,
          category: 'folha',
          description: `Produção ${receiptNumber} — ${technician.name}`,
          amount: totalAmount,
          due_date: parsed.data.period_end,
          status: 'pendente',
          notes: `Fechamento de produção do período ${parsed.data.period_start} a ${parsed.data.period_end} (${freshOs.length} OS).`,
          created_by: user.id,
        })
        .select('id')
        .single()

      if (billError || !createdBill) {
        // Rollback manual: delete items (CASCADE) e payout
        await supabase.from('technician_payouts').delete().eq('id', payoutId)
        throw billError ?? new Error('Falha ao criar lançamento em contas a pagar.')
      }

      // 8. Vincula o bill ao payout
      const { error: linkError } = await supabase
        .from('technician_payouts')
        .update({ bill_id: createdBill.id })
        .eq('id', payoutId)

      if (linkError) {
        await supabase.from('bills').delete().eq('id', createdBill.id)
        await supabase.from('technician_payouts').delete().eq('id', payoutId)
        throw linkError
      }

      await createAuditLog({
        action: 'create',
        entityType: 'bill',
        entityId: createdBill.id,
        companyId,
        summary: `Fechamento de produção criado: ${receiptNumber} — ${technician.name} (${freshOs.length} OS).`,
        metadata: {
          payout_id: payoutId,
          technician_id: technician.id,
          os_count: freshOs.length,
          total_amount: totalAmount,
          period_start: parsed.data.period_start,
          period_end: parsed.data.period_end,
        },
      })

      created.push({
        payoutId,
        receiptNumber,
        technicianName: technician.name,
      })
    }

    revalidatePayoutPages()

    return {
      success: true,
      created,
      skipped,
    }
  } catch (error: unknown) {
    return { error: getActionErrorMessage(error, 'Erro ao gerar fechamento.') }
  }
}

// ── listPayouts ──────────────────────────────────────────────────────────────

export type ListPayoutsFilters = {
  status?: PayoutStatus
  technicianId?: string
  periodStart?: string
  periodEnd?: string
}

export async function listPayouts(
  filters: ListPayoutsFilters = {},
): Promise<{ data: PayoutRow[] | null; error?: string }> {
  try {
    const { companyId } = await getAdminContext('financeiro')
    const supabase = await createClient()

    let query = supabase
      .from('technician_payouts')
      .select(
        'id, receipt_number, technician_id, period_start, period_end, os_count, total_amount, status, bill_id, created_at, paid_at, notes, employees:technician_id(name)',
      )
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .order('period_end', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(500)

    if (filters.status) query = query.eq('status', filters.status)
    if (filters.technicianId) query = query.eq('technician_id', filters.technicianId)
    if (filters.periodStart) query = query.gte('period_end', filters.periodStart)
    if (filters.periodEnd) query = query.lte('period_end', filters.periodEnd)

    const { data, error } = await query
    if (error) throw error

    type Row = {
      id: string
      receipt_number: string
      technician_id: string
      period_start: string
      period_end: string
      os_count: number
      total_amount: number | string
      status: PayoutStatus
      bill_id: string | null
      created_at: string
      paid_at: string | null
      notes: string | null
      employees: RelationValue<{ name: string }>
    }

    const rows: PayoutRow[] = ((data ?? []) as Row[]).map((r) => ({
      id: r.id,
      receipt_number: r.receipt_number,
      technician_id: r.technician_id,
      technician_name: firstRelation(r.employees)?.name ?? '—',
      period_start: r.period_start,
      period_end: r.period_end,
      os_count: r.os_count,
      total_amount: Number(r.total_amount),
      status: r.status,
      bill_id: r.bill_id,
      created_at: r.created_at,
      paid_at: r.paid_at,
      notes: r.notes,
    }))

    return { data: rows }
  } catch (error: unknown) {
    return { data: null, error: getActionErrorMessage(error, 'Erro ao listar fechamentos.') }
  }
}

// ── getPayoutDetail ──────────────────────────────────────────────────────────

export async function getPayoutDetail(
  payoutId: string,
): Promise<{ data: PayoutDetail | null; error?: string }> {
  try {
    const { companyId } = await getAdminContext('financeiro')
    const supabase = await createClient()

    const { data: payout, error: payoutError } = await supabase
      .from('technician_payouts')
      .select(
        'id, receipt_number, technician_id, period_start, period_end, os_count, total_amount, status, bill_id, created_at, paid_at, notes, employees:technician_id(name, cpf, phone, branch_id, branches(name, city, state))',
      )
      .eq('id', payoutId)
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .maybeSingle()

    if (payoutError) throw payoutError
    if (!payout) return { data: null, error: 'Fechamento não encontrado.' }

    const { data: items, error: itemsError } = await supabase
      .from('technician_payout_items')
      .select('id, service_order_id, os_number, client_name, completed_at, labor_rate, active')
      .eq('payout_id', payoutId)
      .order('completed_at', { ascending: true })

    if (itemsError) throw itemsError

    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('name, cnpj, phone, email')
      .eq('id', companyId)
      .single()

    if (companyError) throw companyError

    let billStatus: string | null = null
    let billPaidAt: string | null = null
    let billPaymentMethod: string | null = null

    if (payout.bill_id) {
      const { data: bill } = await supabase
        .from('bills')
        .select('status, paid_at, payment_method')
        .eq('id', payout.bill_id)
        .is('deleted_at', null)
        .maybeSingle()

      if (bill) {
        billStatus = bill.status
        billPaidAt = bill.paid_at
        billPaymentMethod = bill.payment_method
      }
    }

    type Emp = {
      name: string
      cpf: string | null
      phone: string | null
      branch_id: string | null
      branches: RelationValue<{ name: string; city: string | null; state: string | null }>
    }
    const employee = firstRelation(
      payout.employees as RelationValue<Emp>,
    )
    const branch = employee ? firstRelation(employee.branches) : null

    const detail: PayoutDetail = {
      id: payout.id,
      receipt_number: payout.receipt_number,
      technician_id: payout.technician_id,
      technician_name: employee?.name ?? '—',
      technician_cpf: employee?.cpf ?? null,
      technician_phone: employee?.phone ?? null,
      period_start: payout.period_start,
      period_end: payout.period_end,
      os_count: payout.os_count,
      total_amount: Number(payout.total_amount),
      status: payout.status as PayoutStatus,
      bill_id: payout.bill_id,
      created_at: payout.created_at,
      paid_at: payout.paid_at,
      notes: payout.notes,
      company_name: company.name,
      company_cnpj: company.cnpj,
      company_phone: company.phone,
      company_email: company.email,
      branch_name: branch?.name ?? null,
      branch_city: branch?.city ?? null,
      branch_state: branch?.state ?? null,
      bill_status: billStatus,
      bill_paid_at: billPaidAt,
      bill_payment_method: billPaymentMethod,
      items: (items ?? []).map((i) => ({
        id: i.id,
        service_order_id: i.service_order_id,
        os_number: i.os_number,
        client_name: i.client_name,
        completed_at: i.completed_at,
        labor_rate: Number(i.labor_rate),
        active: i.active,
      })),
    }

    return { data: detail }
  } catch (error: unknown) {
    return { data: null, error: getActionErrorMessage(error, 'Erro ao carregar fechamento.') }
  }
}

// ── markPayoutPaid ───────────────────────────────────────────────────────────
// Marca o bill vinculado como pago — trigger no banco sincroniza o payout.

export async function markPayoutPaid(payoutId: string, data: PayoutMarkAsPaidSchema) {
  try {
    const { companyId } = await getAdminContext('financeiro')
    const parsed = payoutMarkAsPaidSchema.safeParse(data)
    if (!parsed.success) return { error: parsed.error.issues[0].message }

    const supabase = await createClient()

    const { data: payout, error: fetchError } = await supabase
      .from('technician_payouts')
      .select('id, receipt_number, bill_id, status')
      .eq('id', payoutId)
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .maybeSingle()

    if (fetchError) throw fetchError
    if (!payout) return { error: 'Fechamento não encontrado.' }
    if (payout.status === 'cancelado') return { error: 'Fechamento já cancelado.' }
    if (payout.status === 'pago') return { error: 'Fechamento já pago.' }
    if (!payout.bill_id) return { error: 'Fechamento sem lançamento em contas a pagar.' }

    const { error: billError } = await supabase
      .from('bills')
      .update({
        status: 'pago',
        paid_at: new Date(`${parsed.data.paid_at}T12:00:00`).toISOString(),
        payment_method: parsed.data.payment_method,
        payment_notes: parsed.data.payment_notes?.trim() || null,
      })
      .eq('id', payout.bill_id)
      .eq('company_id', companyId)

    if (billError) throw billError

    await createAuditLog({
      action: 'update',
      entityType: 'bill',
      entityId: payout.bill_id,
      companyId,
      summary: `Fechamento pago: ${payout.receipt_number} via ${parsed.data.payment_method}.`,
      metadata: {
        payout_id: payout.id,
        paid_at: parsed.data.paid_at,
        payment_method: parsed.data.payment_method,
      },
    })

    revalidatePayoutPages()
    return { success: true }
  } catch (error: unknown) {
    return { error: getActionErrorMessage(error, 'Erro ao registrar pagamento.') }
  }
}

// ── cancelPayout ─────────────────────────────────────────────────────────────
// Cancela o fechamento, desativa os items (libera as OS) e soft-deleta o bill
// se ainda estiver pendente.

export async function cancelPayout(payoutId: string, reason?: string) {
  try {
    const { companyId, user } = await getAdminContext('financeiro')
    const supabase = await createClient()

    const { data: payout, error: fetchError } = await supabase
      .from('technician_payouts')
      .select('id, receipt_number, bill_id, status, total_amount')
      .eq('id', payoutId)
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .maybeSingle()

    if (fetchError) throw fetchError
    if (!payout) return { error: 'Fechamento não encontrado.' }
    if (payout.status === 'cancelado') return { error: 'Fechamento já cancelado.' }
    if (payout.status === 'pago') {
      return { error: 'Fechamento já pago. Estorne o lançamento em Contas a Pagar antes de cancelar.' }
    }

    // 1. Desativa items (libera as OS)
    const { error: itemsError } = await supabase
      .from('technician_payout_items')
      .update({ active: false })
      .eq('payout_id', payoutId)

    if (itemsError) throw itemsError

    // 2. Marca payout como cancelado (soft delete)
    const now = new Date().toISOString()
    const { error: payoutError } = await supabase
      .from('technician_payouts')
      .update({
        status: 'cancelado',
        cancelled_at: now,
        cancelled_by: user.id,
        deleted_at: now,
        notes: reason?.trim() ? reason.trim() : null,
      })
      .eq('id', payoutId)

    if (payoutError) throw payoutError

    // 3. Soft-delete do bill relacionado (se pendente)
    if (payout.bill_id) {
      await supabase
        .from('bills')
        .update({ deleted_at: now })
        .eq('id', payout.bill_id)
        .eq('status', 'pendente')
    }

    await createAuditLog({
      action: 'delete',
      entityType: 'bill',
      entityId: payout.bill_id,
      companyId,
      summary: `Fechamento cancelado: ${payout.receipt_number}.`,
      metadata: {
        payout_id: payout.id,
        reason: reason ?? null,
      },
    })

    revalidatePayoutPages()
    return { success: true }
  } catch (error: unknown) {
    return { error: getActionErrorMessage(error, 'Erro ao cancelar fechamento.') }
  }
}
