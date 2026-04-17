import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCompanyContext } from '@/lib/auth/company-context'
import { firstRelation } from '@/lib/supabase/relations'
import { type ServiceOrderEstimateRecord } from './[id]/_components/service-order-estimates-panel'
import { ServiceOrderList, type ServiceOrderData } from './_components/service-order-list'

type RelationValue<T> = T | T[] | null
type ServiceOrderEstimateSummary = NonNullable<ServiceOrderData['service_order_estimates']>[number]

type ServiceOrderQueryRow = Omit<ServiceOrderData, 'service_order_estimates'> & {
  service_order_estimates: Array<
    Omit<ServiceOrderEstimateSummary, 'profiles'> & {
      profiles: RelationValue<{ name: string }>
    }
  > | null
}

const normalizeServiceOrder = (order: ServiceOrderQueryRow): ServiceOrderData => ({
  ...order,
  service_order_estimates:
    order.service_order_estimates?.map((estimate) => ({
      ...estimate,
      profiles: firstRelation(estimate.profiles),
    })) ?? null,
})

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
      'id, number, status, device_type, device_brand, device_model, device_serial, device_condition, reported_issue, estimated_delivery, notes, branch_id, client_id, technician_id, third_party_id, created_at, client_notified_at, client_notified_via, service_order_estimates(id, version, total_amount, status, valid_until, profiles!created_by(name))'
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
    { data: clients },
    { data: employees },
    { data: activeThirdParties },
  ] = await Promise.all([
    serviceOrdersQuery,
    supabase
      .from('branches')
      .select('id, name, is_main')
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .order('name', { ascending: true }),
    supabase
      .from('clients')
      .select('id, name, phone, document, email')
      .eq('company_id', companyId)
      .eq('active', true)
      .is('deleted_at', null)
      .order('name', { ascending: true }),
    supabase
      .from('employees')
      .select('id, name, role')
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
  ])

  const serviceOrderIds = (serviceOrders ?? []).map((order) => order.id)

  const [{ data: estimates }, { data: estimateItems }] =
    serviceOrderIds.length > 0
      ? await Promise.all([
          supabase
            .from('service_order_estimates')
            .select(
              'id, service_order_id, version, status, approval_channel, subtotal_amount, discount_amount, total_amount, valid_until, sent_at, approved_at, rejected_at, notes, created_at, warranty_days'
            )
            .eq('company_id', companyId)
            .in('service_order_id', serviceOrderIds)
            .order('version', { ascending: false }),
          supabase
            .from('service_order_estimate_items')
            .select(
              'id, estimate_id, part_id, item_type, description, quantity, unit_price, line_total, notes'
            )
            .eq('company_id', companyId)
            .in('service_order_id', serviceOrderIds)
            .order('created_at', { ascending: true }),
        ])
      : [{ data: [] }, { data: [] }]

  const itemsByEstimateId = new Map<string, ServiceOrderEstimateRecord['items']>()
  for (const item of estimateItems ?? []) {
    const existing = itemsByEstimateId.get(item.estimate_id) ?? []
    existing.push({
      id: item.id,
      part_id: item.part_id,
      item_type: item.item_type,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      line_total: item.line_total,
      notes: item.notes,
    })
    itemsByEstimateId.set(item.estimate_id, existing)
  }

  const estimateHistoriesByOrderId: Record<string, ServiceOrderEstimateRecord[]> = {}
  for (const estimate of estimates ?? []) {
    const existing = estimateHistoriesByOrderId[estimate.service_order_id] ?? []
    existing.push({
      id: estimate.id,
      version: estimate.version,
      status: estimate.status,
      approval_channel: estimate.approval_channel,
      subtotal_amount: estimate.subtotal_amount,
      discount_amount: estimate.discount_amount,
      total_amount: estimate.total_amount,
      valid_until: estimate.valid_until,
      sent_at: estimate.sent_at,
      approved_at: estimate.approved_at,
      rejected_at: estimate.rejected_at,
      notes: estimate.notes,
      created_at: estimate.created_at,
      warranty_days: estimate.warranty_days,
      items: itemsByEstimateId.get(estimate.id) ?? [],
    })
    estimateHistoriesByOrderId[estimate.service_order_id] = existing
  }

  const normalizedServiceOrders = ((serviceOrders ?? []) as ServiceOrderQueryRow[]).map(
    normalizeServiceOrder,
  )

  return (
    <div className="space-y-6">
      <ServiceOrderList
        initialOrders={normalizedServiceOrders}
        estimateHistoriesByOrderId={estimateHistoriesByOrderId}
        branches={branches || []}
        clients={clients || []}
        employees={employees || []}
        thirdParties={activeThirdParties || []}
        currentBranchId={currentBranchId}
        isAdmin={isAdmin}
      />
    </div>
  )
}
