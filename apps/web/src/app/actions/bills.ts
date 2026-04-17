'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAuditLog } from '@/lib/audit/audit-log'
import { getAdminContext } from '@/lib/auth/admin-context'
import { firstRelation } from '@/lib/supabase/relations'
import {
  BILL_CATEGORY_LABELS,
  billCreateSchema,
  billEditSchema,
  billMarkAsPaidSchema,
  type BillCategory,
  type BillCreateSchema,
  type BillEditSchema,
  type BillMarkAsPaidSchema,
} from '@/lib/validations/bills'

const revalidateBillsPage = () => revalidatePath('/dashboard/financeiro/contas-a-pagar')

const getActionErrorMessage = (error: unknown, fallback: string) => {
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message
  }
  if (error instanceof Error) return error.message
  return fallback
}

const getBillDescription = (
  description: string | null | undefined,
  category: BillCategory,
) => description?.trim() || BILL_CATEGORY_LABELS[category]

// ── Tipos públicos ────────────────────────────────────────────────────────────

export type BillRow = {
  id: string
  company_id: string
  branch_id: string
  category: string
  description: string
  supplier_id: string | null
  amount: number
  due_date: string
  status: string
  paid_at: string | null
  payment_method: string | null
  payment_notes: string | null
  notes: string | null
  recurrence: string | null
  recurrence_group_id: string | null
  created_by: string | null
  created_at: string
  suppliers: { name: string } | null
  branches: { name: string } | null
  profiles: { name: string } | null
}

export type BillsSummary = {
  totalPendente: number
  totalVencido: number
  totalPagoMes: number
  countPendente: number
  countVencido: number
}

type RelationValue<T> = T | T[] | null

type BillQueryRow = Omit<BillRow, 'suppliers' | 'branches' | 'profiles'> & {
  suppliers: RelationValue<{ name: string }>
  branches: RelationValue<{ name: string }>
  profiles: RelationValue<{ name: string }>
}

const normalizeBillRow = (row: BillQueryRow): BillRow => ({
  ...row,
  suppliers: firstRelation(row.suppliers),
  branches: firstRelation(row.branches),
  profiles: firstRelation(row.profiles),
})

// ── Helpers ──────────────────────────────────────────────────────────────────

function addMonths(dateStr: string, months: number): string {
  const date = new Date(`${dateStr}T00:00:00`)
  const day = date.getDate()
  date.setMonth(date.getMonth() + months)
  // Se o mês resultante não tem o mesmo dia (ex: 31 jan + 1 mês = 3 mar),
  // recua para o último dia do mês anterior
  if (date.getDate() !== day) {
    date.setDate(0)
  }
  return date.toISOString().slice(0, 10)
}

function addYears(dateStr: string, years: number): string {
  const date = new Date(`${dateStr}T00:00:00`)
  date.setFullYear(date.getFullYear() + years)
  return date.toISOString().slice(0, 10)
}

