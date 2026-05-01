'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowDownToLine,
  ArrowRightLeft,
  Download,
  History,
  MoreHorizontal,
  Package,
  Pencil,
  Plus,
  SlidersHorizontal,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button-variants'
import {
  DataTableCard,
  DataTableFilterPopover,
  DataTableSearch,
  DataTablePagination,
  type DataTableFilterOption,
} from '@/components/ui/data-table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { CATEGORY_LABELS, type PartCategory } from '@/lib/validations/part'
import { cn } from '@/lib/utils'
import { MovementDialog } from './movement-dialog'
import { TransferenciaDialog } from './transferencia-dialog'
import { HistorySheet } from './history-sheet'

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface PartRow {
  id: string
  name: string
  sku: string | null
  category: string
  unit: string
  min_stock: number
  active: boolean
  supplier_id: string | null
}

export interface BranchOption {
  id: string
  name: string
}

export interface SupplierOption {
  id: string
  name: string
}

interface StockListProps {
  parts: PartRow[]
  branches: BranchOption[]
  suppliers: SupplierOption[]
  stockByPartBranch: Record<string, number>
  reservedByPartBranch: Record<string, number>
  isAdmin: boolean
  currentBranchId: string | null
  initialPartId: string | null
  initialSelectedBranch: string | null
}

type StockStatus = 'ok' | 'baixo' | 'zerado'

interface StockItem extends PartRow {
  currentStock: number   // físico
  reservedStock: number  // reservado em orçamentos ativos
  availableStock: number // físico - reservado
  status: StockStatus    // baseado no disponível
}

type DialogState =
  | { type: 'none' }
  | { type: 'entrada'; part: PartRow | null; branchId: string }
  | { type: 'ajuste'; part: PartRow; branchId: string }
  | { type: 'transferencia'; part: PartRow; branchId: string }
  | { type: 'history'; part: PartRow | null; branchId: string }

// ── Helpers ───────────────────────────────────────────────────────────────────

function getStatus(current: number, min: number): StockStatus {
  if (current <= 0) return 'zerado'
  if (current < min) return 'baixo'
  return 'ok'
}

const STATUS_LABELS: Record<StockStatus, string> = {
  ok: 'Ok',
  baixo: 'Baixo',
  zerado: 'Zerado',
}

function formatQuantity(n: number) {
  return n.toLocaleString('pt-BR')
}

function getCoveragePercent(available: number, min: number) {
  if (available <= 0) return 0
  if (min <= 0) return 100
  return Math.min(100, Math.max(10, Math.round((available / min) * 100)))
}

// ── Componente ────────────────────────────────────────────────────────────────

