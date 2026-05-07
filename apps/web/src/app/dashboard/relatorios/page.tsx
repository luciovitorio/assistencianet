import { redirect } from 'next/navigation'
import { getCompanyContext } from '@/lib/auth/company-context'
import { ReportsHub } from './_components/reports-hub'

export default async function RelatoriosPage() {
  let isAdmin: boolean

  try {
    const context = await getCompanyContext()
    isAdmin = context.isAdmin
  } catch {
    redirect('/dashboard')
  }

  if (!isAdmin) redirect('/dashboard')

  return <ReportsHub />
}
