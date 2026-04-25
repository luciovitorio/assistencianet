import Link from 'next/link'
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  DollarSign,
  FileSpreadsheet,
  ReceiptText,
  Wrench,
} from 'lucide-react'
import { getDashboardOverview, type DashboardBranchPerformanceRow, type DashboardRecentServiceOrder } from '@/app/actions/dashboard'
import { buttonVariants } from '@/components/ui/button-variants'
import { cn } from '@/lib/utils'
import { STATUS_COLORS, STATUS_LABELS, type ServiceOrderStatus } from '@/lib/validations/service-order'

const formatCurrency = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const formatNumber = (value: number) => value.toLocaleString('pt-BR')

const formatDate = (date: string) => new Date(date).toLocaleDateString('pt-BR')

const getStatusLabel = (status: string) =>
  STATUS_LABELS[status as ServiceOrderStatus] ?? status

const getStatusColor = (status: string) =>
  STATUS_COLORS[status as ServiceOrderStatus] ?? 'bg-muted text-muted-foreground'

export async function AdminDashboard() {
  const result = await getDashboardOverview()

  if (result.error || !result.data) {
    throw new Error(result.error ?? 'Erro ao carregar a dashboard.')
  }

  const { kpis, period, branchPerformance, recentServiceOrders } = result.data

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">Visão inicial da operação</p>
          <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            Indicadores reais de OS, faturamento, despesas e filiais no período {period.label}.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard/relatorios" className={cn(buttonVariants({ variant: 'outline' }))}>
            <FileSpreadsheet className="size-4" />
            Abrir relatórios
          </Link>
          <Link href="/dashboard/ordens-de-servico/nova" className={cn(buttonVariants())}>
            Nova OS
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="OS abertas"
          value={formatNumber(kpis.openServiceOrders)}
          helper="Em andamento agora"
          icon={<Wrench className="size-5" />}
          tone="primary"
        />
        <KpiCard
          label="OS entregues"
          value={formatNumber(kpis.deliveredServiceOrders)}
          helper="Entregues no mês atual"
          icon={<CheckCircle2 className="size-5" />}
          tone="success"
        />
        <KpiCard
          label="Faturamento"
          value={formatCurrency(kpis.revenue)}
          helper={`Ticket médio: ${formatCurrency(kpis.averageTicket)}`}
          icon={<DollarSign className="size-5" />}
          tone="revenue"
        />
        <KpiCard
          label="Despesas operacionais"
          value={formatCurrency(kpis.operationalExpenses)}
          helper={`Pagas no mês · Resultado: ${formatCurrency(kpis.netResult)}`}
          icon={<ReceiptText className="size-5" />}
          tone="expense"
        />
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="overflow-hidden rounded-lg border bg-card shadow-sm xl:col-span-2">
          <div className="flex flex-col gap-3 border-b bg-muted/20 px-6 py-5 md:flex-row md:items-start md:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-primary/10 p-2 text-primary">
                <Building2 className="size-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Comparativo entre filiais</h3>
                <p className="text-sm text-muted-foreground">
                  Receita, despesas pagas, OS abertas e OS entregues no mês.
                </p>
              </div>
            </div>
            <Link
              href="/dashboard/relatorios"
              className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
            >
              Ver análise completa
              <ArrowRight className="size-4" />
            </Link>
          </div>
          <BranchPerformanceTable rows={branchPerformance} />
        </div>

        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h3 className="text-lg font-semibold">Resumo financeiro</h3>
          <p className="text-sm text-muted-foreground">Mês atual por caixa realizado.</p>
          <div className="mt-6 space-y-4">
            <FinancialLine label="Faturamento" value={kpis.revenue} tone="positive" />
            <FinancialLine label="Despesas pagas" value={kpis.operationalExpenses} tone="negative" />
            <div className="border-t pt-4">
              <FinancialLine
                label="Resultado"
                value={kpis.netResult}
                tone={kpis.netResult >= 0 ? 'positive' : 'negative'}
                strong
              />
            </div>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border bg-card shadow-sm">
        <div className="flex flex-col gap-3 border-b bg-muted/20 px-6 py-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-lg font-semibold">Últimas ordens de serviço</h3>
            <p className="text-sm text-muted-foreground">Acompanhamento operacional com dados reais.</p>
          </div>
          <Link
            href="/dashboard/ordens-de-servico"
            className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
          >
            Ver todas
            <ArrowRight className="size-4" />
          </Link>
        </div>
        <RecentServiceOrdersTable rows={recentServiceOrders} />
      </section>
    </div>
  )
}

