import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { AdminDashboard } from './_components/admin-dashboard'
import { TechnicianDashboard } from './_components/technician-dashboard'

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const employeeRole = user?.app_metadata?.role
  let forcePasswordChange = Boolean(user?.app_metadata?.force_password_change)

  if (!forcePasswordChange && user?.id) {
    const admin = createAdminClient()
    const { data } = await admin.auth.admin.getUserById(user.id)
    forcePasswordChange = Boolean(data.user?.app_metadata?.force_password_change)
  }

  if (forcePasswordChange) {
    redirect('/dashboard/alterar-senha')
  }

  const usesOperationalDashboard =
    employeeRole === 'tecnico' || employeeRole === 'atendente'

  if (usesOperationalDashboard) {
    return <TechnicianDashboard />
  }

  return <AdminDashboard />
}
