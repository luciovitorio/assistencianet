import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

export interface CompanyContext {
  user: User
  companyId: string
  currentBranchId: string | null
  isOwner: boolean
  isAdmin: boolean
  isEmployee: boolean
}

export const getCompanyContext = async (): Promise<CompanyContext> => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Usuário não autenticado')
  }

  const [{ data: company, error: ownerCompanyError }, { data: employee }] = await Promise.all([
    supabase
      .from('companies')
      .select('id, owner_id')
      .eq('owner_id', user.id)
      .maybeSingle(),
    supabase
      .from('employees')
      .select('company_id, branch_id, role')
      .eq('user_id', user.id)
      .eq('active', true)
      .is('deleted_at', null)
      .maybeSingle(),
  ])

  const isOwner = !ownerCompanyError && company?.owner_id === user.id
  const isAdmin = isOwner || employee?.role === 'admin'
  const companyId = company?.id ?? employee?.company_id ?? null

  if (!companyId) {
    throw new Error('Usuário sem empresa vinculada.')
  }

  return {
    user,
    companyId,
    currentBranchId: employee?.branch_id ?? null,
    isOwner,
    isAdmin,
    isEmployee: Boolean(employee),
  }
}
