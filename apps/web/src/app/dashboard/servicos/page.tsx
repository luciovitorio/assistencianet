import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAdminContext } from '@/lib/auth/admin-context'
import { ServiceList } from './_components/service-list'

export default async function ServicosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  let companyId: string

  try {
    companyId = (await getAdminContext('servicos')).companyId
  } catch {
    redirect('/dashboard')
  }

  const { data: services } = await supabase
    .from('services')
    .select('id, name, code, category, price, estimated_duration_minutes, warranty_days, notes, active')
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .order('name', { ascending: true })

  return (
    <div className="space-y-6">
      <ServiceList initialServices={services || []} />
    </div>
  )
}
