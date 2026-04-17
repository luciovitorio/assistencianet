'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Edit2, Trash2, Mail, ShieldOff, ShieldCheck, AlertCircle, KeyRound, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DataTableCard,
  DataTableFilterPopover,
  DataTablePagination,
  DataTableSearch,
  DataTableToolbar,
  type DataTableFilterOption,
} from '@/components/ui/data-table'
import { EMPLOYEE_ROLES, ROLE_LABELS, type EmployeeRole } from '@/lib/validations/employee'
import { EmployeeDialog, type EmployeeFormState } from './employee-dialog'
import { DeleteEmployeeDialog } from './delete-dialog'
import { InviteDialog } from './invite-dialog'
import { RevokeDialog } from './revoke-dialog'
import { DirectAccessDialog } from './direct-access-dialog'

export interface EmployeeData {
  id: string
  name: string
  role: string
  email: string | null
  phone: string | null
  cpf: string | null
  active: boolean
  branch_id: string | null
  user_id: string | null
  labor_rate: number | null
}

interface BranchOption {
  id: string
  name: string
}

interface EmployeeListProps {
  initialEmployees: EmployeeData[]
  branches: BranchOption[]
  isAdmin: boolean
}

type DialogState =
  | { type: 'none' }
  | { type: 'edit'; employee: EmployeeFormState }
  | { type: 'delete'; id: string; name: string }
  | { type: 'invite'; id: string; name: string; email: string }
  | { type: 'revoke'; id: string; name: string }
  | { type: 'direct'; id: string; name: string; email: string | null }

const roleColors: Record<EmployeeRole, string> = {
  admin: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  atendente: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  tecnico: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
}

type AccessFilter = 'all' | 'with-access' | 'without-access' | 'without-email'
type AccessOption = Exclude<AccessFilter, 'all'>

