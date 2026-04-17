import { createClient } from '@/lib/supabase/server'
import { AdminDashboard } from './_components/admin-dashboard'
import { TechnicianDashboard } from './_components/technician-dashboard'

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const employeeRole = user?.app_metadata?.role
  const usesOperationalDashboard =
    employeeRole === 'tecnico' || employeeRole === 'atendente'

  if (usesOperationalDashboard) {
    return <TechnicianDashboard />
  }

  return <AdminDashboard />
}
