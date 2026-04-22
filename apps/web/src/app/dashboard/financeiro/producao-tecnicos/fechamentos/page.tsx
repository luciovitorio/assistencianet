import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCompanyContext } from '@/lib/auth/company-context'
import { listPayouts } from '@/app/actions/technician-payouts'
import { PayoutsList } from './_components/payouts-list'

export default async function FechamentosPage() {
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

  const { data: payouts } = await listPayouts()

  return (
    <div className="space-y-6">
      <PayoutsList payouts={payouts ?? []} />
    </div>
  )
}
