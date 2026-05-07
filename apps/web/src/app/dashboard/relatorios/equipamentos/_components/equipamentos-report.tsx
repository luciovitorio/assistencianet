'use client'

import * as React from 'react'
import Link from 'next/link'
import { ArrowLeft, Download, Printer, Wrench } from 'lucide-react'
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
import { getEquipmentsReport, type EquipmentsReportData, type EquipmentRankRow } from '@/app/actions/specific-reports'

const ROWS_PER_PAGE = 25

type Props = {
  initialData: EquipmentsReportData
  initialStart: string
  initialEnd: string
}

export function EquipamentosReport({ initialData, initialStart, initialEnd }: Props) {
  const [data, setData] = React.useState(initialData)
  const [startDate, setStartDate] = React.useState(initialStart)
  const [endDate, setEndDate] = React.useState(initialEnd)
  const [branchFilter, setBranchFilter] = React.useState('all')
  const [search, setSearch] = React.useState('')
  const [currentPage, setCurrentPage] = React.useState(1)
  const [isPending, startTransition] = React.useTransition()

  const deferredSearch = React.useDeferredValue(search)

  const loadReport = (nextStart: string, nextEnd: string, nextBranch: string) => {
    if (!nextStart || !nextEnd) { toast.error('Selecione o período completo.'); return }
    if (nextStart > nextEnd) { toast.error('A data inicial não pode ser maior que a data final.'); return }
    startTransition(async () => {
      const result = await getEquipmentsReport({
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
      r.device_type.toLocaleLowerCase('pt-BR').includes(q) ||
      r.device_brand?.toLocaleLowerCase('pt-BR').includes(q) ||
      r.device_model?.toLocaleLowerCase('pt-BR').includes(q)
    )
  }, [data.rows, deferredSearch])

  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE))
  const page = Math.min(currentPage, totalPages)
  const paginated = filtered.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE)

  const handleExportCsv = () => {
    exportCsv(
      `equipamentos-${startDate}.csv`,
      ['Tipo', 'Marca', 'Modelo', 'Total de OS', 'Concluídas', '% Concluído'],
      filtered.map((r) => [
        r.device_type,
        r.device_brand ?? '',
        r.device_model ?? '',
        r.count,
        r.completed,
        r.count > 0 ? `${Math.round((r.completed / r.count) * 100)}%` : '0%',
      ]),
    )
  }

  const topDevice = filtered[0]

  return (
    <div className="space-y-6">
      <div className="print:hidden">
        <div className="mb-1 flex items-center gap-2">
          <Link href="/dashboard/relatorios" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" />
            Relatórios
          </Link>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Equipamentos Mais Atendidos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ranking de equipamentos por volume de OS no período.
        </p>
      </div>

      <div className="hidden print:block">
        <h1 className="text-xl font-bold">Equipamentos Mais Atendidos</h1>
        <p className="text-sm text-muted-foreground">
          Período: {fmtDate(startDate)} a {fmtDate(endDate)} — Impresso em {fmtDate(new Date().toISOString())}
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground">OS no período</p>
          <p className="mt-1 text-3xl font-bold">{data.total_os}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground">Tipos distintos</p>
          <p className="mt-1 text-3xl font-bold">{data.rows.length}</p>
        </div>
        {topDevice && (
          <div className="rounded-xl border bg-card p-4 col-span-2 sm:col-span-1">
            <p className="text-xs font-medium text-muted-foreground">Mais atendido</p>
            <p className="mt-1 font-semibold leading-tight">
              {[topDevice.device_type, topDevice.device_brand].filter(Boolean).join(' ')}
            </p>
            <p className="text-xs text-muted-foreground">{topDevice.count} OS</p>
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
                placeholder="Buscar tipo, marca, modelo..."
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

      {/* Table */}
      <DataTableCard>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground w-12">#</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tipo</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden sm:table-cell">Marca</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">Modelo</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Total OS</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground hidden sm:table-cell">Concluídas</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground hidden lg:table-cell">% Concluído</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    <Wrench className="mx-auto mb-2 size-6 opacity-40" />
                    Nenhum equipamento encontrado no período.
                  </td>
                </tr>
              ) : (
                paginated.map((row, idx) => (
                  <EquipmentRow
                    key={row.key}
                    row={row}
                    rank={(page - 1) * ROWS_PER_PAGE + idx + 1}
                    isTop={idx === 0 && page === 1}
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

function EquipmentRow({ row, rank, isTop }: { row: EquipmentRankRow; rank: number; isTop: boolean }) {
  const pct = row.count > 0 ? Math.round((row.completed / row.count) * 100) : 0

  return (
    <tr className={`border-b last:border-0 ${isTop ? 'bg-amber-50/50' : 'hover:bg-muted/40'}`}>
      <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{rank}</td>
      <td className="px-4 py-3 font-medium">{row.device_type}</td>
      <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{row.device_brand ?? '—'}</td>
      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{row.device_model ?? '—'}</td>
      <td className="px-4 py-3 text-right font-semibold">{row.count}</td>
      <td className="px-4 py-3 text-right text-muted-foreground hidden sm:table-cell">{row.completed}</td>
      <td className="px-4 py-3 text-right text-muted-foreground hidden lg:table-cell">{pct}%</td>
    </tr>
  )
}
