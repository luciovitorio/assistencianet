'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Edit2, Trash2, X, AlertTriangle } from 'lucide-react'
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
  PART_CATEGORIES,
  CATEGORY_LABELS,
  type PartCategory,
} from '@/lib/validations/part'
import { PartDialog, type PartFormState } from './part-dialog'
import { DeletePartDialog } from './delete-part-dialog'

export interface PartData {
  id: string
  name: string
  sku: string | null
  category: string
  unit: string
  supplier_id: string | null
  cost_price: number | null
  sale_price: number | null
  min_stock: number
  notes: string | null
  active: boolean
}

interface SupplierOption {
  id: string
  name: string
}

interface PartListProps {
  initialParts: PartData[]
  suppliers: SupplierOption[]
}

type DialogState =
  | { type: 'none' }
  | { type: 'edit'; part: PartFormState }
  | { type: 'delete'; id: string; name: string }

const categoryColors: Record<PartCategory, string> = {
  peca_reposicao: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  acessorio: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  outro: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400',
}

const formatCurrency = (value: number | null) => {
  if (value == null) return '—'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

export function PartList({ initialParts, suppliers }: PartListProps) {
  const router = useRouter()
  const [parts, setParts] = React.useState(initialParts)
  const [dialog, setDialog] = React.useState<DialogState>({ type: 'none' })
  const [search, setSearch] = React.useState('')
  const [categoryFilter, setCategoryFilter] = React.useState<PartCategory[]>([])
  const [supplierFilter, setSupplierFilter] = React.useState<string[]>([])
  const [rowsPerPage, setRowsPerPage] = React.useState(10)
  const [currentPage, setCurrentPage] = React.useState(1)
  const deferredSearch = React.useDeferredValue(search)

  React.useEffect(() => {
    setParts(initialParts)
  }, [initialParts])

  const supplierMap = React.useMemo(
    () => Object.fromEntries(suppliers.map((s) => [s.id, s.name])),
    [suppliers],
  )

  const categoryOptions = React.useMemo<DataTableFilterOption[]>(
    () =>
      PART_CATEGORIES.map((cat) => ({
        value: cat,
        label: CATEGORY_LABELS[cat],
        count: parts.filter((p) => p.category === cat).length,
      })),
    [parts],
  )

  const supplierOptions = React.useMemo<DataTableFilterOption[]>(
    () =>
      suppliers.map((s) => ({
        value: s.id,
        label: s.name,
        count: parts.filter((p) => p.supplier_id === s.id).length,
      })),
    [suppliers, parts],
  )

  const filteredParts = React.useMemo(() => {
    const normalizedQuery = deferredSearch.trim().toLowerCase()

    return parts.filter((part) => {
      const supplierName = part.supplier_id ? supplierMap[part.supplier_id] : ''
      const categoryLabel = CATEGORY_LABELS[part.category as PartCategory] ?? part.category

      const matchesSearch =
        normalizedQuery.length === 0 ||
        [part.name, part.sku, categoryLabel, supplierName]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(normalizedQuery))

      const matchesCategory =
        categoryFilter.length === 0 || categoryFilter.includes(part.category as PartCategory)
      const matchesSupplier =
        supplierFilter.length === 0 ||
        (part.supplier_id !== null && supplierFilter.includes(part.supplier_id))

      return matchesSearch && matchesCategory && matchesSupplier
    })
  }, [categoryFilter, deferredSearch, parts, supplierFilter, supplierMap])

  const hasActiveFilters =
    search.trim().length > 0 || categoryFilter.length > 0 || supplierFilter.length > 0

  const totalPages = Math.max(1, Math.ceil(filteredParts.length / rowsPerPage))
  const paginatedParts = React.useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage
    return filteredParts.slice(startIndex, startIndex + rowsPerPage)
  }, [currentPage, filteredParts, rowsPerPage])

  React.useEffect(() => {
    setCurrentPage(1)
  }, [deferredSearch, categoryFilter, supplierFilter, rowsPerPage])

  React.useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages)
  }, [currentPage, totalPages])

  const closeDialog = () => setDialog({ type: 'none' })

  const resetFilters = () => {
    setSearch('')
    setCategoryFilter([])
    setSupplierFilter([])
  }

  const toggleCategoryFilter = (value: string) => {
    setCategoryFilter((prev) =>
      prev.includes(value as PartCategory)
        ? prev.filter((item) => item !== value)
        : [...prev, value as PartCategory],
    )
  }

  const toggleSupplierFilter = (value: string) => {
    setSupplierFilter((prev) =>
      prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value],
    )
  }

  const handleDeleteSuccess = (deletedId: string) => {
    setParts((prev) => prev.filter((p) => p.id !== deletedId))
    router.refresh()
  }

  return (
    <>
      <div className="mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Gerenciar Peças</h2>
          <p className="text-muted-foreground">Catálogo de peças de reposição e acessórios.</p>
        </div>
      </div>

      <DataTableToolbar
        filters={
          <>
            <DataTableSearch
              value={search}
              onChange={setSearch}
              placeholder="Filtrar peças..."
              disabled={parts.length === 0}
            />

            <DataTableFilterPopover
              title="Categoria"
              options={categoryOptions}
              selectedValues={categoryFilter}
              onToggle={toggleCategoryFilter}
              onClear={() => setCategoryFilter([])}
              disabled={parts.length === 0}
            />

            {suppliers.length > 0 && (
              <DataTableFilterPopover
                title="Fornecedor padrão"
                options={supplierOptions}
                selectedValues={supplierFilter}
                onToggle={toggleSupplierFilter}
                onClear={() => setSupplierFilter([])}
                disabled={parts.length === 0}
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
          <Button
            onClick={() => setDialog({ type: 'edit', part: {} })}
            className="gap-2 cursor-pointer"
          >
            <Plus className="size-4" />
            Nova Peça
          </Button>
        }
      />

      <DataTableCard>
        {parts.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-center">
            <h3 className="text-lg font-medium mb-2">Nenhuma peça cadastrada</h3>
            <p className="text-muted-foreground text-sm max-w-sm">
              Clique em &quot;Nova Peça&quot; para adicionar a primeira peça ao catálogo.
            </p>
          </div>
        ) : filteredParts.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-center">
            <h3 className="text-lg font-medium mb-2">Nenhum resultado encontrado</h3>
            <p className="text-muted-foreground text-sm max-w-md">
              Ajuste a busca ou os filtros de categoria e fornecedor padrão para localizar outra peça.
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
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left font-medium text-muted-foreground px-4 py-3">Peça</th>
                  <th className="text-left font-medium text-muted-foreground px-4 py-3">Categoria</th>
                  <th className="text-left font-medium text-muted-foreground px-4 py-3 hidden md:table-cell">Fornecedor padrão</th>
                  <th className="text-right font-medium text-muted-foreground px-4 py-3 hidden lg:table-cell">Custo</th>
                  <th className="text-right font-medium text-muted-foreground px-4 py-3 hidden lg:table-cell">Venda</th>
                  <th className="text-center font-medium text-muted-foreground px-4 py-3 hidden md:table-cell">Est. Mín.</th>
                  <th className="text-right font-medium text-muted-foreground px-4 py-3">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedParts.map((part) => {
                  const categoryLabel = CATEGORY_LABELS[part.category as PartCategory] ?? part.category
                  const categoryColor = categoryColors[part.category as PartCategory] ?? 'bg-muted text-muted-foreground'
                  const supplierName = part.supplier_id ? supplierMap[part.supplier_id] : null

                  return (
                    <tr key={part.id} className="hover:bg-muted/20 transition-colors">
                      {/* Nome + SKU */}
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">{part.name}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {part.sku && (
                            <span className="text-xs text-muted-foreground font-mono">
                              {part.sku}
                            </span>
                          )}
                          {!part.active && (
                            <span className="text-[10px] uppercase tracking-wider font-bold text-destructive">
                              Inativa
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Categoria */}
                      <td className="px-4 py-3">
                        <span className={`inline-block text-[11px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${categoryColor}`}>
                          {categoryLabel}
                        </span>
                      </td>

                      {/* Fornecedor */}
                      <td className="px-4 py-3 hidden md:table-cell text-muted-foreground text-sm">
                        {supplierName ?? <span className="text-muted-foreground/50">—</span>}
                      </td>

                      {/* Custo */}
                      <td className="px-4 py-3 hidden lg:table-cell text-right text-muted-foreground text-sm tabular-nums">
                        {formatCurrency(part.cost_price)}
                      </td>

                      {/* Venda */}
                      <td className="px-4 py-3 hidden lg:table-cell text-right font-medium text-sm tabular-nums">
                        {formatCurrency(part.sale_price)}
                      </td>

                      {/* Estoque Mínimo */}
                      <td className="px-4 py-3 hidden md:table-cell text-center">
                        {part.min_stock > 0 ? (
                          <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 font-medium">
                            <AlertTriangle className="size-3.5" />
                            {part.min_stock}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/50 text-xs">—</span>
                        )}
                      </td>

                      {/* Ações */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-muted-foreground hover:text-foreground"
                            onClick={() =>
                              setDialog({
                                type: 'edit',
                                part: {
                                  id: part.id,
                                  name: part.name,
                                  sku: part.sku,
                                  category: part.category,
                                  unit: part.unit,
                                  supplier_id: part.supplier_id,
                                  cost_price: part.cost_price,
                                  sale_price: part.sale_price,
                                  min_stock: part.min_stock,
                                  notes: part.notes,
                                  active: part.active,
                                },
                              })
                            }
                            title="Editar"
                          >
                            <Edit2 className="size-4" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-muted-foreground hover:text-destructive"
                            onClick={() =>
                              setDialog({ type: 'delete', id: part.id, name: part.name })
                            }
                            title="Excluir"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {parts.length > 0 && filteredParts.length > 0 && (
          <DataTablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={setRowsPerPage}
            onPageChange={setCurrentPage}
            totalItems={filteredParts.length}
            currentItemsCount={paginatedParts.length}
            itemLabel="peca"
          />
        )}
      </DataTableCard>

      {/* Dialogs */}
      <PartDialog
        part={dialog.type === 'edit' ? dialog.part : undefined}
        suppliers={suppliers}
        open={dialog.type === 'edit'}
        onOpenChange={(open) => { if (!open) closeDialog() }}
      />

      {dialog.type === 'delete' && (
        <DeletePartDialog
          partId={dialog.id}
          partName={dialog.name}
          open
          onOpenChange={(open) => { if (!open) closeDialog() }}
          onSuccess={handleDeleteSuccess}
        />
      )}
    </>
  )
}
