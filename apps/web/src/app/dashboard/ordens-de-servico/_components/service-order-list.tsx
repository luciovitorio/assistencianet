'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Plus,
  RotateCcw,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  X,
  Wrench,
  Truck,
  User,
  Calendar,
  Mail,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  EyeIcon,
  AlertTriangle,
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { sendEstimate } from '@/app/actions/service-order-estimates'
import { registerClientResponse, updateServiceOrderStatus } from '@/app/actions/service-orders'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button-variants'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import {
  DataTableCard,
  DataTableColumnToggle,
  DataTableFilterPopover,
  DataTablePagination,
  DataTableSearch,
  DataTableToolbar,
  useTableColumnVisibility,
  type DataTableColumnDef,
  type DataTableFilterOption,
} from '@/components/ui/data-table'
import { useRouteTransition } from '@/components/ui/route-transition-indicator'
import {
  STATUS_LABELS,
  STATUS_COLORS,
  type ServiceOrderStatus,
} from '@/lib/validations/service-order'
import { isServiceOrderEstimateExpired } from '@/lib/validations/service-order-estimate'
import { CancelServiceOrderDialog } from './cancel-service-order-dialog'
import { DeleteServiceOrderDialog } from './delete-dialog'
import {
  DispatchToThirdPartyDialog,
  type ThirdPartyOption,
} from '../[id]/_components/dispatch-to-third-party-dialog'
import { ReturnFromThirdPartyDialog } from '../[id]/_components/return-from-third-party-dialog'
import { LazyEstimatesModal } from './lazy-estimates-modal'
import { ServiceOrderPickupSheet } from './service-order-pickup-sheet'

export interface ServiceOrderData {
  id: string
  number: number
  status: string
  device_type: string
  device_brand: string | null
  device_model: string | null
  device_serial: string | null
  device_color: string | null
  device_internal_code: string | null
  device_condition: string | null
  reported_issue: string
  estimated_delivery: string | null
  notes: string | null
  branch_id: string | null
  client_id: string
  technician_id: string | null
  third_party_id: string | null
  created_at: string
  client_notified_at: string | null
  client_notified_via: string | null
  service_order_estimates: Array<{
    id: string
    version: number
    total_amount: number
    status: string
    valid_until: string | null
    profiles: { name: string } | null
  }> | null
}

export interface ClientOption {
  id: string
  name: string
  phone: string | null
  document: string | null
  email?: string | null
}

export interface BranchOption {
  id: string
  name: string
}

export interface EmployeeOption {
  id: string
  name: string
  role: string
  is_owner?: boolean
}

interface ServiceOrderListProps {
  initialOrders: ServiceOrderData[]
  branches: BranchOption[]
  clients: ClientOption[]
  employees: EmployeeOption[]
  thirdParties: ThirdPartyOption[]
  currentBranchId: string | null
  initialColumnVisibility: Record<string, boolean> | null
  isAdmin: boolean
}

type DialogState =
  | { type: 'none' }
  | { type: 'delete'; id: string; number: number }
  | { type: 'cancel'; id: string; number: number }

const DISPATCHABLE_STATUSES: ServiceOrderStatus[] = ['aguardando', 'em_analise', 'aprovado', 'aguardando_peca']

const SERVICE_ORDER_COLUMNS_BASE: DataTableColumnDef[] = [
  { id: 'number', label: 'OS', locked: true },
  { id: 'client', label: 'Cliente', locked: true },
  { id: 'device', label: 'Equipamento', defaultVisible: true },
  { id: 'status', label: 'Status', locked: true },
  { id: 'estimate', label: 'Orçamento', defaultVisible: true },
  { id: 'technician', label: 'Técnico', defaultVisible: true },
  { id: 'entry', label: 'Entrada', defaultVisible: true },
  { id: 'notified', label: 'Notificado', defaultVisible: false },
  { id: 'actions', label: 'Ações', locked: true },
]

