'use client'

import * as React from 'react'
import Link from 'next/link'
import { ArrowLeft, Download, Printer, UserCheck } from 'lucide-react'
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
  getClientRecurrenceReport,
  type ClientRecurrenceReportData,
  type ClientRecurrenceRow,
} from '@/app/actions/specific-reports'

const ROWS_PER_PAGE = 25

type Props = {
  initialData: ClientRecurrenceReportData
  initialStart: string
  initialEnd: string
}

export function ClientesRecorrentesReport({ initialData, initialStart, initialEnd }: Props) {
  const [data, setData] = React.useState(initialData)
  const [startDate, setStartDate] = React.useState(initialStart)
  const [endDate, setEndDate] = React.useState(initialEnd)
  const [branchFilter, setBranchFilter] = React.useState('all')
  const [minOs, setMinOs] = React.useState('1')
  const [search, setSearch] = React.useState('')
  const [currentPage, setCurrentPage] = React.useState(1)
  const [isPending, startTransition] = React.useTransition()

  const deferredSearch = React.useDeferredValue(search)

  const loadReport = (nextStart: string, nextEnd: string, nextBranch: string) => {
    if (!nextStart || !nextEnd) { toast.error('Selecione o período completo.'); return }
    if (nextStart > nextEnd) { toast.error('A data inicial não pode ser maior que a data final.'); return }
    startTransition(async () => {
      const result = await getClientRecurrenceReport({
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
    let rows = data.rows

    const min = Number(minOs)
    if (min > 1) rows = rows.filter((r) => r.os_count >= min)

    if (deferredSearch) {
      const q = deferredSearch.toLocaleLowerCase('pt-BR')
      rows = rows.filter((r) => r.client_name.toLocaleLowerCase('pt-BR').includes(q))
    }

    return rows
  }, [data.rows, minOs, deferredSearch])

  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE))
  const page = Math.min(currentPage, totalPages)
  const paginated = filtered.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE)

  const handleExportCsv = () => {
    exportCsv(
      `clientes-recorrentes-${startDate}.csv`,
      ['Cliente', 'OS no período', 'Concluídas', 'Primeira OS', 'Última OS'],
      filtered.map((r) => [
        r.client_name,
        r.os_count,
        r.completed_count,
        fmtDate(r.first_os_at),
        fmtDate(r.last_os_at),
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
        <h1 className="text-2xl font-semibold tracking-tight">Recorrência de Clientes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Clientes com maior número de OS no período — identifica fidelidade e frequência.
        </p>
      </div>

      <div className="hidden print:block">
        <h1 className="text-xl font-bold">Recorrência de Clientes</h1>
        <p className="text-sm text-muted-foreground">
          Período: {fmtDate(startDate)} a {fmtDate(endDate)} — Impresso em {fmtDate(new Date().toISOString())}
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground">Clientes no período</p>
          <p className="mt-1 text-3xl font-bold">{data.total_clients}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground">Clientes recorrentes</p>
          <p className="mt-1 text-3xl font-bold text-violet-600">{data.recurrent_clients}</p>
          <p className="text-xs text-muted-foreground">2+ OS no período</p>
        </div>
        <div className="rounded-xl border bg-card p-4 col-span-2 sm:col-span-1">
          <p className="text-xs font-medium text-muted-foreground">Taxa de recorrência</p>
          <p className="mt-1 text-3xl font-bold">
            {data.total_clients > 0
              ? `${Math.round((data.recurrent_clients / data.total_clients) * 100)}%`
              : '—'}
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="print:hidden">
        <DataTableToolbar
          filters={
            <>
              <DataTableSearch
                value={search}
                onChange={(v) => { setSearch(v); setCurrentPage(1) }}
                placeholder="Buscar cliente..."
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
              <Select
                value={minOs}
                onValueChange={(v) => { setMinOs(v ?? '1'); setCurrentPage(1) }}
                disabled={isPending}
              >
                <SelectTrigger className="h-9 w-full lg:w-44">
                  <SelectValue placeholder="Mínimo de OS" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Todos os clientes</SelectItem>
                  <SelectItem value="2">2+ OS (recorrentes)</SelectItem>
                  <SelectItem value="3">3+ OS</SelectItem>
                  <SelectItem value="5">5+ OS</SelectItem>
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

      {/* Table */}
      <DataTableCard>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground w-12">#</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Cliente</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">OS no período</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground hidden sm:table-cell">Concluídas</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">Primeira OS</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">Última OS</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                    <UserCheck className="mx-auto mb-2 size-6 opacity-40" />
                    Nenhum cliente encontrado no período.
                  </td>
                </tr>
              ) : (
                paginated.map((row, idx) => (
                  <ClientRow
                    key={row.client_id}
                    row={row}
                    rank={(page - 1) * ROWS_PER_PAGE + idx + 1}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </DataTableCard>

      <div className="print:hidden">
        <DataTablePagination
          currentPage={page}
          totalPages={totalPages}
          totalRows={filtered.length}
          rowsPerPage={ROWS_PER_PAGE}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  )
}

function ClientRow({ row, rank }: { row: ClientRecurrenceRow; rank: number }) {
  const isRecurrent = row.os_count >= 2

  return (
    <tr className={`border-b last:border-0 ${isRecurrent ? 'hover:bg-violet-50/40' : 'hover:bg-muted/40'}`}>
      <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{rank}</td>
      <td className="px-4 py-3">
        <span className="font-medium">{row.client_name}</span>
        {isRecurrent && (
          <span className="ml-2 inline-block rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700">
            recorrente
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-right font-semibold">{row.os_count}</td>
      <td className="px-4 py-3 text-right text-muted-foreground hidden sm:table-cell">{row.completed_count}</td>
      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{fmtDate(row.first_os_at)}</td>
      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{fmtDate(row.last_os_at)}</td>
    </tr>
  )
}