export function StockList({
  parts,
  branches,
  suppliers,
  stockByPartBranch,
  reservedByPartBranch,
  isAdmin,
  currentBranchId,
  initialPartId,
  initialSelectedBranch,
}: StockListProps) {
  const router = useRouter()
  const stockTableRef = React.useRef<HTMLDivElement | null>(null)

  // Filial selecionada: parâmetro explícito da URL; sem parâmetro, mostra o consolidado.
  const [selectedBranch, setSelectedBranch] = React.useState<string>(() => {
    if (initialSelectedBranch && branches.some((b) => b.id === initialSelectedBranch)) {
      return initialSelectedBranch
    }
    return ''
  })

  const [search, setSearch] = React.useState('')
  const [categoryFilter, setCategoryFilter] = React.useState<string[]>([])
  const [statusFilter, setStatusFilter] = React.useState<StockStatus[]>([])
  const [focusedPartId, setFocusedPartId] = React.useState<string | null>(initialPartId)
  const [rowsPerPage, setRowsPerPage] = React.useState(15)
  const [currentPage, setCurrentPage] = React.useState(1)
  const [dialog, setDialog] = React.useState<DialogState>({ type: 'none' })
  const deferredSearch = React.useDeferredValue(search)

  React.useEffect(() => {
    setFocusedPartId(initialPartId)
  }, [initialPartId])

  React.useEffect(() => {
    if (initialSelectedBranch && branches.some((branch) => branch.id === initialSelectedBranch)) {
      setSelectedBranch(initialSelectedBranch)
      return
    }

    setSelectedBranch('')
  }, [branches, initialSelectedBranch])

  // Monta os itens com saldo físico, reservado e disponível
  const stockItems = React.useMemo<StockItem[]>(() => {
    return parts.map((part) => {
      let currentStock = 0
      let reservedStock = 0

      if (selectedBranch) {
        currentStock = stockByPartBranch[`${part.id}:${selectedBranch}`] ?? 0
        reservedStock = reservedByPartBranch[`${part.id}:${selectedBranch}`] ?? 0
      } else {
        for (const branch of branches) {
          currentStock += stockByPartBranch[`${part.id}:${branch.id}`] ?? 0
          reservedStock += reservedByPartBranch[`${part.id}:${branch.id}`] ?? 0
        }
      }

      const availableStock = currentStock - reservedStock

      return {
        ...part,
        currentStock,
        reservedStock,
        availableStock,
        status: getStatus(availableStock, part.min_stock),
      }
    })
  }, [parts, branches, selectedBranch, stockByPartBranch, reservedByPartBranch])

  // Cards de resumo
  const summary = React.useMemo(() => {
    const total = stockItems.length
    const baixo = stockItems.filter((i) => i.status === 'baixo').length
    const zerado = stockItems.filter((i) => i.status === 'zerado').length
    const ok = stockItems.filter((i) => i.status === 'ok').length
    return { total, baixo, zerado, ok }
  }, [stockItems])

  const selectedBranchLabel = React.useMemo(() => {
    if (!selectedBranch) return 'Consolidado de todas as filiais'
    return branches.find((branch) => branch.id === selectedBranch)?.name ?? 'Filial selecionada'
  }, [branches, selectedBranch])

  const totalPhysicalStock = React.useMemo(
    () => stockItems.reduce((sum, item) => sum + item.currentStock, 0),
    [stockItems]
  )

  const criticalItems = summary.baixo + summary.zerado
  const healthyPercent = summary.total > 0 ? Math.round((summary.ok / summary.total) * 100) : 0

  const supplierMap = React.useMemo(
    () => Object.fromEntries(suppliers.map((supplier) => [supplier.id, supplier.name])),
    [suppliers],
  )

  // Opções de filtro
  const categoryOptions = React.useMemo<DataTableFilterOption[]>(() =>
    Object.entries(CATEGORY_LABELS).map(([value, label]) => ({
      value,
      label,
      count: stockItems.filter((i) => i.category === value).length,
    })), [stockItems])

  const statusOptions = React.useMemo<DataTableFilterOption[]>(() => [
    { value: 'ok', label: 'Ok', count: summary.ok },
    { value: 'baixo', label: 'Estoque baixo', count: summary.baixo },
    { value: 'zerado', label: 'Zerado', count: summary.zerado },
  ], [summary])

  const branchOptions = React.useMemo<DataTableFilterOption[]>(() => [
    { value: '', label: 'Todas as filiais', count: parts.length },
    ...branches.map((b) => ({
      value: b.id,
      label: b.name,
      count: parts.length,
    })),
  ], [branches, parts.length])

  // Filtragem
  const filtered = React.useMemo(() => {
    const q = deferredSearch.trim().toLowerCase()
    return stockItems.filter((item) => {
      const matchFocusedPart = !focusedPartId || item.id === focusedPartId
      const matchSearch =
        q.length === 0 ||
        item.name.toLowerCase().includes(q) ||
        (item.sku?.toLowerCase().includes(q) ?? false)
      const matchCategory = categoryFilter.length === 0 || categoryFilter.includes(item.category)
      const matchStatus = statusFilter.length === 0 || statusFilter.includes(item.status)
      return matchFocusedPart && matchSearch && matchCategory && matchStatus
    })
  }, [stockItems, deferredSearch, categoryFilter, focusedPartId, statusFilter])

  const hasActiveFilters =
    search.trim().length > 0 ||
    categoryFilter.length > 0 ||
    statusFilter.length > 0 ||
    !!focusedPartId

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage))
  const paginated = React.useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage
    return filtered.slice(start, start + rowsPerPage)
  }, [filtered, currentPage, rowsPerPage])

  React.useEffect(() => { setCurrentPage(1) }, [deferredSearch, categoryFilter, statusFilter, rowsPerPage, selectedBranch])
  React.useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages)
  }, [currentPage, totalPages])

  const closeDialog = () => setDialog({ type: 'none' })

  const resetFilters = () => {
    setSearch('')
    setCategoryFilter([])
    setStatusFilter([])
    setFocusedPartId(null)
  }

  const toggleCategory = (v: string) =>
    setCategoryFilter((prev) => prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v])

  const toggleStatus = (v: string) =>
    setStatusFilter((prev) => {
      const s = v as StockStatus
      return prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    })

  const userDefaultBranchId = React.useMemo(() => {
    if (currentBranchId && branches.some((branch) => branch.id === currentBranchId)) {
      return currentBranchId
    }

    return branches[0]?.id ?? ''
  }, [branches, currentBranchId])

  const scopedBranchId = selectedBranch || userDefaultBranchId

  const getBranchTags = React.useCallback((partId: string) => {
    if (selectedBranch) {
      const branchName = branches.find((branch) => branch.id === selectedBranch)?.name
      return branchName ? [branchName] : []
    }

    return branches
      .map((branch) => {
        const physical = stockByPartBranch[`${partId}:${branch.id}`] ?? 0
        const reserved = reservedByPartBranch[`${partId}:${branch.id}`] ?? 0
        return {
          name: branch.name,
          available: physical - reserved,
        }
      })
      .filter((branch) => branch.available > 0)
      .sort((a, b) => b.available - a.available)
      .slice(0, 3)
      .map((branch) => branch.name)
  }, [branches, reservedByPartBranch, selectedBranch, stockByPartBranch])

  return (
    <>
      <section className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <div className="flex flex-col gap-3 border-b border-border bg-white px-5 py-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <h2 className="text-lg font-bold tracking-tight text-foreground">Estoque</h2>
            {branches.length > 1 ? (
              <select
                value={selectedBranch}
                onChange={(event) => setSelectedBranch(event.target.value)}
                className="h-8 rounded-md border border-border bg-background px-3 text-xs font-semibold text-slate-700 outline-none transition-colors hover:bg-muted focus:border-primary"
                aria-label="Filial"
              >
                {branchOptions.map((option) => (
                  <option key={option.value || 'all'} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : (
              <span className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-semibold text-slate-700">
                {selectedBranchLabel}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger
                className={cn(
                  buttonVariants({ variant: 'outline', size: 'icon-sm' }),
                  'h-9 w-11',
                )}
                title="Mais ações"
              >
                <MoreHorizontal className="size-4" />
                <span className="sr-only">Mais ações</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-45">
                <DropdownMenuItem
                  onClick={(event) => {
                    event.preventDefault()
                    const firstPart = paginated[0] ?? filtered[0] ?? parts[0] ?? null
                    if (firstPart) setDialog({ type: 'ajuste', part: firstPart, branchId: scopedBranchId })
                  }}
                  disabled={parts.length === 0 || !isAdmin}
                >
                  <SlidersHorizontal className="size-4" />
                  Ajustar estoque
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(event) => {
                    event.preventDefault()
                  }}
                  disabled={parts.length === 0}
                >
                  <Download className="size-4" />
                  Exportar CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="outline"
              onClick={() => setDialog({ type: 'history', part: null, branchId: selectedBranch })}
              className="gap-2"
              disabled={parts.length === 0}
            >
              <History className="size-4" />
              Histórico
            </Button>
            {isAdmin && branches.length > 1 && (
              <Button
                variant="outline"
                onClick={() => {
                  const firstPart = paginated[0] ?? filtered[0] ?? parts[0] ?? null
                  if (firstPart) setDialog({ type: 'transferencia', part: firstPart, branchId: scopedBranchId })
                }}
                className="gap-2"
                disabled={parts.length === 0 || branches.length < 2}
              >
                <ArrowRightLeft className="size-4" />
                Transferir
              </Button>
            )}
            {isAdmin && (
              <Button
                onClick={() => setDialog({ type: 'entrada', part: null, branchId: userDefaultBranchId })}
                className="gap-2"
                disabled={parts.length === 0 || branches.length === 0}
              >
                <ArrowDownToLine className="size-4" />
                Registrar entrada
              </Button>
            )}
          </div>
        </div>

        <div className="grid border-b border-border bg-white sm:grid-cols-2 xl:grid-cols-4 xl:divide-x xl:divide-border">
          <KpiItem label="Peças monitoradas" value={summary.total} />
          <KpiItem
            label="Estoque baixo"
            value={criticalItems}
            valueClass={criticalItems > 0 ? 'text-amber-700' : 'text-emerald-700'}
            helper={criticalItems > 0 ? 'requer atenção' : 'sem ruptura'}
          />
          <KpiItem label="Unidades no estoque" value={totalPhysicalStock} />
          <KpiItem
            label="Em nível saudável"
            value={summary.ok}
            valueClass="text-emerald-700"
            helper={`${healthyPercent}% das peças`}
          />
        </div>

        <div ref={stockTableRef} className="border-b border-border bg-slate-50/70 px-5 py-3">
          <div className="flex flex-col gap-3 2xl:flex-row 2xl:items-center 2xl:justify-between">
            <div className="flex flex-1 flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center">
              <DataTableSearch
                value={search}
                onChange={setSearch}
                placeholder="Buscar peça ou SKU..."
                disabled={parts.length === 0}
                className="lg:max-w-xs"
              />

              <DataTableFilterPopover
                title="Categoria"
                options={categoryOptions}
                selectedValues={categoryFilter}
                onToggle={toggleCategory}
                onClear={() => setCategoryFilter([])}
                disabled={parts.length === 0}
              />

              <DataTableFilterPopover
                title="Status"
                options={statusOptions}
                selectedValues={statusFilter}
                onToggle={toggleStatus}
                onClear={() => setStatusFilter([])}
                disabled={parts.length === 0}
              />

              {hasActiveFilters && (
                <Button variant="ghost" onClick={resetFilters} className="gap-2 text-primary hover:text-primary">
                  <X className="size-4" />
                  Limpar filtros
                </Button>
              )}
            </div>

            <div className="text-sm text-muted-foreground">
              {filtered.length} {filtered.length === 1 ? 'item' : 'itens'}
            </div>
          </div>
        </div>

      <DataTableCard className="rounded-none border-0 shadow-none">
        <TooltipProvider>
        {parts.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-center">
            <div className="mb-4 rounded-lg bg-slate-100 p-4 text-slate-500">
              <Package className="size-8" />
            </div>
            <h3 className="text-lg font-medium mb-2">Nenhuma peça cadastrada</h3>
            <p className="text-muted-foreground text-sm max-w-sm">
              Cadastre peças em <strong>Cadastros → Peças</strong> para começar a controlar o estoque.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-center">
            <div className="mb-4 rounded-2xl bg-slate-100 p-4 text-slate-500">
              <History className="size-8" />
            </div>
            <h3 className="text-lg font-medium mb-2">Nenhum resultado encontrado</h3>
            <p className="text-muted-foreground text-sm max-w-md">
              Ajuste a busca ou os filtros para localizar outra peça.
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
                <tr className="border-b border-border bg-white">
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Peça</th>
                  <th className="hidden px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground md:table-cell">Categoria</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Estoque</th>
                  <th className="hidden px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground xl:table-cell">Filial</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Status</th>
                  <th className="hidden px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground lg:table-cell">Fornecedor</th>
                  {isAdmin && (
                    <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Ações</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginated.map((item) => (
                  <tr key={item.id} className="group/stock-row transition-colors hover:bg-slate-50/80">
                    <td className="px-5 py-3.5">
                      <div className="min-w-0">
                        <div className="font-semibold leading-5 text-foreground">{item.name}</div>
                        <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                          {item.sku || 'Sem SKU'}
                        </div>
                      </div>
                    </td>

                    <td className="hidden px-4 py-3.5 md:table-cell">
                      <span className="text-sm text-muted-foreground">
                        {CATEGORY_LABELS[item.category as PartCategory] ?? item.category}
                      </span>
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-baseline gap-1.5">
                          <span className={cn(
                            'text-base font-bold tabular-nums',
                            item.availableStock <= 0
                              ? 'text-destructive'
                              : item.status === 'baixo'
                                ? 'text-amber-700'
                                : 'text-foreground',
                          )}>
                            {formatQuantity(item.availableStock)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            / mín. {formatQuantity(item.min_stock)} {item.unit}
                          </span>
                        </div>
                        <div className="h-1.5 w-32 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={cn(
                              'h-full rounded-full',
                              item.status === 'ok'
                                ? 'bg-emerald-500'
                                : item.status === 'baixo'
                                  ? 'bg-amber-500'
                                  : 'bg-red-500',
                            )}
                            style={{ width: `${getCoveragePercent(item.availableStock, item.min_stock)}%` }}
                          />
                        </div>
                        <span className="text-[11px] text-muted-foreground">
                          Físico {formatQuantity(item.currentStock)}
                          {item.reservedStock > 0 ? ` · reservado ${formatQuantity(item.reservedStock)}` : ''}
                        </span>
                      </div>
                    </td>

                    <td className="hidden px-4 py-3.5 xl:table-cell">
                      <div className="flex max-w-56 flex-wrap gap-1">
                        {getBranchTags(item.id).length > 0 ? (
                          getBranchTags(item.id).map((branch) => (
                            <span
                              key={branch}
                              className="inline-flex rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600"
                            >
                              {branch}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-muted-foreground">Sem saldo</span>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <StatusPill status={item.status} />
                    </td>

                    <td className="hidden px-4 py-3.5 text-sm text-muted-foreground lg:table-cell">
                      {item.supplier_id ? supplierMap[item.supplier_id] ?? 'Fornecedor não encontrado' : '—'}
                    </td>

                    {isAdmin && (
                      <td className="px-5 py-3.5">
                        <div className="pointer-events-none flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover/stock-row:pointer-events-auto group-hover/stock-row:opacity-100 has-focus-visible:pointer-events-auto has-focus-visible:opacity-100">
                          <Tooltip>
                            <TooltipTrigger
                              render={
                                <button
                                  type="button"
                                  className={cn(
                                    buttonVariants({ variant: 'ghost', size: 'icon-sm' }),
                                    'size-7 rounded-md text-slate-400 hover:bg-primary/5 hover:text-primary',
                                  )}
                                  onClick={() => setDialog({
                                    type: 'entrada',
                                    part: item,
                                    branchId: userDefaultBranchId,
                                  })}
                                />
                              }
                            >
                              <Plus className="size-3.5" />
                              <span className="sr-only">Registrar entrada</span>
                            </TooltipTrigger>
                            <TooltipContent>Registrar entrada</TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger
                              render={
                                <button
                                  type="button"
                                  className={cn(
                                    buttonVariants({ variant: 'ghost', size: 'icon-sm' }),
                                    'size-7 rounded-md text-slate-400 hover:bg-primary/5 hover:text-primary',
                                  )}
                                  onClick={() => setDialog({
                                    type: 'ajuste',
                                    part: item,
                                    branchId: scopedBranchId,
                                  })}
                                />
                              }
                            >
                              <Pencil className="size-3.5" />
                              <span className="sr-only">Ajustar estoque</span>
                            </TooltipTrigger>
                            <TooltipContent>Ajustar estoque</TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger
                              render={
                                <button
                                  type="button"
                                  className={cn(
                                    buttonVariants({ variant: 'ghost', size: 'icon-sm' }),
                                    'size-7 rounded-md text-slate-400 hover:bg-primary/5 hover:text-primary',
                                  )}
                                  onClick={() => setDialog({
                                    type: 'history',
                                    part: item,
                                    branchId: selectedBranch,
                                  })}
                                />
                              }
                            >
                              <History className="size-3.5" />
                              <span className="sr-only">Ver histórico</span>
                            </TooltipTrigger>
                            <TooltipContent>Ver histórico</TooltipContent>
                          </Tooltip>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        </TooltipProvider>

        {filtered.length > 0 && (
          <DataTablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={setRowsPerPage}
            onPageChange={setCurrentPage}
            totalItems={filtered.length}
            currentItemsCount={paginated.length}
            itemLabel="peca"
          />
        )}
      </DataTableCard>
      </section>

      {/* Dialogs */}
      <MovementDialog
        mode={dialog.type === 'entrada' ? 'entrada' : 'ajuste'}
        part={dialog.type !== 'none' && dialog.type !== 'history' && dialog.type !== 'transferencia' ? dialog.part : null}
        parts={parts}
        suppliers={suppliers}
        initialBranchId={dialog.type === 'entrada' || dialog.type === 'ajuste' ? dialog.branchId : ''}
        branches={branches}
        stockByPartBranch={stockByPartBranch}
        open={dialog.type === 'entrada' || dialog.type === 'ajuste'}
        onOpenChange={(open) => { if (!open) closeDialog() }}
        onSuccess={() => {
          closeDialog()
          router.refresh()
        }}
      />

      <TransferenciaDialog
        part={dialog.type === 'transferencia' ? dialog.part : null}
        branches={branches}
        initialFromBranchId={dialog.type === 'transferencia' ? dialog.branchId : ''}
        stockByPartBranch={stockByPartBranch}
        reservedByPartBranch={reservedByPartBranch}
        open={dialog.type === 'transferencia'}
        onOpenChange={(open) => { if (!open) closeDialog() }}
        onSuccess={() => {
          closeDialog()
          router.refresh()
        }}
      />

      <HistorySheet
        part={dialog.type === 'history' ? dialog.part : null}
        branchId={dialog.type === 'history' ? dialog.branchId : ''}
        branches={branches}
        open={dialog.type === 'history'}
        onOpenChange={(open) => { if (!open) closeDialog() }}
      />
    </>
  )
}

function KpiItem({
  label,
  value,
  helper,
  valueClass,
}: {
  label: string
  value: number
  helper?: string
  valueClass?: string
}) {
  return (
    <div className="min-h-21 px-5 py-3">
      <p className={cn('text-2xl font-extrabold leading-none tracking-tight tabular-nums text-foreground', valueClass)}>
        {formatQuantity(value)}
      </p>
      <p className="mt-1.5 text-[11px] font-medium text-muted-foreground">{label}</p>
      {helper && (
        <p className="mt-0.5 text-[11px] font-medium text-muted-foreground">{helper}</p>
      )}
    </div>
  )
}

function StatusPill({ status }: { status: StockStatus }) {
  const className = {
    ok: 'bg-emerald-50 text-emerald-700',
    baixo: 'bg-amber-50 text-amber-700',
    zerado: 'bg-red-50 text-red-700',
  }[status]
  const dotClassName = {
    ok: 'bg-emerald-600',
    baixo: 'bg-amber-600',
    zerado: 'bg-red-600',
  }[status]

  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold', className)}>
      <span className={cn('size-1.5 rounded-full', dotClassName)} />
      {STATUS_LABELS[status]}
    </span>
  )
}
