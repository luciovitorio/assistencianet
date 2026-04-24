import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCompanyContext } from '@/lib/auth/company-context'
import { ServiceOrderForm, type ServiceOrderInitialData } from '../../_components/service-order-form'

export default async function EditarOrdemDeServicoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  let companyId: string
  let isAdmin: boolean

  try {
    const context = await getCompanyContext()
    companyId = context.companyId
    isAdmin = context.isAdmin
  } catch {
    redirect('/dashboard')
  }

  const [
    { data: os },
    { data: branches },
    { data: employees },
  ] = await Promise.all([
    supabase
      .from('service_orders')
      .select('*')
      .eq('id', id)
      .eq('company_id', companyId)
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
  ])

  if (!os) {
    notFound()
  }

  if (!['aguardando', 'em_analise', 'reprovado'].includes(os.status)) {
    redirect(`/dashboard/ordens-de-servico/${os.id}`)
  }

  const [{ data: client }, { data: equipment }] = await Promise.all([
    supabase
      .from('clients')
      .select('id, name, phone, document')
      .eq('id', os.client_id)
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .maybeSingle(),
    os.equipment_model_id
      ? supabase
          .from('equipment_models')
          .select('id, type, manufacturer, model, voltage')
          .eq('id', os.equipment_model_id)
          .eq('company_id', companyId)
          .is('deleted_at', null)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  const initialData: ServiceOrderInitialData = {
    id: os.id,
    number: os.number,
    status: os.status,
    branch_id: os.branch_id ?? '',
    client_id: os.client_id,
    equipment_model_id: os.equipment_model_id,
    device_type: os.device_type,
    device_brand: os.device_brand,
    device_model: os.device_model,
    device_serial: os.device_serial,
    device_color: os.device_color,
    device_internal_code: os.device_internal_code,
    device_condition: os.device_condition,
    reported_issue: os.reported_issue,
    technician_id: os.technician_id,
    estimated_delivery: os.estimated_delivery,
    notes: os.notes,
  }

  return (
    <ServiceOrderForm
      branches={branches || []}
      clients={client ? [client] : []}
      employees={employees || []}
      equipments={equipment ? [equipment] : []}
      defaultBranchId={os.branch_id || null}
      initialData={initialData}
      isAdmin={isAdmin}
    />
  )
}
