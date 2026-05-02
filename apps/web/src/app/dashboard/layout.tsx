import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getCompanyContext } from '@/lib/auth/company-context'
import { getCompanySubscriptionAccess } from '@/lib/billing/entitlements'
import { DashboardShell } from './_components/dashboard-shell'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const initialIsExpanded = cookieStore.get('dashboard_sidebar_expanded')?.value !== 'false'
  const supabase = await createClient()

  let company: { id: string; name: string; owner_id: string } | null = null
  let userEmail = ''
  let isAdmin = false
  let canAccessFinancial = true
  let canAccessWhatsApp = true
  let canAccessReports = true
  let canManageSubscription = false

  try {
    const context = await getCompanyContext()
    const [companyResult, billingAccess] = await Promise.all([
      supabase.from('companies').select('id, name, owner_id').eq('id', context.companyId).maybeSingle(),
      getCompanySubscriptionAccess(supabase, context.companyId),
    ])

    company = companyResult.data
    userEmail = context.user.email || ''
    isAdmin = context.isOwner || context.isAdmin
    canManageSubscription = context.isOwner
    canAccessFinancial = billingAccess.active && billingAccess.hasFinancialModule
    canAccessWhatsApp = billingAccess.active && billingAccess.hasWhatsAppBot
    canAccessReports = billingAccess.active && billingAccess.hasAdvancedReports
  } catch (error) {
    if (error instanceof Error && error.message === 'Usuário não autenticado') {
      redirect('/login')
    }
    redirect('/onboarding/empresa')
  }

  const formatter = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Sao_Paulo',
  })
  const currentDate = formatter.format(new Date()).replace(/^\w/, (c) => c.toUpperCase())

  return (
    <DashboardShell
      companyId={company?.id || ''}
      companyName={company?.name || 'Assistência'}
      userEmail={userEmail}
      currentDate={currentDate}
      isAdmin={isAdmin}
      initialIsExpanded={initialIsExpanded}
      canAccessFinancial={canAccessFinancial}
      canAccessWhatsApp={canAccessWhatsApp}
      canAccessReports={canAccessReports}
      canManageSubscription={canManageSubscription}
    >
      {children}
    </DashboardShell>
  )
}
