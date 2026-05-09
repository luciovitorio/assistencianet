import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCompanyContext } from '@/lib/auth/company-context'
import { firstRelation } from '@/lib/supabase/relations'
import { getTableColumnsVisibility } from '@/lib/table-columns'
import { ServiceOrderList, type ServiceOrderData } from './_components/service-order-list'

type RelationValue<T> = T | T[] | null
type ServiceOrderEstimateSummary = NonNullable<ServiceOrderData['service_order_estimates']>[number]
type ServiceOrderClient = {
  id: string
  name: string
  phone: string | null
  document: string | null
  email: string | null
}

type ServiceOrderQueryRow = Omit<ServiceOrderData, 'service_order_estimates'> & {
  clients: RelationValue<ServiceOrderClient>
  service_order_estimates: Array<
    Omit<ServiceOrderEstimateSummary, 'profiles'> & {
      profiles: RelationValue<{ name: string }>
    }
  > | null
}

const normalizeServiceOrder = (order: ServiceOrderQueryRow): ServiceOrderData => {
  const serviceOrder = { ...order } as ServiceOrderData & {
    clients?: RelationValue<ServiceOrderClient>
  }
  delete serviceOrder.clients

  return {
    ...serviceOrder,
    service_order_estimates:
      order.service_order_estimates?.map((estimate) => ({
        ...estimate,
        profiles: firstRelation(estimate.profiles),
      })) ?? null,
  }
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

  const supabase = await createClient()

  let companyId: string
  let currentBranchId: string | null
  let isAdmin: boolean
  let currentEmployeeId: string | null = null

  try {
    const context = await getCompanyContext()
    companyId = context.companyId
    currentBranchId = context.currentBranchId
    isAdmin = context.isAdmin

    const { data: currentEmployee } = await supabase
      .from('employees')
      .select('id')
      .eq('user_id', context.user.id)
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .maybeSingle()

    currentEmployeeId = currentEmployee?.id ?? null
  } catch {
    redirect('/dashboard')
  }

  // Pre-query client IDs matching the search text (for name/phone/document search)
  let searchClientIds: string[] = []
  if (search.trim()) {
    const q = search.trim()
    const { data: matchingClients } = await supabase
      .from('clients')
      .select('id')
      .eq('company_id', companyId)
      .or(`name.ilike.%${q}%,phone.ilike.%${q}%,document.ilike.%${q}%`)
    searchClientIds = matchingClients?.map((c) => c.id) ?? []
  }

  const from = (page - 1) * perPage
  const to = from + perPage - 1

  const serviceOrdersQuery = supabase
    .from('service_orders')
    .select(
      'id, number, status, device_type, device_brand, device_model, device_serial, device_color, device_internal_code, device_condition, reported_issue, estimated_delivery, notes, branch_id, client_id, technician_id, third_party_id, created_at, client_notified_at, client_notified_via, clients!client_id(id, name, phone, document, email), service_order_estimates(id, version, total_amount, status, valid_until, profiles!created_by(name))',
      { count: 'exact' }
    )
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .order('number', { ascending: false })
    .range(from, to)

  if (!isAdmin && currentBranchId) {
    serviceOrdersQuery.eq('branch_id', currentBranchId)
  }

  if (statusFilter.length > 0) {
    serviceOrdersQuery.in('status', statusFilter)
  }

  if (branchFilter.length > 0) {
    serviceOrdersQuery.in('branch_id', branchFilter)
  }

  if (technicianFilter.length > 0) {
    serviceOrdersQuery.in('technician_id', technicianFilter)
  }

  if (search.trim()) {
    const q = search.trim()
    const isNumeric = /^\d+$/.test(q)
    const conditions: string[] = [
      `device_brand.ilike.%${q}%`,
      `device_model.ilike.%${q}%`,
      `device_serial.ilike.%${q}%`,
      `reported_issue.ilike.%${q}%`,
    ]
    if (isNumeric) conditions.unshift(`number.eq.${parseInt(q, 10)}`)
    if (searchClientIds.length > 0) conditions.push(`client_id.in.(${searchClientIds.join(',')})`)
    serviceOrdersQuery.or(conditions.join(','))
  }

  const [
    { data: serviceOrders, count: totalCount },
    { data: branches },
    { data: employees },
    { data: activeThirdParties },
    columnVisibility,
  ] = await Promise.all([
    serviceOrdersQuery,
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

  const serviceOrderRows = (serviceOrders ?? []) as ServiceOrderQueryRow[]
  const normalizedServiceOrders = serviceOrderRows.map(normalizeServiceOrder)
  const clientsById = new Map<string, ServiceOrderClient>()

  for (const order of serviceOrderRows) {
    const client = firstRelation(order.clients)
    if (client) clientsById.set(client.id, client)
  }

  const resolvedTotalCount = totalCount ?? 0
  const totalPages = Math.max(1, Math.ceil(resolvedTotalCount / perPage))
  const safePage = Math.min(page, totalPages)

  return (
    <div className="space-y-6">
      <ServiceOrderList
        initialOrders={normalizedServiceOrders}
        branches={branches || []}
        clients={Array.from(clientsById.values())}
        employees={employees || []}
        thirdParties={activeThirdParties || []}
        currentBranchId={currentBranchId}
        currentEmployeeId={currentEmployeeId}
        initialColumnVisibility={columnVisibility}
        isAdmin={isAdmin}
        totalCount={resolvedTotalCount}
        currentPage={safePage}
        totalPages={totalPages}
        rowsPerPage={perPage}
      />
    </div>
  )
}
