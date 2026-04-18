'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Edit2, Trash2, Building2, MapPin, X } from 'lucide-react'
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
  CLIENT_CLASSIFICATION_LABELS,
  CLIENT_CLASSIFICATION_COLORS,
  type ClientClassification,
} from '@/lib/validations/client'
import { ClientDialog, type ClientFormState } from './client-dialog'
import { DeleteClientDialog } from './delete-dialog'

export interface ClientData {
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
  classification: string
  classification_manual: boolean
}

interface BranchOption {
  id: string
  name: string
}

interface ClientListProps {
  initialClients: ClientData[]
  branches: BranchOption[]
  currentBranchId: string | null
  defaultOriginBranchId: string | null
  isAdmin: boolean
}

type DialogState =
  | { type: 'none' }
  | { type: 'edit'; client: ClientFormState }
  | { type: 'delete'; id: string; name: string }

type StatusFilter = 'active' | 'inactive'
type ClassificationFilter = ClientClassification

export function ClientList({
  initialClients,
  branches,
  currentBranchId,
  defaultOriginBranchId,
  isAdmin,
}: ClientListProps) {
  const router = useRouter()
  const [clients, setClients] = React.useState(initialClients)
  const [dialog, setDialog] = React.useState<DialogState>({ type: 'none' })
  const [search, setSearch] = React.useState('')
  const [branchFilter, setBranchFilter] = React.useState<string[]>([])
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter[]>([])
  const [classificationFilter, setClassificationFilter] = React.useState<ClassificationFilter[]>([])
  const [rowsPerPage, setRowsPerPage] = React.useState(10)
  const [currentPage, setCurrentPage] = React.useState(1)
  const deferredSearch = React.useDeferredValue(search)

  React.useEffect(() => {
    setClients(initialClients)
  }, [initialClients])

  const branchMap = React.useMemo(
    () => Object.fromEntries(branches.map((branch) => [branch.id, branch.name])),
    [branches],
  )

  const branchOptions = React.useMemo<DataTableFilterOption[]>(
    () =>
      branches.map((branch) => ({
        value: branch.id,
        label: branch.name,
        count: clients.filter((client) => client.origin_branch_id === branch.id).length,
      })),
    [branches, clients],
  )

  const statusOptions = React.useMemo<DataTableFilterOption[]>(
    () => [
      {
        value: 'active',
        label: 'Ativos',
        count: clients.filter((client) => client.active).length,
      },
      {
        value: 'inactive',
        label: 'Inativos',
        count: clients.filter((client) => !client.active).length,
      },
    ],
    [clients],
  )

  const classificationOptions = React.useMemo<DataTableFilterOption[]>(
    () =>
      (['novo', 'recorrente', 'vip', 'inadimplente'] as ClientClassification[]).map((value) => ({
        value,
        label: CLIENT_CLASSIFICATION_LABELS[value],
        count: clients.filter((client) => client.classification === value).length,
      })),
    [clients],
  )

  const filteredClients = React.useMemo(() => {
    const normalizedQuery = deferredSearch.trim().toLowerCase()

    return clients.filter((client) => {
      const branchName = client.origin_branch_id ? branchMap[client.origin_branch_id] : ''
      const matchesSearch =
        normalizedQuery.length === 0 ||
        [
          client.name,
          client.document,
          client.phone,
          client.email,
          client.address,
          client.notes,
          branchName,
        ]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(normalizedQuery))

      const matchesBranch =
        branchFilter.length === 0 ||
        (client.origin_branch_id !== null && branchFilter.includes(client.origin_branch_id))
      const matchesStatus =
        statusFilter.length === 0 ||
        statusFilter.some((filter) => (filter === 'active' ? client.active : !client.active))
      const matchesClassification =
        classificationFilter.length === 0 ||
        classificationFilter.includes(client.classification as ClientClassification)

      return matchesSearch && matchesBranch && matchesStatus && matchesClassification
    })
  }, [branchFilter, branchMap, classificationFilter, clients, deferredSearch, statusFilter])

  const hasActiveFilters =
    search.trim().length > 0 || branchFilter.length > 0 || statusFilter.length > 0 || classificationFilter.length > 0

  const totalPages = Math.max(1, Math.ceil(filteredClients.length / rowsPerPage))
  const paginatedClients = React.useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage
    return filteredClients.slice(startIndex, startIndex + rowsPerPage)
  }, [currentPage, filteredClients, rowsPerPage])

  React.useEffect(() => {
    setCurrentPage(1)
  }, [deferredSearch, branchFilter, statusFilter, classificationFilter, rowsPerPage])

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
    setClassificationFilter([])
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

  const toggleClassificationFilter = (value: string) => {
    setClassificationFilter((prev) =>
      prev.includes(value as ClassificationFilter)
        ? prev.filter((item) => item !== value)
        : [...prev, value as ClassificationFilter],
    )
  }

  const handleDeleteSuccess = (deletedId: string) => {
    setClients((prev) => prev.filter((client) => client.id !== deletedId))
    router.refresh()
  }

  return (
    <>
      <div className="mb-6 space-y-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Gerenciar Clientes</h2>
          <p className="text-muted-foreground">
            Base compartilhada entre todas as filiais, com prioridade visual para a filial de origem.
          </p>
        </div>

        {currentBranchId && branchMap[currentBranchId] ? (
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
            <Building2 className="size-3.5" />
            Clientes da filial {branchMap[currentBranchId]} aparecem primeiro nesta listagem.
          </div>
        ) : null}
      </div>

      <DataTableToolbar
        filters={
          <>
            <DataTableSearch
              value={search}
              onChange={setSearch}
              placeholder="Filtrar clientes..."
              disabled={clients.length === 0}
            />

            <DataTableFilterPopover
              title="Filial de origem"
              options={branchOptions}
              selectedValues={branchFilter}
              onToggle={toggleBranchFilter}
              onClear={() => setBranchFilter([])}
              disabled={clients.length === 0}
            />

            <DataTableFilterPopover
              title="Status"
              options={statusOptions}
              selectedValues={statusFilter}
              onToggle={toggleStatusFilter}
              onClear={() => setStatusFilter([])}
              disabled={clients.length === 0}
            />

            <DataTableFilterPopover
              title="Classificação"
              options={classificationOptions}
              selectedValues={classificationFilter}
              onToggle={toggleClassificationFilter}
              onClear={() => setClassificationFilter([])}
              disabled={clients.length === 0}
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
              setDialog({ type: 'edit', client: { origin_branch_id: defaultOriginBranchId } })
            }
            className="gap-2 cursor-pointer"
          >
            <Plus className="size-4" />
            Novo Cliente
          </Button>
        ) : null}
      />

      <DataTableCard>
        {clients.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-center">
            <h3 className="text-lg font-medium mb-2">Nenhum cliente cadastrado</h3>
            <p className="text-muted-foreground text-sm max-w-sm">
              Clique em &quot;Novo Cliente&quot; para adicionar o primeiro cliente da base compartilhada.
            </p>
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-center">
            <h3 className="text-lg font-medium mb-2">Nenhum resultado encontrado</h3>
            <p className="text-muted-foreground text-sm max-w-md">
              Ajuste a busca ou os filtros de filial e status para localizar outro cliente.
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
                  <th className="text-left font-medium text-muted-foreground px-4 py-3">Cliente</th>
                  <th className="text-left font-medium text-muted-foreground px-4 py-3 hidden md:table-cell">Documento</th>
                  <th className="text-left font-medium text-muted-foreground px-4 py-3">Contato</th>
                  <th className="text-left font-medium text-muted-foreground px-4 py-3 hidden lg:table-cell">Filial de origem</th>
                  <th className="text-left font-medium text-muted-foreground px-4 py-3 hidden xl:table-cell">Endereço</th>
                  <th className="text-left font-medium text-muted-foreground px-4 py-3">Status</th>
                  <th className="text-right font-medium text-muted-foreground px-4 py-3">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedClients.map((client) => {
                  const branchName = client.origin_branch_id ? branchMap[client.origin_branch_id] : null
                  const isPreferred = currentBranchId && client.origin_branch_id === currentBranchId

                  return (
                    <tr key={client.id} data-testid="client-row" className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">{client.name}</div>
                        {client.notes && (
                          <div className="text-xs text-muted-foreground truncate max-w-72">
                            {client.notes}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                        {client.document || '—'}
                      </td>

                      <td className="px-4 py-3 text-muted-foreground">
                        <div>{client.phone || '—'}</div>
                        {client.email && (
                          <div className="text-xs truncate max-w-52">{client.email}</div>
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
                        {client.address || '—'}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <span
                            className={`inline-block text-[11px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full w-fit ${
                              client.active
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {client.active ? 'Ativo' : 'Inativo'}
                          </span>
                          <span
                            className={`inline-block text-[11px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full w-fit ${
                              CLIENT_CLASSIFICATION_COLORS[client.classification as ClientClassification] ?? 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {CLIENT_CLASSIFICATION_LABELS[client.classification as ClientClassification] ?? client.classification}
                          </span>
                        </div>
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
                                    client: {
                                      id: client.id,
                                      name: client.name,
                                      document: client.document,
                                      phone: client.phone,
                                      email: client.email,
                                      address: client.address,
                                      zip_code: client.zip_code,
                                      street: client.street,
                                      number: client.number,
                                      complement: client.complement,
                                      city: client.city,
                                      state: client.state,
                                      notes: client.notes,
                                      origin_branch_id: client.origin_branch_id,
                                      active: client.active,
                                      classification: client.classification,
                                      classification_manual: client.classification_manual,
                                    },
                                  })
                                }
                                title="Editar"
                                aria-label={`Editar cliente ${client.name}`}
                              >
                                <Edit2 className="size-4" />
                              </Button>

                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 text-muted-foreground hover:text-destructive"
                                onClick={() => setDialog({ type: 'delete', id: client.id, name: client.name })}
                                title="Excluir"
                                aria-label={`Excluir cliente ${client.name}`}
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

        {clients.length > 0 && filteredClients.length > 0 && (
          <DataTablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={setRowsPerPage}
            onPageChange={setCurrentPage}
            totalItems={filteredClients.length}
            currentItemsCount={paginatedClients.length}
            itemLabel="cliente"
          />
        )}
      </DataTableCard>

      <ClientDialog
        client={dialog.type === 'edit' ? dialog.client : undefined}
        branches={branches}
        defaultOriginBranchId={defaultOriginBranchId}
        open={dialog.type === 'edit'}
        onOpenChange={(open) => {
          if (!open) closeDialog()
        }}
      />

      {dialog.type === 'delete' && (
        <DeleteClientDialog
          clientId={dialog.id}
          clientName={dialog.name}
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
