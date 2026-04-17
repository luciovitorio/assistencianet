'use client'

import * as React from 'react'
import { useForm, Controller, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { ArrowRightLeft } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { InputField } from '@/components/ui/input-field'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import {
  stockTransferenciaSchema,
  type StockTransferenciaSchema,
} from '@/lib/validations/stock'
import { createStockTransferencia } from '@/app/actions/stock'
import type { PartRow, BranchOption } from './stock-list'

type TransferenciaFormValues = Omit<StockTransferenciaSchema, 'quantity'> & {
  quantity: string | number
}

interface TransferenciaDialogProps {
  part: PartRow | null
  branches: BranchOption[]
  initialFromBranchId: string
  stockByPartBranch: Record<string, number>
  reservedByPartBranch: Record<string, number>
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

function getAvailableStock(
  stockByPartBranch: Record<string, number>,
  reservedByPartBranch: Record<string, number>,
  partId: string,
  branchId: string,
): number {
  const physical = stockByPartBranch[`${partId}:${branchId}`] ?? 0
  const reserved = reservedByPartBranch[`${partId}:${branchId}`] ?? 0
  return physical - reserved
}

export function TransferenciaDialog({
  part,
  branches,
  initialFromBranchId,
  stockByPartBranch,
  reservedByPartBranch,
  open,
  onOpenChange,
  onSuccess,
}: TransferenciaDialogProps) {
  const [isPending, startTransition] = React.useTransition()

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<TransferenciaFormValues>({
    resolver: zodResolver(stockTransferenciaSchema) as unknown as Resolver<TransferenciaFormValues>,
    defaultValues: {
      part_id: part?.id ?? '',
      from_branch_id: initialFromBranchId,
      to_branch_id: '',
      quantity: '',
      notes: '',
    },
  })

  React.useEffect(() => {
    reset({
      part_id: part?.id ?? '',
      from_branch_id: initialFromBranchId,
      to_branch_id: '',
      quantity: '',
      notes: '',
    })
  }, [part?.id, initialFromBranchId, open, reset])

  const watchedFromBranchId = watch('from_branch_id')
  const watchedToBranchId = watch('to_branch_id')

  // Ao trocar filial de origem, limpa destino se for igual
  React.useEffect(() => {
    if (watchedToBranchId && watchedToBranchId === watchedFromBranchId) {
      setValue('to_branch_id', '')
    }
  }, [watchedFromBranchId, watchedToBranchId, setValue])

  const availableStock = part
    ? getAvailableStock(stockByPartBranch, reservedByPartBranch, part.id, watchedFromBranchId)
    : 0

  const destinationBranches = branches.filter((b) => b.id !== watchedFromBranchId)

  const onSubmit = (data: TransferenciaFormValues) => {
    startTransition(async () => {
      try {
        const result = await createStockTransferencia(data)
        if (result?.error) throw new Error(result.error)
        toast.success('Transferência realizada com sucesso.')
        onSuccess()
      } catch (e: unknown) {
        toast.error((e as Error).message || 'Erro ao realizar transferência.')
      }
    })
  }

  if (!part) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="size-5 text-primary" />
            Transferir entre filiais
          </DialogTitle>
          <DialogDescription>
            <span className="font-medium text-foreground">{part.name}</span>
            {part.sku && <span className="text-muted-foreground"> · SKU {part.sku}</span>}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          {/* Filial de origem */}
          <div>
            <Label className="mb-1.5 block text-sm font-medium">Filial de origem *</Label>
            <Controller
              control={control}
              name="from_branch_id"
              render={({ field }) => {
                const selected = branches.find((b) => b.id === field.value)
                return (
                  <Select
                    value={field.value}
                    onValueChange={(v) => field.onChange(v)}
                  >
                    <SelectTrigger className={errors.from_branch_id ? 'border-destructive' : ''}>
                      <span className={field.value ? 'text-foreground' : 'text-muted-foreground'}>
                        {selected ? selected.name : 'Selecione a filial de origem'}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )
              }}
            />
            {errors.from_branch_id && (
              <p className="text-destructive mt-1 text-xs">{errors.from_branch_id.message}</p>
            )}
          </div>

          {/* Saldo disponível na origem */}
          {watchedFromBranchId && (
            <div className="rounded-lg bg-muted/60 px-4 py-3 text-sm">
              <span className="text-muted-foreground">Disponível para transferir: </span>
              <span className={`font-semibold tabular-nums ${availableStock <= 0 ? 'text-destructive' : ''}`}>
                {availableStock} {part.unit}
              </span>
              {availableStock <= 0 && (
                <p className="mt-1 text-xs text-destructive">
                  Sem saldo disponível nesta filial. Peças reservadas não podem ser transferidas.
                </p>
              )}
            </div>
          )}

          {/* Filial de destino */}
          <div>
            <Label className="mb-1.5 block text-sm font-medium">Filial de destino *</Label>
            <Controller
              control={control}
              name="to_branch_id"
              render={({ field }) => {
                const selected = destinationBranches.find((b) => b.id === field.value)
                return (
                  <Select
                    value={field.value}
                    onValueChange={(v) => field.onChange(v)}
                    disabled={destinationBranches.length === 0}
                  >
                    <SelectTrigger className={errors.to_branch_id ? 'border-destructive' : ''}>
                      <span className={field.value ? 'text-foreground' : 'text-muted-foreground'}>
                        {selected ? selected.name : 'Selecione a filial de destino'}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      {destinationBranches.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )
              }}
            />
            {errors.to_branch_id && (
              <p className="text-destructive mt-1 text-xs">{errors.to_branch_id.message}</p>
            )}
          </div>

          {/* Quantidade */}
          <Controller
            control={control}
            name="quantity"
            render={({ field }) => (
              <InputField
                label={`Quantidade a transferir *`}
                type="number"
                min={1}
                max={availableStock > 0 ? availableStock : undefined}
                step={1}
                placeholder="0"
                error={errors.quantity?.message}
                disabled={availableStock <= 0}
                helper={availableStock > 0 ? `Máximo: ${availableStock} ${part.unit}` : undefined}
                {...field}
                value={String(field.value ?? '')}
                onChange={(e) => field.onChange(e.target.value)}
              />
            )}
          />

          {/* Observações */}
          <Controller
            control={control}
            name="notes"
            render={({ field }) => (
              <InputField
                label="Motivo / observações (opcional)"
                placeholder="Ex: Redistribuição para atender demanda da filial centro..."
                error={errors.notes?.message}
                {...field}
                value={field.value ?? ''}
              />
            )}
          />

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
              type="submit"
              disabled={isPending || availableStock <= 0}
              className="gap-2 cursor-pointer"
            >
              <ArrowRightLeft className="size-4" />
              {isPending ? 'Transferindo...' : 'Confirmar Transferência'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
