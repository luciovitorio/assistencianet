'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Edit2, Trash2, X, Clock } from 'lucide-react'
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
  SERVICE_CATEGORIES,
  CATEGORY_LABELS,
  type ServiceCategory,
} from '@/lib/validations/service'
import { ServiceDialog, type ServiceFormState } from './service-dialog'
import { DeleteServiceDialog } from './delete-service-dialog'

export interface ServiceData {
  id: string
  name: string
  code: string | null
  category: string
  price: number | null
  estimated_duration_minutes: number | null
  notes: string | null
  active: boolean
}

interface ServiceListProps {
  initialServices: ServiceData[]
}

type DialogState =
  | { type: 'none' }
  | { type: 'edit'; service: ServiceFormState }
  | { type: 'delete'; id: string; name: string }

const categoryColors: Record<ServiceCategory, string> = {
  diagnostico: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
  reparo: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  manutencao: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  instalacao: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  limpeza: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  outro: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400',
}

const formatCurrency = (value: number | null) => {
  if (value == null) return '—'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

const formatDuration = (minutes: number | null) => {
  if (minutes == null) return '—'
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}

export function ServiceList({ initialServices }: ServiceListProps) {
  const router = useRouter()
  const [services, setServices] = React.useState(initialServices)
  const [dialog, setDialog] = React.useState<DialogState>({ type: 'none' })
  const [search, setSearch] = React.useState('')
  const [categoryFilter, setCategoryFilter] = React.useState<ServiceCategory[]>([])
  const [rowsPerPage, setRowsPerPage] = React.useState(10)
  const [currentPage, setCurrentPage] = React.useState(1)
  const deferredSearch = React.useDeferredValue(search)

  React.useEffect(() => {
    setServices(initialServices)
  }, [initialServices])

  const categoryOptions = React.useMemo<DataTableFilterOption[]>(
    () =>
      SERVICE_CATEGORIES.map((cat) => ({
        value: cat,
        label: CATEGORY_LABELS[cat],
        count: services.filter((s) => s.category === cat).length,
      })),
    [services],
  )

  const filteredServices = React.useMemo(() => {
    const normalizedQuery = deferredSearch.trim().toLowerCase()

    return services.filter((service) => {
      const categoryLabel = CATEGORY_LABELS[service.category as ServiceCategory] ?? service.category

      const matchesSearch =
        normalizedQuery.length === 0 ||
        [service.name, service.code, categoryLabel]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(normalizedQuery))

      const matchesCategory =
        categoryFilter.length === 0 || categoryFilter.includes(service.category as ServiceCategory)

      return matchesSearch && matchesCategory
    })
  }, [categoryFilter, deferredSearch, services])

  const hasActiveFilters = search.trim().length > 0 || categoryFilter.length > 0

  const totalPages = Math.max(1, Math.ceil(filteredServices.length / rowsPerPage))
  const paginatedServices = React.useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage
    return filteredServices.slice(startIndex, startIndex + rowsPerPage)
  }, [currentPage, filteredServices, rowsPerPage])

  React.useEffect(() => {
    setCurrentPage(1)
  }, [deferredSearch, categoryFilter, rowsPerPage])

  React.useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages)
  }, [currentPage, totalPages])

  const closeDialog = () => setDialog({ type: 'none' })

  const resetFilters = () => {
    setSearch('')
    setCategoryFilter([])
  }

  const toggleCategoryFilter = (value: string) => {
    setCategoryFilter((prev) =>
      prev.includes(value as ServiceCategory)
        ? prev.filter((item) => item !== value)
        : [...prev, value as ServiceCategory],
    )
  }

  const handleDeleteSuccess = (deletedId: string) => {
    setServices((prev) => prev.filter((s) => s.id !== deletedId))
    router.refresh()
  }

  return (
    <>
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Gerenciar Serviços</h2>
        <p className="text-muted-foreground">Catálogo de serviços prestados pela assistência.</p>
      </div>

      <DataTableToolbar
        filters={
          <>
            <DataTableSearch
              value={search}
              onChange={setSearch}
              placeholder="Filtrar serviços..."
              disabled={services.length === 0}
            />

            <DataTableFilterPopover
              title="Categoria"
              options={categoryOptions}
              selectedValues={categoryFilter}
              onToggle={toggleCategoryFilter}
              onClear={() => setCategoryFilter([])}
              disabled={services.length === 0}
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
          <Button
            onClick={() => setDialog({ type: 'edit', service: {} })}
            className="gap-2 cursor-pointer"
          >
            <Plus className="size-4" />
            Novo Serviço
          </Button>
        }
      />

      <DataTableCard>
        {services.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-center">
            <h3 className="text-lg font-medium mb-2">Nenhum serviço cadastrado</h3>
            <p className="text-muted-foreground text-sm max-w-sm">
              Clique em &quot;Novo Serviço&quot; para adicionar o primeiro serviço ao catálogo.
            </p>
          </div>
        ) : filteredServices.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-center">
            <h3 className="text-lg font-medium mb-2">Nenhum resultado encontrado</h3>
            <p className="text-muted-foreground text-sm max-w-md">
              Ajuste a busca ou o filtro de categoria para localizar outro serviço.
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
                  <th className="text-left font-medium text-muted-foreground px-4 py-3">Serviço</th>
                  <th className="text-left font-medium text-muted-foreground px-4 py-3">Categoria</th>
                  <th className="text-right font-medium text-muted-foreground px-4 py-3 hidden lg:table-cell">Preço</th>
                  <th className="text-center font-medium text-muted-foreground px-4 py-3 hidden md:table-cell">Duração</th>
                  <th className="text-right font-medium text-muted-foreground px-4 py-3">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedServices.map((service) => {
                  const categoryLabel =
                    CATEGORY_LABELS[service.category as ServiceCategory] ?? service.category
                  const categoryColor =
                    categoryColors[service.category as ServiceCategory] ??
                    'bg-muted text-muted-foreground'

                  return (
                    <tr key={service.id} className="hover:bg-muted/20 transition-colors">
                      {/* Nome + Código */}
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">{service.name}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {service.code && (
                            <span className="text-xs text-muted-foreground font-mono">
                              {service.code}
                            </span>
                          )}
                          {!service.active && (
                            <span className="text-[10px] uppercase tracking-wider font-bold text-destructive">
                              Inativo
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Categoria */}
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block text-[11px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${categoryColor}`}
                        >
                          {categoryLabel}
                        </span>
                      </td>

                      {/* Preço */}
                      <td className="px-4 py-3 hidden lg:table-cell text-right font-medium text-sm tabular-nums">
                        {formatCurrency(service.price)}
                      </td>

                      {/* Duração */}
                      <td className="px-4 py-3 hidden md:table-cell text-center">
                        {service.estimated_duration_minutes != null ? (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="size-3.5" />
                            {formatDuration(service.estimated_duration_minutes)}
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
                                service: {
                                  id: service.id,
                                  name: service.name,
                                  code: service.code,
                                  category: service.category,
                                  price: service.price,
                                  estimated_duration_minutes: service.estimated_duration_minutes,
                                  notes: service.notes,
                                  active: service.active,
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
                              setDialog({ type: 'delete', id: service.id, name: service.name })
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

        {services.length > 0 && filteredServices.length > 0 && (
          <DataTablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={setRowsPerPage}
            onPageChange={setCurrentPage}
            totalItems={filteredServices.length}
            currentItemsCount={paginatedServices.length}
            itemLabel="servico"
          />
        )}
      </DataTableCard>

      <ServiceDialog
        service={dialog.type === 'edit' ? dialog.service : undefined}
        open={dialog.type === 'edit'}
        onOpenChange={(open) => { if (!open) closeDialog() }}
      />

      {dialog.type === 'delete' && (
        <DeleteServiceDialog
          serviceId={dialog.id}
          serviceName={dialog.name}
          open
          onOpenChange={(open) => { if (!open) closeDialog() }}
          onSuccess={handleDeleteSuccess}
        />
      )}
    </>
  )
}
