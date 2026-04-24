import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCompanyContext } from '@/lib/auth/company-context'
import { ServiceOrderForm } from '../_components/service-order-form'

export default async function NovaOrdemDeServicoPage() {
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

  const currentYear = new Date().getFullYear()

  const [
    { data: branches },
    { data: employees },
    { data: lastOrder },
  ] = await Promise.all([
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
    // Busca o maior número do ano atual para calcular o próximo
    supabase
      .from('service_orders')
      .select('number')
      .eq('company_id', companyId)
      .gte('number', currentYear * 10000)
      .lt('number', (currentYear + 1) * 10000)
      .order('number', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const nextNumber = lastOrder ? lastOrder.number + 1 : currentYear * 10000 + 1

  const defaultBranchId =
    currentBranchId ??
    branches?.find((b) => b.is_main)?.id ??
    branches?.[0]?.id ??
    null

  // Resolve o nome da filial padrão — inclui fallback para branches excluídas
  let defaultBranchName: string | null =
    branches?.find((b) => b.id === defaultBranchId)?.name ?? null

  if (!defaultBranchName && defaultBranchId) {
    const { data: branch } = await supabase
      .from('branches')
      .select('name')
      .eq('id', defaultBranchId)
      .maybeSingle()
    defaultBranchName = branch?.name ?? null
  }

  return (
    <ServiceOrderForm
      branches={branches || []}
      clients={[]}
      employees={employees || []}
      equipments={[]}
      defaultBranchId={defaultBranchId}
      defaultBranchName={defaultBranchName}
      nextNumber={nextNumber}
      isAdmin={isAdmin}
    />
  )
}
