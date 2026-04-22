'use client'

import * as React from 'react'
import Link from 'next/link'
import { AlertCircle, ClipboardList, Receipt, Wrench, Users, History } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button-variants'
import { cn } from '@/lib/utils'
import { DatePickerField } from '@/components/ui/date-picker-field'
import { DataTableCard, DataTableToolbar } from '@/components/ui/data-table'
import { getTechnicianProduction, type TechnicianProductionRow } from '@/app/actions/technician-production'
import { ClosePayoutDialog } from './close-payout-dialog'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function toIso(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

function getCurrentFridayWeek() {
  const now = new Date()
  const daysUntilFriday = (5 - now.getDay() + 7) % 7
  const end = new Date(now)
  end.setDate(end.getDate() + daysUntilFriday)
  const start = new Date(end)
  start.setDate(start.getDate() - 6)
  return { start: toIso(start), end: toIso(end) }
}

function getCurrentMonthRange() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const lastDay = new Date(year, now.getMonth() + 1, 0).getDate()
  return {
    start: `${year}-${month}-01`,
    end: `${year}-${month}-${String(lastDay).padStart(2, '0')}`,
  }
}

// ── Componente ────────────────────────────────────────────────────────────────

interface ProductionReportProps {
  initialRows: TechnicianProductionRow[]
  initialStart: string
  initialEnd: string
}

