'use client'

import * as React from 'react'
import Link from 'next/link'
import { ArrowLeft, Download, DollarSign, Printer } from 'lucide-react'
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
import { exportCsv, fmtCurrency, fmtDate, PAYMENT_METHOD_LABEL } from '@/lib/report-utils'
import {
  getFaturamentoPorPeriodoReport,
  type FaturamentoReportData,
  type FaturamentoRow,
} from '@/app/actions/specific-reports'

const DEFAULT_ROWS = 25

type Props = {
  initialData: FaturamentoReportData
  initialStart: string
  initialEnd: string
}

export function FaturamentoReport({ initialData, initialStart, initialEnd }: Props) {
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
      const result = await getFaturamentoPorPeriodoReport({
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
    return data.rows.filter((r) =>
      String(r.service_order_number ?? '').includes(q) ||
      r.branch_name?.toLocaleLowerCase('pt-BR').includes(q) ||
      PAYMENT_METHOD_LABEL(r.payment_method).toLocaleLowerCase('pt-BR').includes(q)
    )
  }, [data.rows, deferredSearch])

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage))
  const page = Math.min(currentPage, totalPages)
  const paginated = filtered.slice((page - 1) * rowsPerPage, page * rowsPerPage)

  const { summary } = data

  const handleExportCsv = () => {
    exportCsv(
      `faturamento-${startDate}.csv`,
      ['OS', 'Filial', 'Forma de Pagamento', 'Valor Cobrado', 'Valor Líquido', 'Data'],
      filtered.map((r) => [
        r.service_order_number ?? '',
        r.branch_name ?? '',
        PAYMENT_METHOD_LABEL(r.payment_method),
        r.amount_received,
        r.net_amount,
        fmtDate(r.created_at),
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
        <h1 className="text-2xl font-semibold tracking-tight">Faturamento por Período</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Receita recebida no período, por filial e forma de pagamento.
        </p>
      </div>

      <div className="hidden print:block">
        <h1 className="text-xl font-bold">Faturamento por Período</h1>
        <p className="text-sm text-muted-foreground">
          Período: {fmtDate(startDate)} a {fmtDate(endDate)} — Impresso em {fmtDate(new Date().toISOString())}
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground">Receita total</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">{fmtCurrency(summary.total_received)}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground">Pagamentos</p>
          <p className="mt-1 text-3xl font-bold">{summary.total_entries}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 col-span-2 sm:col-span-1">
          <p className="text-xs font-medium text-muted-foreground">Ticket médio</p>
          <p className="mt-1 text-2xl font-bold">{fmtCurrency(summary.avg_ticket)}</p>
        </div>
      </div>

      {/* Por filial + Por método */}
      {(summary.by_branch.length > 0 || summary.by_payment_method.length > 0) && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {summary.by_branch.length > 0 && (
            <div className="rounded-xl border bg-card p-4">
              <p className="mb-3 text-sm font-semibold">Por filial</p>
              <div className="space-y-2">
                {summary.by_branch.map((b) => (
                  <div key={b.branch_name} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{b.branch_name}</span>
                    <span className="font-semibold">{fmtCurrency(b.total_received)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {summary.by_payment_method.length > 0 && (
            <div className="rounded-xl border bg-card p-4">
              <p className="mb-3 text-sm font-semibold">Por forma de pagamento</p>
              <div className="space-y-2">
                {summary.by_payment_method.map((m) => (
                  <div key={m.method} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{PAYMENT_METHOD_LABEL(m.method)}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">{m.count}×</span>
                      <span className="font-semibold">{fmtCurrency(m.total_received)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
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
                placeholder="Buscar OS, filial, pagamento..."
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
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">OS</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden sm:table-cell">Filial</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">Pagamento</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground hidden md:table-cell">Valor Cobrado</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Valor Líquido</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden sm:table-cell">Data</th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                      <DollarSign className="mx-auto mb-2 size-6 opacity-40" />
                      Nenhum recebimento encontrado no período.
                    </td>
                  </tr>
                ) : (
                  paginated.map((row) => <FaturamentoEntryRow key={row.id} row={row} />)
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
              <th className="py-1.5 pr-2 text-left font-semibold">OS</th>
              <th className="py-1.5 pr-2 text-left font-semibold">Filial</th>
              <th className="py-1.5 pr-2 text-left font-semibold">Pagamento</th>
              <th className="py-1.5 pr-2 text-right font-semibold">Valor Cobrado</th>
              <th className="py-1.5 text-right font-semibold">Valor Líquido</th>
              <th className="py-1.5 pl-2 text-left font-semibold">Data</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={6} className="py-4 text-center">Nenhum recebimento encontrado no período.</td></tr>
            ) : (
              filtered.map((row) => <PrintFaturamentoRow key={row.id} row={row} />)
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
          itemLabel="lançamento"
        />
      </div>
    </div>
  )
}

function PrintFaturamentoRow({ row }: { row: FaturamentoRow }) {
  return (
    <tr className="border-b border-gray-300" style={{ breakInside: 'avoid' }}>
      <td className="py-1 pr-2 font-mono">
        {row.service_order_number != null ? `#${row.service_order_number}` : '—'}
      </td>
      <td className="py-1 pr-2">{row.branch_name ?? '—'}</td>
      <td className="py-1 pr-2">{PAYMENT_METHOD_LABEL(row.payment_method)}</td>
      <td className="py-1 pr-2 text-right">{fmtCurrency(row.amount_received)}</td>
      <td className="py-1 text-right font-semibold">{fmtCurrency(row.net_amount)}</td>
      <td className="py-1 pl-2 whitespace-nowrap">{fmtDate(row.created_at)}</td>
    </tr>
  )
}

function FaturamentoEntryRow({ row }: { row: FaturamentoRow }) {
  return (
    <tr className="border-b last:border-0 hover:bg-muted/40">
      <td className="px-4 py-3 font-mono font-medium">
        {row.service_order_number != null ? `#${row.service_order_number}` : <span className="text-muted-foreground">—</span>}
      </td>
      <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{row.branch_name ?? '—'}</td>
      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{PAYMENT_METHOD_LABEL(row.payment_method)}</td>
      <td className="px-4 py-3 text-right text-muted-foreground hidden md:table-cell">{fmtCurrency(row.amount_received)}</td>
      <td className="px-4 py-3 text-right font-semibold text-emerald-700">{fmtCurrency(row.net_amount)}</td>
      <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{fmtDate(row.created_at)}</td>
    </tr>
  )
}
