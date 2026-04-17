'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Edit2, Trash2, Building2, X, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DataTableCard,
  DataTableFilterPopover,
  DataTablePagination,
  DataTableSearch,
  DataTableToolbar,
  type DataTableFilterOption,
} from '@/components/ui/data-table'
import { ThirdPartyDialog, type ThirdPartyFormState } from './third-party-dialog'
import { DeleteThirdPartyDialog } from './delete-dialog'
import { THIRD_PARTY_TYPE_LABELS, type ThirdPartyType } from '@/lib/validations/third-party'

export interface ThirdPartyData {
  id: string
  name: string
  type: string
  document: string | null
  phone: string | null
  email: string | null
  default_return_days: number | null
  notes: string | null
  active: boolean
}

interface ThirdPartyListProps {
  initialThirdParties: ThirdPartyData[]
  isAdmin: boolean
}

type DialogState =
  | { type: 'none' }
  | { type: 'edit'; thirdParty: ThirdPartyFormState }
  | { type: 'delete'; id: string; name: string }

type StatusFilter = 'active' | 'inactive'

export function ThirdPartyList({ initialThirdParties, isAdmin }: ThirdPartyListProps) {
  const router = useRouter()
  const [items, setItems] = React.useState(initialThirdParties)
  const [dialog, setDialog] = React.useState<DialogState>({ type: 'none' })
  const [search, setSearch] = React.useState('')
  const [typeFilter, setTypeFilter] = React.useState<string[]>([])
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter[]>([])
  const [rowsPerPage, setRowsPerPage] = React.useState(10)
  const [currentPage, setCurrentPage] = React.useState(1)
  const deferredSearch = React.useDeferredValue(search)

  React.useEffect(() => {
    setItems(initialThirdParties)
  }, [initialThirdParties])

  const typeOptions = React.useMemo<DataTableFilterOption[]>(
    () =>
      Object.entries(THIRD_PARTY_TYPE_LABELS).map(([value, label]) => ({
        value,
        label,
        count: items.filter((item) => item.type === value).length,
      })),
    [items],
  )

  const statusOptions = React.useMemo<DataTableFilterOption[]>(
    () => [
      { value: 'active', label: 'Ativas', count: items.filter((i) => i.active).length },
      { value: 'inactive', label: 'Inativas', count: items.filter((i) => !i.active).length },
    ],
    [items],
  )

  const filtered = React.useMemo(() => {
    const q = deferredSearch.trim().toLowerCase()
    return items.filter((item) => {
      const matchesSearch =
        q.length === 0 ||
        [item.name, item.document, item.phone, item.email, item.notes]
          .filter(Boolean)
          .some((v) => v!.toLowerCase().includes(q))
      const matchesType = typeFilter.length === 0 || typeFilter.includes(item.type)
      const matchesStatus =
        statusFilter.length === 0 ||
        statusFilter.some((f) => (f === 'active' ? item.active : !item.active))
      return matchesSearch && matchesType && matchesStatus
    })
  }, [deferredSearch, items, typeFilter, statusFilter])

  const hasActiveFilters = search.trim().length > 0 || typeFilter.length > 0 || statusFilter.length > 0
  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage))
  const paginated = React.useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage
    return filtered.slice(start, start + rowsPerPage)
  }, [currentPage, filtered, rowsPerPage])

  React.useEffect(() => { setCurrentPage(1) }, [deferredSearch, typeFilter, statusFilter, rowsPerPage])
  React.useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages)
  }, [currentPage, totalPages])

  const closeDialog = () => setDialog({ type: 'none' })
  const resetFilters = () => { setSearch(''); setTypeFilter([]); setStatusFilter([]) }
  const toggleFilter = (setter: React.Dispatch<React.SetStateAction<string[]>>) => (value: string) =>
    setter((prev) => prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value])

  const handleDeleteSuccess = (deletedId: string) => {
    setItems((prev) => prev.filter((item) => item.id !== deletedId))
    router.refresh()
  }

  return (
    <>
      <div className="mb-6 space-y-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Gerenciar Terceirizadas</h2>
          <p className="text-muted-foreground">
            Cadastro de fabricantes e técnicos especializados para os quais equipamentos são
            encaminhados para reparo.
          </p>
        </div>
      </div>

      <DataTableToolbar
        filters={
          <>
            <DataTableSearch
              value={search}
              onChange={setSearch}
              placeholder="Filtrar terceirizadas..."
              disabled={items.length === 0}
            />

            <DataTableFilterPopover
              title="Tipo"
              options={typeOptions}
              selectedValues={typeFilter}
              onToggle={toggleFilter(setTypeFilter)}
              onClear={() => setTypeFilter([])}
              disabled={items.length === 0}
            />

            <DataTableFilterPopover
              title="Status"
              options={statusOptions}
              selectedValues={statusFilter}
              onToggle={toggleFilter(setStatusFilter as React.Dispatch<React.SetStateAction<string[]>>)}
              onClear={() => setStatusFilter([])}
              disabled={items.length === 0}
            />

            {hasActiveFilters && (
              <Button variant="outline" onClick={resetFilters} className="gap-2">
                <X className="size-4" />
                Limpar filtros
              </Button>
            )}
          </>
        }
        actions={isAdmin ? (
          <Button
            onClick={() => setDialog({ type: 'edit', thirdParty: {} })}
            className="gap-2 cursor-pointer"
          >
            <Plus className="size-4" />
            Nova Terceirizada
          </Button>
        ) : null}
      />

      <DataTableCard>
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-center">
            <h3 className="text-lg font-medium mb-2">Nenhuma terceirizada cadastrada</h3>
            <p className="text-muted-foreground text-sm max-w-sm">
              Clique em &quot;Nova Terceirizada&quot; para cadastrar um fabricante ou técnico
              especializado.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-center">
            <h3 className="text-lg font-medium mb-2">Nenhum resultado encontrado</h3>
            <p className="text-muted-foreground text-sm max-w-md">
              Ajuste a busca ou os filtros para localizar outra terceirizada.
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
                  <th className="text-left font-medium text-muted-foreground px-4 py-3">
                    Terceirizada
                  </th>
                  <th className="text-left font-medium text-muted-foreground px-4 py-3 hidden md:table-cell">
                    Tipo
                  </th>
                  <th className="text-left font-medium text-muted-foreground px-4 py-3">
                    Contato
                  </th>
                  <th className="text-left font-medium text-muted-foreground px-4 py-3 hidden lg:table-cell">
                    Prazo padrão
                  </th>
                  <th className="text-left font-medium text-muted-foreground px-4 py-3">
                    Status
                  </th>
                  <th className="text-right font-medium text-muted-foreground px-4 py-3">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginated.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Building2 className="size-4 text-muted-foreground shrink-0" />
                        <div className="font-medium text-foreground">{item.name}</div>
                      </div>
                      {item.notes && (
                        <div className="text-xs text-muted-foreground truncate max-w-72 ml-6">
                          {item.notes}
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                      {THIRD_PARTY_TYPE_LABELS[item.type as ThirdPartyType] ?? item.type}
                    </td>

                    <td className="px-4 py-3 text-muted-foreground">
                      <div>{item.phone || '—'}</div>
                      {item.email && (
                        <div className="text-xs truncate max-w-52">{item.email}</div>
                      )}
                    </td>

                    <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">
                      {item.default_return_days ? (
                        <div className="inline-flex items-center gap-1.5">
                          <Clock className="size-3.5" />
                          <span>{item.default_return_days} dias</span>
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`inline-block text-[11px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${
                          item.active
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {item.active ? 'Ativa' : 'Inativa'}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {isAdmin && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 text-muted-foreground hover:text-foreground"
                              onClick={() =>
                                setDialog({
                                  type: 'edit',
                                  thirdParty: {
                                    id: item.id,
                                    name: item.name,
                                    type: item.type,
                                    document: item.document,
                                    phone: item.phone,
                                    email: item.email,
                                    default_return_days: item.default_return_days,
                                    notes: item.notes,
                                    active: item.active,
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
                              onClick={() => setDialog({ type: 'delete', id: item.id, name: item.name })}
                              title="Excluir"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {items.length > 0 && filtered.length > 0 && (
          <DataTablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={setRowsPerPage}
            onPageChange={setCurrentPage}
            totalItems={filtered.length}
            currentItemsCount={paginated.length}
            itemLabel="terceirizada"
          />
        )}
      </DataTableCard>

      <ThirdPartyDialog
        thirdParty={dialog.type === 'edit' ? dialog.thirdParty : undefined}
        open={dialog.type === 'edit'}
        onOpenChange={(open) => { if (!open) closeDialog() }}
      />

      {dialog.type === 'delete' && (
        <DeleteThirdPartyDialog
          id={dialog.id}
          name={dialog.name}
          open
          onOpenChange={(open) => { if (!open) closeDialog() }}
          onSuccess={handleDeleteSuccess}
        />
      )}
    </>
  )
}
