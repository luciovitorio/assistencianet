'use client'

import * as React from 'react'
import Link from 'next/link'
import { ArrowLeft, Building2, Download, Printer } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  DataTableCard,
  DataTableToolbar,
} from '@/components/ui/data-table'
import { DatePickerField } from '@/components/ui/date-picker-field'
import { exportCsv, fmtCurrency, fmtDate } from '@/lib/report-utils'
import {
  getBranchComparisonReport,
  type BranchComparisonReportData,
  type BranchDetailRow,
} from '@/app/actions/specific-reports'

type Props = {
  initialData: BranchComparisonReportData
  initialStart: string
  initialEnd: string
}

export function ComparativoFiliaisReport({ initialData, initialStart, initialEnd }: Props) {
  const [data, setData] = React.useState(initialData)
  const [startDate, setStartDate] = React.useState(initialStart)
  const [endDate, setEndDate] = React.useState(initialEnd)
  const [isPending, startTransition] = React.useTransition()

  const loadReport = (nextStart: string, nextEnd: string) => {
    if (!nextStart || !nextEnd) { toast.error('Selecione o período completo.'); return }
    if (nextStart > nextEnd) { toast.error('A data inicial não pode ser maior que a data final.'); return }
    startTransition(async () => {
      const result = await getBranchComparisonReport({ startDate: nextStart, endDate: nextEnd })
      if (result.error || !result.data) { toast.error(result.error ?? 'Erro ao carregar relatório.'); return }
      setData(result.data)
    })
  }

  const handleExportCsv = () => {
    exportCsv(
      `comparativo-filiais-${startDate}.csv`,
      ['Filial', 'OS Abertas', 'Concluídas', 'Canceladas', 'Em Andamento', 'Prazo médio (dias)', 'Faturamento'],
      data.rows.map((r) => [
        r.branch_name,
        r.os_opened,
        r.os_completed,
        r.os_canceled,
        r.os_in_progress,
        r.avg_execution_days ?? '',
        r.revenue,
      ]),
    )
  }

  const maxOs = Math.max(...data.rows.map((r) => r.os_opened), 1)
  const maxRevenue = Math.max(...data.rows.map((r) => r.revenue), 1)

  return (
    <div className="space-y-6">
      <div className="print:hidden">
        <div className="mb-1 flex items-center gap-2">
          <Link href="/dashboard/relatorios" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" />
            Relatórios
          </Link>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Comparativo de Filiais</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Volume de OS, faturamento e prazo médio de conclusão por filial.
        </p>
      </div>

      <div className="hidden print:block">
        <h1 className="text-xl font-bold">Comparativo de Filiais</h1>
        <p className="text-sm text-muted-foreground">
          Período: {fmtDate(startDate)} a {fmtDate(endDate)} — Impresso em {fmtDate(new Date().toISOString())}
        </p>
      </div>

      {/* KPIs totais */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground">Total de OS</p>
          <p className="mt-1 text-3xl font-bold">{data.period_total_os}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground">Faturamento total</p>
          <p className="mt-1 text-2xl font-bold">{fmtCurrency(data.period_total_revenue)}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 col-span-2 sm:col-span-1">
          <p className="text-xs font-medium text-muted-foreground">Filiais ativas</p>
          <p className="mt-1 text-3xl font-bold">{data.rows.length}</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="print:hidden">
        <DataTableToolbar
          filters={
            <>
              <DatePickerField
                value={startDate}
                onChange={(v) => { if (v) { setStartDate(v); loadReport(v, endDate) } }}
                disabled={isPending}
              />
              <DatePickerField
                value={endDate}
                onChange={(v) => { if (v) { setEndDate(v); loadReport(startDate, v) } }}
                disabled={isPending}
              />
            </>
          }
          actions={
            <>
              <Button variant="outline" size="sm" className="gap-2" onClick={() => window.print()}>
                <Printer className="size-4" />
                Imprimir
              </Button>
              <Button variant="outline" size="sm" className="gap-2" onClick={handleExportCsv} disabled={data.rows.length === 0}>
                <Download className="size-4" />
                Exportar CSV
              </Button>
            </>
          }
        />
      </div>

      {/* Cards de filial — ocultos na impressão */}
      <div className="print:hidden">
        {data.rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border bg-card p-12 text-center text-muted-foreground">
            <Building2 className="mb-3 size-8 opacity-40" />
            <p>Nenhuma filial com movimento no período.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {data.rows.map((row) => (
              <BranchCard key={row.branch_id} row={row} maxOs={maxOs} maxRevenue={maxRevenue} />
            ))}
          </div>
        )}
      </div>

      {/* Tabela comparativa — tela (responsiva) */}
      <div className="print:hidden">
        <DataTableCard>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Filial</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">OS Abertas</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground hidden sm:table-cell">Concluídas</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground hidden sm:table-cell">Canceladas</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground hidden md:table-cell">Em Andamento</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground hidden md:table-cell">Prazo médio</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Faturamento</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row) => (
                  <tr key={row.branch_id} className="border-b last:border-0 hover:bg-muted/40">
                    <td className="px-4 py-3 font-medium">{row.branch_name}</td>
                    <td className="px-4 py-3 text-right font-semibold">{row.os_opened}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground hidden sm:table-cell">{row.os_completed}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground hidden sm:table-cell">{row.os_canceled}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground hidden md:table-cell">{row.os_in_progress}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground hidden md:table-cell">
                      {row.avg_execution_days != null ? `${row.avg_execution_days} dias` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">{fmtCurrency(row.revenue)}</td>
                  </tr>
                ))}
                <tr className="border-t bg-muted/30 font-semibold">
                  <td className="px-4 py-3">Total</td>
                  <td className="px-4 py-3 text-right">{data.period_total_os}</td>
                  <td className="px-4 py-3 text-right hidden sm:table-cell">{data.rows.reduce((s, r) => s + r.os_completed, 0)}</td>
                  <td className="px-4 py-3 text-right hidden sm:table-cell">{data.rows.reduce((s, r) => s + r.os_canceled, 0)}</td>
                  <td className="px-4 py-3 text-right hidden md:table-cell">{data.rows.reduce((s, r) => s + r.os_in_progress, 0)}</td>
                  <td className="px-4 py-3 text-right hidden md:table-cell">—</td>
                  <td className="px-4 py-3 text-right">{fmtCurrency(data.period_total_revenue)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </DataTableCard>
      </div>

      {/* Tabela de impressão — todas as colunas */}
      <div className="hidden print:block">
        <table className="w-full border-collapse text-[11px]">
          <thead>
            <tr className="border-b-2 border-black">
              <th className="py-1.5 pr-2 text-left font-semibold">Filial</th>
              <th className="py-1.5 pr-2 text-right font-semibold">OS Abertas</th>
              <th className="py-1.5 pr-2 text-right font-semibold">Concluídas</th>
              <th className="py-1.5 pr-2 text-right font-semibold">Canceladas</th>
              <th className="py-1.5 pr-2 text-right font-semibold">Em Andamento</th>
              <th className="py-1.5 pr-2 text-right font-semibold">Prazo médio</th>
              <th className="py-1.5 text-right font-semibold">Faturamento</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row) => (
              <tr key={row.branch_id} className="border-b border-gray-300" style={{ breakInside: 'avoid' }}>
                <td className="py-1 pr-2 font-medium">{row.branch_name}</td>
                <td className="py-1 pr-2 text-right font-semibold">{row.os_opened}</td>
                <td className="py-1 pr-2 text-right">{row.os_completed}</td>
                <td className="py-1 pr-2 text-right">{row.os_canceled}</td>
                <td className="py-1 pr-2 text-right">{row.os_in_progress}</td>
                <td className="py-1 pr-2 text-right">{row.avg_execution_days != null ? `${row.avg_execution_days}d` : '—'}</td>
                <td className="py-1 text-right font-medium">{fmtCurrency(row.revenue)}</td>
              </tr>
            ))}
            <tr className="border-t-2 border-black font-semibold">
              <td className="py-1 pr-2">Total</td>
              <td className="py-1 pr-2 text-right">{data.period_total_os}</td>
              <td className="py-1 pr-2 text-right">{data.rows.reduce((s, r) => s + r.os_completed, 0)}</td>
              <td className="py-1 pr-2 text-right">{data.rows.reduce((s, r) => s + r.os_canceled, 0)}</td>
              <td className="py-1 pr-2 text-right">{data.rows.reduce((s, r) => s + r.os_in_progress, 0)}</td>
              <td className="py-1 pr-2 text-right">—</td>
              <td className="py-1 text-right">{fmtCurrency(data.period_total_revenue)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

function BranchCard({
  row,
  maxOs,
  maxRevenue,
}: {
  row: BranchDetailRow
  maxOs: number
  maxRevenue: number
}) {
  const osPct = Math.round((row.os_opened / maxOs) * 100)
  const revPct = maxRevenue > 0 ? Math.round((row.revenue / maxRevenue) * 100) : 0

  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="mb-3 flex items-center gap-2">
        <Building2 className="size-4 text-muted-foreground" />
        <h3 className="font-semibold">{row.branch_name}</h3>
      </div>

      <div className="space-y-3">
        <div>
          <div className="mb-1 flex justify-between text-xs text-muted-foreground">
            <span>OS abertas</span>
            <span className="font-medium text-foreground">{row.os_opened}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-blue-500" style={{ width: `${osPct}%` }} />
          </div>
        </div>

        <div>
          <div className="mb-1 flex justify-between text-xs text-muted-foreground">
            <span>Faturamento</span>
            <span className="font-medium text-foreground">{fmtCurrency(row.revenue)}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${revPct}%` }} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 pt-1 text-center">
          <div>
            <p className="text-lg font-bold">{row.os_completed}</p>
            <p className="text-[10px] text-muted-foreground">Concluídas</p>
          </div>
          <div>
            <p className="text-lg font-bold">{row.os_in_progress}</p>
            <p className="text-[10px] text-muted-foreground">Em andamento</p>
          </div>
          <div>
            <p className="text-lg font-bold">
              {row.avg_execution_days != null ? `${row.avg_execution_days}d` : '—'}
            </p>
            <p className="text-[10px] text-muted-foreground">Prazo médio</p>
          </div>
        </div>
      </div>
    </div>
  )
}
