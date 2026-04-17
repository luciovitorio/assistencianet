'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, ClipboardCheck, MoreHorizontal } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { buttonVariants } from '@/components/ui/button-variants'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DataTablePagination } from '@/components/ui/data-table'
import { useRouteTransition } from '@/components/ui/route-transition-indicator'
import { cn } from '@/lib/utils'
import { claimServiceOrder } from '@/app/actions/service-orders'
import {
  STATUS_LABELS,
  STATUS_COLORS,
  type ServiceOrderStatus,
} from '@/lib/validations/service-order'

export interface WorkQueueOrder {
  id: string
  number: number
  status: string
  device_type: string
  device_brand: string | null
  device_model: string | null
  reported_issue: string
  estimated_delivery: string | null
  client: { name: string; phone: string | null } | null
}

const AVATAR_COLORS = [
  'bg-indigo-100 text-indigo-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-violet-100 text-violet-700',
  'bg-teal-100 text-teal-700',
  'bg-emerald-100 text-emerald-700',
  'bg-blue-100 text-blue-700',
  'bg-orange-100 text-orange-700',
]

function getAvatarColor(name: string): string {
  let hash = 0
  for (const ch of name) hash = ch.charCodeAt(0) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function formatDeliveryFull(dateStr: string): string {
  const [year, month, day] = dateStr.split('-')
  return `${day}/${month}/${year}`
}

interface WorkQueueTableProps {
  orders: WorkQueueOrder[]
  todayStr: string
}

export function WorkQueueTable({ orders, todayStr }: WorkQueueTableProps) {
  const router = useRouter()
  const { navigate } = useRouteTransition()
  const [rowsPerPage, setRowsPerPage] = React.useState(5)
  const [currentPage, setCurrentPage] = React.useState(1)
  const [claimingId, setClaimingId] = React.useState<string | null>(null)

  const totalPages = Math.max(1, Math.ceil(orders.length / rowsPerPage))

  const paginated = React.useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage
    return orders.slice(start, start + rowsPerPage)
  }, [orders, currentPage, rowsPerPage])

  React.useEffect(() => {
    setCurrentPage(1)
  }, [rowsPerPage])

  React.useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages)
  }, [currentPage, totalPages])

  const handleClaim = async (id: string, number: number) => {
    setClaimingId(id)
    const result = await claimServiceOrder(id)
    setClaimingId(null)
    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success(`OS #${number}: iniciada com sucesso.`)
      router.refresh()
    }
  }

  if (orders.length === 0) {
    return (
      <div className="px-8 py-16 text-center text-muted-foreground text-sm">
        Nenhuma OS ativa no momento.
      </div>
    )
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="text-left font-medium text-muted-foreground px-4 py-3">Nº OS</th>
              <th className="text-left font-medium text-muted-foreground px-4 py-3">Cliente</th>
              <th className="text-left font-medium text-muted-foreground px-4 py-3 hidden md:table-cell">Equipamento</th>
              <th className="text-left font-medium text-muted-foreground px-4 py-3 hidden lg:table-cell">Defeito Relatado</th>
              <th className="text-left font-medium text-muted-foreground px-4 py-3">Status</th>
              <th className="text-left font-medium text-muted-foreground px-4 py-3 hidden md:table-cell">Entrega Prevista</th>
              <th className="text-right font-medium text-muted-foreground px-4 py-3">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {paginated.map((os) => {
              const clientName = os.client?.name ?? '—'
              const isOverdue =
                !!os.estimated_delivery &&
                os.estimated_delivery < todayStr &&
                os.status !== 'pronto'
              const equipment = [os.device_type, os.device_brand, os.device_model]
                .filter(Boolean)
                .join(' · ')
              const status = os.status as ServiceOrderStatus

              return (
                <tr key={os.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/ordens-de-servico/${os.id}`}
                      className="font-bold text-primary text-base hover:underline"
                    >
                      #{os.number}
                    </Link>
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${getAvatarColor(clientName)}`}
                      >
                        {getInitials(clientName)}
                      </div>
                      <div>
                        <div className="font-medium text-foreground">{clientName}</div>
                        {os.client?.phone && (
                          <div className="text-xs text-muted-foreground">{os.client.phone}</div>
                        )}
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                    <div className="max-w-52 truncate">{equipment || '—'}</div>
                  </td>

                  <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">
                    <div className="max-w-48 truncate">{os.reported_issue}</div>
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'inline-block text-[11px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full whitespace-nowrap',
                        isOverdue
                          ? 'bg-destructive/10 text-destructive'
                          : (STATUS_COLORS[status] ?? 'bg-muted text-muted-foreground'),
                      )}
                    >
                      {isOverdue ? 'Atrasado' : (STATUS_LABELS[status] ?? os.status)}
                    </span>
                  </td>

                  <td className="px-4 py-3 hidden md:table-cell">
                    {os.estimated_delivery ? (
                      <span
                        className={cn(
                          'text-sm font-medium',
                          isOverdue ? 'text-destructive font-bold' : 'text-muted-foreground',
                        )}
                      >
                        {isOverdue && <span className="mr-1">⚠</span>}
                        {formatDeliveryFull(os.estimated_delivery)}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground/50">—</span>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'size-8')}
                          title="Ações"
                        >
                          <MoreHorizontal className="size-4" />
                          <span className="sr-only">Ações</span>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuGroup>
                            <DropdownMenuLabel>Ações da OS</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {os.status === 'aguardando' && (
                              <DropdownMenuItem
                                onClick={() => handleClaim(os.id, os.number)}
                                disabled={claimingId === os.id}
                              >
                                <ClipboardCheck className="size-4" />
                                Pegar OS
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => navigate(`/dashboard/ordens-de-servico/${os.id}`)}
                            >
                              <ArrowRight className="size-4" />
                              Abrir OS
                            </DropdownMenuItem>
                          </DropdownMenuGroup>
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

      <DataTablePagination
        currentPage={currentPage}
        totalPages={totalPages}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={setRowsPerPage}
        onPageChange={setCurrentPage}
        totalItems={orders.length}
        currentItemsCount={paginated.length}
        rowsPerPageOptions={[5, 10, 20]}
        itemLabel="OS"
      />
    </>
  )
}
