'use client'

import * as React from 'react'
import Link from 'next/link'
import { ArrowLeft, Download, FileText, Printer } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  DataTableCard,
  DataTableFilterPopover,
  DataTablePagination,
  DataTableSearch,
  DataTableToolbar,
  type DataTableFilterOption,
} from '@/components/ui/data-table'
import { DatePickerField } from '@/components/ui/date-picker-field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { exportCsv, fmtCurrency, fmtDate, fmtPercent } from '@/lib/report-utils'
import {
  getEstimatesConversionReport,
  type EstimatesConversionReportData,
  type EstimateConversionRow,
} from '@/app/actions/specific-reports'

const ESTIMATE_STATUS_OPTIONS: DataTableFilterOption[] = [
  { value: 'rascunho', label: 'Rascunho' },
  { value: 'enviado', label: 'Enviado' },
  { value: 'aprovado', label: 'Aprovado' },
  { value: 'recusado', label: 'Recusado' },
]

const STATUS_COLORS: Record<string, string> = {
  rascunho: 'bg-gray-100 text-gray-700',
  enviado: 'bg-blue-100 text-blue-700',
  aprovado: 'bg-green-100 text-green-700',
  recusado: 'bg-red-100 text-red-700',
}

const STATUS_LABELS: Record<string, string> = {
  rascunho: 'Rascunho',
  enviado: 'Enviado',
  aprovado: 'Aprovado',
  recusado: 'Recusado',
}

const ROWS_PER_PAGE = 20

type Props = {
  initialData: EstimatesConversionReportData
  initialStart: string
  initialEnd: string
}

export function OrcamentosReport({ initialData, initialStart, initialEnd }: Props) {
  const [data, setData] = React.useState(initialData)
  const [startDate, setStartDate] = React.useState(initialStart)
  const [endDate, setEndDate] = React.useState(initialEnd)
  const [branchFilter, setBranchFilter] = React.useState('all')
  const [statusFilter, setStatusFilter] = React.useState<string[]>([])
  const [search, setSearch] = React.useState('')
  const [currentPage, setCurrentPage] = React.useState(1)
  const [isPending, startTransition] = React.useTransition()

  const deferredSearch = React.useDeferredValue(search)

  const loadReport = (nextStart: string, nextEnd: string, nextBranch: string) => {
    if (!nextStart || !nextEnd) { toast.error('Selecione o período completo.'); return }
    if (nextStart > nextEnd) { toast.error('A data inicial não pode ser maior que a data final.'); return }
    startTransition(async () => {
      const result = await getEstimatesConversionReport({
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

    if (statusFilter.length > 0) {
      rows = rows.filter((r) => statusFilter.includes(r.status))
    }

    if (deferredSearch) {
      const q = deferredSearch.toLocaleLowerCase('pt-BR')
      rows = rows.filter((r) =>
        String(r.service_order_number).includes(q) ||
        r.client_name?.toLocaleLowerCase('pt-BR').includes(q)
      )
    }

    return rows
  }, [data.rows, statusFilter, deferredSearch])

  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE))
  const page = Math.min(currentPage, totalPages)
  const paginated = filtered.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE)

  const handleExportCsv = () => {
    exportCsv(
      `orcamentos-conversao-${startDate}.csv`,
      ['OS', 'Cliente', 'Filial', 'Status', 'Valor', 'Criado em', 'Enviado em', 'Aprovado em', 'Recusado em'],
      filtered.map((r) => [
        r.service_order_number,
        r.client_name ?? '',
        r.branch_name ?? '',
        STATUS_LABELS[r.status] ?? r.status,
        r.total_amount,
        fmtDate(r.created_at),
        fmtDate(r.sent_at),
        fmtDate(r.approved_at),
        fmtDate(r.rejected_at),
      ]),
    )
  }

  const { summary } = data

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="print:hidden">
        <div className="mb-1 flex items-center gap-2">
          <Link href="/dashboard/relatorios" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" />
            Relatórios
          </Link>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Orçamentos — Conversão</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Taxa de aprovação e recusa dos orçamentos no período selecionado.
        </p>
      </div>

      <div className="hidden print:block">
        <h1 className="text-xl font-bold">Orçamentos — Conversão</h1>
        <p className="text-sm text-muted-foreground">
          Período: {fmtDate(startDate)} a {fmtDate(endDate)} — Impresso em {fmtDate(new Date().toISOString())}
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 xl:grid-cols-4">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground">Total de orçamentos</p>
          <p className="mt-1 text-3xl font-bold">{summary.total}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground">Taxa de aprovação</p>
          <p className="mt-1 text-3xl font-bold text-green-600">{fmtPercent(summary.conversionRate)}</p>
          <p className="text-xs text-muted-foreground">{summary.approved} aprovados</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground">Taxa de recusa</p>
          <p className="mt-1 text-3xl font-bold text-red-600">{fmtPercent(summary.rejectionRate)}</p>
          <p className="text-xs text-muted-foreground">{summary.rejected} recusados</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground">Ticket médio aprovado</p>
          <p className="mt-1 text-2xl font-bold">{fmtCurrency(summary.averageTicket)}</p>
          <p className="text-xs text-muted-foreground">Total: {fmtCurrency(summary.totalApprovedAmount)}</p>
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
                placeholder="Buscar OS, cliente..."
                disabled={isPending}
              />
              <DatePickerField
                value={startDate}
                onChange={(v) => {
                  if (v) { setStartDate(v); loadReport(v, endDate, branchFilter) }
                }}
                disabled={isPending}
              />
              <DatePickerField
                value={endDate}
                onChange={(v) => {
                  if (v) { setEndDate(v); loadReport(startDate, v, branchFilter) }
                }}
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
              <DataTableFilterPopover
                title="Status"
                options={ESTIMATE_STATUS_OPTIONS}
                selectedValues={statusFilter}
                onToggle={(v) => {
                  setStatusFilter((prev) => prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v])
                  setCurrentPage(1)
                }}
                onClear={() => { setStatusFilter([]); setCurrentPage(1) }}
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
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">OS</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Cliente</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">Filial</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Valor</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">Criado em</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">Aprovado / Recusado</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    <FileText className="mx-auto mb-2 size-6 opacity-40" />
                    Nenhum orçamento encontrado no período.
                  </td>
                </tr>
              ) : (
                paginated.map((row) => <EstimateRow key={row.id} row={row} />)
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

function EstimateRow({ row }: { row: EstimateConversionRow }) {
  const color = STATUS_COLORS[row.status] ?? 'bg-gray-100 text-gray-700'
  const label = STATUS_LABELS[row.status] ?? row.status
  const eventDate = row.status === 'aprovado' ? row.approved_at : row.status === 'recusado' ? row.rejected_at : null

  return (
    <tr className="border-b last:border-0 hover:bg-muted/40">
      <td className="px-4 py-3 font-mono font-medium">#{row.service_order_number}</td>
      <td className="px-4 py-3">{row.client_name ?? <span className="text-muted-foreground">—</span>}</td>
      <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{row.branch_name ?? '—'}</td>
      <td className="px-4 py-3 text-right font-medium">{fmtCurrency(row.total_amount)}</td>
      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{fmtDate(row.created_at)}</td>
      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{fmtDate(eventDate)}</td>
      <td className="px-4 py-3">
        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>
          {label}
        </span>
      </td>
    </tr>
  )
}
