'use client'

import * as React from 'react'
import Link from 'next/link'
import { ArrowLeft, ClipboardList, Download, Printer } from 'lucide-react'
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
import { exportCsv, fmtCurrency, fmtDate } from '@/lib/report-utils'
import {
  getOsPorPeriodoReport,
  type OsPorPeriodoReportData,
  type OsPorPeriodoRow,
} from '@/app/actions/specific-reports'

const STATUS_OPTIONS: DataTableFilterOption[] = [
  { value: 'finalizado', label: 'Finalizada' },
  { value: 'cancelado', label: 'Cancelada' },
]

const STATUS_COLORS: Record<string, string> = {
  finalizado: 'bg-green-100 text-green-700',
  cancelado: 'bg-red-100 text-red-700',
}

const STATUS_LABELS: Record<string, string> = {
  finalizado: 'Finalizada',
  cancelado: 'Cancelada',
}

const PAYMENT_LABELS: Record<string, string> = {
  dinheiro: 'Dinheiro',
  pix: 'PIX',
  cartao_credito: 'Crédito',
  cartao_debito: 'Débito',
  transferencia: 'Transferência',
  boleto: 'Boleto',
}

const DEFAULT_ROWS = 20

type Props = {
  initialData: OsPorPeriodoReportData
  initialStart: string
  initialEnd: string
}

export function OsPorPeriodoReport({ initialData, initialStart, initialEnd }: Props) {
  const [data, setData] = React.useState(initialData)
  const [startDate, setStartDate] = React.useState(initialStart)
  const [endDate, setEndDate] = React.useState(initialEnd)
  const [branchFilter, setBranchFilter] = React.useState('all')
  const [statusFilter, setStatusFilter] = React.useState<string[]>([])
  const [search, setSearch] = React.useState('')
  const [currentPage, setCurrentPage] = React.useState(1)
  const [rowsPerPage, setRowsPerPage] = React.useState(DEFAULT_ROWS)
  const [isPending, startTransition] = React.useTransition()

  const deferredSearch = React.useDeferredValue(search)

  const loadReport = (nextStart: string, nextEnd: string, nextBranch: string) => {
    if (!nextStart || !nextEnd) { toast.error('Selecione o período completo.'); return }
    if (nextStart > nextEnd) { toast.error('A data inicial não pode ser maior que a data final.'); return }
    startTransition(async () => {
      const result = await getOsPorPeriodoReport({
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
        String(r.number).includes(q) ||
        r.client_name?.toLocaleLowerCase('pt-BR').includes(q) ||
        r.device_brand?.toLocaleLowerCase('pt-BR').includes(q) ||
        r.device_model?.toLocaleLowerCase('pt-BR').includes(q) ||
        r.technician_name?.toLocaleLowerCase('pt-BR').includes(q)
      )
    }

    return rows
  }, [data.rows, statusFilter, deferredSearch])

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage))
  const page = Math.min(currentPage, totalPages)
  const paginated = filtered.slice((page - 1) * rowsPerPage, page * rowsPerPage)

  const { summary } = data

  const handleExportCsv = () => {
    exportCsv(
      `os-por-periodo-${startDate}.csv`,
      ['OS', 'Status', 'Cliente', 'Equipamento', 'Técnico', 'Filial', 'Abertura', 'Conclusão', 'Dias', 'Valor Recebido', 'Pagamento'],
      filtered.map((r) => [
        r.number,
        STATUS_LABELS[r.status] ?? r.status,
        r.client_name ?? '',
        [r.device_type, r.device_brand, r.device_model].filter(Boolean).join(' '),
        r.technician_name ?? '',
        r.branch_name ?? '',
        fmtDate(r.created_at),
        fmtDate(r.completed_at),
        r.execution_days ?? '',
        r.amount_paid ?? '',
        r.payment_method ? (PAYMENT_LABELS[r.payment_method] ?? r.payment_method) : '',
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
        <h1 className="text-2xl font-semibold tracking-tight">OS por Período</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Listagem de todas as OS finalizadas e canceladas no período selecionado.
        </p>
      </div>

      <div className="hidden print:block">
        <h1 className="text-xl font-bold">OS por Período</h1>
        <p className="text-sm text-muted-foreground">
          Período: {fmtDate(startDate)} a {fmtDate(endDate)} — Impresso em {fmtDate(new Date().toISOString())}
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 print:grid-cols-4">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground">Total no período</p>
          <p className="mt-1 text-3xl font-bold print:text-2xl">{summary.total}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground">Finalizadas</p>
          <p className="mt-1 text-3xl font-bold text-green-600 print:text-2xl">{summary.completed}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground">Canceladas</p>
          <p className="mt-1 text-3xl font-bold text-red-500 print:text-2xl">{summary.canceled}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground">Prazo médio</p>
          <p className="mt-1 text-3xl font-bold print:text-2xl">
            {summary.avg_execution_days != null ? `${summary.avg_execution_days}d` : '—'}
          </p>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-4">
        <p className="text-xs font-medium text-muted-foreground">Receita das finalizadas</p>
        <p className="mt-1 text-2xl font-bold text-emerald-600">{fmtCurrency(summary.total_revenue)}</p>
        <p className="text-xs text-muted-foreground">Soma de amount_paid das OS finalizadas no período</p>
      </div>

      {/* Toolbar */}
      <div className="print:hidden">
        <DataTableToolbar
          filters={
            <>
              <DataTableSearch
                value={search}
                onChange={(v) => { setSearch(v); setCurrentPage(1) }}
                placeholder="Buscar OS, cliente, técnico..."
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
              <DataTableFilterPopover
                title="Status"
                options={STATUS_OPTIONS}
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

      {/* Tabela de tela — paginada, responsiva */}
      <div className="print:hidden">
        <DataTableCard>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">OS</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Cliente</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">Equipamento</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">Técnico</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden sm:table-cell">Abertura</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden sm:table-cell">Conclusão</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground hidden md:table-cell">Dias</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground hidden lg:table-cell">Valor</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">
                      <ClipboardList className="mx-auto mb-2 size-6 opacity-40" />
                      Nenhuma OS encontrada no período.
                    </td>
                  </tr>
                ) : (
                  paginated.map((row) => <OsRow key={row.id} row={row} />)
                )}
              </tbody>
            </table>
          </div>
        </DataTableCard>
      </div>

      {/* Tabela de impressão — todos os registros, todas as colunas */}
      <div className="hidden print:block">
        <table className="w-full border-collapse text-[11px]">
          <thead>
            <tr className="border-b-2 border-black">
              <th className="py-1.5 pr-2 text-left font-semibold">OS</th>
              <th className="py-1.5 pr-2 text-left font-semibold">Cliente</th>
              <th className="py-1.5 pr-2 text-left font-semibold">Equipamento</th>
              <th className="py-1.5 pr-2 text-left font-semibold">Técnico</th>
              <th className="py-1.5 pr-2 text-left font-semibold">Abertura</th>
              <th className="py-1.5 pr-2 text-left font-semibold">Conclusão</th>
              <th className="py-1.5 pr-2 text-right font-semibold">Dias</th>
              <th className="py-1.5 pr-2 text-right font-semibold">Valor</th>
              <th className="py-1.5 text-left font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-4 text-center">Nenhuma OS encontrada no período.</td>
              </tr>
            ) : (
              filtered.map((row) => <PrintRow key={row.id} row={row} />)
            )}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-black">
              <td colSpan={6} className="py-1.5 pr-2 text-right text-[11px] font-semibold">
                Total ({filtered.length} OS):
              </td>
              <td className="py-1.5 pr-2 text-right text-[11px] font-semibold">
                {summary.avg_execution_days != null ? `${summary.avg_execution_days}d méd.` : ''}
              </td>
              <td className="py-1.5 pr-2 text-right text-[11px] font-semibold">
                {fmtCurrency(summary.total_revenue)}
              </td>
              <td />
            </tr>
          </tfoot>
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
          itemLabel="OS"
        />
      </div>
    </div>
  )
}

