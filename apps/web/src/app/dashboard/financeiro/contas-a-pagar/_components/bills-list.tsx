'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertCircle,
  CheckCircle2,
  CircleDollarSign,
  Clock,
  MoreHorizontal,
  Plus,
  TrendingDown,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button-variants'
import {
  DataTableCard,
  DataTableFilterPopover,
  DataTableSearch,
  DataTableToolbar,
  DataTablePagination,
  type DataTableFilterOption,
} from '@/components/ui/data-table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  BILL_CATEGORY_LABELS,
  BILL_STATUS_COLORS,
  BILL_STATUS_LABELS,
  BILL_PAYMENT_METHOD_LABELS,
  type BillCategory,
  type BillStatusDerived,
} from '@/lib/validations/bills'
import { cn } from '@/lib/utils'
import type { BillRow, BillsSummary } from '@/app/actions/bills'
import { BillDialog } from './bill-dialog'
import { BillPayDialog } from './bill-pay-dialog'

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface BranchOption { id: string; name: string }
export interface SupplierOption { id: string; name: string }

interface BillsListProps {
  bills: BillRow[]
  summary: BillsSummary
  branches: BranchOption[]
  suppliers: SupplierOption[]
  isAdmin: boolean
}

type DialogState =
  | { type: 'none' }
  | { type: 'create' }
  | { type: 'edit'; bill: BillRow }
  | { type: 'pay'; bill: BillRow }

// ── Helpers ───────────────────────────────────────────────────────────────────

const today = new Date().toISOString().slice(0, 10)

function derivedStatus(bill: BillRow): BillStatusDerived {
  if (bill.status === 'pago') return 'pago'
  if (bill.due_date < today) return 'vencido'
  return 'pendente'
}

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatDate(dateStr: string) {
  const [year, month, day] = dateStr.split('-')
  return `${day}/${month}/${year}`
}

// ── Componente principal ──────────────────────────────────────────────────────

