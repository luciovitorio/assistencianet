'use client'

import * as React from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DataTableCard,
  DataTableFilterPopover,
  DataTablePagination,
  DataTableSearch,
  DataTableToolbar,
  type DataTableFilterOption,
} from '@/components/ui/data-table'

export interface AuditLogData {
  id: string
  action: string
  actor_email: string | null
  actor_name: string | null
  created_at: string
  entity_type: string
  summary: string
}

interface AuditLogListProps {
  initialLogs: AuditLogData[]
}

const ACTION_LABELS: Record<string, string> = {
  create: 'Criação',
  delete: 'Exclusão',
  login: 'Login',
  logout: 'Logout',
  revoke_access: 'Revogar acesso',
  send_invite: 'Enviar convite',
  set_password: 'Definir senha',
  soft_delete: 'Soft delete',
  update: 'Atualização',
}

const ACTION_STYLES: Record<string, string> = {
  create: 'bg-emerald-100 text-emerald-700',
  delete: 'bg-rose-100 text-rose-700',
  login: 'bg-sky-100 text-sky-700',
  logout: 'bg-slate-100 text-slate-700',
  revoke_access: 'bg-amber-100 text-amber-700',
  send_invite: 'bg-indigo-100 text-indigo-700',
  set_password: 'bg-violet-100 text-violet-700',
  soft_delete: 'bg-rose-100 text-rose-700',
  update: 'bg-blue-100 text-blue-700',
}

const ENTITY_LABELS: Record<string, string> = {
  auth: 'Autenticação',
  branch: 'Filiais',
  client: 'Clientes',
  company: 'Empresa',
  employee: 'Funcionários',
  part: 'Peças',
  service: 'Serviços',
  service_order: 'Ordens de Serviço',
  service_order_estimate: 'Orçamentos de OS',
  supplier: 'Fornecedores',
  system: 'Sistema',
}

const ENTITY_STYLES: Record<string, string> = {
  auth: 'bg-slate-100 text-slate-700',
  branch: 'bg-orange-100 text-orange-700',
  client: 'bg-sky-100 text-sky-700',
  company: 'bg-cyan-100 text-cyan-700',
  employee: 'bg-emerald-100 text-emerald-700',
  part: 'bg-violet-100 text-violet-700',
  service: 'bg-indigo-100 text-indigo-700',
  service_order: 'bg-blue-100 text-blue-700',
  service_order_estimate: 'bg-amber-100 text-amber-700',
  supplier: 'bg-amber-100 text-amber-700',
  system: 'bg-zinc-100 text-zinc-700',
}

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
})

