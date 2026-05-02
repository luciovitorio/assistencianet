import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAdminContext } from '@/lib/auth/admin-context'
import { getBillingBranchUsage } from '@/lib/billing/entitlements'
import { BranchList } from './_components/branch-list'

export default async function FiliaisPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  let companyId: string
  let isAdmin = false
  let upgradeHref = '/sem-plano'

  try {
    const context = await getAdminContext('filiais')
    companyId = context.companyId
    isAdmin = context.isAdmin
    upgradeHref = context.isOwner ? '/dashboard/assinatura' : '/sem-plano'
  } catch {
    redirect('/dashboard')
  }

  const [{ data: branches }, branchUsage] = await Promise.all([
    supabase
      .from('branches')
      .select('*')
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true })
      .order('id', { ascending: true }),
    getBillingBranchUsage(supabase, companyId),
  ])

  return (
    <div className="space-y-6">
      <BranchList
        initialBranches={branches || []}
        isAdmin={isAdmin}
        branchUsage={branchUsage}
        upgradeHref={upgradeHref}
      />
    </div>
  )
}
