import { redirect } from 'next/navigation'
import { getCompanyContext } from '@/lib/auth/company-context'
import { getBranchComparisonReport } from '@/app/actions/specific-reports'
import { ComparativoFiliaisReport } from './_components/comparativo-filiais-report'

const getDefaultRange = () => {
  const end = new Date()
  const start = new Date(end)
  start.setDate(end.getDate() - 29)
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  }
}

export default async function ComparativoFiliaisPage() {
  let isAdmin: boolean

  try {
    const context = await getCompanyContext()
    isAdmin = context.isAdmin
  } catch {
    redirect('/dashboard')
  }

  if (!isAdmin) redirect('/dashboard')

  const { startDate, endDate } = getDefaultRange()
  const result = await getBranchComparisonReport({ startDate, endDate })

  if (result.error || !result.data) {
    throw new Error(result.error ?? 'Erro ao carregar relatório.')
  }

  return (
    <ComparativoFiliaisReport
      initialData={result.data}
      initialStart={startDate}
      initialEnd={endDate}
    />
  )
}
