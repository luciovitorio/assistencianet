'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  FileText,
  MoreHorizontal,
  Printer,
  Receipt,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { buttonVariants } from '@/components/ui/button-variants'
import {
  DataTableCard,
  DataTableFilterPopover,
  DataTableToolbar,
  type DataTableFilterOption,
} from '@/components/ui/data-table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import {
  PAYOUT_STATUS_COLORS,
  PAYOUT_STATUS_LABELS,
  type PayoutStatus,
} from '@/lib/validations/technician-payout'
import type { PayoutRow } from '@/app/actions/technician-payouts'
import { cancelPayout } from '@/app/actions/technician-payouts'
import { PayPayoutDialog } from './pay-payout-dialog'

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatIsoToBr(iso: string) {
  if (!iso) return '—'
  return iso.slice(0, 10).split('-').reverse().join('/')
}

interface PayoutsListProps {
  payouts: PayoutRow[]
}

export function PayoutsList({ payouts }: PayoutsListProps) {
  const router = useRouter()
  const [statusFilter, setStatusFilter] = React.useState<string[]>([])
  const [payDialog, setPayDialog] = React.useState<PayoutRow | null>(null)
  const [cancellingId, setCancellingId] = React.useState<string | null>(null)
  const [isPending, startTransition] = React.useTransition()

  const statusOptions = React.useMemo<DataTableFilterOption[]>(() => {
    const order: PayoutStatus[] = ['aberto', 'pago', 'cancelado']
    return order.map((v) => ({
      value: v,
      label: PAYOUT_STATUS_LABELS[v],
      count: payouts.filter((p) => p.status === v).length,
    }))
  }, [payouts])

  const filtered = React.useMemo(() => {
    if (statusFilter.length === 0) return payouts
    return payouts.filter((p) => statusFilter.includes(p.status))
  }, [payouts, statusFilter])

  const summary = React.useMemo(() => {
    const totalAberto = payouts
      .filter((p) => p.status === 'aberto')
      .reduce((acc, p) => acc + p.total_amount, 0)
    const totalPagoMes = payouts
      .filter((p) => p.status === 'pago' && p.paid_at)
      .reduce((acc, p) => acc + p.total_amount, 0)
    const countAberto = payouts.filter((p) => p.status === 'aberto').length
    return { totalAberto, totalPagoMes, countAberto }
  }, [payouts])

  const handleCancel = (payout: PayoutRow) => {
    if (!window.confirm(`Cancelar o fechamento ${payout.receipt_number}? As OS voltam a ficar disponíveis para um novo fechamento.`)) {
      return
    }
    setCancellingId(payout.id)
    startTransition(async () => {
      const result = await cancelPayout(payout.id)
      setCancellingId(null)
      if (result?.error) {
        toast.error(result.error)
        return
      }
      toast.success('Fechamento cancelado.')
      router.refresh()
    })
  }

  const openReceipt = (payoutId: string) => {
    window.open(`/recibos/producao/${payoutId}`, '_blank', 'noopener,noreferrer')
  }

  const openReceiptAndPrint = (payoutId: string) => {
    window.open(`/recibos/producao/${payoutId}?autoPrint=1`, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Link
              href="/dashboard/financeiro/producao-tecnicos"
              className="inline-flex items-center gap-1 hover:text-foreground"
            >
              <ArrowLeft className="size-3" /> Produção de Técnicos
            </Link>
          </div>
          <h2 className="mt-1 text-2xl font-bold tracking-tight">Fechamentos</h2>
          <p className="text-muted-foreground">
            Recibos de pagamento gerados para os técnicos. Pagamentos refletem em Contas a Pagar.
          </p>
        </div>
      </div>

      {/* Cards de resumo */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Em aberto</span>
            <Receipt className="size-5 text-amber-600" />
          </div>
          <p className="text-2xl font-bold tabular-nums text-amber-600">
            {formatCurrency(summary.totalAberto)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {summary.countAberto} fechamento{summary.countAberto === 1 ? '' : 's'}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Pagos (histórico)</span>
            <CheckCircle2 className="size-5 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold tabular-nums text-emerald-700">
            {formatCurrency(summary.totalPagoMes)}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total de recibos</span>
            <FileText className="size-5 text-primary" />
          </div>
          <p className="text-2xl font-bold tabular-nums">{payouts.length}</p>
        </div>
      </div>

      {/* Filtro */}
      <DataTableToolbar
        filters={
          <DataTableFilterPopover
            title="Status"
            options={statusOptions}
            selectedValues={statusFilter}
            onToggle={(value) =>
              setStatusFilter((prev) =>
                prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
              )
            }
            onClear={() => setStatusFilter([])}
          />
        }
      />

      {/* Tabela */}
      <DataTableCard>
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-center">
            <Receipt className="size-10 text-muted-foreground/30 mb-3" />
            <h3 className="text-lg font-medium mb-1">Nenhum fechamento encontrado</h3>
            <p className="text-muted-foreground text-sm max-w-sm">
              Gere um fechamento em Produção de Técnicos para começar.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left font-medium text-muted-foreground px-4 py-3">Recibo</th>
                  <th className="text-left font-medium text-muted-foreground px-4 py-3">Técnico</th>
                  <th className="text-left font-medium text-muted-foreground px-4 py-3 hidden md:table-cell">Período</th>
                  <th className="text-right font-medium text-muted-foreground px-4 py-3">OS</th>
                  <th className="text-right font-medium text-muted-foreground px-4 py-3">Total</th>
                  <th className="text-left font-medium text-muted-foreground px-4 py-3">Status</th>
                  <th className="px-4 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((row) => {
                  const isCancelling = cancellingId === row.id
                  return (
                    <tr key={row.id} className={cn('hover:bg-muted/20 transition-colors', isCancelling && 'opacity-60')}>
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-foreground">
                        {row.receipt_number}
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground">{row.technician_name}</td>
                      <td className="px-4 py-3 hidden md:table-cell text-muted-foreground tabular-nums">
                        {formatIsoToBr(row.period_start)} → {formatIsoToBr(row.period_end)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{row.os_count}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-semibold">
                        {formatCurrency(row.total_amount)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                            PAYOUT_STATUS_COLORS[row.status],
                          )}
                        >
                          {PAYOUT_STATUS_LABELS[row.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            disabled={isPending}
                            className={cn(
                              buttonVariants({ variant: 'ghost', size: 'icon' }),
                            )}
                          >
                            <MoreHorizontal className="size-4" />
                            <span className="sr-only">Ações</span>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openReceipt(row.id)}>
                              <FileText className="size-4" /> Ver recibo
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openReceiptAndPrint(row.id)}>
                              <Printer className="size-4" /> Imprimir
                            </DropdownMenuItem>
                            {row.status === 'aberto' && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => setPayDialog(row)}>
                                  <CheckCircle2 className="size-4 text-emerald-600" /> Marcar como pago
                                </DropdownMenuItem>
                                {row.bill_id && (
                                  <DropdownMenuItem
                                    onClick={() => router.push('/dashboard/financeiro/contas-a-pagar')}
                                  >
                                    <ExternalLink className="size-4" /> Abrir em Contas a Pagar
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleCancel(row)}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <XCircle className="size-4" /> Cancelar fechamento
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </DataTableCard>

      <PayPayoutDialog
        payout={payDialog}
        open={payDialog !== null}
        onOpenChange={(open) => !open && setPayDialog(null)}
        onSuccess={() => {
          setPayDialog(null)
          router.refresh()
        }}
      />
    </div>
  )
}
