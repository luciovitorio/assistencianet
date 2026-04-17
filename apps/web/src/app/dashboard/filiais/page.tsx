import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAdminContext } from '@/lib/auth/admin-context'
import { BranchList } from './_components/branch-list'

export default async function FiliaisPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  let companyId: string

  try {
    companyId = (await getAdminContext('filiais')).companyId
  } catch {
    redirect('/dashboard')
  }

  const { data: branches } = await supabase
    .from('branches')
    .select('*')
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })
    .order('id', { ascending: true })

  return (
    <div className="space-y-6">
      <BranchList initialBranches={branches || []} isAdmin />
    </div>
  )
}
