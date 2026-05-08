'use client'

import * as React from 'react'
import Link from 'next/link'
import { AlertTriangle, ArrowLeft, Download, Package, Printer } from 'lucide-react'
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
  getEstoqueReport,
  type EstoqueReportData,
  type EstoquePartRow,
} from '@/app/actions/specific-reports'

const STATUS_OPTIONS: DataTableFilterOption[] = [
  { value: 'zerado', label: 'Zerado' },
  { value: 'critico', label: 'Crítico' },
  { value: 'normal', label: 'Normal' },
]

const STATUS_COLORS: Record<string, string> = {
  zerado: 'bg-red-100 text-red-700',
  critico: 'bg-amber-100 text-amber-700',
  normal: 'bg-green-100 text-green-700',
}

const STATUS_LABELS: Record<string, string> = {
  zerado: 'Zerado',
  critico: 'Crítico',
  normal: 'Normal',
}

const DEFAULT_ROWS = 25

type Props = {
  initialData: EstoqueReportData
  initialStart: string
  initialEnd: string
}

export function EstoqueReport({ initialData, initialStart, initialEnd }: Props) {
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

  const loadReport = (nextBranch: string, nextStart: string, nextEnd: string) => {
    if (!nextStart || !nextEnd) { toast.error('Selecione o período completo.'); return }
    if (nextStart > nextEnd) { toast.error('A data inicial não pode ser maior que a data final.'); return }
    startTransition(async () => {
      const result = await getEstoqueReport({
        branchId: nextBranch === 'all' ? undefined : nextBranch,
        startDate: nextStart,
        endDate: nextEnd,
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
        r.part_name.toLocaleLowerCase('pt-BR').includes(q) ||
        r.sku?.toLocaleLowerCase('pt-BR').includes(q) ||
        r.category.toLocaleLowerCase('pt-BR').includes(q)
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
      `estoque-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Peça', 'SKU', 'Categoria', 'Qtd. Atual', 'Estoque Mín.', 'Status', 'Custo Unit.', 'Valor em Estoque', `Saídas (${fmtDate(startDate)}–${fmtDate(endDate)})`, 'Entradas no Período'],
      filtered.map((r) => [
        r.part_name,
        r.sku ?? '',
        r.category,
        r.total_quantity,
        r.min_stock,
        STATUS_LABELS[r.status],
        r.cost_price,
        r.stock_value,
        r.saidas_periodo,
        r.entradas_periodo,
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
        <h1 className="text-2xl font-semibold tracking-tight">Peças / Giro de Estoque</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Posição atual do estoque, peças críticas e movimentações no período.
        </p>
      </div>

      <div className="hidden print:block">
        <h1 className="text-xl font-bold">Peças / Giro de Estoque</h1>
        <p className="text-sm text-muted-foreground">
          Impresso em {fmtDate(new Date().toISOString())} — Período de movimentação: {fmtDate(startDate)} a {fmtDate(endDate)}
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground">Total de SKUs</p>
          <p className="mt-1 text-3xl font-bold">{summary.total_skus}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground">Zerados</p>
          <p className={`mt-1 text-3xl font-bold ${summary.zero_stock > 0 ? 'text-red-600' : ''}`}>
            {summary.zero_stock}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground">Críticos</p>
          <p className={`mt-1 text-3xl font-bold ${summary.critical_stock > 0 ? 'text-amber-600' : ''}`}>
            {summary.critical_stock}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground">Valor em estoque</p>
          <p className="mt-1 text-2xl font-bold">{fmtCurrency(summary.total_inventory_value)}</p>
        </div>
      </div>

      {summary.most_used_part && (
        <div className="flex items-start gap-2 rounded-xl border bg-blue-50 p-4 text-sm text-blue-800">
          <Package className="mt-0.5 size-4 shrink-0" />
          <span>
            Peça mais saída no período: <strong>{summary.most_used_part}</strong>
            {' — '}
            {summary.total_saidas_periodo} saída{summary.total_saidas_periodo !== 1 ? 's' : ''} totais
          </span>
        </div>
      )}

      {(summary.zero_stock > 0 || summary.critical_stock > 0) && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>
            {summary.zero_stock + summary.critical_stock} ite{(summary.zero_stock + summary.critical_stock) !== 1 ? 'ns' : 'm'} precisam de atenção:
            {' '}
            {summary.zero_stock > 0 && <>{summary.zero_stock} zerado{summary.zero_stock !== 1 ? 's' : ''}</>}
            {summary.zero_stock > 0 && summary.critical_stock > 0 && ' e '}
            {summary.critical_stock > 0 && <>{summary.critical_stock} abaixo do mínimo</>}.
          </span>
        </div>
      )}

      {/* Toolbar */}
      <div className="print:hidden">
        <DataTableToolbar
          filters={
            <>
              <DataTableSearch
                value={search}
                onChange={(v) => { setSearch(v); setCurrentPage(1) }}
                placeholder="Buscar peça, SKU, categoria..."
                disabled={isPending}
              />
              <Select
                value={branchFilter}
                onValueChange={(v) => { const val = v ?? 'all'; setBranchFilter(val); loadReport(val, startDate, endDate) }}
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
              <DatePickerField
                value={startDate}
                onChange={(v) => { if (v) { setStartDate(v); loadReport(branchFilter, v, endDate) } }}
                disabled={isPending}
              />
              <DatePickerField
                value={endDate}
                onChange={(v) => { if (v) { setEndDate(v); loadReport(branchFilter, startDate, v) } }}
                disabled={isPending}
              />
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

      {/* Table */}
      <DataTableCard>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Peça</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">SKU</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">Categoria</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Qtd.</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground hidden sm:table-cell">Mín.</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground hidden md:table-cell">Custo unit.</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground hidden lg:table-cell">Valor total</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground hidden sm:table-cell">Saídas</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">
                    <Package className="mx-auto mb-2 size-6 opacity-40" />
                    Nenhuma peça encontrada.
                  </td>
                </tr>
              ) : (
                paginated.map((row) => <EstoqueRow key={row.part_id} row={row} />)
              )}
            </tbody>
          </table>
        </div>
      </DataTableCard>

      <div className="print:hidden">
        <DataTablePagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={filtered.length}
          currentItemsCount={paginated.length}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(v) => { setRowsPerPage(v); setCurrentPage(1) }}
          onPageChange={setCurrentPage}
          itemLabel="peça"
        />
      </div>
    </div>
  )
}

function EstoqueRow({ row }: { row: EstoquePartRow }) {
  const statusColor = STATUS_COLORS[row.status] ?? 'bg-gray-100 text-gray-700'
  const statusLabel = STATUS_LABELS[row.status] ?? row.status

  return (
    <tr className={`border-b last:border-0 ${row.status === 'zerado' ? 'bg-red-50/40' : row.status === 'critico' ? 'bg-amber-50/40' : 'hover:bg-muted/40'}`}>
      <td className="px-4 py-3 font-medium">{row.part_name}</td>
      <td className="px-4 py-3 font-mono text-xs text-muted-foreground hidden md:table-cell">
        {row.sku ?? '—'}
      </td>
      <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{row.category}</td>
      <td className="px-4 py-3 text-right font-semibold">{row.total_quantity}</td>
      <td className="px-4 py-3 text-right text-muted-foreground hidden sm:table-cell">{row.min_stock}</td>
      <td className="px-4 py-3 text-right text-muted-foreground hidden md:table-cell">
        {row.cost_price > 0 ? fmtCurrency(row.cost_price) : '—'}
      </td>
      <td className="px-4 py-3 text-right font-medium hidden lg:table-cell">
        {row.stock_value > 0 ? fmtCurrency(row.stock_value) : '—'}
      </td>
      <td className="px-4 py-3 text-right text-muted-foreground hidden sm:table-cell">
        {row.saidas_periodo > 0 ? row.saidas_periodo : <span className="italic text-muted-foreground/60">sem mov.</span>}
      </td>
      <td className="px-4 py-3">
        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusColor}`}>
          {statusLabel}
        </span>
      </td>
    </tr>
  )
}
