import { createClient } from '@/lib/supabase/server'
import { EmpresaForm } from './empresa-form'

export default async function OnboardingEmpresaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const defaultName = (user?.user_metadata?.company_name as string) ?? ''

  return <EmpresaForm defaultName={defaultName} />
}
