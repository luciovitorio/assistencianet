'use client'

import * as React from 'react'
import {
  AlertTriangle,
  BarChart3,
  Building2,
  ClipboardList,
  DollarSign,
  PackageSearch,
  Percent,
  TrendingUp,
  Wrench,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { DatePickerField } from '@/components/ui/date-picker-field'
import { DataTableCard, DataTableToolbar } from '@/components/ui/data-table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getBusinessReports, type BusinessReportsData, type ReportRankRow } from '@/app/actions/reports'

type ReportsDashboardProps = {
  initialData: BusinessReportsData
  initialStart: string
  initialEnd: string
}

type ReportQuery = {
  startDate: string
  endDate: string
  branchId: string
}

const formatCurrency = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const formatNumber = (value: number) => value.toLocaleString('pt-BR')

const formatPercent = (value: number | null) =>
  value == null ? '—' : `${value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`

const formatDays = (value: number | null) =>
  value == null ? 'Sem dados' : `${value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} dia${value === 1 ? '' : 's'}`

const getCurrentWeekRange = () => {
  const now = new Date()
  const start = new Date(now)
  start.setDate(now.getDate() - 6)
  return {
    start: start.toISOString().slice(0, 10),
    end: now.toISOString().slice(0, 10),
  }
}

export function ReportsDashboard({ initialData, initialStart, initialEnd }: ReportsDashboardProps) {
  const [report, setReport] = React.useState(initialData)
  const [startDate, setStartDate] = React.useState(initialStart)
  const [endDate, setEndDate] = React.useState(initialEnd)
  const [branchId, setBranchId] = React.useState('all')
  const [isPending, startTransition] = React.useTransition()

  const selectedBranchLabel =
    branchId === 'all'
      ? 'Todas as filiais'
      : report.branches.find((branch) => branch.id === branchId)?.name ?? 'Filial'
  const isAllBranches = branchId === 'all'

  const loadReport = ({ startDate: nextStartDate, endDate: nextEndDate, branchId: nextBranchId }: ReportQuery) => {
    if (!nextStartDate || !nextEndDate) {
      toast.error('Selecione o período completo.')
      return
    }
    if (nextStartDate > nextEndDate) {
      toast.error('A data inicial não pode ser maior que a data final.')
      return
    }

    startTransition(async () => {
      const result = await getBusinessReports({
        startDate: nextStartDate,
        endDate: nextEndDate,
        branchId: nextBranchId,
      })
      if (result.error || !result.data) {
        toast.error(result.error ?? 'Não foi possível carregar os relatórios.')
        return
      }
      setReport(result.data)
    })
  }

  const handleFilter = () => {
    loadReport({ startDate, endDate, branchId })
  }

  const handleCurrentWeek = () => {
    const range = getCurrentWeekRange()
    setStartDate(range.start)
    setEndDate(range.end)
    loadReport({ startDate: range.start, endDate: range.end, branchId })
  }

  const handleBranchChange = (nextBranchId: string) => {
    setBranchId(nextBranchId)
    loadReport({ startDate, endDate, branchId: nextBranchId })
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">Visão semanal do negócio</p>
          <h2 className="text-2xl font-bold tracking-tight">Relatórios e Indicadores</h2>
          <p className="text-muted-foreground">
            OS, financeiro e estoque consolidados para {selectedBranchLabel.toLowerCase()}.
          </p>
        </div>
        <div className="rounded-lg border bg-card px-4 py-3 text-sm text-muted-foreground">
          Período: <span className="font-semibold text-foreground">{startDate.split('-').reverse().join('/')}</span>
          {' até '}
          <span className="font-semibold text-foreground">{endDate.split('-').reverse().join('/')}</span>
        </div>
      </div>

      <DataTableToolbar
        filters={
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-40">
              <DatePickerField label="De" value={startDate} onChange={setStartDate} />
            </div>
            <div className="w-40">
              <DatePickerField label="Até" value={endDate} onChange={setEndDate} />
            </div>
            <div className="flex w-52 flex-col gap-1.5">
              <label className="block text-sm font-medium">Filial</label>
              <Select value={branchId} onValueChange={(value) => handleBranchChange(value ?? 'all')}>
                <SelectTrigger className="h-10 w-full">
                  <SelectValue>{selectedBranchLabel}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as filiais</SelectItem>
                  {report.branches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleFilter} disabled={isPending} loading={isPending}>
              Atualizar
            </Button>
            <Button variant="outline" onClick={handleCurrentWeek} disabled={isPending}>
              Últimos 7 dias
            </Button>
          </div>
        }
      />

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="OS abertas"
          value={formatNumber(report.serviceOrders.opened)}
          helper="Total aberto no período"
          icon={<ClipboardList className="size-5 text-primary" />}
        />
        <SummaryCard
          label="Tempo médio"
          value={formatDays(report.serviceOrders.averageExecutionDays)}
          helper="OS concluídas no período"
          icon={<Wrench className="size-5 text-amber-600" />}
        />
        <SummaryCard
          label="Faturamento"
          value={formatCurrency(report.financial.revenue)}
          helper={`Ticket médio: ${formatCurrency(report.financial.averageTicket)}`}
          icon={<DollarSign className="size-5 text-emerald-600" />}
        />
        <SummaryCard
          label="Margem líquida"
          value={formatPercent(report.financial.netMargin)}
          helper="Faturamento menos despesas pagas no período"
          icon={<Percent className="size-5 text-indigo-600" />}
        />
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <ReportSection
          title="Ordens de Serviço"
          description="Volume, execução e aceite de orçamento."
          className="xl:col-span-2"
        >
          <div className="grid gap-4 md:grid-cols-3">
            <MiniMetric label="OS concluídas" value={formatNumber(report.serviceOrders.completed)} />
            <MiniMetric label="Taxa de recusa" value={formatPercent(report.serviceOrders.refusalRate)} />
            <MiniMetric label="Tipos atendidos" value={formatNumber(report.serviceOrders.byDeviceType.length)} />
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <RankList title="OS por técnico" rows={report.serviceOrders.byTechnician} emptyLabel="Nenhuma OS com técnico no período." />
            <RankList title="OS por tipo de equipamento" rows={report.serviceOrders.byDeviceType} emptyLabel="Nenhum tipo registrado no período." />
          </div>
        </ReportSection>

        <ReportSection title="Estoque" description="Risco, giro e custo de peças.">
          <div className="grid gap-3">
            <MiniMetric
              label={isAllBranches ? 'Posições críticas' : 'Mínimo ou zerado'}
              value={formatNumber(report.stock.lowOrZeroItems)}
              helper={isAllBranches ? 'Peça + filial abaixo do mínimo ou zerada' : undefined}
            />
            <MiniMetric label="Zerados" value={formatNumber(report.stock.zeroItems)} />
            <MiniMetric label="Valor em estoque" value={formatCurrency(report.stock.inventoryValue)} />
            <MiniMetric label="Custo de peças por OS" value={formatCurrency(report.stock.partsCostByServiceOrder)} />
          </div>
          {isAllBranches && (
            <BranchCriticalStockList rows={report.stock.criticalByBranch} />
          )}
        </ReportSection>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <ReportSection title="Financeiro" description="Receita, margem bruta e contas em aberto.">
          <div className="grid gap-4 md:grid-cols-2">
            <MiniMetric label="Contas a receber" value={formatCurrency(report.financial.openReceivables)} />
            <MiniMetric label="Lucro bruto serviços" value={formatCurrency(report.financial.serviceGrossProfit)} />
            <MiniMetric label="Lucro bruto peças" value={formatCurrency(report.financial.partsGrossProfit)} />
            <MiniMetric label="Custo das peças" value={formatCurrency(report.financial.partsCost)} />
          </div>
          <MoneyList title="Despesas pagas por categoria" rows={report.financial.expensesByCategory} emptyLabel="Nenhuma despesa paga no período." />
        </ReportSection>

        <ReportSection title="Comparativo entre filiais" description="Faturamento, despesas e OS abertas no período.">
          <BranchTable rows={report.financial.branchComparison} />
        </ReportSection>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <ReportSection title="Peças mais utilizadas" description="Giro por OS e custo estimado no período.">
          <RankList
            rows={report.stock.mostUsedParts}
            emptyLabel="Nenhuma baixa de peça vinculada a OS no período."
            showAmount
          />
        </ReportSection>
        <ReportSection title="Itens sem movimento" description="Peças sem giro há 90 dias ou sem histórico.">
          <StagnantList rows={report.stock.stagnantParts} />
        </ReportSection>
      </section>
    </div>
  )
}

function SummaryCard({
  label,
  value,
  helper,
  icon,
}: {
  label: string
  value: string
  helper: string
  icon: React.ReactNode
}) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
        <div className="rounded-lg bg-muted p-2">{icon}</div>
      </div>
      <p className="text-2xl font-bold tabular-nums text-foreground">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{helper}</p>
    </div>
  )
}

