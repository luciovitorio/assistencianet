'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  TrendingUp,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DataTableCard,
  DataTableFilterPopover,
  DataTableSearch,
  DataTableToolbar,
  DataTablePagination,
  type DataTableFilterOption,
} from '@/components/ui/data-table'
import { cn } from '@/lib/utils'
import type { ContaAReceberRow } from '@/app/actions/contas-a-receber'

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface BranchOption { id: string; name: string }

interface ReceivablesListProps {
  receivables: ContaAReceberRow[]
  branches: BranchOption[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatDate(dateStr: string) {
  const [year, month, day] = dateStr.split('-')
  return `${day}/${month}/${year}`
}

// ── Componente principal ──────────────────────────────────────────────────────

export function ReceivablesList({ receivables, branches }: ReceivablesListProps) {
  const [search, setSearch] = React.useState('')
  const [grupoFilter, setGrupoFilter] = React.useState<string[]>([])
  const [branchFilter, setBranchFilter] = React.useState<string[]>([])
  const [rowsPerPage, setRowsPerPage] = React.useState(15)
  const [currentPage, setCurrentPage] = React.useState(1)
  const deferredSearch = React.useDeferredValue(search)

  // Totais
  const summary = React.useMemo(() => {
    let totalPronto = 0, totalFiado = 0, countPronto = 0, countFiado = 0
    for (const r of receivables) {
      if (r.grupo === 'pronto') { totalPronto += r.amount; countPronto++ }
      else { totalFiado += r.amount; countFiado++ }
    }
    return { totalPronto, totalFiado, countPronto, countFiado }
  }, [receivables])

  const grupoOptions = React.useMemo<DataTableFilterOption[]>(() => [
    {
      value: 'pronto',
      label: 'Prontas para retirada',
      count: receivables.filter((r) => r.grupo === 'pronto').length,
    },
    {
      value: 'fiado',
      label: 'Entregues não pagas',
      count: receivables.filter((r) => r.grupo === 'fiado').length,
    },
  ], [receivables])

  const branchOptions = React.useMemo<DataTableFilterOption[]>(() =>
    branches.map((b) => ({
      value: b.id,
      label: b.name,
      count: receivables.filter((r) => r.branch_id === b.id).length,
    })), [branches, receivables])

  const filtered = React.useMemo(() => {
    const q = deferredSearch.trim().toLowerCase()
    return receivables.filter((r) => {
      const matchSearch =
        q.length === 0 ||
        r.client_name.toLowerCase().includes(q) ||
        r.device_type.toLowerCase().includes(q) ||
        (r.device_brand?.toLowerCase().includes(q) ?? false) ||
        (r.device_model?.toLowerCase().includes(q) ?? false) ||
        String(r.number).includes(q)
      const matchGrupo = grupoFilter.length === 0 || grupoFilter.includes(r.grupo)
      const matchBranch = branchFilter.length === 0 || branchFilter.includes(r.branch_id)
      return matchSearch && matchGrupo && matchBranch
    })
  }, [receivables, deferredSearch, grupoFilter, branchFilter])

  const hasActiveFilters =
    search.trim().length > 0 ||
    grupoFilter.length > 0 ||
    branchFilter.length > 0

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage))
  const paginated = React.useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage
    return filtered.slice(start, start + rowsPerPage)
  }, [filtered, currentPage, rowsPerPage])

  React.useEffect(() => { setCurrentPage(1) }, [deferredSearch, grupoFilter, branchFilter, rowsPerPage])
  React.useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages)
  }, [currentPage, totalPages])

  const resetFilters = () => {
    setSearch('')
    setGrupoFilter([])
    setBranchFilter([])
  }

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-[linear-gradient(135deg,#f8fafc_0%,#ffffff_58%,#f0fdf4_100%)] shadow-sm">
        <div className="absolute inset-y-0 right-0 w-72 bg-[radial-gradient(circle_at_top,rgba(34,197,94,0.12),transparent_62%)]" />
        <div className="relative grid gap-5 px-6 py-5 lg:grid-cols-[minmax(0,1fr)_300px] lg:px-8">
          <div className="min-w-0 space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              <TrendingUp className="size-3.5 text-emerald-600" />
              Contas a Receber
            </div>
            <div className="space-y-1.5">
              <h2 className="text-2xl font-bold tracking-tight text-slate-950">
                Receita pendente por filial
              </h2>
              <p className="max-w-2xl text-sm leading-6 text-slate-600">
                Ordens prontas aguardando retirada e ordens entregues ainda não pagas.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Summary cards */}
      <section className="grid gap-4 sm:grid-cols-2">
        <SummaryCard
          label="Prontas para retirada"
          value={summary.totalPronto}
          count={summary.countPronto}
          icon={Clock}
          helper="Equipamentos prontos aguardando retirada e pagamento"
          valueClass="text-slate-900"
          accentClass="from-blue-100 via-blue-50 to-white"
        />
        <SummaryCard
          label="Entregues não pagas"
          value={summary.totalFiado}
          count={summary.countFiado}
          icon={AlertTriangle}
          helper="Equipamentos entregues — pagamento ainda pendente"
          valueClass={summary.totalFiado > 0 ? 'text-destructive' : 'text-slate-900'}
          accentClass={summary.totalFiado > 0 ? 'from-red-100 via-red-50 to-white' : 'from-slate-100 via-white to-white'}
        />
      </section>

      {/* Tabela */}
      <DataTableToolbar
        filters={
          <>
            <DataTableSearch
              value={search}
              onChange={setSearch}
              placeholder="Buscar por cliente, equipamento ou nº OS..."
              disabled={receivables.length === 0}
            />
            <DataTableFilterPopover
              title="Grupo"
              options={grupoOptions}
              selectedValues={grupoFilter}
              onToggle={(v) => setGrupoFilter((prev) => prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v])}
              onClear={() => setGrupoFilter([])}
              disabled={receivables.length === 0}
            />
            {branches.length > 1 && (
              <DataTableFilterPopover
                title="Filial"
                options={branchOptions}
                selectedValues={branchFilter}
                onToggle={(v) => setBranchFilter((prev) => prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v])}
                onClear={() => setBranchFilter([])}
                disabled={receivables.length === 0}
              />
            )}
            {hasActiveFilters && (
              <Button variant="outline" onClick={resetFilters} className="gap-2">
                <X className="size-4" />
                Limpar filtros
              </Button>
            )}
          </>
        }
      />

      <DataTableCard>
        {receivables.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-center">
            <div className="mb-4 rounded-2xl bg-slate-100 p-4 text-slate-500">
              <CheckCircle2 className="size-8 text-emerald-600" />
            </div>
            <h3 className="text-lg font-medium mb-2">Nenhuma conta a receber</h3>
            <p className="text-muted-foreground text-sm max-w-sm">
              Não há ordens prontas para retirada nem entregas com pagamento pendente no momento.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-center">
            <div className="mb-4 rounded-2xl bg-slate-100 p-4 text-slate-500">
              <TrendingUp className="size-8" />
            </div>
            <h3 className="text-lg font-medium mb-2">Nenhum resultado encontrado</h3>
            <p className="text-muted-foreground text-sm max-w-md">
              Ajuste a busca ou os filtros para localizar outra entrada.
            </p>
            {hasActiveFilters && (
              <Button variant="outline" onClick={resetFilters} className="mt-4 gap-2">
                <X className="size-4" />
                Limpar filtros
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-slate-50/80">
                  <th className="text-left font-medium text-muted-foreground px-4 py-3">OS / Cliente</th>
                  {branches.length > 1 && (
                    <th className="text-left font-medium text-muted-foreground px-4 py-3 hidden lg:table-cell">Filial</th>
                  )}
                  <th className="text-left font-medium text-muted-foreground px-4 py-3 hidden md:table-cell">Equipamento</th>
                  <th className="text-center font-medium text-muted-foreground px-4 py-3 hidden sm:table-cell">Aguardando</th>
                  <th className="text-right font-medium text-muted-foreground px-4 py-3">Valor</th>
                  <th className="text-center font-medium text-muted-foreground px-4 py-3">Situação</th>
                  <th className="text-right font-medium text-muted-foreground px-4 py-3">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginated.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-foreground">OS #{row.number}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{row.client_name}</div>
                    </td>
                    {branches.length > 1 && (
                      <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell text-sm">
                        {row.branch_name}
                      </td>
                    )}
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="text-foreground">{row.device_type}</div>
                      {(row.device_brand || row.device_model) && (
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {[row.device_brand, row.device_model].filter(Boolean).join(' · ')}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center hidden sm:table-cell">
                      <span
                        className={cn(
                          'tabular-nums text-sm font-medium',
                          row.days_waiting > 7
                            ? 'text-amber-600'
                            : row.days_waiting > 30
                              ? 'text-destructive'
                              : 'text-muted-foreground',
                        )}
                      >
                        {row.days_waiting === 0 ? 'Hoje' : `${row.days_waiting}d`}
                      </span>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        {formatDate(row.reference_date)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">
                      {row.amount > 0 ? formatCurrency(row.amount) : <span className="text-muted-foreground text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {row.grupo === 'pronto' ? (
                        <span className="inline-block text-[11px] uppercase tracking-wider font-bold px-2.5 py-1 rounded-full bg-blue-100 text-blue-700">
                          Aguardando retirada
                        </span>
                      ) : (
                        <span className="inline-block text-[11px] uppercase tracking-wider font-bold px-2.5 py-1 rounded-full bg-red-100 text-red-700">
                          Entregue · não pago
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/dashboard/ordens-de-servico/${row.id}`}
                        className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                      >
                        Ver OS
                        <ArrowUpRight className="size-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {filtered.length > 0 && (
          <DataTablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={setRowsPerPage}
            onPageChange={setCurrentPage}
            totalItems={filtered.length}
            currentItemsCount={paginated.length}
            itemLabel="os"
          />
        )}
      </DataTableCard>
    </>
  )
}

// ── SummaryCard ────────────────────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  count,
  icon: Icon,
  helper,
  valueClass = '',
  accentClass = 'from-slate-100 via-white to-white',
}: {
  label: string
  value: number
  count: number
  icon: React.ElementType
  helper: string
  valueClass?: string
  accentClass?: string
}) {
  return (
    <div className={`rounded-[24px] border border-slate-200 bg-gradient-to-br ${accentClass} p-4 shadow-sm`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-600">{label}</p>
          <p className={`mt-2 text-2xl font-bold tracking-tight tabular-nums ${valueClass}`}>
            {value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
          <p className="mt-1 text-xs text-slate-500">{count} OS{count !== 1 ? '' : ''}</p>
        </div>
        <div className="rounded-2xl border border-white/70 bg-white/80 p-2.5 text-slate-700 shadow-sm">
          <Icon className="size-5" />
        </div>
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-500">{helper}</p>
    </div>
  )
}
