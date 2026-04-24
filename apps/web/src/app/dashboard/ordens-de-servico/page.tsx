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

export default async function OrdensDeServicoPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  let companyId: string
  let currentBranchId: string | null
  let isAdmin: boolean

  try {
    const context = await getCompanyContext()
    companyId = context.companyId
    currentBranchId = context.currentBranchId
    isAdmin = context.isAdmin
  } catch {
    redirect('/dashboard')
  }

  const serviceOrdersQuery = supabase
    .from('service_orders')
    .select(
      'id, number, status, device_type, device_brand, device_model, device_serial, device_color, device_internal_code, device_condition, reported_issue, estimated_delivery, notes, branch_id, client_id, technician_id, third_party_id, created_at, client_notified_at, client_notified_via, clients!client_id(id, name, phone, document, email), service_order_estimates(id, version, total_amount, status, valid_until, profiles!created_by(name))'
    )
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .order('number', { ascending: false })

  if (!isAdmin && currentBranchId) {
    serviceOrdersQuery.eq('branch_id', currentBranchId)
  }

  const [
    { data: serviceOrders },
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

  return (
    <div className="space-y-6">
      <ServiceOrderList
        initialOrders={normalizedServiceOrders}
        branches={branches || []}
        clients={Array.from(clientsById.values())}
        employees={employees || []}
        thirdParties={activeThirdParties || []}
        currentBranchId={currentBranchId}
        initialColumnVisibility={columnVisibility}
        isAdmin={isAdmin}
      />
    </div>
  )
}
