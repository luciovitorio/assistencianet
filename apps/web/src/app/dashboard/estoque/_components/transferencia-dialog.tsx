'use client'

import * as React from 'react'
import { useForm, Controller, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { ArrowRightLeft } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { StepperInput } from '@/components/ui/stepper-input'
import { cn } from '@/lib/utils'
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
  parts: PartRow[]
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
  parts,
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
      quantity: 1,
      notes: '',
    },
  })

  React.useEffect(() => {
    reset({
      part_id: part?.id ?? '',
      from_branch_id: initialFromBranchId,
      to_branch_id: '',
      quantity: 1,
      notes: '',
    })
  }, [part?.id, initialFromBranchId, open, reset])

  const watchedPartId = watch('part_id')
  const watchedFromBranchId = watch('from_branch_id')
  const watchedToBranchId = watch('to_branch_id')
  React.useEffect(() => {
    if (watchedToBranchId && watchedToBranchId === watchedFromBranchId) {
      setValue('to_branch_id', '')
    }
  }, [watchedFromBranchId, watchedToBranchId, setValue])

  const currentPart = parts.find((p) => p.id === watchedPartId) ?? null

  const availableStock =
    watchedPartId && watchedFromBranchId
      ? getAvailableStock(stockByPartBranch, reservedByPartBranch, watchedPartId, watchedFromBranchId)
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="size-4 text-muted-foreground" />
            Transferir entre filiais
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Peça */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Peça</Label>
            <Controller
              control={control}
              name="part_id"
              render={({ field }) => {
                const selected = parts.find((p) => p.id === field.value)
                return (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className={cn('w-full', errors.part_id && 'border-destructive')}>
                      <span className={field.value ? 'text-foreground' : 'text-muted-foreground'}>
                        {selected
                          ? `${selected.name}${selected.sku ? ` — ${selected.sku}` : ''}`
                          : 'Selecione a peça'}
                      </span>
                    </SelectTrigger>
                    <SelectContent side="bottom">
                      {parts.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                          {p.sku && <span className="text-muted-foreground"> — {p.sku}</span>}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )
              }}
            />
            {errors.part_id && (
              <p className="text-destructive text-xs">{errors.part_id.message}</p>
            )}
          </div>

          {/* Filial de origem + destino lado a lado */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Filial de origem</Label>
              <Controller
                control={control}
                name="from_branch_id"
                render={({ field }) => {
                  const selected = branches.find((b) => b.id === field.value)
                  return (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className={cn('w-full', errors.from_branch_id && 'border-destructive')}>
                        <span className={field.value ? 'text-foreground truncate' : 'text-muted-foreground'}>
                          {selected ? selected.name : 'Origem'}
                        </span>
                      </SelectTrigger>
                      <SelectContent side="bottom">
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
                <p className="text-destructive text-xs">{errors.from_branch_id.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Filial de destino</Label>
              <Controller
                control={control}
                name="to_branch_id"
                render={({ field }) => {
                  const selected = destinationBranches.find((b) => b.id === field.value)
                  return (
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={destinationBranches.length === 0}
                    >
                      <SelectTrigger className={cn('w-full', errors.to_branch_id && 'border-destructive')}>
                        <span className={field.value ? 'text-foreground truncate' : 'text-muted-foreground'}>
                          {selected ? selected.name : 'Destino'}
                        </span>
                      </SelectTrigger>
                      <SelectContent side="bottom">
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
                <p className="text-destructive text-xs">{errors.to_branch_id.message}</p>
              )}
            </div>
          </div>

          {/* Quantidade com stepper */}
          <Controller
            control={control}
            name="quantity"
            render={({ field }) => (
              <StepperInput
                label="Quantidade"
                value={field.value ?? 1}
                onChange={field.onChange}
                min={1}
                max={availableStock > 0 ? availableStock : 0}
                disabled={availableStock <= 0}
                helper={
                  watchedFromBranchId && watchedPartId
                    ? availableStock <= 0
                      ? 'Sem saldo disponível nesta filial.'
                      : `Disponível na origem: ${availableStock} ${currentPart?.unit ?? 'unid.'}`
                    : undefined
                }
                error={errors.quantity?.message}
              />
            )}
          />

          {/* Motivo */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Motivo (opcional)</Label>
            <Controller
              control={control}
              name="notes"
              render={({ field }) => (
                <input
                  placeholder="Ex: reposição para campanha"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-ring disabled:opacity-50"
                  {...field}
                  value={field.value ?? ''}
                />
              )}
            />
            {errors.notes && (
              <p className="text-destructive text-xs">{errors.notes.message}</p>
            )}
          </div>

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
              disabled={isPending || availableStock <= 0 || !watchedPartId}
              className="gap-2 cursor-pointer"
            >
              <ArrowRightLeft className="size-4" />
              {isPending ? 'Transferindo...' : 'Confirmar transferência'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
