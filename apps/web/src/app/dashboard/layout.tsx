import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getCompanyContext } from '@/lib/auth/company-context'
import { DashboardShell } from './_components/dashboard-shell'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const initialIsExpanded = cookieStore.get('dashboard_sidebar_expanded')?.value !== 'false'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  let company: { id: string; name: string; owner_id: string } | null = null
  let isAdmin = false

  try {
    const context = await getCompanyContext()
    const { data: c } = await supabase
      .from('companies')
      .select('id, name, owner_id')
      .eq('id', context.companyId)
      .maybeSingle()

    company = c
    isAdmin = context.isOwner || context.isAdmin
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
    >
      {children}
    </DashboardShell>
  )
}
