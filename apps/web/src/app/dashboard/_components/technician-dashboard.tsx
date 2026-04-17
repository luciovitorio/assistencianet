import {
  Wrench,
  CheckCircle2,
  Package,
  AlertTriangle,
  Clock,
  ArrowRight,
  CalendarClock,
} from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getCompanyContext } from '@/lib/auth/company-context'
import { firstRelation } from '@/lib/supabase/relations'
import { WorkQueueTable, type WorkQueueOrder } from './work-queue-table'

type ClientRelation =
  | { name: string; phone: string | null }
  | { name: string; phone: string | null }[]
  | null

function formatDeliveryShort(dateStr: string): string {
  const [, month, day] = dateStr.split('-')
  return `${day}/${month}`
}

export async function TechnicianDashboard() {
  const { companyId, currentBranchId } = await getCompanyContext()
  const supabase = await createClient()

  const todayStr = new Date().toISOString().split('T')[0]

  const activeOrdersQuery = supabase
    .from('service_orders')
    .select('id, number, status, device_type, device_brand, device_model, reported_issue, estimated_delivery, clients(name, phone)')
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .neq('status', 'finalizado')
    .neq('status', 'cancelado')
    .order('number', { ascending: false })
    .limit(100)

  const concluidasQuery = supabase
    .from('service_orders')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .eq('status', 'finalizado')
    .gte('updated_at', todayStr)

  if (currentBranchId) {
    activeOrdersQuery.eq('branch_id', currentBranchId)
    concluidasQuery.eq('branch_id', currentBranchId)
  }

  const [{ data: activeOrders }, { count: concluidasHoje }] = await Promise.all([
    activeOrdersQuery,
    concluidasQuery,
  ])

  const orders = activeOrders ?? []

  const aguardandoPeca = orders.filter(o => o.status === 'aguardando_peca').length
  const urgentes = orders.filter(
    o => o.estimated_delivery && o.estimated_delivery < todayStr && o.status !== 'pronto',
  ).length

  const statusCounts = orders.reduce<Record<string, number>>((acc, o) => {
    acc[o.status] = (acc[o.status] ?? 0) + 1
    return acc
  }, {})

  // Urgentes (atrasadas) primeiro, depois por número decrescente
  const queue: WorkQueueOrder[] = [...orders]
    .sort((a, b) => {
      const aOverdue = !!a.estimated_delivery && a.estimated_delivery < todayStr && a.status !== 'pronto'
      const bOverdue = !!b.estimated_delivery && b.estimated_delivery < todayStr && b.status !== 'pronto'
      if (aOverdue && !bOverdue) return -1
      if (!aOverdue && bOverdue) return 1
      return b.number - a.number
    })
    .map((o) => ({
      id: o.id,
      number: o.number,
      status: o.status,
      device_type: o.device_type,
      device_brand: o.device_brand,
      device_model: o.device_model,
      reported_issue: o.reported_issue,
      estimated_delivery: o.estimated_delivery,
      client: firstRelation(o.clients as ClientRelation),
    }))

  const upcomingDeliveries = orders
    .filter(o => o.estimated_delivery)
    .sort((a, b) => (a.estimated_delivery! < b.estimated_delivery! ? -1 : 1))
    .slice(0, 6)

  const statusBreakdown = [
    { key: 'em_analise', label: 'Em Reparo', color: 'bg-primary' },
    { key: 'aguardando_peca', label: 'Aguardando Peça', color: 'bg-amber-500' },
    { key: 'pronto', label: 'Pronto p/ Entrega', color: 'bg-emerald-500' },
    { key: 'aguardando', label: 'Aguardando Início', color: 'bg-slate-400' },
  ]
  const totalActive = orders.length || 1

  return (
    <>
      {/* KPI CARDS */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-card text-card-foreground p-6 rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-muted-foreground text-sm font-medium">OS Abertas</p>
              <h3 className="text-3xl font-bold tracking-tight">{orders.length}</h3>
            </div>
            <div className="w-12 h-12 bg-primary/10 text-primary rounded-lg flex items-center justify-center">
              <Wrench className="size-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-xs text-muted-foreground font-medium">
            <Clock className="size-4 mr-1" />
            <span>Em andamento</span>
          </div>
        </div>

        <div className="bg-card text-card-foreground p-6 rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-muted-foreground text-sm font-medium">Concluídas Hoje</p>
              <h3 className="text-3xl font-bold tracking-tight">{concluidasHoje ?? 0}</h3>
            </div>
            <div className="w-12 h-12 bg-emerald-500/10 text-emerald-600 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="size-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-xs text-emerald-600 font-medium">
            <CheckCircle2 className="size-4 mr-1" />
            <span>{(concluidasHoje ?? 0) > 0 ? 'Bom trabalho hoje!' : 'Nenhuma ainda hoje'}</span>
          </div>
        </div>

        <div className="bg-card text-card-foreground p-6 rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-muted-foreground text-sm font-medium">Aguardando Peça</p>
              <h3 className="text-3xl font-bold tracking-tight">{aguardandoPeca}</h3>
            </div>
            <div className="w-12 h-12 bg-amber-500/10 text-amber-600 rounded-lg flex items-center justify-center">
              <Package className="size-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-xs text-amber-600 font-medium">
            <Package className="size-4 mr-1" />
            <span>Pendentes de material</span>
          </div>
        </div>

        <div className="bg-card text-card-foreground p-6 rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-muted-foreground text-sm font-medium">Urgentes</p>
              <h3 className="text-3xl font-bold tracking-tight">{urgentes}</h3>
            </div>
            <div className="w-12 h-12 bg-destructive/10 text-destructive rounded-lg flex items-center justify-center">
              <AlertTriangle className="size-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-xs text-destructive font-medium">
            <AlertTriangle className="size-4 mr-1" />
            <span>Requer atenção imediata</span>
          </div>
        </div>
      </section>

      {/* FILA DE TRABALHO */}
      <section className="bg-card text-card-foreground border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-border flex justify-between items-center bg-muted/30">
          <div>
            <h2 className="text-xl font-bold">Fila de Trabalho</h2>
            <p className="text-muted-foreground text-sm">OS ativas — urgentes primeiro</p>
          </div>
          <Link
            href="/dashboard/ordens-de-servico"
            className="text-primary text-sm font-bold flex items-center hover:underline"
          >
            Ver Todas <ArrowRight className="size-4 ml-1" />
          </Link>
        </div>
        <WorkQueueTable orders={queue} todayStr={todayStr} />
      </section>

      {/* BOTTOM ROW */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* DISTRIBUIÇÃO POR STATUS */}
        <div className="bg-card text-card-foreground border border-border rounded-xl p-8 flex flex-col shadow-sm">
          <h3 className="text-lg font-bold mb-6">Distribuição por Status</h3>
          <div className="space-y-5 flex-1">
            {statusBreakdown.map(({ key, label, color }) => {
              const count = statusCounts[key] ?? 0
              const pct = Math.round((count / totalActive) * 100)
              return (
                <div key={key} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${color}`} />
                      <span className="font-medium">{label}</span>
                    </div>
                    <span className="text-muted-foreground font-bold">{count} OS</span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
          <div className="mt-8 pt-6 border-t border-border flex justify-between text-sm">
            <span className="text-muted-foreground font-medium">Total em andamento</span>
            <span className="font-bold text-foreground">{orders.length} OS</span>
          </div>
        </div>

        {/* PRÓXIMAS ENTREGAS */}
        <div className="bg-card text-card-foreground border border-border rounded-xl p-8 flex flex-col shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold">Próximas Entregas</h3>
            <CalendarClock className="size-5 text-muted-foreground" />
          </div>
          {upcomingDeliveries.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Sem entregas agendadas.
            </p>
          ) : (
            <div className="flex flex-col gap-3 flex-1">
              {upcomingDeliveries.map((os) => {
                const client = firstRelation(os.clients as ClientRelation)
                const isOverdue = os.estimated_delivery! < todayStr && os.status !== 'pronto'
                const equipment = [os.device_type, os.device_brand].filter(Boolean).join(' ')
                return (
                  <Link
                    key={os.id}
                    href={`/dashboard/ordens-de-servico/${os.id}`}
                    className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                      isOverdue
                        ? 'bg-destructive/5 border-destructive/20 hover:bg-destructive/10'
                        : 'bg-muted/40 border-border hover:bg-muted/70'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold ${
                          isOverdue ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'
                        }`}
                      >
                        {formatDeliveryShort(os.estimated_delivery!)}
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{equipment || os.device_type}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {client?.name ?? '—'} · #{os.number}
                        </p>
                      </div>
                    </div>
                    {isOverdue && (
                      <span className="text-[10px] font-bold text-destructive bg-destructive/10 px-2 py-1 rounded-full border border-destructive/20">
                        ATRASADO
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </section>
    </>
  )
}