export function ProductionReport({ initialRows, initialStart, initialEnd }: ProductionReportProps) {
  const [rows, setRows] = React.useState(initialRows)
  const [startDate, setStartDate] = React.useState(initialStart)
  const [endDate, setEndDate] = React.useState(initialEnd)
  const [isPending, startTransition] = React.useTransition()
  const [payoutOpen, setPayoutOpen] = React.useState(false)

  const summary = React.useMemo(() => ({
    total_os: rows.reduce((acc, r) => acc + r.os_count, 0),
    total_labor: rows.reduce((acc, r) => acc + r.total_labor, 0),
    technicians_with_rate: rows.filter((r) => r.labor_rate != null).length,
    technicians_without_rate: rows.filter((r) => r.labor_rate == null).length,
  }), [rows])

  const eligibleCount = React.useMemo(
    () => rows.filter((r) => r.os_count > 0 && r.labor_rate != null).length,
    [rows],
  )

  const refresh = React.useCallback(
    (start: string, end: string) => {
      startTransition(async () => {
        const result = await getTechnicianProduction(start, end)
        if (result.error) {
          toast.error(result.error)
          return
        }
        setRows(result.data ?? [])
      })
    },
    [],
  )

  const handleFilter = () => {
    if (!startDate || !endDate) {
      toast.error('Selecione o período completo.')
      return
    }
    if (startDate > endDate) {
      toast.error('A data inicial não pode ser maior que a data final.')
      return
    }
    refresh(startDate, endDate)
  }

  const handleCurrentFridayWeek = () => {
    const { start, end } = getCurrentFridayWeek()
    setStartDate(start)
    setEndDate(end)
    refresh(start, end)
  }

  const handleCurrentMonth = () => {
    const { start, end } = getCurrentMonthRange()
    setStartDate(start)
    setEndDate(end)
    refresh(start, end)
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Produção de Técnicos</h2>
          <p className="text-muted-foreground">
            OS concluídas por técnico no período. Feche a produção para gerar recibos e lançar em Contas a Pagar.
          </p>
        </div>
        <Link
          href="/dashboard/financeiro/producao-tecnicos/fechamentos"
          className={cn(buttonVariants({ variant: 'outline' }), 'gap-2')}
        >
          <History className="size-4" />
          Ver Fechamentos
        </Link>
      </div>

      {/* Cards de resumo */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="OS concluídas"
          value={String(summary.total_os)}
          icon={<ClipboardList className="size-5 text-primary" />}
        />
        <SummaryCard
          label="Total mão de obra"
          value={formatCurrency(summary.total_labor)}
          icon={<Wrench className="size-5 text-amber-600" />}
          highlight={summary.total_labor > 0}
        />
        <SummaryCard
          label="Técnicos com valor"
          value={String(summary.technicians_with_rate)}
          icon={<Users className="size-5 text-emerald-600" />}
        />
        {summary.technicians_without_rate > 0 && (
          <SummaryCard
            label="Sem valor definido"
            value={String(summary.technicians_without_rate)}
            icon={<AlertCircle className="size-5 text-destructive" />}
            warning
          />
        )}
      </div>

      {/* Filtro de período */}
      <DataTableToolbar
        filters={
          <div className="flex flex-wrap items-end gap-3">
            <DatePickerField label="De" value={startDate} onChange={setStartDate} />
            <DatePickerField label="Até" value={endDate} onChange={setEndDate} />
            <Button onClick={handleFilter} disabled={isPending} loading={isPending}>
              Filtrar
            </Button>
            <Button variant="outline" onClick={handleCurrentFridayWeek} disabled={isPending}>
              Semana (sex→sex)
            </Button>
            <Button variant="outline" onClick={handleCurrentMonth} disabled={isPending}>
              Mês atual
            </Button>
          </div>
        }
        actions={
          <Button
            onClick={() => setPayoutOpen(true)}
            disabled={isPending || eligibleCount === 0}
            className="gap-2"
          >
            <Receipt className="size-4" />
            Gerar Fechamento
          </Button>
        }
      />

      {/* Tabela */}
      <DataTableCard>
        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-center">
            <Wrench className="size-10 text-muted-foreground/30 mb-3" />
            <h3 className="text-lg font-medium mb-1">Nenhum técnico encontrado</h3>
            <p className="text-muted-foreground text-sm max-w-sm">
              Cadastre técnicos em Funcionários ou ajuste o período do filtro.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left font-medium text-muted-foreground px-4 py-3">Técnico</th>
                  <th className="text-left font-medium text-muted-foreground px-4 py-3 hidden md:table-cell">Filial</th>
                  <th className="text-right font-medium text-muted-foreground px-4 py-3">OS concluídas</th>
                  <th className="text-right font-medium text-muted-foreground px-4 py-3">Valor / OS</th>
                  <th className="text-right font-medium text-muted-foreground px-4 py-3">Total a pagar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((row) => (
                  <tr key={row.technician_id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">{row.technician_name}</td>
                    <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                      {row.branch_name ?? <span className="text-muted-foreground/40">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {row.os_count > 0 ? (
                        <span className="font-semibold">{row.os_count}</span>
                      ) : (
                        <span className="text-muted-foreground/50">0</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                      {row.labor_rate != null ? (
                        formatCurrency(row.labor_rate)
                      ) : (
                        <span className="inline-flex items-center gap-1 text-destructive text-xs">
                          <AlertCircle className="size-3" />
                          Não definido
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {row.total_labor > 0 ? (
                        <span className="font-semibold text-foreground">{formatCurrency(row.total_labor)}</span>
                      ) : (
                        <span className="text-muted-foreground/50">
                          {row.labor_rate == null ? '—' : formatCurrency(0)}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              {rows.length > 0 && summary.total_labor > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-border bg-muted/20">
                    <td colSpan={2} className="px-4 py-3 font-semibold text-muted-foreground hidden md:table-cell">
                      Total
                    </td>
                    <td className="px-4 py-3 font-semibold text-right md:hidden">Total</td>
                    <td className="px-4 py-3 font-semibold text-right tabular-nums">
                      {summary.total_os}
                    </td>
                    <td className="px-4 py-3" />
                    <td className="px-4 py-3 font-semibold text-right tabular-nums text-foreground">
                      {formatCurrency(summary.total_labor)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </DataTableCard>

      {summary.technicians_without_rate > 0 && (
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <AlertCircle className="size-3.5 text-destructive shrink-0" />
          Técnicos sem valor de mão de obra definido não são incluídos no total.
          Configure o valor em{' '}
          <a href="/dashboard/funcionarios" className="underline underline-offset-2 hover:text-foreground">
            Funcionários
          </a>.
        </p>
      )}

      <ClosePayoutDialog
        open={payoutOpen}
        onOpenChange={setPayoutOpen}
        rows={rows}
        periodStart={startDate}
        periodEnd={endDate}
        onSuccess={() => refresh(startDate, endDate)}
      />
    </div>
  )
}

// ── SummaryCard ───────────────────────────────────────────────────────────────

interface SummaryCardProps {
  label: string
  value: string
  icon: React.ReactNode
  highlight?: boolean
  warning?: boolean
}

function SummaryCard({ label, value, icon, highlight, warning }: SummaryCardProps) {
  return (
    <div className={`rounded-xl border bg-card p-5 shadow-sm ${warning ? 'border-destructive/30' : ''}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
        {icon}
      </div>
      <p className={`text-2xl font-bold tabular-nums ${highlight ? 'text-amber-600' : warning ? 'text-destructive' : 'text-foreground'}`}>
        {value}
      </p>
    </div>
  )
}
