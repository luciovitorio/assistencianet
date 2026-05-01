'use client'

import * as React from 'react'
import { History, X } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select'
import { getPartMovements, getRecentMovements, type PartMovement } from '@/app/actions/stock'
import type { PartRow, BranchOption } from './stock-list'
import { type MovementType } from '@/lib/validations/stock'
import { cn } from '@/lib/utils'

interface HistorySheetProps {
  part: PartRow | null
  branchId: string
  branches: BranchOption[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const MONTHS_PT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  const day = String(d.getDate()).padStart(2, '0')
  const month = MONTHS_PT[d.getMonth()]
  const year = d.getFullYear()
  const hour = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${day}/${month}/${year} · ${hour}:${min}`
}

function getTypeLabel(m: PartMovement): string {
  if (m.movement_type === 'saida' && m.reference_type === 'os') return 'Saída OS'
  if (m.movement_type === 'transferencia_entrada' || m.movement_type === 'transferencia_saida') return 'Transferência'
  const labels: Record<string, string> = {
    entrada: 'Entrada',
    saida: 'Saída',
    ajuste: 'Ajuste',
  }
  return labels[m.movement_type] ?? m.movement_type
}

function getTypeStyle(type: string, referenceType: string | null): { dot: string; label: string } {
  if (type === 'entrada') return { dot: 'bg-emerald-500', label: 'text-emerald-600' }
  if (type === 'saida') return { dot: 'bg-amber-500', label: 'text-amber-600' }
  if (type === 'ajuste') return { dot: 'bg-blue-500', label: 'text-blue-600' }
  if (type.startsWith('transferencia')) return { dot: 'bg-slate-400', label: 'text-slate-500' }
  return { dot: 'bg-gray-400', label: 'text-gray-500' }
}

function buildDescription(m: PartMovement, unit: string): string {
  const qty = Math.abs(m.quantity).toLocaleString('pt-BR')
  const q = `${qty} ${unit}`.trim()
  switch (m.movement_type as MovementType) {
    case 'entrada':
      if (m.notes) return m.notes
      return m.suppliers?.name ? `${q} recebidas — ${m.suppliers.name}` : `${q} recebidas`
    case 'saida':
      return m.notes ?? `${q} saída`
    case 'ajuste':
      return m.notes ?? 'Ajuste de estoque'
    case 'transferencia_saida':
      return m.notes ?? `${q} enviadas por transferência`
    case 'transferencia_entrada':
      return m.notes ?? `${q} recebidas por transferência`
    default:
      return m.notes ?? q
  }
}

// ── Componente ────────────────────────────────────────────────────────────────

type TypeFilter = 'all' | 'entrada' | 'saida' | 'transferencia' | 'ajuste'
type DaysFilter = 7 | 30 | 90

const TYPE_FILTER_OPTIONS: { value: TypeFilter; label: string }[] = [
  { value: 'all', label: 'Todos os tipos' },
  { value: 'entrada', label: 'Entrada' },
  { value: 'saida', label: 'Saída' },
  { value: 'transferencia', label: 'Transferência' },
  { value: 'ajuste', label: 'Ajuste' },
]

const DAYS_FILTER_OPTIONS: { value: DaysFilter; label: string }[] = [
  { value: 7, label: 'Últimos 7 dias' },
  { value: 30, label: 'Últimos 30 dias' },
  { value: 90, label: 'Últimos 90 dias' },
]

export function HistorySheet({ part, branchId, branches, open, onOpenChange }: HistorySheetProps) {
  const [movements, setMovements] = React.useState<PartMovement[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [typeFilter, setTypeFilter] = React.useState<TypeFilter>('all')
  const [days, setDays] = React.useState<DaysFilter>(30)

  // displayPart/displayBranchId ficam congelados durante o fechamento (animação)
  // e só atualizam quando o sheet abre — tudo dentro do mesmo effect para evitar
  // race condition entre dois effects separados.
  const [displayPart, setDisplayPart] = React.useState(part)
  const [displayBranchId, setDisplayBranchId] = React.useState(branchId)

  React.useEffect(() => {
    if (!open) return

    setDisplayPart(part)
    setDisplayBranchId(branchId)
    setLoading(true)
    setError(null)
    setMovements([])

    const fetch = part
      ? getPartMovements(part.id, branchId || undefined)
      : getRecentMovements(branchId || undefined, days)

    fetch.then(({ data, error: err }) => {
      setLoading(false)
      if (err) setError(err)
      else setMovements(data ?? [])
    })
  }, [open, part, branchId, days])

  const branchName = displayBranchId
    ? (branches.find((b) => b.id === displayBranchId)?.name ?? 'Todas as filiais')
    : 'Todas as filiais'

  const filtered = React.useMemo(() => {
    let result = movements

    // Para peça específica, aplica filtro de data no client (já busca tudo de uma vez)
    if (displayPart) {
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - days)
      result = result.filter((m) => new Date(m.created_at) >= cutoff)
    }

    if (typeFilter !== 'all') {
      result = result.filter((m) => {
        if (typeFilter === 'transferencia') return m.movement_type.startsWith('transferencia')
        return m.movement_type === typeFilter
      })
    }

    return result
  }, [movements, typeFilter, displayPart, days])

  const subtitle = displayPart
    ? displayPart.name + (displayPart.sku ? ` · SKU ${displayPart.sku}` : '')
    : `${branchName} · últimos ${days} dias`

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 ring-0 sm:max-w-lg" showCloseButton={false}>
        <SheetHeader className="border-b border-border px-6 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <SheetTitle className="flex items-center gap-2">
                <History className="size-5 text-primary" />
                Histórico de movimentações
              </SheetTitle>
              <SheetDescription>{subtitle}</SheetDescription>
            </div>
            <SheetClose
              render={
                <Button variant="ghost" size="icon-sm" className="shrink-0 text-muted-foreground" />
              }
            >
              <X className="size-4" />
              <span className="sr-only">Fechar</span>
            </SheetClose>
          </div>
        </SheetHeader>

        <div className="flex flex-wrap items-center gap-2 border-b border-border px-6 py-3">
          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as TypeFilter)}>
            <SelectTrigger className="h-8 min-w-36 rounded-md text-xs font-medium">
              <span className="flex flex-1 text-left">
                {TYPE_FILTER_OPTIONS.find((o) => o.value === typeFilter)?.label}
              </span>
            </SelectTrigger>
            <SelectContent className="rounded-md" alignItemWithTrigger={false}>
              {TYPE_FILTER_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={String(days)} onValueChange={(v) => setDays(Number(v) as DaysFilter)}>
            <SelectTrigger className="h-8 min-w-40 rounded-md text-xs font-medium">
              <span className="flex flex-1 text-left">
                {DAYS_FILTER_OPTIONS.find((o) => o.value === days)?.label}
              </span>
            </SelectTrigger>
            <SelectContent className="rounded-md" alignItemWithTrigger={false}>
              {DAYS_FILTER_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-2">
          {loading && (
            <div className="flex flex-col gap-3 pt-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex gap-3 py-2">
                  <div className="mt-1.5 size-2 shrink-0 animate-pulse rounded-full bg-muted" />
                  <div className="flex flex-1 flex-col gap-1.5">
                    <div className="h-3 w-16 animate-pulse rounded bg-muted" />
                    <div className="h-4 w-48 animate-pulse rounded bg-muted" />
                    <div className="h-3 w-32 animate-pulse rounded bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && error && (
            <p className="py-8 text-center text-sm text-destructive">{error}</p>
          )}

          {!loading && !error && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <History className="mb-3 size-10 text-muted-foreground/40" />
              <p className="text-sm font-medium">Nenhuma movimentação encontrada</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {typeFilter !== 'all'
                  ? 'Tente mudar o filtro de tipo.'
                  : 'Nenhuma movimentação registrada neste período.'}
              </p>
            </div>
          )}

          {!loading && !error && filtered.length > 0 && (
            <div className="divide-y divide-slate-100">
              {filtered.map((m) => {
                const style = getTypeStyle(m.movement_type, m.reference_type)
                const label = getTypeLabel(m)
                const unit = displayPart?.unit ?? m.parts?.unit ?? ''
                const desc = buildDescription(m, unit)
                const branchLabel = branches.find((b) => b.id === m.branch_id)?.name ?? ''
                const meta = [
                  formatDateTime(m.created_at),
                  m.profiles?.name,
                  branchLabel,
                ].filter(Boolean).join(' · ')

                return (
                  <div key={m.id} className="flex gap-3 py-3.5">
                    <div className="mt-1.5 shrink-0">
                      <span className={cn('block size-2 rounded-full', style.dot)} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className={cn('text-[10px] font-bold uppercase tracking-widest', style.label)}>
                        {label}
                      </div>
                      {!displayPart && m.parts?.name && (
                        <div className="mt-0.5 truncate text-xs font-semibold text-foreground">
                          {m.parts.name}
                        </div>
                      )}
                      <div className="mt-0.5 text-sm text-foreground">{desc}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">{meta}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <SheetFooter className="border-t border-border px-6 py-4 items-end">
          <SheetClose render={<Button variant="outline" />}>Fechar</SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