function addDays(dateStr: string, days: number): string {
  const date = new Date(`${dateStr}T00:00:00`)
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

function getNextDueDate(
  baseDate: string,
  recurrence: string,
  iteration: number,
): string {
  switch (recurrence) {
    case 'mensal':
      return addMonths(baseDate, iteration)
    case 'anual':
      return addYears(baseDate, iteration)
    case 'quinzenal':
      return addDays(baseDate, 14 * iteration)
    case 'semanal':
      return addDays(baseDate, 7 * iteration)
    default:
      return baseDate
  }
}

// ── createBill ────────────────────────────────────────────────────────────────
// Cria um lançamento avulso ou uma série recorrente.
// Para séries, gera `recurrence_count` instâncias a partir de `due_date`.

export async function createBill(data: BillCreateSchema) {
  try {
    const { companyId, user } = await getAdminContext('financeiro')
    const parsed = billCreateSchema.safeParse(data)

    if (!parsed.success) {
      return { error: parsed.error.issues[0].message }
    }

    const supabase = await createClient()
    const isRecurring = !!parsed.data.recurrence
    const count = isRecurring ? (parsed.data.recurrence_count ?? 1) : 1
    const groupId = isRecurring ? crypto.randomUUID() : null

    const rows = Array.from({ length: count }, (_, i) => ({
      company_id: companyId,
      branch_id: parsed.data.branch_id,
      category: parsed.data.category,
      description: getBillDescription(parsed.data.description, parsed.data.category),
      supplier_id: parsed.data.supplier_id || null,
      amount: parsed.data.amount,
      due_date: getNextDueDate(parsed.data.due_date, parsed.data.recurrence ?? '', i),
      notes: parsed.data.notes?.trim() || null,
      recurrence: parsed.data.recurrence || null,
      recurrence_group_id: groupId,
      created_by: user.id,
    }))

    const { data: created, error } = await supabase
      .from('bills')
      .insert(rows)
      .select('id')

    if (error) throw error

    await createAuditLog({
      action: 'create',
      entityType: 'bill',
      entityId: created[0].id,
      companyId,
      summary: isRecurring
        ? `${count} lançamentos recorrentes criados: "${parsed.data.description}" (${parsed.data.recurrence}).`
        : `Lançamento criado: "${parsed.data.description}" — venc. ${parsed.data.due_date}.`,
      metadata: {
        category: parsed.data.category,
        amount: parsed.data.amount,
        recurrence: parsed.data.recurrence ?? null,
        count,
        recurrence_group_id: groupId,
      },
    })

    revalidateBillsPage()
    return { success: true, count }
  } catch (error: unknown) {
    return { error: getActionErrorMessage(error, 'Erro ao criar lançamento.') }
  }
}

// ── updateBill ────────────────────────────────────────────────────────────────
// Edita um lançamento individual (não afeta os demais da série).

export async function updateBill(id: string, data: BillEditSchema) {
  try {
    const { companyId } = await getAdminContext('financeiro')
    const parsed = billEditSchema.safeParse(data)

    if (!parsed.success) {
      return { error: parsed.error.issues[0].message }
    }

    const supabase = await createClient()

    const { data: existing, error: fetchError } = await supabase
      .from('bills')
      .select('id, description, status')
      .eq('id', id)
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .single()

    if (fetchError || !existing) return { error: 'Lançamento não encontrado.' }
    if (existing.status === 'pago') return { error: 'Não é possível editar um lançamento já pago.' }

    const { error } = await supabase
      .from('bills')
      .update({
        branch_id: parsed.data.branch_id,
        category: parsed.data.category,
        description: getBillDescription(parsed.data.description, parsed.data.category),
        supplier_id: parsed.data.supplier_id || null,
        amount: parsed.data.amount,
        due_date: parsed.data.due_date,
        notes: parsed.data.notes?.trim() || null,
      })
      .eq('id', id)
      .eq('company_id', companyId)

    if (error) throw error

    await createAuditLog({
      action: 'update',
      entityType: 'bill',
      entityId: id,
      companyId,
      summary: `Lançamento editado: "${existing.description}".`,
      metadata: { ...parsed.data },
    })

    revalidateBillsPage()
    return { success: true }
  } catch (error: unknown) {
    return { error: getActionErrorMessage(error, 'Erro ao editar lançamento.') }
  }
}

// ── deleteBill ────────────────────────────────────────────────────────────────
// Soft delete de um lançamento individual.

export async function deleteBill(id: string) {
  try {
    const { companyId } = await getAdminContext('financeiro')
    const supabase = await createClient()

    const { data: existing, error: fetchError } = await supabase
      .from('bills')
      .select('id, description, status')
      .eq('id', id)
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .single()

    if (fetchError || !existing) return { error: 'Lançamento não encontrado.' }
    if (existing.status === 'pago') return { error: 'Não é possível excluir um lançamento já pago.' }

    const { error } = await supabase
      .from('bills')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('company_id', companyId)

    if (error) throw error

    await createAuditLog({
      action: 'delete',
      entityType: 'bill',
      entityId: id,
      companyId,
      summary: `Lançamento excluído: "${existing.description}".`,
      metadata: {},
    })

    revalidateBillsPage()
    return { success: true }
  } catch (error: unknown) {
    return { error: getActionErrorMessage(error, 'Erro ao excluir lançamento.') }
  }
}

// ── markBillAsPaid ────────────────────────────────────────────────────────────
// Registra o pagamento de um lançamento pendente.

export async function markBillAsPaid(id: string, data: BillMarkAsPaidSchema) {
  try {
    const { companyId } = await getAdminContext('financeiro')
    const parsed = billMarkAsPaidSchema.safeParse(data)

    if (!parsed.success) {
      return { error: parsed.error.issues[0].message }
    }

    const supabase = await createClient()

    const { data: existing, error: fetchError } = await supabase
      .from('bills')
      .select('id, description, amount, status')
      .eq('id', id)
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .single()

    if (fetchError || !existing) return { error: 'Lançamento não encontrado.' }
    if (existing.status === 'pago') return { error: 'Este lançamento já foi pago.' }

    const { error } = await supabase
      .from('bills')
      .update({
        status: 'pago',
        paid_at: new Date(`${parsed.data.paid_at}T12:00:00`).toISOString(),
        payment_method: parsed.data.payment_method,
        payment_notes: parsed.data.payment_notes?.trim() || null,
      })
      .eq('id', id)
      .eq('company_id', companyId)

    if (error) throw error

    await createAuditLog({
      action: 'update',
      entityType: 'bill',
      entityId: id,
      companyId,
      summary: `Lançamento pago: "${existing.description}" — R$ ${Number(existing.amount).toFixed(2).replace('.', ',')} via ${parsed.data.payment_method}.`,
      metadata: {
        amount: existing.amount,
        payment_method: parsed.data.payment_method,
        paid_at: parsed.data.paid_at,
      },
    })

    revalidateBillsPage()
    return { success: true }
  } catch (error: unknown) {
    return { error: getActionErrorMessage(error, 'Erro ao registrar pagamento.') }
  }
}

// ── getBills ──────────────────────────────────────────────────────────────────
// Lista lançamentos com filtros opcionais.

export type GetBillsFilters = {
  branchId?: string
  status?: string   // 'pendente' | 'pago' | 'vencido'
  category?: string
  dueDateFrom?: string
  dueDateTo?: string
}

export async function getBills(
  filters: GetBillsFilters = {},
): Promise<{ data: BillRow[] | null; error?: string }> {
  try {
    const { companyId } = await getAdminContext('financeiro')
    const supabase = await createClient()
    const today = new Date().toISOString().slice(0, 10)

    let query = supabase
      .from('bills')
      .select(
        'id, company_id, branch_id, category, description, supplier_id, amount, due_date, status, paid_at, payment_method, payment_notes, notes, recurrence, recurrence_group_id, created_by, created_at, suppliers(name), branches(name), profiles!created_by(name)',
      )
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .order('due_date', { ascending: true })
      .order('created_at', { ascending: false })
      .limit(500)

    if (filters.branchId) {
      query = query.eq('branch_id', filters.branchId)
    }

    if (filters.category) {
      query = query.eq('category', filters.category)
    }

    if (filters.dueDateFrom) {
      query = query.gte('due_date', filters.dueDateFrom)
    }

    if (filters.dueDateTo) {
      query = query.lte('due_date', filters.dueDateTo)
    }

    // status 'vencido' é derivado: filtramos pendente + due_date < today
    if (filters.status === 'vencido') {
      query = query.eq('status', 'pendente').lt('due_date', today)
    } else if (filters.status === 'pendente') {
      query = query.eq('status', 'pendente').gte('due_date', today)
    } else if (filters.status === 'pago') {
      query = query.eq('status', 'pago')
    }

    const { data, error } = await query

    if (error) throw error

    return { data: ((data ?? []) as BillQueryRow[]).map(normalizeBillRow) }
  } catch (error: unknown) {
    return { error: getActionErrorMessage(error, 'Erro ao buscar lançamentos.'), data: null }
  }
}

// ── getBillsSummary ───────────────────────────────────────────────────────────
// Retorna totais para os cards de resumo.

export async function getBillsSummary(
  branchId?: string,
): Promise<{ data: BillsSummary | null; error?: string }> {
  try {
    const { companyId } = await getAdminContext('financeiro')
    const supabase = await createClient()
    const today = new Date().toISOString().slice(0, 10)
    const [todayYear, todayMonth] = today.split('-').map(Number)
    const firstOfMonth = `${todayYear}-${String(todayMonth).padStart(2, '0')}-01`
    // Date.UTC(year, month, 0) = último dia do mês anterior ao `month` (0-indexed),
    // equivalente ao último dia de todayMonth — sem misturar UTC parse com métodos locais.
    const lastOfMonth = new Date(Date.UTC(todayYear, todayMonth, 0))
      .toISOString()
      .slice(0, 10)

    let baseQuery = supabase
      .from('bills')
      .select('amount, status, due_date, paid_at')
      .eq('company_id', companyId)
      .is('deleted_at', null)

    if (branchId) baseQuery = baseQuery.eq('branch_id', branchId)

    const { data, error } = await baseQuery

    if (error) throw error

    const rows = data ?? []

    let totalPendente = 0
    let totalVencido = 0
    let totalPagoMes = 0
    let countPendente = 0
    let countVencido = 0

    for (const row of rows) {
      const amount = Number(row.amount)
      if (row.status === 'pendente') {
        if (row.due_date < today) {
          totalVencido += amount
          countVencido++
        } else {
          totalPendente += amount
          countPendente++
        }
      } else if (row.status === 'pago') {
        const paidDate = row.paid_at ? row.paid_at.slice(0, 10) : null
        if (paidDate && paidDate >= firstOfMonth && paidDate <= lastOfMonth) {
          totalPagoMes += amount
        }
      }
    }

    return {
      data: {
        totalPendente: Math.round(totalPendente * 100) / 100,
        totalVencido: Math.round(totalVencido * 100) / 100,
        totalPagoMes: Math.round(totalPagoMes * 100) / 100,
        countPendente,
        countVencido,
      },
    }
  } catch (error: unknown) {
    return { error: getActionErrorMessage(error, 'Erro ao calcular resumo.'), data: null }
  }
}
