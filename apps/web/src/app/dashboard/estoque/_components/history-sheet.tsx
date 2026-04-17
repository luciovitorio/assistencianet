'use client'

import * as React from 'react'
import { History, ArrowDownToLine, ArrowUpFromLine, SlidersHorizontal, ArrowRightLeft } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { getPartMovements, type PartMovement } from '@/app/actions/stock'
import type { PartRow, BranchOption } from './stock-list'
import { MOVEMENT_TYPE_LABELS, type MovementType } from '@/lib/validations/stock'

interface HistorySheetProps {
  part: PartRow | null
  branchId: string
  branches: BranchOption[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

const MOVEMENT_ICONS: Record<MovementType, React.ReactNode> = {
  entrada: <ArrowDownToLine className="size-4 text-emerald-600" />,
  saida: <ArrowUpFromLine className="size-4 text-red-500" />,
  ajuste: <SlidersHorizontal className="size-4 text-amber-500" />,
  transferencia_entrada: <ArrowRightLeft className="size-4 text-blue-500" />,
  transferencia_saida: <ArrowRightLeft className="size-4 text-blue-400" />,
}

const MOVEMENT_CLASSES: Record<MovementType, string> = {
  entrada: 'text-emerald-700 bg-emerald-50',
  saida: 'text-red-700 bg-red-50',
  ajuste: 'text-amber-700 bg-amber-50',
  transferencia_entrada: 'text-blue-700 bg-blue-50',
  transferencia_saida: 'text-blue-600 bg-blue-50',
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

function formatSimpleDate(date: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(`${date}T00:00:00`))
}

function formatDelta(quantity: number, unit: string) {
  const sign = quantity > 0 ? '+' : ''
  return `${sign}${quantity.toLocaleString('pt-BR')} ${unit}`
}

export function HistorySheet({ part, branchId, branches, open, onOpenChange }: HistorySheetProps) {
  const [movements, setMovements] = React.useState<PartMovement[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const branchName = branchId
    ? (branches.find((b) => b.id === branchId)?.name ?? 'Todas as filiais')
    : 'Todas as filiais'

  React.useEffect(() => {
    if (!open || !part) return

    setLoading(true)
    setError(null)
    setMovements([])

    getPartMovements(part.id, branchId || undefined).then(({ data, error: err }) => {
      setLoading(false)
      if (err) {
        setError(err)
      } else {
        setMovements(data ?? [])
      }
    })
  }, [open, part, branchId])

  if (!part) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-lg w-full flex flex-col gap-0 p-0">
        <SheetHeader className="border-b border-border px-6 py-4">
          <SheetTitle className="flex items-center gap-2">
            <History className="size-5 text-primary" />
            Histórico de Movimentações
          </SheetTitle>
          <SheetDescription>
            <span className="font-medium text-foreground">{part.name}</span>
            {part.sku && <span className="text-muted-foreground"> · SKU {part.sku}</span>}
            <br />
            <span className="text-muted-foreground">{branchName}</span>
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading && (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-16 rounded-lg bg-muted/60 animate-pulse" />
              ))}
            </div>
          )}

          {!loading && error && (
            <p className="text-sm text-destructive text-center py-8">{error}</p>
          )}

          {!loading && !error && movements.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <History className="size-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium">Nenhuma movimentação registrada</p>
              <p className="text-xs text-muted-foreground mt-1">
                Use &quot;Registrar Entrada&quot; para iniciar o controle de estoque desta peça.
              </p>
            </div>
          )}

          {!loading && !error && movements.length > 0 && (
            <div className="flex flex-col gap-2">
              {movements.map((m) => {
                const type = m.movement_type as MovementType
                const label = MOVEMENT_TYPE_LABELS[type] ?? m.movement_type
                const icon = MOVEMENT_ICONS[type]
                const cls = MOVEMENT_CLASSES[type] ?? 'text-foreground bg-muted'

                return (
                  <div
                    key={m.id}
                    className="rounded-lg border border-border bg-card p-3 text-sm space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {icon}
                        <span className={`text-[11px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${cls}`}>
                          {label}
                        </span>
                      </div>
                      <span className={`font-semibold tabular-nums ${m.quantity > 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                        {formatDelta(m.quantity, part.unit)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{formatDate(m.created_at)}</span>
                      {m.profiles?.name && (
                        <span className="truncate max-w-32">{m.profiles.name}</span>
                      )}
                    </div>

                    {m.unit_cost != null && (
                      <div className="text-xs text-muted-foreground">
                        Custo unit.: {m.unit_cost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </div>
                    )}

                    {(m.suppliers?.name || m.invoice_date || m.entry_date) && (
                      <div className="space-y-1 text-xs text-muted-foreground">
                        {m.suppliers?.name && <div>Fornecedor: {m.suppliers.name}</div>}
                        {m.invoice_date && <div>Data da nota: {formatSimpleDate(m.invoice_date)}</div>}
                        {m.entry_date && <div>Data de entrada: {formatSimpleDate(m.entry_date)}</div>}
                      </div>
                    )}

                    {m.notes && (
                      <p className="text-xs text-muted-foreground italic">{m.notes}</p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