function OsRow({ row }: { row: OsPorPeriodoRow }) {
  const statusColor = STATUS_COLORS[row.status] ?? 'bg-gray-100 text-gray-700'
  const statusLabel = STATUS_LABELS[row.status] ?? row.status
  const equipment = [row.device_type, row.device_brand, row.device_model].filter(Boolean).join(' ')

  return (
    <tr className="border-b last:border-0 hover:bg-muted/40">
      <td className="px-4 py-3 font-mono font-medium">#{row.number}</td>
      <td className="px-4 py-3">{row.client_name ?? <span className="text-muted-foreground">—</span>}</td>
      <td className="max-w-48 truncate px-4 py-3 text-muted-foreground hidden md:table-cell">{equipment || '—'}</td>
      <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
        {row.technician_name ?? <span className="italic">Sem técnico</span>}
      </td>
      <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{fmtDate(row.created_at)}</td>
      <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{fmtDate(row.completed_at)}</td>
      <td className="px-4 py-3 text-right text-muted-foreground hidden md:table-cell">
        {row.execution_days != null ? `${row.execution_days}d` : '—'}
      </td>
      <td className="px-4 py-3 text-right font-medium hidden lg:table-cell">
        {row.amount_paid != null ? fmtCurrency(row.amount_paid) : '—'}
      </td>
      <td className="px-4 py-3">
        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusColor}`}>
          {statusLabel}
        </span>
      </td>
    </tr>
  )
}

function PrintRow({ row }: { row: OsPorPeriodoRow }) {
  const statusLabel = STATUS_LABELS[row.status] ?? row.status
  const equipment = [row.device_type, row.device_brand, row.device_model].filter(Boolean).join(' ')

  return (
    <tr className="border-b border-gray-300" style={{ breakInside: 'avoid' }}>
      <td className="py-1 pr-2 font-mono">#{row.number}</td>
      <td className="py-1 pr-2">{row.client_name ?? '—'}</td>
      <td className="py-1 pr-2 max-w-36 truncate">{equipment || '—'}</td>
      <td className="py-1 pr-2">{row.technician_name ?? '—'}</td>
      <td className="py-1 pr-2 whitespace-nowrap">{fmtDate(row.created_at)}</td>
      <td className="py-1 pr-2 whitespace-nowrap">{fmtDate(row.completed_at)}</td>
      <td className="py-1 pr-2 text-right">{row.execution_days != null ? `${row.execution_days}d` : '—'}</td>
      <td className="py-1 pr-2 text-right whitespace-nowrap">
        {row.amount_paid != null ? fmtCurrency(row.amount_paid) : '—'}
      </td>
      <td className="py-1">{statusLabel}</td>
    </tr>
  )
}
