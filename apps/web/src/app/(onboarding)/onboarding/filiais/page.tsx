import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { FiliaisForm } from './filiais-form'

export default async function OnboardingFiliaisPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: company } = await supabase
    .from('companies')
    .select('name, phone')
    .eq('owner_id', user.id)
    .maybeSingle()

  if (!company) redirect('/onboarding/empresa')

  return (
    <FiliaisForm
      mainBranchDefaults={{
        name: company.name ?? '',
        phone: company.phone ?? '',
      }}
    />
  )
}