export function BillsList({
  bills,
  summary,
  branches,
  suppliers,
  isAdmin,
}: BillsListProps) {
  const router = useRouter()
  const [search, setSearch] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState<string[]>([])
  const [categoryFilter, setCategoryFilter] = React.useState<string[]>([])
  const [branchFilter, setBranchFilter] = React.useState<string[]>([])
  const [rowsPerPage, setRowsPerPage] = React.useState(15)
  const [currentPage, setCurrentPage] = React.useState(1)
  const [dialog, setDialog] = React.useState<DialogState>({ type: 'none' })
  const deferredSearch = React.useDeferredValue(search)

  const enriched = React.useMemo(
    () => bills.map((b) => ({ ...b, derivedStatus: derivedStatus(b) })),
    [bills],
  )

  const categoryOptions = React.useMemo<DataTableFilterOption[]>(() =>
    Object.entries(BILL_CATEGORY_LABELS).map(([value, label]) => ({
      value,
      label,
      count: enriched.filter((b) => b.category === value).length,
    })), [enriched])

  const statusOptions = React.useMemo<DataTableFilterOption[]>(() => [
    { value: 'pendente', label: 'Pendente', count: enriched.filter((b) => b.derivedStatus === 'pendente').length },
    { value: 'vencido',  label: 'Vencido',  count: enriched.filter((b) => b.derivedStatus === 'vencido').length },
    { value: 'pago',     label: 'Pago',     count: enriched.filter((b) => b.derivedStatus === 'pago').length },
  ], [enriched])

  const branchOptions = React.useMemo<DataTableFilterOption[]>(() =>
    branches.map((b) => ({
      value: b.id,
      label: b.name,
      count: enriched.filter((bill) => bill.branch_id === b.id).length,
    })), [branches, enriched])

  const filtered = React.useMemo(() => {
    const q = deferredSearch.trim().toLowerCase()
    return enriched.filter((b) => {
      const matchSearch =
        q.length === 0 ||
        b.description.toLowerCase().includes(q) ||
        (b.suppliers?.name?.toLowerCase().includes(q) ?? false)
      const matchStatus = statusFilter.length === 0 || statusFilter.includes(b.derivedStatus)
      const matchCategory = categoryFilter.length === 0 || categoryFilter.includes(b.category)
      const matchBranch = branchFilter.length === 0 || branchFilter.includes(b.branch_id)
      return matchSearch && matchStatus && matchCategory && matchBranch
    })
  }, [enriched, deferredSearch, statusFilter, categoryFilter, branchFilter])

  const hasActiveFilters =
    search.trim().length > 0 ||
    statusFilter.length > 0 ||
    categoryFilter.length > 0 ||
    branchFilter.length > 0

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage))
  const paginated = React.useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage
    return filtered.slice(start, start + rowsPerPage)
  }, [filtered, currentPage, rowsPerPage])

  React.useEffect(() => { setCurrentPage(1) }, [deferredSearch, statusFilter, categoryFilter, branchFilter, rowsPerPage])
  React.useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages)
  }, [currentPage, totalPages])

  const resetFilters = () => {
    setSearch('')
    setStatusFilter([])
    setCategoryFilter([])
    setBranchFilter([])
  }

  const closeDialog = () => setDialog({ type: 'none' })
  const onSuccess = () => { closeDialog(); router.refresh() }

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-[linear-gradient(135deg,#f8fafc_0%,#ffffff_58%,#fef9ee_100%)] shadow-sm">
        <div className="absolute inset-y-0 right-0 w-72 bg-[radial-gradient(circle_at_top,rgba(234,179,8,0.12),transparent_62%)]" />
        <div className="relative grid gap-5 px-6 py-5 lg:grid-cols-[minmax(0,1fr)_300px] lg:px-8">
          <div className="min-w-0 space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              <TrendingDown className="size-3.5 text-amber-600" />
              Contas a Pagar
            </div>
            <div className="space-y-1.5">
              <h2 className="text-2xl font-bold tracking-tight text-slate-950">
                Compromissos financeiros da empresa
              </h2>
              <p className="max-w-2xl text-sm leading-6 text-slate-600">
                Fornecedores, despesas fixas e recorrentes organizados por filial e vencimento.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Summary cards */}
      <section className="grid gap-4 sm:grid-cols-3">
        <SummaryCard
          label="A vencer"
          value={summary.totalPendente}
          count={summary.countPendente}
          icon={Clock}
          valueClass="text-slate-900"
          accentClass="from-slate-100 via-white to-white"
        />
        <SummaryCard
          label="Vencido"
          value={summary.totalVencido}
          count={summary.countVencido}
          icon={AlertCircle}
          valueClass={summary.totalVencido > 0 ? 'text-destructive' : 'text-slate-900'}
          accentClass={summary.totalVencido > 0 ? 'from-red-100 via-red-50 to-white' : 'from-slate-100 via-white to-white'}
        />
        <SummaryCard
          label="Pago no mês"
          value={summary.totalPagoMes}
          icon={CheckCircle2}
          valueClass="text-emerald-700"
          accentClass="from-emerald-100 via-emerald-50 to-white"
        />
      </section>

      {/* Tabela */}
      <DataTableToolbar
        filters={
          <>
            <DataTableSearch
              value={search}
              onChange={setSearch}
              placeholder="Buscar por descrição ou fornecedor..."
              disabled={bills.length === 0}
            />
            <DataTableFilterPopover
              title="Status"
              options={statusOptions}
              selectedValues={statusFilter}
              onToggle={(v) => setStatusFilter((prev) => prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v])}
              onClear={() => setStatusFilter([])}
              disabled={bills.length === 0}
            />
            <DataTableFilterPopover
              title="Categoria"
              options={categoryOptions}
              selectedValues={categoryFilter}
              onToggle={(v) => setCategoryFilter((prev) => prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v])}
              onClear={() => setCategoryFilter([])}
              disabled={bills.length === 0}
            />
            {branches.length > 1 && (
              <DataTableFilterPopover
                title="Filial"
                options={branchOptions}
                selectedValues={branchFilter}
                onToggle={(v) => setBranchFilter((prev) => prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v])}
                onClear={() => setBranchFilter([])}
                disabled={bills.length === 0}
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
        actions={
          isAdmin ? (
            <Button onClick={() => setDialog({ type: 'create' })} className="gap-2 cursor-pointer">
              <Plus className="size-4" />
              Novo Lançamento
            </Button>
          ) : null
        }
      />

      <DataTableCard>
        {bills.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-center">
            <div className="mb-4 rounded-2xl bg-slate-100 p-4 text-slate-500">
              <CircleDollarSign className="size-8" />
            </div>
            <h3 className="text-lg font-medium mb-2">Nenhum lançamento cadastrado</h3>
            <p className="text-muted-foreground text-sm max-w-sm">
              Registre despesas, fornecedores e contas recorrentes para controlar os compromissos financeiros.
            </p>
            {isAdmin && (
              <Button onClick={() => setDialog({ type: 'create' })} className="mt-4 gap-2">
                <Plus className="size-4" />
                Novo Lançamento
              </Button>
            )}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-center">
            <div className="mb-4 rounded-2xl bg-slate-100 p-4 text-slate-500">
              <CircleDollarSign className="size-8" />
            </div>
            <h3 className="text-lg font-medium mb-2">Nenhum resultado encontrado</h3>
            <p className="text-muted-foreground text-sm max-w-md">
              Ajuste a busca ou os filtros para localizar outro lançamento.
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
                  <th className="text-left font-medium text-muted-foreground px-4 py-3">Descrição</th>
                  {branches.length > 1 && (
                    <th className="text-left font-medium text-muted-foreground px-4 py-3 hidden lg:table-cell">Filial</th>
                  )}
                  <th className="text-left font-medium text-muted-foreground px-4 py-3 hidden md:table-cell">Categoria</th>
                  <th className="text-center font-medium text-muted-foreground px-4 py-3">Vencimento</th>
                  <th className="text-right font-medium text-muted-foreground px-4 py-3">Valor</th>
                  <th className="text-center font-medium text-muted-foreground px-4 py-3">Status</th>
                  {isAdmin && (
                    <th className="text-right font-medium text-muted-foreground px-4 py-3">Ações</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginated.map((bill) => {
                  const ds = bill.derivedStatus
                  return (
                    <tr key={bill.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">{bill.description}</div>
                        {bill.suppliers?.name && (
                          <div className="text-xs text-muted-foreground mt-0.5">{bill.suppliers.name}</div>
                        )}
                        {bill.recurrence && (
                          <div className="text-xs text-blue-600 mt-0.5">↻ Recorrente</div>
                        )}
                      </td>
                      {branches.length > 1 && (
                        <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell text-sm">
                          {bill.branches?.name ?? '—'}
                        </td>
                      )}
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700">
                          {BILL_CATEGORY_LABELS[bill.category as BillCategory] ?? bill.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-sm tabular-nums">
                        <span className={ds === 'vencido' ? 'text-destructive font-medium' : 'text-foreground'}>
                          {formatDate(bill.due_date)}
                        </span>
                        {ds === 'pago' && bill.paid_at && (
                          <div className="text-[11px] text-muted-foreground mt-0.5">
                            Pago {formatDate(bill.paid_at.slice(0, 10))}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums">
                        {formatCurrency(Number(bill.amount))}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block text-[11px] uppercase tracking-wider font-bold px-2.5 py-1 rounded-full ${BILL_STATUS_COLORS[ds]}`}>
                          {BILL_STATUS_LABELS[ds]}
                        </span>
                        {ds === 'pago' && bill.payment_method && (
                          <div className="text-[10px] text-muted-foreground mt-0.5">
                            {BILL_PAYMENT_METHOD_LABELS[bill.payment_method as keyof typeof BILL_PAYMENT_METHOD_LABELS] ?? bill.payment_method}
                          </div>
                        )}
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end">
                            <DropdownMenu>
                              <DropdownMenuTrigger
                                className={cn(
                                  buttonVariants({ variant: 'ghost', size: 'icon' }),
                                  'size-8 rounded-xl text-muted-foreground',
                                )}
                                type="button"
                                title="Ações"
                              >
                                <MoreHorizontal className="size-4" />
                                <span className="sr-only">Ações</span>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuGroup>
                                  <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  {bill.status === 'pendente' && (
                                    <DropdownMenuItem
                                      onClick={(e) => { e.preventDefault(); setDialog({ type: 'pay', bill }) }}
                                    >
                                      <CheckCircle2 className="size-4" />
                                      Registrar pagamento
                                    </DropdownMenuItem>
                                  )}
                                  {bill.status === 'pendente' && (
                                    <DropdownMenuItem
                                      onClick={(e) => { e.preventDefault(); setDialog({ type: 'edit', bill }) }}
                                    >
                                      Editar
                                    </DropdownMenuItem>
                                  )}
                                  {bill.status === 'pendente' && (
                                    <DropdownMenuItem
                                      className="text-destructive focus:text-destructive"
                                      onClick={async (e) => {
                                        e.preventDefault()
                                        const { deleteBill } = await import('@/app/actions/bills')
                                        const res = await deleteBill(bill.id)
                                        if (res.error) {
                                          const { toast } = await import('sonner')
                                          toast.error(res.error)
                                        } else {
                                          router.refresh()
                                        }
                                      }}
                                    >
                                      Excluir
                                    </DropdownMenuItem>
                                  )}
                                  {bill.status === 'pago' && (
                                    <DropdownMenuItem disabled className="text-muted-foreground">
                                      Lançamento pago
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuGroup>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                })}
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
            itemLabel="lancamento"
          />
        )}
      </DataTableCard>

      {/* Dialogs */}
      <BillDialog
        mode={dialog.type === 'edit' ? 'edit' : 'create'}
        bill={dialog.type === 'edit' ? dialog.bill : null}
        branches={branches}
        suppliers={suppliers}
        open={dialog.type === 'create' || dialog.type === 'edit'}
        onOpenChange={(open) => { if (!open) closeDialog() }}
        onSuccess={onSuccess}
      />

      <BillPayDialog
        bill={dialog.type === 'pay' ? dialog.bill : null}
        open={dialog.type === 'pay'}
        onOpenChange={(open) => { if (!open) closeDialog() }}
        onSuccess={onSuccess}
      />
    </>
  )
}

// ── SummaryCard ────────────────────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  count,
  icon: Icon,
  valueClass = '',
  accentClass = 'from-slate-100 via-white to-white',
}: {
  label: string
  value: number
  count?: number
  icon: React.ElementType
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
          {count !== undefined && (
            <p className="mt-1 text-xs text-slate-500">{count} lançamento{count !== 1 ? 's' : ''}</p>
          )}
        </div>
        <div className="rounded-2xl border border-white/70 bg-white/80 p-2.5 text-slate-700 shadow-sm">
          <Icon className="size-5" />
        </div>
      </div>
    </div>
  )
}
