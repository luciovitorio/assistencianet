import { createClient } from '@/lib/supabase/server'
import { getCompanyContext } from '@/lib/auth/company-context'
import { History, UserCircle2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
})

export async function ServiceOrderTimeline({ serviceOrderId }: { serviceOrderId: string }) {
  const { companyId } = await getCompanyContext()
  const supabase = await createClient()

  const [{ data: serviceOrderLogs }, { data: estimates }] = await Promise.all([
    supabase
      .from('audit_logs')
      .select('id, action, summary, metadata, created_at, actor_name, actor_email')
      .eq('company_id', companyId)
      .eq('entity_type', 'service_order')
      .eq('entity_id', serviceOrderId)
      .order('created_at', { ascending: false }),
    supabase
      .from('service_order_estimates')
      .select('id')
      .eq('company_id', companyId)
      .eq('service_order_id', serviceOrderId)
      .is('deleted_at', null),
  ])

  const estimateIds = (estimates ?? []).map((estimate) => estimate.id)

  const { data: estimateLogs } =
    estimateIds.length === 0
      ? { data: [] }
      : await supabase
          .from('audit_logs')
          .select('id, action, summary, metadata, created_at, actor_name, actor_email')
          .eq('company_id', companyId)
          .eq('entity_type', 'service_order_estimate')
          .in('entity_id', estimateIds)
          .order('created_at', { ascending: false })

  const logs = [...(serviceOrderLogs ?? []), ...(estimateLogs ?? [])].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  if (!logs || logs.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
        Nenhum evento registrado nesta OS.
      </div>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2 pt-4">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <History className="size-4 text-primary" />
          Histórico
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="relative ml-2 border-l border-slate-200 pl-5 space-y-5">
          {logs.map((log) => (
            <div key={log.id} className="relative">
              <div className="absolute -left-5.5 top-1 size-2.5 rounded-full bg-slate-200 ring-2 ring-white" />
              <div className="flex flex-col gap-0.5">
                <p className="text-xs font-medium text-slate-800 leading-snug">{log.summary}</p>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                  <span>{dateFormatter.format(new Date(log.created_at))}</span>
                  {(log.actor_name || log.actor_email) && (
                    <span className="flex items-center gap-1">
                      <UserCircle2 className="size-3" />
                      {log.actor_name || log.actor_email}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