export function EmployeeList({ initialEmployees, branches, isAdmin }: EmployeeListProps) {
  const router = useRouter()
  const [employees, setEmployees] = React.useState(initialEmployees)
  const [dialog, setDialog] = React.useState<DialogState>({ type: 'none' })
  const [search, setSearch] = React.useState('')
  const [roleFilter, setRoleFilter] = React.useState<EmployeeRole[]>([])
  const [branchFilter, setBranchFilter] = React.useState<string[]>([])
  const [accessFilter, setAccessFilter] = React.useState<AccessOption[]>([])
  const [rowsPerPage, setRowsPerPage] = React.useState(10)
  const [currentPage, setCurrentPage] = React.useState(1)
  const deferredSearch = React.useDeferredValue(search)

  React.useEffect(() => {
    setEmployees(initialEmployees)
  }, [initialEmployees])

  const branchMap = React.useMemo(
    () => Object.fromEntries(branches.map((b) => [b.id, b.name])),
    [branches],
  )

  const roleOptions = React.useMemo<DataTableFilterOption[]>(
    () =>
      EMPLOYEE_ROLES.map((role) => ({
        value: role,
        label: ROLE_LABELS[role],
        count: employees.filter((employee) => employee.role === role).length,
      })),
    [employees],
  )

  const branchOptions = React.useMemo<DataTableFilterOption[]>(
    () =>
      branches.map((branch) => ({
        value: branch.id,
        label: branch.name,
        count: employees.filter((employee) => employee.branch_id === branch.id).length,
      })),
    [branches, employees],
  )

  const accessOptions = React.useMemo<DataTableFilterOption[]>(
    () => [
      {
        value: 'with-access',
        label: 'Com acesso',
        count: employees.filter((employee) => !!employee.user_id).length,
      },
      {
        value: 'without-access',
        label: 'Sem acesso',
        count: employees.filter((employee) => !employee.user_id).length,
      },
      {
        value: 'without-email',
        label: 'Sem e-mail',
        count: employees.filter((employee) => !employee.email).length,
      },
    ],
    [employees],
  )

  const filteredEmployees = React.useMemo(() => {
    const normalizedQuery = deferredSearch.trim().toLowerCase()

    return employees.filter((employee) => {
      const branchName = employee.branch_id ? branchMap[employee.branch_id] : ''
      const roleLabel = ROLE_LABELS[employee.role as EmployeeRole] ?? employee.role
      const matchesSearch =
        normalizedQuery.length === 0 ||
        [
          employee.name,
          employee.email,
          employee.phone,
          employee.cpf,
          roleLabel,
          branchName,
        ]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(normalizedQuery))

      const matchesRole = roleFilter.length === 0 || roleFilter.includes(employee.role as EmployeeRole)
      const matchesBranch =
        branchFilter.length === 0 ||
        (employee.branch_id !== null && branchFilter.includes(employee.branch_id))
      const matchesAccess =
        accessFilter.length === 0 ||
        accessFilter.some((filter) => {
          if (filter === 'with-access') return !!employee.user_id
          if (filter === 'without-access') return !employee.user_id
          return !employee.email
        })

      return matchesSearch && matchesRole && matchesBranch && matchesAccess
    })
  }, [accessFilter, branchFilter, branchMap, deferredSearch, employees, roleFilter])

  const hasActiveFilters =
    search.trim().length > 0 || roleFilter.length > 0 || branchFilter.length > 0 || accessFilter.length > 0

  const totalPages = Math.max(1, Math.ceil(filteredEmployees.length / rowsPerPage))
  const paginatedEmployees = React.useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage
    return filteredEmployees.slice(startIndex, startIndex + rowsPerPage)
  }, [currentPage, filteredEmployees, rowsPerPage])

  React.useEffect(() => {
    setCurrentPage(1)
  }, [deferredSearch, roleFilter, branchFilter, accessFilter, rowsPerPage])

  React.useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const closeDialog = () => setDialog({ type: 'none' })

  const resetFilters = () => {
    setSearch('')
    setRoleFilter([])
    setBranchFilter([])
    setAccessFilter([])
  }

  const toggleRoleFilter = (value: string) => {
    setRoleFilter((prev) =>
      prev.includes(value as EmployeeRole)
        ? prev.filter((item) => item !== value)
        : [...prev, value as EmployeeRole]
    )
  }

  const toggleBranchFilter = (value: string) => {
    setBranchFilter((prev) =>
      prev.includes(value)
        ? prev.filter((item) => item !== value)
        : [...prev, value]
    )
  }

  const toggleAccessFilter = (value: string) => {
    setAccessFilter((prev) =>
      prev.includes(value as AccessOption)
        ? prev.filter((item) => item !== value)
        : [...prev, value as AccessOption]
    )
  }

  const handleDeleteSuccess = (deletedId: string) => {
    setEmployees((prev) => prev.filter((e) => e.id !== deletedId))
    router.refresh()
  }

  const handleDirectAccessSuccess = () => {
    router.refresh()
  }

  const handleInviteSuccess = () => {
    router.refresh()
  }

  const handleRevokeSuccess = () => {
    router.refresh()
  }

  return (
    <>
      <div className="mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Gerenciar Funcionários</h2>
          <p className="text-muted-foreground">Cadastro e gestão da equipe da empresa.</p>
        </div>
      </div>

      <DataTableToolbar
        filters={
          <>
            <DataTableSearch
              value={search}
              onChange={setSearch}
              placeholder="Filtrar funcionários..."
              disabled={employees.length === 0}
            />

            <DataTableFilterPopover
              title="Cargo"
              options={roleOptions}
              selectedValues={roleFilter}
              onToggle={toggleRoleFilter}
              onClear={() => setRoleFilter([])}
              disabled={employees.length === 0}
            />

            <DataTableFilterPopover
              title="Filial"
              options={branchOptions}
              selectedValues={branchFilter}
              onToggle={toggleBranchFilter}
              onClear={() => setBranchFilter([])}
              disabled={employees.length === 0}
            />

            <DataTableFilterPopover
              title="Acesso"
              options={accessOptions}
              selectedValues={accessFilter}
              onToggle={toggleAccessFilter}
              onClear={() => setAccessFilter([])}
              disabled={employees.length === 0}
            />

            {hasActiveFilters && (
              <Button
                variant="outline"
                onClick={resetFilters}
                className="gap-2"
              >
                <X className="size-4" />
                Limpar filtros
              </Button>
            )}
          </>
        }
        actions={
          <>
            {isAdmin && (
              <Button
                onClick={() => setDialog({ type: 'edit', employee: {} })}
                className="gap-2 cursor-pointer"
              >
                <Plus className="size-4" />
                Novo Funcionário
              </Button>
            )}
          </>
        }
      />

      <DataTableCard>

        {employees.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-center">
            <h3 className="text-lg font-medium mb-2">Nenhum funcionário cadastrado</h3>
            <p className="text-muted-foreground text-sm max-w-sm">
              Clique em &quot;Novo Funcionário&quot; para adicionar o primeiro membro da equipe.
            </p>
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-center">
            <h3 className="text-lg font-medium mb-2">Nenhum resultado encontrado</h3>
            <p className="text-muted-foreground text-sm max-w-md">
              Ajuste a busca ou os filtros de cargo, filial e acesso para localizar outro funcionário.
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
                  <th className="text-left font-medium text-muted-foreground px-4 py-3">Nome</th>
                  <th className="text-left font-medium text-muted-foreground px-4 py-3">Cargo</th>
                  <th className="text-left font-medium text-muted-foreground px-4 py-3 hidden md:table-cell">Filial</th>
                  <th className="text-left font-medium text-muted-foreground px-4 py-3 hidden lg:table-cell">Contato</th>
                  <th className="text-left font-medium text-muted-foreground px-4 py-3 hidden xl:table-cell">Mão de obra</th>
                  <th className="text-left font-medium text-muted-foreground px-4 py-3">Acesso</th>
                  {isAdmin && (
                    <th className="text-right font-medium text-muted-foreground px-4 py-3">Ações</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedEmployees.map((employee) => {
                  const roleLabel = ROLE_LABELS[employee.role as EmployeeRole] ?? employee.role
                  const roleColor = roleColors[employee.role as EmployeeRole] ?? 'bg-muted text-muted-foreground'
                  const branchName = employee.branch_id ? branchMap[employee.branch_id] : null
                  const hasAccess = !!employee.user_id
                  const hasEmail = !!employee.email

                  return (
                    <tr key={employee.id} className="hover:bg-muted/20 transition-colors">
                      {/* Nome */}
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">{employee.name}</div>
                        {!employee.active && (
                          <span className="text-[10px] uppercase tracking-wider font-bold text-destructive">
                            Inativo
                          </span>
                        )}
                      </td>

                      {/* Cargo */}
                      <td className="px-4 py-3">
                        <span className={`inline-block text-[11px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${roleColor}`}>
                          {roleLabel}
                        </span>
                      </td>

                      {/* Filial */}
                      <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                        {branchName ?? <span className="text-muted-foreground/50">—</span>}
                      </td>

                      {/* Contato */}
                      <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">
                        <div>{employee.phone || '—'}</div>
                        {employee.email && (
                          <div className="text-xs truncate max-w-48">{employee.email}</div>
                        )}
                      </td>

                      {/* Mão de obra */}
                      <td className="px-4 py-3 hidden xl:table-cell text-muted-foreground">
                        {employee.role === 'tecnico' && employee.labor_rate != null
                          ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(employee.labor_rate) + ' / OS'
                          : <span className="text-muted-foreground/40">—</span>}
                      </td>

                      {/* Acesso */}
                      <td className="px-4 py-3">
                        {hasAccess ? (
                          <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
                            <ShieldCheck className="size-3.5" />
                            Ativo
                          </span>
                        ) : hasEmail ? (
                          <span className="inline-flex items-center gap-1.5 text-muted-foreground text-xs font-medium">
                            <ShieldOff className="size-3.5" />
                            Sem acesso
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-muted-foreground/60 text-xs">
                            <AlertCircle className="size-3.5" />
                            Sem e-mail
                          </span>
                        )}
                      </td>

                      {/* Ações */}
                      {isAdmin && (
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 text-muted-foreground hover:text-foreground"
                              onClick={() =>
                                setDialog({
                                  type: 'edit',
                                  employee: {
                                    id: employee.id,
                                    name: employee.name,
                                    role: employee.role,
                                    email: employee.email,
                                    phone: employee.phone,
                                    cpf: employee.cpf,
                                    branch_id: employee.branch_id,
                                    active: employee.active,
                                    labor_rate: employee.labor_rate,
                                  },
                                })
                              }
                              title="Editar"
                            >
                              <Edit2 className="size-4" />
                            </Button>

                            {!hasAccess && hasEmail && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 text-muted-foreground hover:text-primary"
                                onClick={() =>
                                  setDialog({
                                    type: 'invite',
                                    id: employee.id,
                                    name: employee.name,
                                    email: employee.email!,
                                  })
                                }
                                title="Convidar por e-mail"
                              >
                                <Mail className="size-4" />
                              </Button>
                            )}

                            {!hasAccess && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 text-muted-foreground hover:text-amber-600"
                                onClick={() =>
                                  setDialog({
                                    type: 'direct',
                                    id: employee.id,
                                    name: employee.name,
                                    email: employee.email,
                                  })
                                }
                                title="Definir senha provisória"
                              >
                                <KeyRound className="size-4" />
                              </Button>
                            )}

                            {hasAccess && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 text-muted-foreground hover:text-destructive"
                                onClick={() =>
                                  setDialog({ type: 'revoke', id: employee.id, name: employee.name })
                                }
                                title="Revogar acesso"
                              >
                                <ShieldOff className="size-4" />
                              </Button>
                            )}

                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 text-muted-foreground hover:text-destructive"
                              onClick={() =>
                                setDialog({ type: 'delete', id: employee.id, name: employee.name })
                              }
                              title="Excluir"
                            >
                              <Trash2 className="size-4" />
                            </Button>
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

        {employees.length > 0 && filteredEmployees.length > 0 && (
          <DataTablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={setRowsPerPage}
            onPageChange={setCurrentPage}
            totalItems={filteredEmployees.length}
            currentItemsCount={paginatedEmployees.length}
            itemLabel="funcionario"
          />
        )}
      </DataTableCard>

      {/* Dialogs */}
      <EmployeeDialog
        employee={dialog.type === 'edit' ? dialog.employee : undefined}
        branches={branches}
        open={dialog.type === 'edit'}
        onOpenChange={(open) => { if (!open) closeDialog() }}
      />

      {dialog.type === 'delete' && (
        <DeleteEmployeeDialog
          employeeId={dialog.id}
          employeeName={dialog.name}
          open
          onOpenChange={(open) => { if (!open) closeDialog() }}
          onSuccess={handleDeleteSuccess}
        />
      )}

      {dialog.type === 'invite' && (
        <InviteDialog
          employeeId={dialog.id}
          employeeName={dialog.name}
          employeeEmail={dialog.email}
          open
          onOpenChange={(open) => { if (!open) closeDialog() }}
          onSuccess={handleInviteSuccess}
        />
      )}

      {dialog.type === 'revoke' && (
        <RevokeDialog
          employeeId={dialog.id}
          employeeName={dialog.name}
          open
          onOpenChange={(open) => { if (!open) closeDialog() }}
          onSuccess={handleRevokeSuccess}
        />
      )}

      {dialog.type === 'direct' && (
        <DirectAccessDialog
          employeeId={dialog.id}
          employeeName={dialog.name}
          defaultEmail={dialog.email}
          open
          onOpenChange={(open) => { if (!open) closeDialog() }}
          onSuccess={handleDirectAccessSuccess}
        />
      )}
    </>
  )
}
