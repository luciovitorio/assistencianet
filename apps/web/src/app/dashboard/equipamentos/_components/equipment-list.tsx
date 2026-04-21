'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Edit2, Plus, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DataTableCard,
  DataTableFilterPopover,
  DataTablePagination,
  DataTableSearch,
  DataTableToolbar,
  type DataTableFilterOption,
} from '@/components/ui/data-table'
import { EquipmentDialog, type EquipmentFormState } from './equipment-dialog'
import { DeleteEquipmentDialog } from './delete-equipment-dialog'

export interface EquipmentData {
  id: string
  type: string
  manufacturer: string
  model: string
  voltage: string | null
  notes: string | null
  active: boolean
}

interface EquipmentListProps {
  initialEquipments: EquipmentData[]
}

type DialogState =
  | { type: 'none' }
  | { type: 'edit'; equipment: EquipmentFormState }
  | { type: 'delete'; id: string; name: string }

export function EquipmentList({ initialEquipments }: EquipmentListProps) {
  const router = useRouter()
  const [equipments, setEquipments] = React.useState(initialEquipments)
  const [dialog, setDialog] = React.useState<DialogState>({ type: 'none' })
  const [search, setSearch] = React.useState('')
  const [typeFilter, setTypeFilter] = React.useState<string[]>([])
  const [rowsPerPage, setRowsPerPage] = React.useState(10)
  const [currentPage, setCurrentPage] = React.useState(1)
  const deferredSearch = React.useDeferredValue(search)

  React.useEffect(() => {
    setEquipments(initialEquipments)
  }, [initialEquipments])

  const typeOptions = React.useMemo<DataTableFilterOption[]>(() => {
    const types = Array.from(new Set(equipments.map((equipment) => equipment.type))).sort()
    return types.map((type) => ({
      value: type,
      label: type,
      count: equipments.filter((equipment) => equipment.type === type).length,
    }))
  }, [equipments])

  const filteredEquipments = React.useMemo(() => {
    const normalizedQuery = deferredSearch.trim().toLowerCase()

    return equipments.filter((equipment) => {
      const matchesSearch =
        normalizedQuery.length === 0 ||
        [equipment.type, equipment.manufacturer, equipment.model, equipment.voltage]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(normalizedQuery))
      const matchesType = typeFilter.length === 0 || typeFilter.includes(equipment.type)

      return matchesSearch && matchesType
    })
  }, [deferredSearch, equipments, typeFilter])

  const hasActiveFilters = search.trim().length > 0 || typeFilter.length > 0
  const totalPages = Math.max(1, Math.ceil(filteredEquipments.length / rowsPerPage))
  const paginatedEquipments = React.useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage
    return filteredEquipments.slice(startIndex, startIndex + rowsPerPage)
  }, [currentPage, filteredEquipments, rowsPerPage])

  React.useEffect(() => {
    setCurrentPage(1)
  }, [deferredSearch, rowsPerPage, typeFilter])

  React.useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages)
  }, [currentPage, totalPages])

  const resetFilters = () => {
    setSearch('')
    setTypeFilter([])
  }

  const closeDialog = () => setDialog({ type: 'none' })

  const toggleTypeFilter = (value: string) => {
    setTypeFilter((prev) =>
      prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value],
    )
  }

  const handleDeleteSuccess = (deletedId: string) => {
    setEquipments((prev) => prev.filter((equipment) => equipment.id !== deletedId))
    router.refresh()
  }

  return (
    <>
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Cadastro de Equipamentos</h2>
        <p className="text-muted-foreground">
          Modelos recorrentes usados na abertura de OS e no rastreamento por etiqueta interna.
        </p>
      </div>

      <DataTableToolbar
        filters={
          <>
            <DataTableSearch
              value={search}
              onChange={setSearch}
              placeholder="Filtrar equipamentos..."
              disabled={equipments.length === 0}
            />
            <DataTableFilterPopover
              title="Tipo"
              options={typeOptions}
              selectedValues={typeFilter}
              onToggle={toggleTypeFilter}
              onClear={() => setTypeFilter([])}
              disabled={equipments.length === 0}
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
          <Button onClick={() => setDialog({ type: 'edit', equipment: {} })} className="gap-2 cursor-pointer">
            <Plus className="size-4" />
            Novo Equipamento
          </Button>
        }
      />

      <DataTableCard>
        {equipments.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-center">
            <h3 className="mb-2 text-lg font-medium">Nenhum equipamento cadastrado</h3>
            <p className="max-w-sm text-sm text-muted-foreground">
              Clique em &quot;Novo Equipamento&quot; para cadastrar os modelos mais comuns da assistência.
            </p>
          </div>
        ) : filteredEquipments.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-center">
            <h3 className="mb-2 text-lg font-medium">Nenhum resultado encontrado</h3>
            <p className="max-w-md text-sm text-muted-foreground">
              Ajuste a busca ou o filtro de tipo para localizar outro equipamento.
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
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Equipamento</th>
                  <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground md:table-cell">Fabricante</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Modelo</th>
                  <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground lg:table-cell">Voltagem</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedEquipments.map((equipment) => {
                  const equipmentName = `${equipment.type} ${equipment.manufacturer} ${equipment.model}`.trim()
                  return (
                    <tr key={equipment.id} className="transition-colors hover:bg-muted/20">
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">{equipment.type}</div>
                        <div className="mt-0.5 flex items-center gap-2">
                          <span className="text-xs text-muted-foreground md:hidden">
                            {equipment.manufacturer}
                          </span>
                          {!equipment.active && (
                            <span className="text-[10px] font-bold uppercase tracking-wider text-destructive">
                              Inativo
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="hidden px-4 py-3 text-sm text-muted-foreground md:table-cell">
                        {equipment.manufacturer}
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground">{equipment.model}</td>
                      <td className="hidden px-4 py-3 text-sm text-muted-foreground lg:table-cell">
                        {equipment.voltage || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-muted-foreground hover:text-foreground"
                            onClick={() =>
                              setDialog({
                                type: 'edit',
                                equipment: {
                                  id: equipment.id,
                                  type: equipment.type,
                                  manufacturer: equipment.manufacturer,
                                  model: equipment.model,
                                  voltage: equipment.voltage,
                                  notes: equipment.notes,
                                  active: equipment.active,
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
                            onClick={() => setDialog({ type: 'delete', id: equipment.id, name: equipmentName })}
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

        {equipments.length > 0 && filteredEquipments.length > 0 && (
          <DataTablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={setRowsPerPage}
            onPageChange={setCurrentPage}
            totalItems={filteredEquipments.length}
            currentItemsCount={paginatedEquipments.length}
            itemLabel="equipamento"
          />
        )}
      </DataTableCard>

      <EquipmentDialog
        equipment={dialog.type === 'edit' ? dialog.equipment : undefined}
        open={dialog.type === 'edit'}
        onOpenChange={(open) => {
          if (!open) closeDialog()
        }}
      />

      {dialog.type === 'delete' && (
        <DeleteEquipmentDialog
          equipmentId={dialog.id}
          equipmentName={dialog.name}
          open
          onOpenChange={(open) => {
            if (!open) closeDialog()
          }}
          onSuccess={handleDeleteSuccess}
        />
      )}
    </>
  )
}
