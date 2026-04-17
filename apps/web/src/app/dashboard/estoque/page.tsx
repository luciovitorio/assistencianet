import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCompanyContext } from '@/lib/auth/company-context'
import { StockList } from './_components/stock-list'

type EstoquePageSearchParams = {
  part?: string | string[]
  branch?: string | string[]
}

const getSingleSearchParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value

export default async function EstoquePage({
  searchParams,
}: {
  searchParams?: Promise<EstoquePageSearchParams>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const resolvedSearchParams = (await searchParams) ?? {}

  if (!user) redirect('/login')

  let companyId: string
  let isAdmin: boolean
  let currentBranchId: string | null

  try {
    const ctx = await getCompanyContext()
    companyId = ctx.companyId
    isAdmin = ctx.isAdmin
    currentBranchId = ctx.currentBranchId
  } catch {
    redirect('/dashboard')
  }

  const [{ data: parts }, { data: branches }, { data: suppliers }, { data: movements }, { data: reservations }] = await Promise.all([
    supabase
      .from('parts')
      .select('id, name, sku, category, unit, min_stock, active, supplier_id')
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .eq('active', true)
      .order('name', { ascending: true }),
    supabase
      .from('branches')
      .select('id, name')
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .eq('active', true)
      .order('name', { ascending: true }),
    supabase
      .from('suppliers')
      .select('id, name')
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .eq('active', true)
      .order('name', { ascending: true }),
    supabase
      .from('stock_movements')
      .select('part_id, branch_id, quantity')
      .eq('company_id', companyId),
    supabase
      .from('stock_reservations')
      .select('part_id, branch_id, quantity')
      .eq('company_id', companyId)
      .eq('status', 'ativa'),
  ])

  // Saldo físico por `${part_id}:${branch_id}`
  const stockByPartBranch: Record<string, number> = {}
  for (const m of movements ?? []) {
    const key = `${m.part_id}:${m.branch_id}`
    stockByPartBranch[key] = (stockByPartBranch[key] ?? 0) + m.quantity
  }

  // Reservado ativo por `${part_id}:${branch_id}`
  const reservedByPartBranch: Record<string, number> = {}
  for (const r of reservations ?? []) {
    const key = `${r.part_id}:${r.branch_id}`
    reservedByPartBranch[key] = (reservedByPartBranch[key] ?? 0) + r.quantity
  }

  return (
    <div className="space-y-6">
      <StockList
        parts={parts ?? []}
        branches={branches ?? []}
        suppliers={suppliers ?? []}
        stockByPartBranch={stockByPartBranch}
        reservedByPartBranch={reservedByPartBranch}
        isAdmin={isAdmin}
        currentBranchId={currentBranchId}
        initialPartId={getSingleSearchParam(resolvedSearchParams.part) ?? null}
        initialSelectedBranch={getSingleSearchParam(resolvedSearchParams.branch) ?? null}
      />
    </div>
  )
}
