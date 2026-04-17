import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAdminContext } from '@/lib/auth/admin-context'
import { ThirdPartyList } from './_components/third-party-list'

export default async function TerceirosPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  let companyId: string

  try {
    const context = await getAdminContext('terceiros')
    companyId = context.companyId
  } catch {
    redirect('/dashboard')
  }

  const { data: thirdParties } = await supabase
    .from('third_parties')
    .select('id, name, type, document, phone, email, default_return_days, notes, active')
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .order('name', { ascending: true })

  return (
    <div className="space-y-6">
      <ThirdPartyList
        initialThirdParties={thirdParties || []}
        isAdmin
      />
    </div>
  )
}
