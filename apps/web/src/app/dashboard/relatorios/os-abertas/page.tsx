import { redirect } from 'next/navigation'
import { getCompanyContext } from '@/lib/auth/company-context'
import { getOpenOsReport } from '@/app/actions/specific-reports'
import { OsAbertasReport } from './_components/os-abertas-report'

export default async function OsAbertasPage() {
  let isAdmin: boolean

  try {
    const context = await getCompanyContext()
    isAdmin = context.isAdmin
  } catch {
    redirect('/dashboard')
  }

  if (!isAdmin) redirect('/dashboard')

  const result = await getOpenOsReport()

  if (result.error || !result.data) {
    throw new Error(result.error ?? 'Erro ao carregar relatório.')
  }

  return <OsAbertasReport initialData={result.data} />
}
