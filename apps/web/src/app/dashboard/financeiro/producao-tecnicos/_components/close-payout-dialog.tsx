'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Receipt, Wrench, AlertCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { InputField } from '@/components/ui/input-field'
import { MaskedInputField } from '@/components/ui/masked-input-field'
import { cn } from '@/lib/utils'
import { createPayouts } from '@/app/actions/technician-payouts'
import type { TechnicianProductionRow } from '@/app/actions/technician-production'

interface ClosePayoutDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  rows: TechnicianProductionRow[]
  periodStart: string
  periodEnd: string
  onSuccess: () => void
}

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatIsoToBr(iso: string) {
  if (!iso) return '—'
  return iso.split('-').reverse().join('/')
}

type LineState = {
  technicianId: string
  technicianName: string
  osCount: number
  laborRate: number | null
  totalInput: string
  notes: string
  selected: boolean
}

function buildInitialLines(rows: TechnicianProductionRow[]): LineState[] {
  return rows
    .filter((r) => r.os_count > 0)
    .map((r) => ({
      technicianId: r.technician_id,
      technicianName: r.technician_name,
      osCount: r.os_count,
      laborRate: r.labor_rate,
      totalInput: r.total_labor > 0 ? formatCurrency(r.total_labor) : '',
      notes: '',
      selected: true,
    }))
}

function parseMoney(input: string): number {
  const normalized = input
    .trim()
    .replace(/R\$\s?/, '')
    .replace(/\./g, '')
    .replace(',', '.')
  const value = Number(normalized)
  return Number.isFinite(value) ? value : 0
}

export function ClosePayoutDialog({
  open,
  onOpenChange,
  rows,
  periodStart,
  periodEnd,
  onSuccess,
}: ClosePayoutDialogProps) {
  const router = useRouter()
  const [lines, setLines] = React.useState<LineState[]>(() => buildInitialLines(rows))
  const [isPending, startTransition] = React.useTransition()

  React.useEffect(() => {
    if (open) {
      setLines(buildInitialLines(rows))
    }
  }, [open, rows])

  const selectedLines = lines.filter((l) => l.selected)
  const totalSelected = selectedLines.reduce((acc, l) => acc + parseMoney(l.totalInput), 0)
  const totalOsSelected = selectedLines.reduce((acc, l) => acc + l.osCount, 0)

  const hasAny = lines.length > 0

  const handleUpdate = (id: string, patch: Partial<LineState>) => {
    setLines((prev) => prev.map((l) => (l.technicianId === id ? { ...l, ...patch } : l)))
  }

  const handleSubmit = () => {
    if (selectedLines.length === 0) {
      toast.error('Selecione ao menos um técnico.')
      return
    }

    for (const line of selectedLines) {
      const total = parseMoney(line.totalInput)
      if (!Number.isFinite(total) || total < 0) {
        toast.error(`Valor inválido para ${line.technicianName}.`)
        return
      }
      if (line.laborRate == null && total <= 0) {
        toast.error(`Informe o total a pagar para ${line.technicianName}.`)
        return
      }
    }

    startTransition(async () => {
      const result = await createPayouts({
        period_start: periodStart,
        period_end: periodEnd,
        lines: selectedLines.map((l) => ({
          technician_id: l.technicianId,
          total_amount: parseMoney(l.totalInput),
          notes: l.notes.trim() || null,
        })),
      })

      if (result?.error) {
        toast.error(result.error)
        return
      }

      const createdCount = result.created?.length ?? 0
      const skippedCount = result.skipped?.length ?? 0

      if (createdCount === 0) {
        toast.error(result.skipped?.[0]?.reason ?? 'Nenhum fechamento foi gerado.')
        return
      }

      toast.success(
        `${createdCount} fechamento${createdCount > 1 ? 's' : ''} gerado${createdCount > 1 ? 's' : ''}${
          skippedCount > 0 ? ` (${skippedCount} ignorado${skippedCount > 1 ? 's' : ''})` : ''
        }.`,
      )

      onOpenChange(false)
      onSuccess()
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="size-5 text-primary" />
            Gerar Fechamento de Produção
          </DialogTitle>
          <DialogDescription>
            Período: <span className="font-medium text-foreground">{formatIsoToBr(periodStart)}</span> a{' '}
            <span className="font-medium text-foreground">{formatIsoToBr(periodEnd)}</span>. Um recibo será gerado para
            cada técnico selecionado e o valor entrará em Contas a Pagar.
          </DialogDescription>
        </DialogHeader>

        {!hasAny ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Wrench className="size-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground max-w-sm">
              Nenhum técnico elegível no período. Verifique se há OS concluídas ainda não incluídas em outro fechamento.
            </p>
          </div>
        ) : (
          <>
            <div className="max-h-[50vh] overflow-y-auto rounded-xl border border-border divide-y divide-border">
              {lines.map((line) => (
                <div
                  key={line.technicianId}
                  className={cn(
                    'p-3 space-y-2 transition-colors',
                    line.selected ? 'bg-background' : 'bg-muted/30 opacity-70',
                  )}
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="flex flex-1 min-w-45 items-center gap-2.5 cursor-pointer">
                      <Checkbox
                        className="size-5"
                        checked={line.selected}
                        onCheckedChange={(v) =>
                          handleUpdate(line.technicianId, { selected: v === true })
                        }
                      />
                      <span className="font-medium text-foreground text-sm">
                        {line.technicianName}
                      </span>
                    </label>

                    <div className="flex items-center gap-4 text-sm">
                      <div className="text-right">
                        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">OS</div>
                        <div className="tabular-nums font-semibold">{line.osCount}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Valor/OS</div>
                        <div className="tabular-nums text-muted-foreground">
                          {line.laborRate != null ? formatCurrency(line.laborRate) : 'Manual'}
                        </div>
                      </div>
                      <div className="w-40">
                        <MaskedInputField
                          mask="money"
                          label="Total a pagar"
                          placeholder="R$ 0,00"
                          value={line.totalInput}
                          onChange={(e) =>
                            handleUpdate(line.technicianId, { totalInput: e.target.value })
                          }
                          disabled={!line.selected}
                          className="text-right h-8"
                        />
                      </div>
                    </div>
                  </div>

                  <InputField
                    placeholder="Observações do recibo (opcional)"
                    value={line.notes}
                    onChange={(e) =>
                      handleUpdate(line.technicianId, { notes: e.target.value })
                    }
                    disabled={!line.selected}
                    className="h-8 text-sm"
                  />
                </div>
              ))}
            </div>

            <div className="rounded-lg bg-muted/60 px-4 py-3 text-sm flex flex-wrap items-center justify-between gap-2">
              <span className="text-muted-foreground">
                {selectedLines.length} técnico{selectedLines.length === 1 ? '' : 's'} · {totalOsSelected} OS
              </span>
              <span className="font-semibold tabular-nums text-foreground">
                Total: {formatCurrency(totalSelected)}
              </span>
            </div>

            <p className="text-xs text-muted-foreground flex items-start gap-1.5">
              <AlertCircle className="size-3.5 shrink-0 mt-0.5 text-muted-foreground" />
              Apenas OS que ainda não foram incluídas em outro fechamento serão consideradas. O valor pode ser editado
              antes de confirmar.
            </p>
          </>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isPending || !hasAny || selectedLines.length === 0}
            className="gap-2"
          >
            <Receipt className="size-4" />
            {isPending ? 'Gerando...' : 'Gerar Fechamento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
