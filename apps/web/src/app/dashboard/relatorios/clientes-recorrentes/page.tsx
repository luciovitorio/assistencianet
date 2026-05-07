import { redirect } from 'next/navigation'
import { getCompanyContext } from '@/lib/auth/company-context'
import { getClientRecurrenceReport } from '@/app/actions/specific-reports'
import { ClientesRecorrentesReport } from './_components/clientes-recorrentes-report'

const getDefaultRange = () => {
  const end = new Date()
  const start = new Date(end)
  start.setDate(end.getDate() - 29)
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  }
}

export default async function ClientesRecorrentesPage() {
  let isAdmin: boolean

  try {
    const context = await getCompanyContext()
    isAdmin = context.isAdmin
  } catch {
    redirect('/dashboard')
  }

  if (!isAdmin) redirect('/dashboard')

  const { startDate, endDate } = getDefaultRange()
  const result = await getClientRecurrenceReport({ startDate, endDate })

  if (result.error || !result.data) {
    throw new Error(result.error ?? 'Erro ao carregar relatório.')
  }

  return <ClientesRecorrentesReport initialData={result.data} initialStart={startDate} initialEnd={endDate} />
}