function KpiCard({
  label,
  value,
  helper,
  icon,
  tone,
}: {
  label: string
  value: string
  helper: string
  icon: React.ReactNode
  tone: 'primary' | 'success' | 'revenue' | 'expense'
}) {
  const toneClass = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-emerald-500/10 text-emerald-600',
    revenue: 'bg-indigo-500/10 text-indigo-600',
    expense: 'bg-destructive/10 text-destructive',
  }[tone]

  return (
    <div className="rounded-lg border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="mt-1 text-3xl font-bold tracking-tight tabular-nums">{value}</p>
        </div>
        <div className={cn('flex size-11 items-center justify-center rounded-lg', toneClass)}>
          {icon}
        </div>
      </div>
      <p className="mt-4 text-xs font-medium text-muted-foreground">{helper}</p>
    </div>
  )
}

function BranchPerformanceTable({ rows }: { rows: DashboardBranchPerformanceRow[] }) {
  const maxRevenue = Math.max(...rows.map((row) => row.revenue), 1)

  if (rows.length === 0) {
    return (
      <div className="p-8 text-center text-sm text-muted-foreground">
        Nenhuma filial ativa encontrada.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-muted-foreground">
            <th className="px-6 py-3 text-left font-medium">Filial</th>
            <th className="px-4 py-3 text-right font-medium">OS abertas</th>
            <th className="px-4 py-3 text-right font-medium">OS entregues</th>
            <th className="px-4 py-3 text-right font-medium">Faturamento</th>
            <th className="px-4 py-3 text-right font-medium">Despesas</th>
            <th className="px-6 py-3 text-right font-medium">Resultado</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((row) => (
            <tr key={row.branch_id} className="hover:bg-muted/20">
              <td className="min-w-52 px-6 py-4">
                <div className="font-semibold">{row.branch_name}</div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${Math.max(6, (row.revenue / maxRevenue) * 100)}%` }}
                  />
                </div>
              </td>
              <td className="px-4 py-4 text-right tabular-nums">{formatNumber(row.open_orders)}</td>
              <td className="px-4 py-4 text-right tabular-nums">{formatNumber(row.delivered_orders)}</td>
              <td className="px-4 py-4 text-right tabular-nums">{formatCurrency(row.revenue)}</td>
              <td className="px-4 py-4 text-right tabular-nums text-muted-foreground">
                {formatCurrency(row.expenses)}
              </td>
              <td className="px-6 py-4 text-right font-semibold tabular-nums">
                {formatCurrency(row.net_result)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function FinancialLine({
  label,
  value,
  tone,
  strong = false,
}: {
  label: string
  value: number
  tone: 'positive' | 'negative'
  strong?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className={cn('text-sm text-muted-foreground', strong && 'font-semibold text-foreground')}>
        {label}
      </span>
      <span
        className={cn(
          'text-sm tabular-nums',
          strong && 'text-base font-bold',
          tone === 'positive' ? 'text-emerald-700' : 'text-destructive',
        )}
      >
        {formatCurrency(value)}
      </span>
    </div>
  )
}

function RecentServiceOrdersTable({ rows }: { rows: DashboardRecentServiceOrder[] }) {
  if (rows.length === 0) {
    return (
      <div className="p-8 text-center text-sm text-muted-foreground">
        Nenhuma ordem de serviço cadastrada ainda.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b bg-muted/30 text-xs uppercase text-muted-foreground">
            <th className="px-6 py-3 font-semibold">OS</th>
            <th className="px-4 py-3 font-semibold">Cliente</th>
            <th className="px-4 py-3 font-semibold">Equipamento</th>
            <th className="px-4 py-3 font-semibold">Status</th>
            <th className="px-4 py-3 font-semibold">Filial</th>
            <th className="px-6 py-3 text-right font-semibold">Abertura</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((order) => (
            <tr key={order.id} className="hover:bg-muted/20">
              <td className="px-6 py-4 font-bold text-primary">
                <Link href={`/dashboard/ordens-de-servico/${order.id}`} className="hover:underline">
                  #{order.number}
                </Link>
              </td>
              <td className="px-4 py-4">
                <div className="font-medium">{order.client_name}</div>
                <div className="text-xs text-muted-foreground">{order.client_phone ?? 'Sem telefone'}</div>
              </td>
              <td className="min-w-56 px-4 py-4 font-medium">{order.device}</td>
              <td className="px-4 py-4">
                <span className={cn('rounded-full px-2.5 py-1 text-xs font-semibold', getStatusColor(order.status))}>
                  {getStatusLabel(order.status)}
                </span>
              </td>
              <td className="px-4 py-4 text-muted-foreground">{order.branch_name}</td>
              <td className="px-6 py-4 text-right text-muted-foreground">{formatDate(order.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