function MiniMetric({ label, value, helper }: { label: string; value: string; helper?: string }) {
  return (
    <div className="rounded-lg border bg-background p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-bold tabular-nums">{value}</p>
      {helper && <p className="mt-1 text-xs text-muted-foreground">{helper}</p>}
    </div>
  )
}

function ReportSection({
  title,
  description,
  className,
  children,
}: {
  title: string
  description: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <DataTableCard className={className}>
      <div className="border-b border-border bg-muted/20 px-6 py-5">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-primary/10 p-2 text-primary">
            <BarChart3 className="size-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">{title}</h3>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
      </div>
      <div className="space-y-6 p-6">{children}</div>
    </DataTableCard>
  )
}

function RankList({
  title,
  rows,
  emptyLabel,
  showAmount = false,
}: {
  title?: string
  rows: ReportRankRow[]
  emptyLabel: string
  showAmount?: boolean
}) {
  const max = Math.max(...rows.map((row) => row.value), 1)

  if (rows.length === 0) {
    return <EmptyState label={emptyLabel} icon={<PackageSearch className="size-8" />} />
  }

  return (
    <div className="space-y-3">
      {title && <h4 className="font-semibold">{title}</h4>}
      {rows.map((row) => (
        <div key={row.id} className="space-y-1.5">
          <div className="flex items-center justify-between gap-3 text-sm">
            <div className="min-w-0">
              <span className="font-medium">{row.label}</span>
              {row.detail && (
                <span className="ml-2 text-xs text-muted-foreground">{row.detail}</span>
              )}
            </div>
            <span className="shrink-0 tabular-nums text-muted-foreground">
              {formatNumber(row.value)}
              {showAmount && row.amount != null ? ` | ${formatCurrency(row.amount)}` : ''}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${Math.max(8, (row.value / max) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

function MoneyList({
  title,
  rows,
  emptyLabel,
}: {
  title: string
  rows: ReportRankRow[]
  emptyLabel: string
}) {
  const max = Math.max(...rows.map((row) => row.amount ?? 0), 1)

  if (rows.length === 0) {
    return <EmptyState label={emptyLabel} icon={<DollarSign className="size-8" />} />
  }

  return (
    <div className="space-y-3">
      <h4 className="font-semibold">{title}</h4>
      {rows.map((row) => (
        <div key={row.id} className="space-y-1.5">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="font-medium">{row.label}</span>
            <span className="shrink-0 tabular-nums text-muted-foreground">{formatCurrency(row.amount ?? 0)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-destructive"
              style={{ width: `${Math.max(8, ((row.amount ?? 0) / max) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

function BranchTable({ rows }: { rows: BusinessReportsData['financial']['branchComparison'] }) {
  if (rows.length === 0) {
    return <EmptyState label="Nenhum movimento por filial no período." icon={<Building2 className="size-8" />} />
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-muted-foreground">
            <th className="px-3 py-2 text-left font-medium">Filial</th>
            <th className="px-3 py-2 text-right font-medium">Receita</th>
            <th className="px-3 py-2 text-right font-medium">Despesas</th>
            <th className="px-3 py-2 text-right font-medium">OS</th>
            <th className="px-3 py-2 text-right font-medium">Resultado</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row) => (
            <tr key={row.branch_id} className="hover:bg-muted/20">
              <td className="px-3 py-3 font-medium">{row.branch_name}</td>
              <td className="px-3 py-3 text-right tabular-nums">{formatCurrency(row.revenue)}</td>
              <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">{formatCurrency(row.expenses)}</td>
              <td className="px-3 py-3 text-right tabular-nums">{formatNumber(row.service_orders)}</td>
              <td className="px-3 py-3 text-right tabular-nums font-semibold">{formatCurrency(row.net_result)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function StagnantList({ rows }: { rows: ReportRankRow[] }) {
  if (rows.length === 0) {
    return <EmptyState label="Nenhuma peça parada há 90 dias." icon={<TrendingUp className="size-8" />} />
  }

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.id} className="flex items-start gap-3 rounded-lg border bg-background p-3">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
          <div>
            <p className="font-medium">{row.label}</p>
            <p className="text-sm text-muted-foreground">{row.detail}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

function BranchCriticalStockList({ rows }: { rows: ReportRankRow[] }) {
  if (rows.length === 0) {
    return <EmptyState label="Nenhuma filial com estoque crítico." icon={<PackageSearch className="size-8" />} />
  }

  return (
    <div className="space-y-3">
      <h4 className="font-semibold">Estoque crítico por filial</h4>
      {rows.map((row) => (
        <div key={row.id} className="flex items-center justify-between gap-3 rounded-lg border bg-background p-3 text-sm">
          <div>
            <p className="font-medium">{row.label}</p>
            <p className="text-muted-foreground">{row.detail}</p>
          </div>
          <span className="shrink-0 rounded-md bg-amber-100 px-2 py-1 font-semibold tabular-nums text-amber-700">
            {formatNumber(row.value)}
          </span>
        </div>
      ))}
    </div>
  )
}

function EmptyState({ label, icon }: { label: string; icon: React.ReactNode }) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center rounded-lg border border-dashed bg-muted/20 p-8 text-center text-muted-foreground">
      <div className="mb-2 text-muted-foreground/50">{icon}</div>
      <p className="text-sm">{label}</p>
    </div>
  )
}
