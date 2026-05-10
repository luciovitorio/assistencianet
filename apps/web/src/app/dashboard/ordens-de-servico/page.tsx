import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCompanyContext } from '@/lib/auth/company-context'
import { getTableColumnsVisibility } from '@/lib/table-columns'
import { ServiceOrderList, type ServiceOrderData } from './_components/service-order-list'

type RpcRow = ServiceOrderData & {
  client_data: {
    id: string
    name: string
    phone: string | null
    document: string | null
    email: string | null
  }
}

type RpcResult = {
  total_count: number
  rows: RpcRow[]
}

const VALID_PER_PAGE = [10, 25, 50] as const

export default async function OrdensDeServicoPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const page = Math.max(1, Number(params.page) || 1)
  const perPage = VALID_PER_PAGE.includes(Number(params.perPage) as typeof VALID_PER_PAGE[number])
    ? Number(params.perPage)
    : 25
  const search = (typeof params.search === 'string' ? params.search : '') || ''
  const statusFilter = typeof params.status === 'string' && params.status
    ? params.status.split(',').filter(Boolean)
    : []
  const branchFilter = typeof params.branch === 'string' && params.branch
    ? params.branch.split(',').filter(Boolean)
    : []
  const technicianFilter = typeof params.technician === 'string' && params.technician
    ? params.technician.split(',').filter(Boolean)
    : []

  let companyId: string
  let currentBranchId: string | null
  let isAdmin: boolean
  let userId: string

  try {
    const context = await getCompanyContext()
    companyId = context.companyId
    currentBranchId = context.currentBranchId
    isAdmin = context.isAdmin
    userId = context.user.id
  } catch {
    redirect('/dashboard')
  }

  const supabase = await createClient()
  const offset = (page - 1) * perPage
  const q = search.trim() || null
  const searchNumber = q && /^\d+$/.test(q) ? parseInt(q, 10) : null

  // All queries fire in one parallel batch — the RPC absorbs the client JOIN
  // so there is no client-ID pre-fetch and no sequential waterfall.
  const [
    { data: rpcData, error: rpcError },
    { data: currentEmployee },
    { data: branches },
    { data: employees },
    { data: activeThirdParties },
    columnVisibility,
  ] = await Promise.all([
    supabase.rpc('list_service_orders_page', {
      p_company_id:      companyId,
      p_offset:          offset,
      p_limit:           perPage,
      p_search:          q ?? undefined,
      p_search_number:   searchNumber ?? undefined,
      p_statuses:        statusFilter.length > 0 ? statusFilter : undefined,
      p_branches:        branchFilter.length > 0 ? branchFilter : undefined,
      p_technicians:     technicianFilter.length > 0 ? technicianFilter : undefined,
      p_restrict_branch: !isAdmin && currentBranchId ? currentBranchId : undefined,
    }),
    supabase
      .from('employees')
      .select('id')
      .eq('user_id', userId)
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .maybeSingle(),
    supabase
      .from('branches')
      .select('id, name, is_main')
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .order('name', { ascending: true }),
    supabase
      .from('employees')
      .select('id, name, role, is_owner')
      .eq('company_id', companyId)
      .eq('active', true)
      .is('deleted_at', null)
      .order('name', { ascending: true }),
    supabase
      .from('third_parties')
      .select('id, name, type, default_return_days')
      .eq('company_id', companyId)
      .eq('active', true)
      .is('deleted_at', null)
      .order('name'),
    getTableColumnsVisibility(isAdmin ? 'ordens-de-servico:admin' : 'ordens-de-servico'),
  ])

  if (rpcError) {
    console.error('[OrdensDeServicoPage] rpc error', rpcError)
  }

  const result = (rpcData as RpcResult | null) ?? { total_count: 0, rows: [] }

  // Extract normalised service order rows and build the clients map from embedded client_data
  const clientsById = new Map<string, RpcRow['client_data']>()
  const serviceOrders: ServiceOrderData[] = result.rows.map((row) => {
    if (row.client_data) clientsById.set(row.client_data.id, row.client_data)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { client_data: _client_data, ...orderData } = row
    return orderData as ServiceOrderData
  })

  const totalCount = result.total_count
  const totalPages = Math.max(1, Math.ceil(totalCount / perPage))
  const safePage = Math.min(page, totalPages)

  return (
    <div className="space-y-6">
      <ServiceOrderList
        initialOrders={serviceOrders}
        branches={branches || []}
        clients={Array.from(clientsById.values())}
        employees={employees || []}
        thirdParties={activeThirdParties || []}
        currentBranchId={currentBranchId}
        currentEmployeeId={currentEmployee?.id ?? null}
        initialColumnVisibility={columnVisibility}
        isAdmin={isAdmin}
        totalCount={totalCount}
        currentPage={safePage}
        totalPages={totalPages}
        rowsPerPage={perPage}
      />
    </div>
  )
}
