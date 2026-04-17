import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCompanyContext } from '@/lib/auth/company-context'
import { getBills, getBillsSummary } from '@/app/actions/bills'
import { BillsList } from './_components/bills-list'

export default async function ContasAPagarPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  let companyId: string
  let isAdmin: boolean

  try {
    const ctx = await getCompanyContext()
    companyId = ctx.companyId
    isAdmin = ctx.isAdmin
  } catch {
    redirect('/dashboard')
  }

  if (!isAdmin) redirect('/dashboard')

  const [
    { data: bills },
    { data: summary },
    { data: branches },
    { data: suppliers },
  ] = await Promise.all([
    getBills(),
    getBillsSummary(),
    supabase
      .from('branches')
      .select('id, name')
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .eq('active', true)
      .order('name', { ascending: true }),
    supabase
      .from('suppliers')
      .select('id, name')
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .eq('active', true)
      .order('name', { ascending: true }),
  ])

  return (
    <div className="space-y-6">
      <BillsList
        bills={bills ?? []}
        summary={summary ?? {
          totalPendente: 0,
          totalVencido: 0,
          totalPagoMes: 0,
          countPendente: 0,
          countVencido: 0,
        }}
        branches={branches ?? []}
        suppliers={suppliers ?? []}
        isAdmin={isAdmin}
      />
    </div>
  )
}
