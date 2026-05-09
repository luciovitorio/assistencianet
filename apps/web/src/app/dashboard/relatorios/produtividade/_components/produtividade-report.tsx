'use client'

import * as React from 'react'
import Link from 'next/link'
import { ArrowLeft, BarChart3, Download, Printer } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  DataTableCard,
  DataTablePagination,
  DataTableSearch,
  DataTableToolbar,
} from '@/components/ui/data-table'
import { DatePickerField } from '@/components/ui/date-picker-field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { exportCsv, fmtDate } from '@/lib/report-utils'
import {
  getProdutividadeReport,
  type TechnicianProductivityReportData,
  type TechnicianProductivityRow,
} from '@/app/actions/specific-reports'

const DEFAULT_ROWS = 25

type Props = {
  initialData: TechnicianProductivityReportData
  initialStart: string
  initialEnd: string
}

export function ProdutividadeReport({ initialData, initialStart, initialEnd }: Props) {
  const [data, setData] = React.useState(initialData)
  const [startDate, setStartDate] = React.useState(initialStart)
  const [endDate, setEndDate] = React.useState(initialEnd)
  const [branchFilter, setBranchFilter] = React.useState('all')
  const [search, setSearch] = React.useState('')
  const [currentPage, setCurrentPage] = React.useState(1)
  const [rowsPerPage, setRowsPerPage] = React.useState(DEFAULT_ROWS)
  const [isPending, startTransition] = React.useTransition()

  const deferredSearch = React.useDeferredValue(search)

  const loadReport = (nextStart: string, nextEnd: string, nextBranch: string) => {
    if (!nextStart || !nextEnd) { toast.error('Selecione o período completo.'); return }
    if (nextStart > nextEnd) { toast.error('A data inicial não pode ser maior que a data final.'); return }
    startTransition(async () => {
      const result = await getProdutividadeReport({
        startDate: nextStart,
        endDate: nextEnd,
        branchId: nextBranch === 'all' ? undefined : nextBranch,
      })
      if (result.error || !result.data) { toast.error(result.error ?? 'Erro ao carregar relatório.'); return }
      setData(result.data)
      setCurrentPage(1)
    })
  }

  const filtered = React.useMemo(() => {
    if (!deferredSearch) return data.rows
    const q = deferredSearch.toLocaleLowerCase('pt-BR')
    return data.rows.filter((r) => r.technician_name.toLocaleLowerCase('pt-BR').includes(q))
  }, [data.rows, deferredSearch])

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage))
  const page = Math.min(currentPage, totalPages)
  const paginated = filtered.slice((page - 1) * rowsPerPage, page * rowsPerPage)

  const topTech = data.rows[0]
  const bestRate = data.rows.length > 0
    ? [...data.rows].sort((a, b) => b.completion_rate - a.completion_rate)[0]
    : null

  const handleExportCsv = () => {
    exportCsv(
      `produtividade-${startDate}.csv`,
      ['Técnico', 'Total OS', 'Finalizadas', 'Canceladas', 'Em Andamento', 'Taxa Conclusão', 'Prazo Médio (dias)'],
      filtered.map((r) => [
        r.technician_name,
        r.os_total,
        r.os_completed,
        r.os_canceled,
        r.os_in_progress,
        `${r.completion_rate}%`,
        r.avg_execution_days ?? '',
      ]),
    )
  }

  return (
    <div className="space-y-6">
      <div className="print:hidden">
        <div className="mb-1 flex items-center gap-2">
          <Link href="/dashboard/relatorios" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" />
            Relatórios
          </Link>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Produtividade por Técnico</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          OS abertas, concluídas e tempo médio de resolução por técnico no período.
        </p>
      </div>

      <div className="hidden print:block">
        <h1 className="text-xl font-bold">Produtividade por Técnico</h1>
        <p className="text-sm text-muted-foreground">
          Período: {fmtDate(startDate)} a {fmtDate(endDate)} — Impresso em {fmtDate(new Date().toISOString())}
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground">Técnicos ativos</p>
          <p className="mt-1 text-3xl font-bold">{data.active_technicians}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground">OS no período</p>
          <p className="mt-1 text-3xl font-bold">{data.period_total_os}</p>
        </div>
        {topTech && (
          <div className="rounded-xl border bg-card p-4">
            <p className="text-xs font-medium text-muted-foreground">Maior volume</p>
            <p className="mt-1 font-semibold leading-tight truncate">{topTech.technician_name}</p>
            <p className="text-xs text-muted-foreground">{topTech.os_total} OS</p>
          </div>
        )}
        {bestRate && bestRate.os_total >= 3 && (
          <div className="rounded-xl border bg-card p-4">
            <p className="text-xs font-medium text-muted-foreground">Melhor taxa</p>
            <p className="mt-1 font-semibold leading-tight truncate">{bestRate.technician_name}</p>
            <p className="text-xs text-muted-foreground">{bestRate.completion_rate}% conclusão</p>
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div className="print:hidden">
        <DataTableToolbar
          filters={
            <>
              <DataTableSearch
                value={search}
                onChange={(v) => { setSearch(v); setCurrentPage(1) }}
                placeholder="Buscar técnico..."
                disabled={isPending}
              />
              <DatePickerField
                value={startDate}
                onChange={(v) => { if (v) { setStartDate(v); loadReport(v, endDate, branchFilter) } }}
                disabled={isPending}
              />
              <DatePickerField
                value={endDate}
                onChange={(v) => { if (v) { setEndDate(v); loadReport(startDate, v, branchFilter) } }}
                disabled={isPending}
              />
              <Select
                value={branchFilter}
                onValueChange={(v) => { const val = v ?? 'all'; setBranchFilter(val); loadReport(startDate, endDate, val) }}
                disabled={isPending}
              >
                <SelectTrigger className="h-9 w-full lg:w-48">
                  <SelectValue>
                    {branchFilter === 'all'
                      ? 'Todas as filiais'
                      : (data.branches.find((b) => b.id === branchFilter)?.name ?? 'Filial')}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as filiais</SelectItem>
                  {data.branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          }
          actions={
            <>
              <Button variant="outline" size="sm" className="gap-2" onClick={() => window.print()}>
                <Printer className="size-4" />
                Imprimir
              </Button>
              <Button variant="outline" size="sm" className="gap-2" onClick={handleExportCsv} disabled={filtered.length === 0}>
                <Download className="size-4" />
                Exportar CSV
              </Button>
            </>
          }
        />
      </div>

      {/* Tabela de tela — paginada */}
      <div className="print:hidden">
        <DataTableCard>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground w-10">#</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Técnico</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Total OS</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground hidden sm:table-cell">Finalizadas</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground hidden md:table-cell">Canceladas</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground hidden md:table-cell">Em Andamento</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground hidden sm:table-cell">Taxa</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground hidden lg:table-cell">Prazo Médio</th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                      <BarChart3 className="mx-auto mb-2 size-6 opacity-40" />
                      Nenhum técnico com OS no período.
                    </td>
                  </tr>
                ) : (
                  paginated.map((row, idx) => (
                    <TechRow
                      key={row.technician_id}
                      row={row}
                      rank={(page - 1) * rowsPerPage + idx + 1}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </DataTableCard>
      </div>

      {/* Tabela de impressão — todos os registros */}
      <div className="hidden print:block">
        <table className="w-full border-collapse text-[11px]">
          <thead>
            <tr className="border-b-2 border-black">
              <th className="py-1.5 pr-2 text-left font-semibold w-8">#</th>
              <th className="py-1.5 pr-2 text-left font-semibold">Técnico</th>
              <th className="py-1.5 pr-2 text-right font-semibold">Total OS</th>
              <th className="py-1.5 pr-2 text-right font-semibold">Finalizadas</th>
              <th className="py-1.5 pr-2 text-right font-semibold">Canceladas</th>
              <th className="py-1.5 pr-2 text-right font-semibold">Em Andamento</th>
              <th className="py-1.5 pr-2 text-right font-semibold">Taxa</th>
              <th className="py-1.5 text-right font-semibold">Prazo Médio</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={8} className="py-4 text-center">Nenhum técnico com OS no período.</td></tr>
            ) : (
              filtered.map((row, idx) => <PrintTechRow key={row.technician_id} row={row} rank={idx + 1} />)
            )}
          </tbody>
        </table>
      </div>

      <div className="print:hidden">
        <DataTablePagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={filtered.length}
          currentItemsCount={paginated.length}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(v) => { setRowsPerPage(v); setCurrentPage(1) }}
          onPageChange={setCurrentPage}
          itemLabel="técnico"
        />
      </div>
    </div>
  )
}

function PrintTechRow({ row, rank }: { row: TechnicianProductivityRow; rank: number }) {
  return (
    <tr className="border-b border-gray-300" style={{ breakInside: 'avoid' }}>
      <td className="py-1 pr-2 font-mono">{rank}</td>
      <td className="py-1 pr-2 font-medium">{row.technician_name}</td>
      <td className="py-1 pr-2 text-right font-semibold">{row.os_total}</td>
      <td className="py-1 pr-2 text-right">{row.os_completed}</td>
      <td className="py-1 pr-2 text-right">{row.os_canceled}</td>
      <td className="py-1 pr-2 text-right">{row.os_in_progress}</td>
      <td className="py-1 pr-2 text-right">{row.completion_rate}%</td>
      <td className="py-1 text-right">{row.avg_execution_days != null ? `${row.avg_execution_days}d` : '—'}</td>
    </tr>
  )
}

function TechRow({ row, rank }: { row: TechnicianProductivityRow; rank: number }) {
  const rateColor =
    row.completion_rate >= 80 ? 'text-green-600' :
    row.completion_rate >= 50 ? 'text-amber-600' :
    'text-red-600'

  return (
    <tr className="border-b last:border-0 hover:bg-muted/40">
      <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{rank}</td>
      <td className="px-4 py-3 font-medium">{row.technician_name}</td>
      <td className="px-4 py-3 text-right font-semibold">{row.os_total}</td>
      <td className="px-4 py-3 text-right text-green-600 font-medium hidden sm:table-cell">{row.os_completed}</td>
      <td className="px-4 py-3 text-right text-muted-foreground hidden md:table-cell">{row.os_canceled}</td>
      <td className="px-4 py-3 text-right text-muted-foreground hidden md:table-cell">{row.os_in_progress}</td>
      <td className={`px-4 py-3 text-right font-semibold hidden sm:table-cell ${rateColor}`}>
        {row.completion_rate}%
      </td>
      <td className="px-4 py-3 text-right text-muted-foreground hidden lg:table-cell">
        {row.avg_execution_days != null ? `${row.avg_execution_days}d` : '—'}
      </td>
    </tr>
  )
}
