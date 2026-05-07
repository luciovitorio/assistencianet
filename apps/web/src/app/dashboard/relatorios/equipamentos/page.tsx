import { redirect } from 'next/navigation'
import { getCompanyContext } from '@/lib/auth/company-context'
import { getEquipmentsReport } from '@/app/actions/specific-reports'
import { EquipamentosReport } from './_components/equipamentos-report'

const getDefaultRange = () => {
  const end = new Date()
  const start = new Date(end)
  start.setDate(end.getDate() - 29)
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  }
}

export default async function EquipamentosPage() {
  let isAdmin: boolean

  try {
    const context = await getCompanyContext()
    isAdmin = context.isAdmin
  } catch {
    redirect('/dashboard')
  }

  if (!isAdmin) redirect('/dashboard')

  const { startDate, endDate } = getDefaultRange()
  const result = await getEquipmentsReport({ startDate, endDate })

  if (result.error || !result.data) {
    throw new Error(result.error ?? 'Erro ao carregar relatório.')
  }

  return <EquipamentosReport initialData={result.data} initialStart={startDate} initialEnd={endDate} />
}
