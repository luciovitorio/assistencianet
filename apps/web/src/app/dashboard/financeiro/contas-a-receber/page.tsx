import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCompanyContext } from '@/lib/auth/company-context'
import { getContasAReceber } from '@/app/actions/contas-a-receber'
import { ReceivablesList } from './_components/receivables-list'

export default async function ContasAReceberPage() {
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

  const [{ data: receivables }, { data: branches }] = await Promise.all([
    getContasAReceber(),
    supabase
      .from('branches')
      .select('id, name')
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .eq('active', true)
      .order('name', { ascending: true }),
  ])

  return (
    <div className="space-y-6">
      <ReceivablesList
        receivables={receivables ?? []}
        branches={branches ?? []}
      />
    </div>
  )
}
