import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getCompanyContext } from '@/lib/auth/company-context'
import { AdminDashboard } from './_components/admin-dashboard'
import { TechnicianDashboard } from './_components/technician-dashboard'
import { DashboardSkeleton } from './_components/dashboard-skeleton'

export default async function DashboardPage() {
  const { user, isAdmin } = await getCompanyContext()

  if (Boolean(user?.app_metadata?.force_password_change)) {
    redirect('/dashboard/alterar-senha')
  }

  if (!isAdmin) {
    return (
      <Suspense fallback={<DashboardSkeleton />}>
        <TechnicianDashboard />
      </Suspense>
    )
  }

  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <AdminDashboard />
    </Suspense>
  )
}