export function AuditLogList({ initialLogs }: AuditLogListProps) {
  const [logs] = React.useState(initialLogs)
  const [search, setSearch] = React.useState('')
  const [actionFilter, setActionFilter] = React.useState<string[]>([])
  const [entityFilter, setEntityFilter] = React.useState<string[]>([])
  const [rowsPerPage, setRowsPerPage] = React.useState(10)
  const [currentPage, setCurrentPage] = React.useState(1)
  const deferredSearch = React.useDeferredValue(search)

  const actionOptions = React.useMemo<DataTableFilterOption[]>(
    () =>
      Object.entries(ACTION_LABELS).map(([value, label]) => ({
        value,
        label,
        count: logs.filter((log) => log.action === value).length,
      })),
    [logs],
  )

  const entityOptions = React.useMemo<DataTableFilterOption[]>(
    () =>
      Object.entries(ENTITY_LABELS).map(([value, label]) => ({
        value,
        label,
        count: logs.filter((log) => log.entity_type === value).length,
      })),
    [logs],
  )

  const filteredLogs = React.useMemo(() => {
    const normalizedQuery = deferredSearch.trim().toLowerCase()

    return logs.filter((log) => {
      const actionLabel = ACTION_LABELS[log.action] ?? log.action
      const entityLabel = ENTITY_LABELS[log.entity_type] ?? log.entity_type
      const actorName = log.actor_name ?? ''
      const actorEmail = log.actor_email ?? ''

      const matchesSearch =
        normalizedQuery.length === 0 ||
        [log.summary, actionLabel, entityLabel, actorName, actorEmail]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(normalizedQuery))

      const matchesAction = actionFilter.length === 0 || actionFilter.includes(log.action)
      const matchesEntity = entityFilter.length === 0 || entityFilter.includes(log.entity_type)

      return matchesSearch && matchesAction && matchesEntity
    })
  }, [actionFilter, deferredSearch, entityFilter, logs])

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / rowsPerPage))
  const paginatedLogs = React.useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage
    return filteredLogs.slice(startIndex, startIndex + rowsPerPage)
  }, [currentPage, filteredLogs, rowsPerPage])

  React.useEffect(() => {
    setCurrentPage(1)
  }, [deferredSearch, actionFilter, entityFilter, rowsPerPage])

  React.useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const hasActiveFilters =
    search.trim().length > 0 || actionFilter.length > 0 || entityFilter.length > 0

  const toggleActionFilter = (value: string) => {
    setActionFilter((prev) =>
      prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value],
    )
  }

  const toggleEntityFilter = (value: string) => {
    setEntityFilter((prev) =>
      prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value],
    )
  }

  const resetFilters = () => {
    setSearch('')
    setActionFilter([])
    setEntityFilter([])
  }

  return (
    <>
      <div className="mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Logs do Sistema</h2>
          <p className="text-muted-foreground">Histórico das ações administrativas realizadas na empresa.</p>
        </div>
      </div>

      <DataTableToolbar
        filters={
          <>
            <DataTableSearch
              value={search}
              onChange={setSearch}
              placeholder="Pesquisar logs..."
              disabled={logs.length === 0}
            />

            <DataTableFilterPopover
              title="Ação"
              options={actionOptions}
              selectedValues={actionFilter}
              onToggle={toggleActionFilter}
              onClear={() => setActionFilter([])}
              disabled={logs.length === 0}
            />

            <DataTableFilterPopover
              title="Módulo"
              options={entityOptions}
              selectedValues={entityFilter}
              onToggle={toggleEntityFilter}
              onClear={() => setEntityFilter([])}
              disabled={logs.length === 0}
            />

            {hasActiveFilters && (
              <Button variant="outline" onClick={resetFilters} className="gap-2">
                <X className="size-4" />
                Limpar filtros
              </Button>
            )}
          </>
        }
      />

      <DataTableCard>
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-center">
            <h3 className="text-lg font-medium mb-2">Nenhum log registrado</h3>
            <p className="text-muted-foreground text-sm max-w-md">
              Os eventos administrativos vão aparecer aqui assim que o sistema começar a registrar ações.
            </p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-center">
            <h3 className="text-lg font-medium mb-2">Nenhum resultado encontrado</h3>
            <p className="text-muted-foreground text-sm max-w-md">
              Ajuste a busca ou os filtros para localizar outro evento.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Data</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Usuário</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Ação</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Módulo</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Descrição</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedLogs.map((log) => {
                  const actionLabel = ACTION_LABELS[log.action] ?? log.action
                  const entityLabel = ENTITY_LABELS[log.entity_type] ?? log.entity_type
                  const actionStyle = ACTION_STYLES[log.action] ?? 'bg-slate-100 text-slate-700'
                  const entityStyle = ENTITY_STYLES[log.entity_type] ?? 'bg-slate-100 text-slate-700'

                  return (
                    <tr key={log.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {dateFormatter.format(new Date(log.created_at))}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">
                          {log.actor_name || 'Usuário do sistema'}
                        </div>
                        {log.actor_email && (
                          <div className="text-xs text-muted-foreground">{log.actor_email}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider ${actionStyle}`}>
                          {actionLabel}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider ${entityStyle}`}>
                          {entityLabel}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-foreground">{log.summary}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {logs.length > 0 && filteredLogs.length > 0 && (
          <DataTablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={setRowsPerPage}
            onPageChange={setCurrentPage}
            totalItems={filteredLogs.length}
            currentItemsCount={paginatedLogs.length}
            itemLabel="log"
          />
        )}
      </DataTableCard>
    </>
  )
}
