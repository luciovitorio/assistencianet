import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAdminContext } from '@/lib/auth/admin-context'
import { EmployeeList } from './_components/employee-list'

export default async function FuncionariosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  let companyId: string

  try {
    companyId = (await getAdminContext('funcionarios')).companyId
  } catch {
    redirect('/dashboard')
  }

  const [{ data: employees }, { data: branches }] = await Promise.all([
    supabase
      .from('employees')
      .select('id, name, role, email, phone, cpf, active, branch_id, user_id, labor_rate, is_owner')
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .order('name', { ascending: true }),
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
      <EmployeeList
        initialEmployees={employees || []}
        branches={branches || []}
        isAdmin
      />
    </div>
  )
}
