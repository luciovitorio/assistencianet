import { redirect } from 'next/navigation'
import { CompanySettingsForm } from '../_components/company-settings-form'
import { getAdminContext } from '@/lib/auth/admin-context'
import { resolveCompanySettings } from '@/lib/company-settings'
import { createClient } from '@/lib/supabase/server'

export default async function ConfiguracoesSistemaPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  let companyId: string

  try {
    companyId = (await getAdminContext('configuracoes')).companyId
  } catch {
    redirect('/dashboard')
  }

  const { data: companySettings } = await supabase
    .from('company_settings')
    .select('device_types, default_warranty_days, default_estimate_validity_days')
    .eq('company_id', companyId)
    .maybeSingle()

  return (
    <div className="space-y-6">
      <CompanySettingsForm initialSettings={resolveCompanySettings(companySettings)} />
    </div>
  )
}
