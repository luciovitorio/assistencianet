import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getCompanyContext } from '@/lib/auth/company-context'
import { hasSubscriptionAccess, isTrialActive } from '@/lib/stripe/plans'
import { DashboardShell } from './_components/dashboard-shell'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const initialIsExpanded = cookieStore.get('dashboard_sidebar_expanded')?.value !== 'false'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  let company: { id: string; name: string; owner_id: string } | null = null
  let isAdmin = false
  let canAccessFinancial = true
  let canAccessWhatsApp = true
  let canAccessReports = true

  try {
    const context = await getCompanyContext()
    const [companyResult, subscriptionResult] = await Promise.all([
      supabase.from('companies').select('id, name, owner_id').eq('id', context.companyId).maybeSingle(),
      supabase.from('subscriptions').select('status, trial_ends_at, plan_id').eq('company_id', context.companyId).maybeSingle(),
    ])

    company = companyResult.data
    isAdmin = context.isOwner || context.isAdmin

    const sub = subscriptionResult.data
    const hasProPlanAccess = Boolean(
      hasSubscriptionAccess(sub) && (isTrialActive(sub) || sub?.plan_id !== 'basico'),
    )
    canAccessFinancial = hasProPlanAccess
    canAccessWhatsApp = hasProPlanAccess
    canAccessReports = hasProPlanAccess
  } catch {
    redirect('/onboarding/empresa')
  }

  const formatter = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  })
  const currentDate = formatter.format(new Date()).replace(/^\w/, (c) => c.toUpperCase())

  return (
    <DashboardShell
      companyId={company?.id || ''}
      companyName={company?.name || 'Assistência'}
      userEmail={user?.email || ''}
      currentDate={currentDate}
      isAdmin={isAdmin}
      initialIsExpanded={initialIsExpanded}
      canAccessFinancial={canAccessFinancial}
      canAccessWhatsApp={canAccessWhatsApp}
      canAccessReports={canAccessReports}
    >
      {children}
    </DashboardShell>
  )
}
