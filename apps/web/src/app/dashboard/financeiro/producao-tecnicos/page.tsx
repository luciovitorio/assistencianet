import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCompanyContext } from '@/lib/auth/company-context'
import { getTechnicianProduction } from '@/app/actions/technician-production'
import { ProductionReport } from './_components/production-report'

function getCurrentMonthRange() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const lastDay = new Date(year, now.getMonth() + 1, 0).getDate()
  return {
    start: `${year}-${month}-01`,
    end: `${year}-${month}-${String(lastDay).padStart(2, '0')}`,
  }
}

export default async function ProducaoTecnicosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  let isAdmin: boolean

  try {
    const ctx = await getCompanyContext()
    isAdmin = ctx.isAdmin
  } catch {
    redirect('/dashboard')
  }

  if (!isAdmin) redirect('/dashboard')

  const { start, end } = getCurrentMonthRange()
  const { data: rows } = await getTechnicianProduction(start, end)

  return (
    <div className="space-y-6">
      <ProductionReport
        initialRows={rows ?? []}
        initialStart={start}
        initialEnd={end}
      />
    </div>
  )
}
