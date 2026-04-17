'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Edit2, Trash2, Building2, MapPin, Truck, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DataTableCard,
  DataTableFilterPopover,
  DataTablePagination,
  DataTableSearch,
  DataTableToolbar,
  type DataTableFilterOption,
} from '@/components/ui/data-table'
import { SupplierDialog, type SupplierFormState } from './supplier-dialog'
import { DeleteSupplierDialog } from './delete-dialog'

export interface SupplierData {
  id: string
  name: string
  document: string | null
  phone: string | null
  email: string | null
  address: string | null
  zip_code: string | null
  street: string | null
  number: string | null
  complement: string | null
  city: string | null
  state: string | null
  notes: string | null
  active: boolean
  origin_branch_id: string | null
}

interface BranchOption {
  id: string
  name: string
}

interface SupplierListProps {
  initialSuppliers: SupplierData[]
  branches: BranchOption[]
  currentBranchId: string | null
  defaultOriginBranchId: string | null
  isAdmin: boolean
}

type DialogState =
  | { type: 'none' }
  | { type: 'edit'; supplier: SupplierFormState }
  | { type: 'delete'; id: string; name: string }

type StatusFilter = 'active' | 'inactive'

export function SupplierList({
  initialSuppliers,
  branches,
  currentBranchId,
  defaultOriginBranchId,
  isAdmin,
}: SupplierListProps) {
  const router = useRouter()
  const [suppliers, setSuppliers] = React.useState(initialSuppliers)
  const [dialog, setDialog] = React.useState<DialogState>({ type: 'none' })
  const [search, setSearch] = React.useState('')
  const [branchFilter, setBranchFilter] = React.useState<string[]>([])
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter[]>([])
  const [rowsPerPage, setRowsPerPage] = React.useState(10)
  const [currentPage, setCurrentPage] = React.useState(1)
  const deferredSearch = React.useDeferredValue(search)

  React.useEffect(() => {
    setSuppliers(initialSuppliers)
  }, [initialSuppliers])

  const branchMap = React.useMemo(
    () => Object.fromEntries(branches.map((branch) => [branch.id, branch.name])),
    [branches],
  )

  const branchOptions = React.useMemo<DataTableFilterOption[]>(
    () =>
      branches.map((branch) => ({
        value: branch.id,
        label: branch.name,
        count: suppliers.filter((supplier) => supplier.origin_branch_id === branch.id).length,
      })),
    [branches, suppliers],
  )

  const statusOptions = React.useMemo<DataTableFilterOption[]>(
    () => [
      {
        value: 'active',
        label: 'Ativos',
        count: suppliers.filter((supplier) => supplier.active).length,
      },
      {
        value: 'inactive',
        label: 'Inativos',
        count: suppliers.filter((supplier) => !supplier.active).length,
      },
    ],
    [suppliers],
  )

  const filteredSuppliers = React.useMemo(() => {
    const normalizedQuery = deferredSearch.trim().toLowerCase()

    return suppliers.filter((supplier) => {
      const branchName = supplier.origin_branch_id ? branchMap[supplier.origin_branch_id] : ''
      const matchesSearch =
        normalizedQuery.length === 0 ||
        [
          supplier.name,
          supplier.document,
          supplier.phone,
          supplier.email,
          supplier.address,
          supplier.notes,
          branchName,
        ]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(normalizedQuery))

      const matchesBranch =
        branchFilter.length === 0 ||
        (supplier.origin_branch_id !== null && branchFilter.includes(supplier.origin_branch_id))
      const matchesStatus =
        statusFilter.length === 0 ||
        statusFilter.some((filter) => (filter === 'active' ? supplier.active : !supplier.active))

      return matchesSearch && matchesBranch && matchesStatus
    })
  }, [branchFilter, branchMap, deferredSearch, statusFilter, suppliers])

  const hasActiveFilters =
    search.trim().length > 0 || branchFilter.length > 0 || statusFilter.length > 0

  const totalPages = Math.max(1, Math.ceil(filteredSuppliers.length / rowsPerPage))
  const paginatedSuppliers = React.useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage
    return filteredSuppliers.slice(startIndex, startIndex + rowsPerPage)
  }, [currentPage, filteredSuppliers, rowsPerPage])

  React.useEffect(() => {
    setCurrentPage(1)
  }, [deferredSearch, branchFilter, statusFilter, rowsPerPage])

  React.useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const closeDialog = () => setDialog({ type: 'none' })

  const resetFilters = () => {
    setSearch('')
    setBranchFilter([])
    setStatusFilter([])
  }

  const toggleBranchFilter = (value: string) => {
    setBranchFilter((prev) =>
      prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value],
    )
  }

  const toggleStatusFilter = (value: string) => {
    setStatusFilter((prev) =>
      prev.includes(value as StatusFilter)
        ? prev.filter((item) => item !== value)
        : [...prev, value as StatusFilter],
    )
  }

  const handleDeleteSuccess = (deletedId: string) => {
    setSuppliers((prev) => prev.filter((supplier) => supplier.id !== deletedId))
    router.refresh()
  }

  return (
    <>
      <div className="mb-6 space-y-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Gerenciar Fornecedores</h2>
          <p className="text-muted-foreground">
            Base compartilhada entre todas as filiais, com indicação da filial onde o cadastro foi criado.
          </p>
        </div>

        {currentBranchId && branchMap[currentBranchId] ? (
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
            <Building2 className="size-3.5" />
            Fornecedores cadastrados pela filial {branchMap[currentBranchId]} aparecem primeiro nesta listagem.
          </div>
        ) : null}
      </div>

      <DataTableToolbar
        filters={
          <>
            <DataTableSearch
              value={search}
              onChange={setSearch}
              placeholder="Filtrar fornecedores..."
              disabled={suppliers.length === 0}
            />

            <DataTableFilterPopover
              title="Filial de cadastro"
              options={branchOptions}
              selectedValues={branchFilter}
              onToggle={toggleBranchFilter}
              onClear={() => setBranchFilter([])}
              disabled={suppliers.length === 0}
            />

            <DataTableFilterPopover
              title="Status"
              options={statusOptions}
              selectedValues={statusFilter}
              onToggle={toggleStatusFilter}
              onClear={() => setStatusFilter([])}
              disabled={suppliers.length === 0}
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
            onClick={() =>
              setDialog({ type: 'edit', supplier: { origin_branch_id: defaultOriginBranchId } })
            }
            className="gap-2 cursor-pointer"
          >
            <Plus className="size-4" />
            Novo Fornecedor
          </Button>
        ) : null}
      />

      <DataTableCard>
        {suppliers.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-center">
            <h3 className="text-lg font-medium mb-2">Nenhum fornecedor cadastrado</h3>
            <p className="text-muted-foreground text-sm max-w-sm">
              Clique em &quot;Novo Fornecedor&quot; para adicionar o primeiro fornecedor da base compartilhada.
            </p>
          </div>
        ) : filteredSuppliers.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-center">
            <h3 className="text-lg font-medium mb-2">Nenhum resultado encontrado</h3>
            <p className="text-muted-foreground text-sm max-w-md">
              Ajuste a busca ou os filtros de filial e status para localizar outro fornecedor.
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
                  <th className="text-left font-medium text-muted-foreground px-4 py-3">Fornecedor</th>
                  <th className="text-left font-medium text-muted-foreground px-4 py-3 hidden md:table-cell">Documento</th>
                  <th className="text-left font-medium text-muted-foreground px-4 py-3">Contato</th>
                  <th className="text-left font-medium text-muted-foreground px-4 py-3 hidden lg:table-cell">Filial de cadastro</th>
                  <th className="text-left font-medium text-muted-foreground px-4 py-3 hidden xl:table-cell">Endereço</th>
                  <th className="text-left font-medium text-muted-foreground px-4 py-3">Status</th>
                  <th className="text-right font-medium text-muted-foreground px-4 py-3">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedSuppliers.map((supplier) => {
                  const branchName = supplier.origin_branch_id ? branchMap[supplier.origin_branch_id] : null
                  const isPreferred = currentBranchId && supplier.origin_branch_id === currentBranchId

                  return (
                    <tr key={supplier.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Truck className="size-4 text-muted-foreground" />
                          <div className="font-medium text-foreground">{supplier.name}</div>
                        </div>
                        {supplier.notes && (
                          <div className="text-xs text-muted-foreground truncate max-w-72">
                            {supplier.notes}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                        {supplier.document || '—'}
                      </td>

                      <td className="px-4 py-3 text-muted-foreground">
                        <div>{supplier.phone || '—'}</div>
                        {supplier.email && (
                          <div className="text-xs truncate max-w-52">{supplier.email}</div>
                        )}
                      </td>

                      <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">
                        <div className="inline-flex items-center gap-2">
                          <MapPin className="size-3.5" />
                          <span>{branchName || '—'}</span>
                          {isPreferred ? (
                            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                              Prioridade
                            </span>
                          ) : null}
                        </div>
                      </td>

                      <td className="px-4 py-3 hidden xl:table-cell text-muted-foreground max-w-80 truncate">
                        {supplier.address || '—'}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`inline-block text-[11px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${
                            supplier.active
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {supplier.active ? 'Ativo' : 'Inativo'}
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
                                    supplier: {
                                      id: supplier.id,
                                      name: supplier.name,
                                      document: supplier.document,
                                      phone: supplier.phone,
                                      email: supplier.email,
                                      address: supplier.address,
                                      zip_code: supplier.zip_code,
                                      street: supplier.street,
                                      number: supplier.number,
                                      complement: supplier.complement,
                                      city: supplier.city,
                                      state: supplier.state,
                                      notes: supplier.notes,
                                      origin_branch_id: supplier.origin_branch_id,
                                      active: supplier.active,
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
                                onClick={() => setDialog({ type: 'delete', id: supplier.id, name: supplier.name })}
                                title="Excluir"
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {suppliers.length > 0 && filteredSuppliers.length > 0 && (
          <DataTablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={setRowsPerPage}
            onPageChange={setCurrentPage}
            totalItems={filteredSuppliers.length}
            currentItemsCount={paginatedSuppliers.length}
            itemLabel="fornecedor"
          />
        )}
      </DataTableCard>

      <SupplierDialog
        supplier={dialog.type === 'edit' ? dialog.supplier : undefined}
        branches={branches}
        defaultOriginBranchId={defaultOriginBranchId}
        open={dialog.type === 'edit'}
        onOpenChange={(open) => {
          if (!open) closeDialog()
        }}
      />

      {dialog.type === 'delete' && (
        <DeleteSupplierDialog
          supplierId={dialog.id}
          supplierName={dialog.name}
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
