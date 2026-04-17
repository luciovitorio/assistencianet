import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAdminContext } from '@/lib/auth/admin-context'
import { SupplierList } from './_components/supplier-list'

const sortSuppliersByBranchPreference = <
  T extends { name: string; origin_branch_id: string | null }
>(
  suppliers: T[],
  currentBranchId: string | null,
) =>
  [...suppliers].sort((a, b) => {
    const aPriority = currentBranchId && a.origin_branch_id === currentBranchId ? 0 : 1
    const bPriority = currentBranchId && b.origin_branch_id === currentBranchId ? 0 : 1

    if (aPriority !== bPriority) {
      return aPriority - bPriority
    }

    return a.name.localeCompare(b.name, 'pt-BR')
  })

export default async function FornecedoresPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  let companyId: string
  let currentBranchId: string | null
  let defaultOriginBranchId: string | null

  try {
    const context = await getAdminContext('fornecedores')
    companyId = context.companyId
    currentBranchId = context.currentBranchId
    defaultOriginBranchId = context.currentBranchId
  } catch {
    redirect('/dashboard')
  }

  const [{ data: suppliers }, { data: branches }] = await Promise.all([
    supabase
      .from('suppliers')
      .select('id, name, document, phone, email, address, notes, active, origin_branch_id, zip_code, street, number, complement, city, state')
      .eq('company_id', companyId)
      .is('deleted_at', null),
    supabase
      .from('branches')
      .select('id, name, is_main')
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .order('name', { ascending: true }),
  ])

  const resolvedDefaultOriginBranchId =
    defaultOriginBranchId ??
    branches?.find((branch) => branch.is_main)?.id ??
    branches?.[0]?.id ??
    null

  return (
    <div className="space-y-6">
      <SupplierList
        initialSuppliers={sortSuppliersByBranchPreference(suppliers || [], currentBranchId)}
        branches={branches || []}
        currentBranchId={currentBranchId}
        defaultOriginBranchId={resolvedDefaultOriginBranchId}
        isAdmin
      />
    </div>
  )
}