const SERVICE_ORDER_COLUMNS_ADMIN: DataTableColumnDef[] = [
  ...SERVICE_ORDER_COLUMNS_BASE.slice(0, 7),
  { id: 'branch', label: 'Filial', defaultVisible: false },
  ...SERVICE_ORDER_COLUMNS_BASE.slice(7),
]

export function ServiceOrderList({
  initialOrders,
  branches,
  clients,
  employees,
  thirdParties,
  initialColumnVisibility,
  isAdmin,
}: ServiceOrderListProps) {
  const router = useRouter()
  const { navigate } = useRouteTransition()
  const [orders, setOrders] = React.useState(initialOrders)
  const [dialog, setDialog] = React.useState<DialogState>({ type: 'none' })
  const [sendingId, setSendingId] = React.useState<string | null>(null)
  const [actionOrderId, setActionOrderId] = React.useState<string | null>(null)
  const [historyOrderId, setHistoryOrderId] = React.useState<string | null>(null)
  const [pickupOrderId, setPickupOrderId] = React.useState<string | null>(null)
  const [dispatchOrderId, setDispatchOrderId] = React.useState<string | null>(null)
  const [returnOrderId, setReturnOrderId] = React.useState<string | null>(null)
  const [search, setSearch] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState<string[]>([])
  const [branchFilter, setBranchFilter] = React.useState<string[]>([])
  const [technicianFilter, setTechnicianFilter] = React.useState<string[]>([])
  const [rowsPerPage, setRowsPerPage] = React.useState(10)
  const [currentPage, setCurrentPage] = React.useState(1)
  const deferredSearch = React.useDeferredValue(search)
  const columnsForUser = isAdmin ? SERVICE_ORDER_COLUMNS_ADMIN : SERVICE_ORDER_COLUMNS_BASE
  const {
    visibility: columnVisibility,
    toggle: toggleColumn,
    reset: resetColumns,
    isVisible: isColumnVisible,
  } = useTableColumnVisibility(
    isAdmin ? 'ordens-de-servico:admin' : 'ordens-de-servico',
    columnsForUser,
    initialColumnVisibility,
  )

  React.useEffect(() => {
    setOrders(initialOrders)
  }, [initialOrders])

  const branchMap = React.useMemo(
    () => Object.fromEntries(branches.map((b) => [b.id, b.name])),
    [branches]
  )

  const clientMap = React.useMemo(
    () => Object.fromEntries(clients.map((c) => [c.id, c])),
    [clients]
  )

  const technicianMap = React.useMemo(
    () => Object.fromEntries(employees.map((e) => [e.id, e.name])),
    [employees]
  )

  const statusOptions = React.useMemo<DataTableFilterOption[]>(
    () =>
      (Object.keys(STATUS_LABELS) as ServiceOrderStatus[]).map((s) => ({
        value: s,
        label: STATUS_LABELS[s],
        count: orders.filter((o) => o.status === s).length,
      })),
    [orders]
  )

  const branchOptions = React.useMemo<DataTableFilterOption[]>(
    () =>
      branches.map((b) => ({
        value: b.id,
        label: b.name,
        count: orders.filter((o) => o.branch_id === b.id).length,
      })),
    [branches, orders]
  )

  const technicianOptions = React.useMemo<DataTableFilterOption[]>(() => {
    const withTechnician = orders.filter((o) => o.technician_id !== null)
    return employees
      .filter((e) => withTechnician.some((o) => o.technician_id === e.id))
      .map((e) => ({
        value: e.id,
        label: e.name,
        count: orders.filter((o) => o.technician_id === e.id).length,
      }))
  }, [employees, orders])

  const filteredOrders = React.useMemo(() => {
    const q = deferredSearch.trim().toLowerCase()

    return orders.filter((order) => {
      const client = clientMap[order.client_id]
      const technicianName = order.technician_id ? technicianMap[order.technician_id] : ''
      const branchName = order.branch_id ? branchMap[order.branch_id] : ''

      const matchesSearch =
        q.length === 0 ||
        [
          String(order.number),
          client?.name,
          client?.phone,
          client?.document,
          order.device_brand,
          order.device_model,
          order.device_serial,
          order.reported_issue,
          technicianName,
          branchName,
        ]
          .filter(Boolean)
          .some((v) => v!.toLowerCase().includes(q))

      const matchesStatus = statusFilter.length === 0 || statusFilter.includes(order.status)
      const matchesBranch =
        branchFilter.length === 0 ||
        (order.branch_id !== null && branchFilter.includes(order.branch_id))
      const matchesTechnician =
        technicianFilter.length === 0 ||
        (order.technician_id !== null && technicianFilter.includes(order.technician_id))

      return matchesSearch && matchesStatus && matchesBranch && matchesTechnician
    })
  }, [
    branchFilter,
    branchMap,
    clientMap,
    deferredSearch,
    orders,
    statusFilter,
    technicianFilter,
    technicianMap,
  ])

  const hasActiveFilters =
    search.trim().length > 0 ||
    statusFilter.length > 0 ||
    branchFilter.length > 0 ||
    technicianFilter.length > 0

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / rowsPerPage))
  const paginatedOrders = React.useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage
    return filteredOrders.slice(start, start + rowsPerPage)
  }, [currentPage, filteredOrders, rowsPerPage])

  React.useEffect(() => {
    setCurrentPage(1)
  }, [deferredSearch, statusFilter, branchFilter, technicianFilter, rowsPerPage])

  React.useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages)
  }, [currentPage, totalPages])

  const closeDialog = () => setDialog({ type: 'none' })

  const handleStatusChange = (
    serviceOrderId: string,
    serviceOrderNumber: number,
    nextStatus: ServiceOrderStatus,
    label: string
  ) => {
    setActionOrderId(serviceOrderId)
    React.startTransition(async () => {
      try {
        const result = await updateServiceOrderStatus(serviceOrderId, nextStatus)
        if (result?.error) {
          toast.error(result.error)
        } else {
          toast.success(`OS #${serviceOrderNumber}: ${label}.`)
          router.refresh()
        }
      } finally {
        setActionOrderId(null)
      }
    })
  }

  const handleClientResponse = (
    serviceOrderId: string,
    serviceOrderNumber: number,
    response: 'aprovado' | 'reprovado'
  ) => {
    setActionOrderId(serviceOrderId)
    React.startTransition(async () => {
      try {
        const result = await registerClientResponse(serviceOrderId, response)
        if (result?.error) {
          toast.error(result.error)
        } else {
          const label =
            result?.message ??
            (response === 'aprovado'
              ? 'orçamento aprovado pelo cliente'
              : 'orçamento recusado pelo cliente. A OS voltou para análise')
          toast.success(`OS #${serviceOrderNumber}: ${label}.`)
          router.refresh()
        }
      } finally {
        setActionOrderId(null)
      }
    })
  }

  const handleSendEstimate = async (
    serviceOrderId: string,
    estimateId: string,
    via: 'whatsapp' | 'email'
  ) => {
    setSendingId(estimateId)
    try {
      const result = await sendEstimate(serviceOrderId, estimateId, via)
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success(`Orçamento enviado via ${via === 'whatsapp' ? 'WhatsApp' : 'e-mail'}.`)
        router.refresh()
      }
    } finally {
      setSendingId(null)
    }
  }

  const resetFilters = () => {
    setSearch('')
    setStatusFilter([])
    setBranchFilter([])
    setTechnicianFilter([])
  }

  const handleDeleteSuccess = (deletedId: string) => {
    setOrders((prev) => prev.filter((o) => o.id !== deletedId))
    router.refresh()
  }

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    })

  const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

  const getLatestEstimate = (estimates: ServiceOrderData['service_order_estimates']) => {
    if (!estimates || estimates.length === 0) return null
    return estimates.reduce((best, curr) => (curr.version > best.version ? curr : best))
  }

  const getLatestApprovedEstimate = (order: ServiceOrderData) => {
    const estimates = order.service_order_estimates ?? []
    return (
      estimates
        .filter((estimate) => estimate.status === 'aprovado')
        .sort((a, b) => b.version - a.version)[0] ?? null
    )
  }

  const canDeleteOrder = (order: ServiceOrderData) =>
    order.status === 'aguardando' && (order.service_order_estimates?.length ?? 0) === 0

  const canEditOrder = (order: ServiceOrderData) =>
    order.status === 'aguardando' || order.status === 'em_analise' || order.status === 'reprovado'

  const canManageEstimatesForOrder = (order: ServiceOrderData) =>
    order.status !== 'cancelado' && order.status !== 'finalizado'

  const canCancelOrder = (order: ServiceOrderData) =>
    [
      'aguardando',
      'em_analise',
      'aguardando_aprovacao',
      'aprovado',
      'aguardando_peca',
      'reprovado',
      'pronto',
    ].includes(order.status)

  const getOrderRestrictionLabel = (order: ServiceOrderData) => {
    if (canCancelOrder(order)) return 'Cancelar OS'
    return 'Ação indisponível'
  }

  const dispatchOrder = dispatchOrderId
    ? (orders.find((order) => order.id === dispatchOrderId) ?? null)
    : null

  const returnOrder = returnOrderId
    ? (orders.find((order) => order.id === returnOrderId) ?? null)
    : null
  const returnThirdPartyName = returnOrder?.third_party_id
    ? (thirdParties.find((tp) => tp.id === returnOrder.third_party_id)?.name ?? null)
    : null

  const historyOrder = historyOrderId
    ? (orders.find((order) => order.id === historyOrderId) ?? null)
    : null
  const historyClient = historyOrder ? clientMap[historyOrder.client_id] : null
  const pickupOrder = pickupOrderId
    ? (orders.find((order) => order.id === pickupOrderId) ?? null)
    : null
  const pickupClient = pickupOrder ? clientMap[pickupOrder.client_id] : null
  const pickupApprovedEstimate = pickupOrder ? getLatestApprovedEstimate(pickupOrder) : null

  return (
    <>
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Ordens de Serviço</h2>
        <p className="text-muted-foreground">
          Gerencie as ordens de serviço abertas na sua assistência técnica.
        </p>
      </div>

      <DataTableToolbar
        filters={
          <>
            <DataTableSearch
              value={search}
              onChange={setSearch}
              placeholder="Buscar por número, cliente, equipamento..."
              disabled={orders.length === 0}
            />

            <DataTableFilterPopover
              title="Status"
              options={statusOptions}
              selectedValues={statusFilter}
              onToggle={(v) =>
                setStatusFilter((prev) =>
                  prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]
                )
              }
              onClear={() => setStatusFilter([])}
              disabled={orders.length === 0}
            />

            {isAdmin && (
              <DataTableFilterPopover
                title="Filial"
                options={branchOptions}
                selectedValues={branchFilter}
                onToggle={(v) =>
                  setBranchFilter((prev) =>
                    prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]
                  )
                }
                onClear={() => setBranchFilter([])}
                disabled={orders.length === 0}
              />
            )}

            {technicianOptions.length > 0 && (
              <DataTableFilterPopover
                title="Técnico"
                options={technicianOptions}
                selectedValues={technicianFilter}
                onToggle={(v) =>
                  setTechnicianFilter((prev) =>
                    prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]
                  )
                }
                onClear={() => setTechnicianFilter([])}
                disabled={orders.length === 0}
              />
            )}

            {hasActiveFilters && (
              <Button variant="outline" onClick={resetFilters} className="gap-2">
                <X className="size-4" />
                Limpar filtros
              </Button>
            )}

            <DataTableColumnToggle
              columns={columnsForUser}
              visibility={columnVisibility}
              onToggle={toggleColumn}
              onReset={resetColumns}
            />
          </>
        }
        actions={
          <Link href="/dashboard/ordens-de-servico/nova" className={cn(buttonVariants(), 'gap-2')}>
            <Plus className="size-4" />
            Nova OS
          </Link>
        }
      />

      <DataTableCard>
        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-center">
            <Wrench className="size-12 text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhuma OS cadastrada</h3>
            <p className="text-muted-foreground text-sm max-w-sm">
              Clique em &quot;Nova OS&quot; para abrir a primeira ordem de serviço.
            </p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-center">
            <h3 className="text-lg font-medium mb-2">Nenhum resultado encontrado</h3>
            <p className="text-muted-foreground text-sm max-w-md">
              Ajuste a busca ou os filtros para localizar outra OS.
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
                  <th className="text-left font-medium text-muted-foreground px-4 py-3">OS</th>
                  <th className="text-left font-medium text-muted-foreground px-4 py-3">Cliente</th>
                  {isColumnVisible('device') && (
                    <th className="text-left font-medium text-muted-foreground px-4 py-3">
                      Equipamento
                    </th>
                  )}
                  <th className="text-left font-medium text-muted-foreground px-4 py-3">Status</th>
                  {isColumnVisible('estimate') && (
                    <th className="text-left font-medium text-muted-foreground px-4 py-3">
                      Orçamento
                    </th>
                  )}
                  {isColumnVisible('technician') && (
                    <th className="text-left font-medium text-muted-foreground px-4 py-3">
                      Técnico
                    </th>
                  )}
                  {isAdmin && isColumnVisible('branch') && (
                    <th className="text-left font-medium text-muted-foreground px-4 py-3">
                      Filial
                    </th>
                  )}
                  {isColumnVisible('entry') && (
                    <th className="text-left font-medium text-muted-foreground px-4 py-3">
                      Entrada
                    </th>
                  )}
                  {isColumnVisible('notified') && (
                    <th className="text-left font-medium text-muted-foreground px-4 py-3">
                      Notificado
                    </th>
                  )}
                  <th className="text-right font-medium text-muted-foreground px-4 py-3">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedOrders.map((order) => {
                  const client = clientMap[order.client_id]
                  const technicianName = order.technician_id
                    ? technicianMap[order.technician_id]
                    : null
                  const branchName = order.branch_id ? branchMap[order.branch_id] : null
                  const status = order.status as ServiceOrderStatus
                  const isActionPending = actionOrderId === order.id
                  const deviceName = order.device_model || order.device_type || '—'
                  const deviceDetails = [
                    order.device_type ? { label: 'Tipo', value: order.device_type } : null,
                    order.device_brand ? { label: 'Marca', value: order.device_brand } : null,
                    order.device_model ? { label: 'Modelo', value: order.device_model } : null,
                    order.device_color ? { label: 'Cor', value: order.device_color } : null,
                    order.device_serial ? { label: 'S/N', value: order.device_serial } : null,
                    order.device_internal_code ? { label: 'Código interno', value: order.device_internal_code } : null,
                  ].filter((item): item is { label: string; value: string } => item !== null)

                  return (
                    <tr key={order.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <Link
                          href={`/dashboard/ordens-de-servico/${order.id}`}
                          className="font-bold text-primary text-sm hover:underline"
                        >
                          #{order.number}
                        </Link>
                      </td>

                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">{client?.name ?? '—'}</div>
                        {client?.phone && (
                          <div className="text-xs text-muted-foreground">{client.phone}</div>
                        )}
                      </td>

                      {isColumnVisible('device') && (
                        <td className="px-4 py-3 text-muted-foreground">
                          {deviceDetails.length > 0 ? (
                            <Tooltip>
                              <TooltipTrigger className="max-w-36 truncate text-left">
                                {deviceName}
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-xs">
                                <div className="flex flex-col gap-1">
                                  {deviceDetails.map((detail) => (
                                    <div key={detail.label} className="flex gap-1.5">
                                      <span className="font-semibold">{detail.label}:</span>
                                      <span>{detail.value}</span>
                                    </div>
                                  ))}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <span>—</span>
                          )}
                        </td>
                      )}

                      <td className="px-4 py-3">
                        <span
                          className={`inline-block text-[11px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${
                            STATUS_COLORS[status] ?? 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {STATUS_LABELS[status] ?? order.status}
                        </span>
                      </td>

                      {isColumnVisible('estimate') && (
                        <td className="px-4 py-3">
                          {(() => {
                            const est = getLatestEstimate(order.service_order_estimates)
                            if (!est) return <span className="text-muted-foreground/40">—</span>
                            const isExpired = isServiceOrderEstimateExpired(
                              est.valid_until,
                              est.status
                            )
                            return (
                              <div className="flex flex-col gap-0.5">
                                <span className="text-xs font-semibold text-foreground">
                                  {currencyFormatter.format(Number(est.total_amount))}
                                </span>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[11px] text-muted-foreground">
                                    v{est.version}
                                  </span>
                                  {isExpired && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-700">
                                      <AlertTriangle className="size-3" />
                                      Vencido
                                    </span>
                                  )}
                                </div>
                              </div>
                            )
                          })()}
                        </td>
                      )}

                      {isColumnVisible('technician') && (
                        <td className="px-4 py-3 text-muted-foreground">
                          {(() => {
                            const name =
                              technicianName ??
                              getLatestEstimate(order.service_order_estimates)?.profiles?.name ??
                              null
                            return name ? (
                              <div className="flex items-center gap-1.5">
                                <User className="size-3.5" />
                                <span>{name}</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground/50">—</span>
                            )
                          })()}
                        </td>
                      )}

                      {isAdmin && isColumnVisible('branch') && (
                        <td className="px-4 py-3 text-muted-foreground">
                          {branchName || '—'}
                        </td>
                      )}

                      {isColumnVisible('entry') && (
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="size-3.5" />
                            <span>{formatDate(order.created_at)}</span>
                          </div>
                          {order.estimated_delivery && (
                            <div className="text-[11px] text-muted-foreground">
                              Prev.:{' '}
                              {new Date(order.estimated_delivery + 'T12:00:00').toLocaleDateString(
                                'pt-BR'
                              )}
                            </div>
                          )}
                        </td>
                      )}

                      {isColumnVisible('notified') && (
                        <td className="px-4 py-3">
                          {order.client_notified_at && order.client_notified_via ? (
                            <div className="flex items-center gap-1.5">
                              {order.client_notified_via === 'whatsapp' ? (
                                <MessageCircle className="size-3.5 shrink-0 text-[#25D366]" />
                              ) : (
                                <Mail className="size-3.5 shrink-0 text-blue-500" />
                              )}
                              <span className="text-xs text-muted-foreground">
                                {formatDate(order.client_notified_at)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground/40">—</span>
                          )}
                        </td>
                      )}

                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end">
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              className={cn(
                                buttonVariants({ variant: 'ghost', size: 'icon' }),
                                'size-8'
                              )}
                              title="Ações"
                            >
                              <MoreHorizontal className="size-4" />
                              <span className="sr-only">Ações</span>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              <DropdownMenuGroup>
                                <DropdownMenuLabel>Ações da OS</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.preventDefault()
                                    navigate(`/dashboard/ordens-de-servico/${order.id}`)
                                  }}
                                >
                                  <ArrowRight className="size-4" />
                                  Abrir OS
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  disabled={!canEditOrder(order)}
                                  onClick={(e) => {
                                    e.preventDefault()
                                    if (!canEditOrder(order)) return
                                    navigate(`/dashboard/ordens-de-servico/${order.id}/editar`)
                                  }}
                                >
                                  <Pencil className="size-4" />
                                  {canEditOrder(order) ? 'Editar OS' : 'Edição bloqueada'}
                                </DropdownMenuItem>
                                {(order.service_order_estimates?.length ?? 0) > 0 && (
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.preventDefault()
                                      setHistoryOrderId(order.id)
                                    }}
                                  >
                                    <EyeIcon className="size-4" />
                                    Ver orçamentos
                                  </DropdownMenuItem>
                                )}
                                {(status === 'aguardando_aprovacao' ||
                                  (status === 'enviado_terceiro' &&
                                    order.service_order_estimates?.some(
                                      (e) => e.status === 'enviado'
                                    ))) && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      disabled={isActionPending}
                                      onClick={(e) => {
                                        e.preventDefault()
                                        handleClientResponse(order.id, order.number, 'aprovado')
                                      }}
                                    >
                                      <ThumbsUp className="size-4" />
                                      Cliente aprovou
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      disabled={isActionPending}
                                      onClick={(e) => {
                                        e.preventDefault()
                                        handleClientResponse(order.id, order.number, 'reprovado')
                                      }}
                                    >
                                      <ThumbsDown className="size-4" />
                                      Cliente reprovou
                                    </DropdownMenuItem>
                                  </>
                                )}
                                {status === 'aprovado' && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      disabled={isActionPending}
                                      onClick={(e) => {
                                        e.preventDefault()
                                        handleStatusChange(
                                          order.id,
                                          order.number,
                                          'pronto',
                                          'marcado como pronto para retirada'
                                        )
                                      }}
                                    >
                                      <CheckCircle2 className="size-4" />
                                      Marcar como pronto
                                    </DropdownMenuItem>
                                  </>
                                )}
                                {status === 'pronto' && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.preventDefault()
                                        setPickupOrderId(order.id)
                                      }}
                                    >
                                      <Truck className="size-4" />
                                      Registrar retirada
                                    </DropdownMenuItem>
                                  </>
                                )}
                                {status === 'aguardando_peca' && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      disabled={isActionPending}
                                      onClick={(e) => {
                                        e.preventDefault()
                                        handleStatusChange(
                                          order.id,
                                          order.number,
                                          'aprovado',
                                          'serviço retomado'
                                        )
                                      }}
                                    >
                                      <RotateCcw className="size-4" />
                                      Retomar serviço
                                    </DropdownMenuItem>
                                  </>
                                )}
                                {(() => {
                                  const est = getLatestEstimate(order.service_order_estimates)
                                  if (
                                    !est ||
                                    est.status !== 'rascunho' ||
                                    !canManageEstimatesForOrder(order)
                                  ) {
                                    return null
                                  }
                                  const isSending = sendingId === est.id
                                  return (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        disabled={isSending}
                                        onClick={() =>
                                          handleSendEstimate(order.id, est.id, 'whatsapp')
                                        }
                                      >
                                        <MessageCircle className="size-4 text-[#25D366]" />
                                        Enc. WhatsApp
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        disabled={isSending}
                                        onClick={() =>
                                          handleSendEstimate(order.id, est.id, 'email')
                                        }
                                      >
                                        <Mail className="size-4 text-blue-500" />
                                        Enc. E-mail
                                      </DropdownMenuItem>
                                    </>
                                  )
                                })()}
                              </DropdownMenuGroup>
                              {(DISPATCHABLE_STATUSES.includes(status) || status === 'enviado_terceiro') && (
                                <DropdownMenuGroup>
                                  <DropdownMenuSeparator />
                                  {DISPATCHABLE_STATUSES.includes(status) && (
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.preventDefault()
                                        setDispatchOrderId(order.id)
                                      }}
                                    >
                                      <Building2 className="size-4 text-indigo-600" />
                                      Enviar p/ terceiro
                                    </DropdownMenuItem>
                                  )}
                                  {status === 'enviado_terceiro' && (
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.preventDefault()
                                        setReturnOrderId(order.id)
                                      }}
                                    >
                                      <Building2 className="size-4 text-indigo-600" />
                                      Registrar retorno
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuGroup>
                              )}
                              {isAdmin && <DropdownMenuSeparator />}
                              {isAdmin && (
                                <DropdownMenuGroup>
                                  {canDeleteOrder(order) ? (
                                    <DropdownMenuItem
                                      variant="destructive"
                                      onClick={() =>
                                        setDialog({
                                          type: 'delete',
                                          id: order.id,
                                          number: order.number,
                                        })
                                      }
                                    >
                                      <Trash2 className="size-4" />
                                      Excluir
                                    </DropdownMenuItem>
                                  ) : canCancelOrder(order) ? (
                                    <DropdownMenuItem
                                      disabled={isActionPending}
                                      onClick={() =>
                                        setDialog({
                                          type: 'cancel',
                                          id: order.id,
                                          number: order.number,
                                        })
                                      }
                                    >
                                      <X className="size-4" />
                                      Cancelar OS
                                    </DropdownMenuItem>
                                  ) : (
                                    <DropdownMenuItem
                                      disabled
                                      title={getOrderRestrictionLabel(order)}
                                    >
                                      <Trash2 className="size-4" />
                                      {getOrderRestrictionLabel(order)}
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuGroup>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {orders.length > 0 && filteredOrders.length > 0 && (
          <DataTablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={setRowsPerPage}
            onPageChange={setCurrentPage}
            totalItems={filteredOrders.length}
            currentItemsCount={paginatedOrders.length}
            itemLabel="OS"
          />
        )}
      </DataTableCard>

      {returnOrder && (
        <ReturnFromThirdPartyDialog
          open={!!returnOrder}
          onOpenChange={(open) => {
            if (!open) setReturnOrderId(null)
          }}
          serviceOrderId={returnOrder.id}
          serviceOrderNumber={returnOrder.number}
          thirdPartyName={returnThirdPartyName}
        />
      )}

      {dispatchOrder && (
        <DispatchToThirdPartyDialog
          open={!!dispatchOrder}
          onOpenChange={(open) => {
            if (!open) setDispatchOrderId(null)
          }}
          serviceOrderId={dispatchOrder.id}
          serviceOrderNumber={dispatchOrder.number}
          thirdParties={thirdParties}
        />
      )}

      {dialog.type === 'delete' && (
        <DeleteServiceOrderDialog
          serviceOrderId={dialog.id}
          serviceOrderNumber={dialog.number}
          open
          onOpenChange={(open) => {
            if (!open) closeDialog()
          }}
          onSuccess={handleDeleteSuccess}
        />
      )}

      {dialog.type === 'cancel' && (
        <CancelServiceOrderDialog
          serviceOrderId={dialog.id}
          serviceOrderNumber={dialog.number}
          open
          onOpenChange={(open) => {
            if (!open) closeDialog()
          }}
          onSuccess={() => {
            closeDialog()
            router.refresh()
          }}
        />
      )}

      {historyOrder && (
        <LazyEstimatesModal
          open={!!historyOrder}
          onOpenChange={(open) => {
            if (!open) setHistoryOrderId(null)
          }}
          serviceOrderId={historyOrder.id}
          serviceOrderNumber={historyOrder.number}
          serviceOrderStatus={historyOrder.status as ServiceOrderStatus}
          clientName={historyClient?.name ?? null}
          clientPhone={historyClient?.phone ?? null}
          clientEmail={historyClient?.email ?? null}
        />
      )}

      {pickupOrder && (
        <ServiceOrderPickupSheet
          open={!!pickupOrder}
          onOpenChange={(open) => {
            if (!open) setPickupOrderId(null)
          }}
          serviceOrderId={pickupOrder.id}
          serviceOrderNumber={pickupOrder.number}
          clientName={pickupClient?.name ?? null}
          amountDue={pickupApprovedEstimate?.total_amount ?? null}
          onSuccess={() => {
            setPickupOrderId(null)
            router.refresh()
          }}
        />
      )}
    </>
  )
}
