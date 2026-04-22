import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCompanyContext } from '@/lib/auth/company-context'
import { getTechnicianProduction } from '@/app/actions/technician-production'
import { ProductionReport } from './_components/production-report'

function toIso(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

function getCurrentFridayWeek() {
  const now = new Date()
  const daysUntilFriday = (5 - now.getDay() + 7) % 7
  const end = new Date(now)
  end.setDate(end.getDate() + daysUntilFriday)
  const start = new Date(end)
  start.setDate(start.getDate() - 6)
  return { start: toIso(start), end: toIso(end) }
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

  const { start, end } = getCurrentFridayWeek()
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
