'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowRightLeft,
  Boxes,
  Building2,
  CheckCircle2,
  History,
  MoreHorizontal,
  Package,
  SlidersHorizontal,
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
  | { type: 'history'; part: PartRow; branchId: string }

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

const STATUS_CLASSES: Record<StockStatus, string> = {
  ok: 'bg-emerald-100 text-emerald-700',
  baixo: 'bg-amber-100 text-amber-700',
  zerado: 'bg-red-100 text-red-700',
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

  const totalReservedStock = React.useMemo(
    () => stockItems.reduce((sum, item) => sum + item.reservedStock, 0),
    [stockItems]
  )

  const totalAvailableStock = React.useMemo(
    () => stockItems.reduce((sum, item) => sum + item.availableStock, 0),
    [stockItems]
  )

  const criticalItems = summary.baixo + summary.zerado

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

  const focusCriticalItems = () => {
    setSearch('')
    setCategoryFilter([])
    setStatusFilter(['baixo', 'zerado'])
    setCurrentPage(1)

    requestAnimationFrame(() => {
      stockTableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
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

  return (
    <>
      {branches.length > 1 && (
        <section className="rounded-3xl border border-border bg-card/80 p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">Recorte por filial</p>
              <p className="text-xs text-muted-foreground">
                Defina primeiro o contexto para ler estoque, reservas e alertas no escopo certo.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {branchOptions.map((opt) => {
                const isActive = selectedBranch === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSelectedBranch(opt.value)}
                    className={`rounded-2xl border px-4 py-2 text-sm font-medium transition-all cursor-pointer ${
                      isActive
                        ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                        : 'border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground'
                    }`}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>
        </section>
      )}

      <section className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-[linear-gradient(135deg,#f8fafc_0%,#ffffff_58%,#eef6ff_100%)] shadow-sm">
        <div className="absolute inset-y-0 right-0 w-72 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.14),_transparent_62%)]" />
        <div className="relative grid gap-5 px-6 py-5 lg:grid-cols-[minmax(0,1fr)_300px] lg:px-8">
          <div className="min-w-0 space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              <Boxes className="size-3.5 text-primary" />
              Operação de estoque
            </div>
            <div className="space-y-1.5">
              <h2 className="text-2xl font-bold tracking-tight text-slate-950">
                Estoque com leitura clara para decidir rápido
              </h2>
              <p className="max-w-2xl text-sm leading-6 text-slate-600">
                Saldo físico, reserva ativa e alertas de ruptura organizados em um painel operacional.
              </p>
            </div>
          </div>

          <div className="min-h-[96px] rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              Escopo atual
            </p>
            <div className="mt-2 flex items-start gap-2 text-sm font-semibold text-slate-900">
              <Building2 className="mt-0.5 size-4 text-primary" />
              <span className="leading-5">{selectedBranchLabel}</span>
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              Todo o painel abaixo respeita esse recorte de visualização.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Peças monitoradas"
          value={summary.total}
          icon={Boxes}
          helper="Itens ativos com saldo consolidado"
        />
        <SummaryCard
          label="Disponível agora"
          value={totalAvailableStock}
          icon={Package}
          valueClass="text-slate-950"
          helper="Saldo livre para uso imediato"
        />
        <SummaryCard
          label="Reserva ativa"
          value={totalReservedStock}
          icon={Package}
          valueClass="text-amber-700"
          helper="Comprometido em ordens e orçamentos"
          accentClass="from-amber-100 via-amber-50 to-white"
        />
        <SummaryCard
          label="Itens em risco"
          value={criticalItems}
          icon={AlertTriangle}
          valueClass={criticalItems > 0 ? 'text-destructive' : 'text-emerald-700'}
          helper={
            criticalItems > 0 ? 'Abaixo do mínimo ou zerados' : 'Nenhum item crítico no momento'
          }
          accentClass={
            criticalItems > 0 ? 'from-red-100 via-red-50 to-white' : 'from-emerald-100 via-emerald-50 to-white'
          }
        />
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Saldo físico total"
          value={totalPhysicalStock}
          icon={Package}
          helper="Quantidade registrada antes das reservas"
        />
        <SummaryCard
          label="Peças em condição saudável"
          value={summary.ok}
          icon={CheckCircle2}
          helper="Itens com cobertura adequada"
          valueClass="text-emerald-700"
          accentClass="from-emerald-100 via-emerald-50 to-white"
        />
        <SummaryCard
          label="Atenção operacional"
          value={summary.zerado}
          icon={AlertTriangle}
          helper="Itens zerados com prioridade imediata"
          valueClass={summary.zerado > 0 ? 'text-destructive' : 'text-slate-900'}
          accentClass={summary.zerado > 0 ? 'from-red-100 via-red-50 to-white' : 'from-slate-100 via-white to-white'}
        />
        <RiskRadarCard
          criticalItems={criticalItems}
          onViewList={focusCriticalItems}
        />
      </section>

      <div ref={stockTableRef}>
      <DataTableToolbar
        filters={
          <>
            <DataTableSearch
              value={search}
              onChange={setSearch}
              placeholder="Buscar por nome ou SKU..."
              disabled={parts.length === 0}
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
              <Button variant="outline" onClick={resetFilters} className="gap-2">
                <X className="size-4" />
                Limpar filtros
              </Button>
            )}
          </>
        }
        actions={
          isAdmin ? (
            <Button
              onClick={() =>
                setDialog({ type: 'entrada', part: null, branchId: userDefaultBranchId })
              }
              className="gap-2 cursor-pointer"
              disabled={parts.length === 0 || branches.length === 0}
            >
              <ArrowDownToLine className="size-4" />
              Registrar Entrada
            </Button>
          ) : null
        }
      />

      <DataTableCard>
        {parts.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-center">
            <div className="mb-4 rounded-2xl bg-slate-100 p-4 text-slate-500">
              <Boxes className="size-8" />
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
                <tr className="border-b border-border bg-slate-50/80">
                  <th className="text-left font-medium text-muted-foreground px-4 py-3">Peça</th>
                  <th className="text-left font-medium text-muted-foreground px-4 py-3 hidden md:table-cell">Categoria</th>
                  <th className="text-center font-medium text-muted-foreground px-4 py-3">Disponível</th>
                  <th className="text-left font-medium text-muted-foreground px-4 py-3 hidden xl:table-cell">Cobertura</th>
                  <th className="text-center font-medium text-muted-foreground px-4 py-3 hidden lg:table-cell">Mínimo</th>
                  <th className="text-center font-medium text-muted-foreground px-4 py-3">Status</th>
                  {isAdmin && (
                    <th className="text-right font-medium text-muted-foreground px-4 py-3">Ações</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginated.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-start gap-3">
                        <div
                          className={`mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-2xl border ${
                            item.status === 'ok'
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              : item.status === 'baixo'
                                ? 'border-amber-200 bg-amber-50 text-amber-700'
                                : 'border-red-200 bg-red-50 text-red-700'
                          }`}
                        >
                          <Package className="size-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-foreground">{item.name}</div>
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                            <span>{item.unit.toUpperCase()}</span>
                            {item.sku && <span>SKU: {item.sku}</span>}
                            <span>
                              Físico: <span className="font-medium tabular-nums">{formatQuantity(item.currentStock)}</span>
                            </span>
                            {item.reservedStock > 0 && (
                              <span>
                                Reservado:{' '}
                                <span className="font-medium tabular-nums">
                                  {formatQuantity(item.reservedStock)}
                                </span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                      <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700">
                        {CATEGORY_LABELS[item.category as PartCategory] ?? item.category}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-center">
                      <span className={`text-lg font-bold tabular-nums ${item.availableStock <= 0 ? 'text-destructive' : item.status === 'baixo' ? 'text-amber-600' : 'text-foreground'}`}>
                        {formatQuantity(item.availableStock)}
                      </span>
                      <span className="text-xs text-muted-foreground ml-1">{item.unit}</span>
                      <div className="mt-1 text-[10px] text-muted-foreground tabular-nums">
                        {item.reservedStock > 0
                          ? `${formatQuantity(item.currentStock)} fís. · ${formatQuantity(item.reservedStock)} res.`
                          : `${formatQuantity(item.currentStock)} em saldo físico`}
                      </div>
                    </td>

                    <td className="hidden xl:table-cell px-4 py-3">
                      <div className="min-w-44">
                        <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                          <span>Disponível / mínimo</span>
                          <span className="tabular-nums">
                            {formatQuantity(item.availableStock)} / {formatQuantity(item.min_stock)}
                          </span>
                        </div>
                        <div className="mt-2 h-2 rounded-full bg-slate-100">
                          <div
                            className={`h-2 rounded-full ${
                              item.status === 'ok'
                                ? 'bg-emerald-500'
                                : item.status === 'baixo'
                                  ? 'bg-amber-500'
                                  : 'bg-red-500'
                            }`}
                            style={{ width: `${getCoveragePercent(item.availableStock, item.min_stock)}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3 text-center text-muted-foreground hidden lg:table-cell tabular-nums">
                      {formatQuantity(item.min_stock)}
                    </td>

                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block text-[11px] uppercase tracking-wider font-bold px-2.5 py-1 rounded-full ${STATUS_CLASSES[item.status]}`}>
                        {STATUS_LABELS[item.status]}
                      </span>
                    </td>

                    {isAdmin && (
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end">
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              className={cn(
                                buttonVariants({ variant: 'ghost', size: 'icon' }),
                                'size-8 rounded-xl text-muted-foreground'
                              )}
                              type="button"
                              title="Ações"
                            >
                              <MoreHorizontal className="size-4" />
                              <span className="sr-only">Ações</span>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuGroup>
                                <DropdownMenuLabel>Ações do estoque</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.preventDefault()
                                    setDialog({
                                      type: 'entrada',
                                      part: item,
                                      branchId: userDefaultBranchId,
                                    })
                                  }}
                                >
                                  <ArrowDownToLine className="size-4" />
                                  Registrar entrada
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.preventDefault()
                                    setDialog({
                                      type: 'ajuste',
                                      part: item,
                                      branchId: scopedBranchId,
                                    })
                                  }}
                                >
                                  <SlidersHorizontal className="size-4" />
                                  Ajustar estoque
                                </DropdownMenuItem>
                                {branches.length > 1 && (
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.preventDefault()
                                      setDialog({
                                        type: 'transferencia',
                                        part: item,
                                        branchId: scopedBranchId,
                                      })
                                    }}
                                  >
                                    <ArrowRightLeft className="size-4" />
                                    Transferir para filial
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.preventDefault()
                                    setDialog({
                                      type: 'history',
                                      part: item,
                                      branchId: selectedBranch,
                                    })
                                  }}
                                >
                                  <History className="size-4" />
                                  Ver histórico
                                </DropdownMenuItem>
                              </DropdownMenuGroup>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    )}
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
            itemLabel="peca"
          />
        )}
      </DataTableCard>
      </div>

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

function SummaryCard({
  label,
  value,
  icon: Icon,
  helper,
  valueClass = '',
  accentClass = 'from-slate-100 via-white to-white',
}: {
  label: string
  value: number
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
          <p className={`mt-2 text-3xl font-bold tracking-tight tabular-nums ${valueClass}`}>{formatQuantity(value)}</p>
        </div>
        <div className="rounded-2xl border border-white/70 bg-white/80 p-2.5 text-slate-700 shadow-sm">
          <Icon className="size-5" />
        </div>
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-500">{helper}</p>
    </div>
  )
}

function RiskRadarCard({
  criticalItems,
  onViewList,
}: {
  criticalItems: number
  onViewList: () => void
}) {
  const hasCriticalItems = criticalItems > 0

  return (
    <div className="rounded-[24px] border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-4 shadow-sm">
      <div className="flex h-full flex-col justify-between gap-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-slate-300">Radar de risco</p>
            <p className="mt-2 text-3xl font-bold tracking-tight text-white tabular-nums">
              {formatQuantity(criticalItems)}
            </p>
          </div>
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] ${
              hasCriticalItems
                ? 'bg-amber-400/15 text-amber-200'
                : 'bg-emerald-400/15 text-emerald-200'
            }`}
          >
            {criticalItems} peça{criticalItems === 1 ? '' : 's'}
          </span>
        </div>

        <div className="space-y-3">
          <p className="text-xs leading-5 text-slate-300">
            {hasCriticalItems
              ? 'Abra a lista filtrada para revisar itens abaixo do mínimo ou já zerados.'
              : 'Nenhum item crítico no momento. Você pode abrir a lista para conferir mesmo assim.'}
          </p>
          <Button
            type="button"
            variant="secondary"
            onClick={onViewList}
            className="w-full justify-center rounded-2xl border border-white/10 bg-white/10 text-white hover:bg-white/15 hover:text-white"
          >
            Ver lista das peças
          </Button>
        </div>
      </div>
    </div>
  )
}
