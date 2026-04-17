import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAdminContext } from '@/lib/auth/admin-context'
import { PartList } from './_components/part-list'

export default async function PecasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  let companyId: string

  try {
    companyId = (await getAdminContext('pecas')).companyId
  } catch {
    redirect('/dashboard')
  }

  const [{ data: parts }, { data: suppliers }] = await Promise.all([
    supabase
      .from('parts')
      .select('id, name, sku, category, unit, supplier_id, cost_price, sale_price, min_stock, notes, active')
      .eq('company_id', companyId)
      .is('deleted_at', null)
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
      <PartList
        initialParts={parts || []}
        suppliers={suppliers || []}
      />
    </div>
  )
}
