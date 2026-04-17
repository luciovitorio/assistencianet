import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAdminContext } from '@/lib/auth/admin-context'
import { AuditLogList } from './_components/audit-log-list'

export default async function LogsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  let companyId: string

  try {
    companyId = (await getAdminContext('logs')).companyId
  } catch {
    redirect('/dashboard')
  }

  const { data: logs } = await supabase
    .from('audit_logs')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <AuditLogList initialLogs={logs || []} />
    </div>
  )
}
