import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCompanyContext } from '@/lib/auth/company-context'
import { resolveCompanySettings } from '@/lib/company-settings'
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
    { data: clients },
    { data: employees },
    { data: companySettings },
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
      .from('clients')
      .select('id, name, phone, document')
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
      .from('company_settings')
      .select('device_types, default_warranty_days, default_estimate_validity_days')
      .eq('company_id', companyId)
      .maybeSingle(),
  ])

  if (!os) {
    notFound()
  }

  if (!['aguardando', 'em_analise', 'reprovado'].includes(os.status)) {
    redirect(`/dashboard/ordens-de-servico/${os.id}`)
  }

  const resolvedSettings = resolveCompanySettings(companySettings)

  const initialData: ServiceOrderInitialData = {
    id: os.id,
    number: os.number,
    status: os.status,
    branch_id: os.branch_id ?? '',
    client_id: os.client_id,
    device_type: os.device_type,
    device_brand: os.device_brand,
    device_model: os.device_model,
    device_serial: os.device_serial,
    device_condition: os.device_condition,
    reported_issue: os.reported_issue,
    technician_id: os.technician_id,
    estimated_delivery: os.estimated_delivery,
    notes: os.notes,
  }

  return (
    <ServiceOrderForm
      branches={branches || []}
      clients={clients || []}
      employees={employees || []}
      deviceTypes={resolvedSettings.deviceTypes}
      defaultBranchId={os.branch_id || null}
      initialData={initialData}
      isAdmin={isAdmin}
    />
  )
}
