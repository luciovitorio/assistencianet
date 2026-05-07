'use client'

import * as React from 'react'
import Link from 'next/link'
import { AlertCircle, ArrowLeft, Download, Printer } from 'lucide-react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { STATUS_LABELS, type ServiceOrderStatus } from '@/lib/validations/service-order'
import { exportCsv, fmtDate } from '@/lib/report-utils'
import { getOpenOsReport, type OpenOsReportData, type OpenOsRow } from '@/app/actions/specific-reports'

const STATUS_COLORS: Record<string, string> = {
  aberta: 'bg-yellow-100 text-yellow-700',
  em_analise: 'bg-blue-100 text-blue-700',
  aguardando_envio: 'bg-sky-100 text-sky-700',
  aguardando_aprovacao: 'bg-orange-100 text-orange-700',
  aprovado: 'bg-teal-100 text-teal-700',
  reprovado: 'bg-red-100 text-red-700',
  aguardando_peca: 'bg-purple-100 text-purple-700',
  enviado_terceiro: 'bg-indigo-100 text-indigo-700',
  em_reparo: 'bg-cyan-100 text-cyan-700',
  pronto: 'bg-green-100 text-green-700',
}

const OPEN_STATUS_OPTIONS: DataTableFilterOption[] = [
  'aberta', 'em_analise', 'aguardando_envio', 'aguardando_aprovacao',
  'aprovado', 'reprovado', 'aguardando_peca', 'enviado_terceiro', 'em_reparo', 'pronto',
].map((s) => ({ value: s, label: STATUS_LABELS[s as ServiceOrderStatus] ?? s }))

const ROWS_PER_PAGE = 20

type Props = {
  initialData: OpenOsReportData
}

export function OsAbertasReport({ initialData }: Props) {
  const [data, setData] = React.useState(initialData)
  const [branchFilter, setBranchFilter] = React.useState('all')
  const [statusFilter, setStatusFilter] = React.useState<string[]>([])
  const [search, setSearch] = React.useState('')
  const [currentPage, setCurrentPage] = React.useState(1)
  const [isPending, startTransition] = React.useTransition()

  const deferredSearch = React.useDeferredValue(search)

  const branchOptions: DataTableFilterOption[] = data.branches.map((b) => ({
    value: b.id,
    label: b.name,
  }))

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

  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE))
  const page = Math.min(currentPage, totalPages)
  const paginated = filtered.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE)

  const overdueCount = filtered.filter((r) => r.is_overdue).length

  const handleBranchChange = (value: string) => {
    setBranchFilter(value)
    setCurrentPage(1)
    startTransition(async () => {
      const result = await getOpenOsReport({ branchId: value === 'all' ? undefined : value })
      if (result.error || !result.data) {
        toast.error(result.error ?? 'Erro ao carregar relatório.')
        return
      }
      setData(result.data)
    })
  }

  const handleExportCsv = () => {
    exportCsv(
      `os-abertas-${new Date().toISOString().slice(0, 10)}.csv`,
      ['OS', 'Cliente', 'Equipamento', 'Técnico', 'Filial', 'Abertura', 'Previsão', 'Status', 'Atrasada'],
      filtered.map((r) => [
        r.number,
        r.client_name ?? '',
        [r.device_type, r.device_brand, r.device_model].filter(Boolean).join(' '),
        r.technician_name ?? '',
        r.branch_name ?? '',
        fmtDate(r.created_at),
        fmtDate(r.estimated_delivery),
        STATUS_LABELS[r.status as ServiceOrderStatus] ?? r.status,
        r.is_overdue ? 'Sim' : 'Não',
      ]),
    )
  }

  return (
    <div className="space-y-6">
      {/* Header — hidden on print */}
      <div className="print:hidden">
        <div className="mb-1 flex items-center gap-2">
          <Link href="/dashboard/relatorios" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" />
            Relatórios
          </Link>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">OS em Aberto / Atrasadas</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Todas as ordens de serviço em andamento. As atrasadas estão destacadas.
        </p>
      </div>

      {/* Print header — only visible on print */}
      <div className="hidden print:block">
        <h1 className="text-xl font-bold">OS em Aberto / Atrasadas</h1>
        <p className="text-sm text-muted-foreground">
          Impresso em {fmtDate(new Date().toISOString())}
          {branchFilter !== 'all'
            ? ` — Filial: ${data.branches.find((b) => b.id === branchFilter)?.name ?? branchFilter}`
            : ''}
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground">Total em aberto</p>
          <p className="mt-1 text-3xl font-bold">{data.total}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground">Atrasadas</p>
          <p className={`mt-1 text-3xl font-bold ${data.overdue > 0 ? 'text-red-600' : ''}`}>
            {data.overdue}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4 col-span-2 sm:col-span-1">
          <p className="text-xs font-medium text-muted-foreground">Filtro atual</p>
          <p className="mt-1 text-2xl font-bold">{filtered.length}</p>
          <p className="text-xs text-muted-foreground">resultados</p>
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
                placeholder="Buscar OS, cliente, equipamento..."
                disabled={isPending}
              />
              <Select value={branchFilter} onValueChange={handleBranchChange} disabled={isPending}>
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
                options={OPEN_STATUS_OPTIONS}
                selectedValues={statusFilter}
                onToggle={(v) => {
                  setStatusFilter((prev) =>
                    prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]
                  )
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
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Equipamento</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">Técnico</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">Filial</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden sm:table-cell">Abertura</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden sm:table-cell">Previsão</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                    <AlertCircle className="mx-auto mb-2 size-6 opacity-40" />
                    Nenhuma OS encontrada.
                  </td>
                </tr>
              ) : (
                paginated.map((row) => (
                  <OsRow key={row.id} row={row} />
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

function OsRow({ row }: { row: OpenOsRow }) {
  const statusLabel = STATUS_LABELS[row.status as ServiceOrderStatus] ?? row.status
  const statusColor = STATUS_COLORS[row.status] ?? 'bg-gray-100 text-gray-700'
  const equipment = [row.device_type, row.device_brand, row.device_model].filter(Boolean).join(' ')

  return (
    <tr className={`border-b last:border-0 ${row.is_overdue ? 'bg-red-50/60' : 'hover:bg-muted/40'}`}>
      <td className="px-4 py-3 font-mono font-medium">
        #{row.number}
        {row.is_overdue && (
          <span className="ml-2 inline-block rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">
            atrasada
          </span>
        )}
      </td>
      <td className="px-4 py-3">{row.client_name ?? <span className="text-muted-foreground">—</span>}</td>
      <td className="max-w-50 truncate px-4 py-3 text-muted-foreground">{equipment || '—'}</td>
      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
        {row.technician_name ?? <span className="italic">Sem técnico</span>}
      </td>
      <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
        {row.branch_name ?? '—'}
      </td>
      <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{fmtDate(row.created_at)}</td>
      <td className={`px-4 py-3 font-medium hidden sm:table-cell ${row.is_overdue ? 'text-red-600' : 'text-muted-foreground'}`}>
        {fmtDate(row.estimated_delivery)}
      </td>
      <td className="px-4 py-3">
        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusColor}`}>
          {statusLabel}
        </span>
      </td>
    </tr>
  )
}
