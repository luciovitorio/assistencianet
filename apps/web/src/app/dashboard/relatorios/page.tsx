import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCompanyContext } from '@/lib/auth/company-context'
import { getBusinessReports } from '@/app/actions/reports'
import { ReportsDashboard } from './_components/reports-dashboard'

const getDefaultReportRange = () => {
  const end = new Date()
  const start = new Date(end)
  start.setDate(end.getDate() - 6)

  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  }
}

export default async function RelatoriosPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  let isAdmin: boolean

  try {
    const context = await getCompanyContext()
    isAdmin = context.isAdmin
  } catch {
    redirect('/dashboard')
  }

  if (!isAdmin) redirect('/dashboard')

  const { startDate, endDate } = getDefaultReportRange()
  const result = await getBusinessReports({ startDate, endDate })

  if (result.error || !result.data) {
    throw new Error(result.error ?? 'Erro ao carregar relatórios.')
  }

  return (
    <ReportsDashboard
      initialData={result.data}
      initialStart={startDate}
      initialEnd={endDate}
    />
  )
}
