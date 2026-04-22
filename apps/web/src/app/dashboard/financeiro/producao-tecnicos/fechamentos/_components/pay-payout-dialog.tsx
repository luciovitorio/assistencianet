'use client'

import * as React from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { CheckCircle2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { DatePickerField } from '@/components/ui/date-picker-field'
import { InputField } from '@/components/ui/input-field'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import {
  payoutMarkAsPaidSchema,
  PAYOUT_PAYMENT_METHODS,
  PAYOUT_PAYMENT_METHOD_LABELS,
  type PayoutMarkAsPaidSchema,
} from '@/lib/validations/technician-payout'
import { markPayoutPaid, type PayoutRow } from '@/app/actions/technician-payouts'

interface PayPayoutDialogProps {
  payout: PayoutRow | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function PayPayoutDialog({ payout, open, onOpenChange, onSuccess }: PayPayoutDialogProps) {
  const [isPending, startTransition] = React.useTransition()

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PayoutMarkAsPaidSchema>({
    resolver: zodResolver(payoutMarkAsPaidSchema),
    defaultValues: {
      payment_method: 'pix',
      paid_at: new Date().toISOString().slice(0, 10),
      payment_notes: '',
    },
  })

  React.useEffect(() => {
    if (open) {
      reset({
        payment_method: 'pix',
        paid_at: new Date().toISOString().slice(0, 10),
        payment_notes: '',
      })
    }
  }, [open, reset])

  const onSubmit = (data: PayoutMarkAsPaidSchema) => {
    if (!payout) return
    startTransition(async () => {
      const result = await markPayoutPaid(payout.id, data)
      if (result?.error) {
        toast.error(result.error)
        return
      }
      toast.success('Pagamento registrado com sucesso.')
      onSuccess()
    })
  }

  if (!payout) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="size-5 text-emerald-600" />
            Registrar Pagamento
          </DialogTitle>
          <DialogDescription>
            Recibo <span className="font-medium text-foreground">{payout.receipt_number}</span> · Técnico{' '}
            <span className="font-medium text-foreground">{payout.technician_name}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg bg-muted/60 px-4 py-3 text-sm space-y-1">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Valor</span>
            <span className="font-semibold tabular-nums">{formatCurrency(payout.total_amount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Período</span>
            <span className="tabular-nums">
              {payout.period_start.split('-').reverse().join('/')} →{' '}
              {payout.period_end.split('-').reverse().join('/')}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">OS incluídas</span>
            <span>{payout.os_count}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-1">
          <div>
            <Label className="mb-1.5 block text-sm font-medium">Forma de pagamento *</Label>
            <Controller
              control={control}
              name="payment_method"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className={errors.payment_method ? 'border-destructive' : ''}>
                    <span className="text-foreground">
                      {PAYOUT_PAYMENT_METHOD_LABELS[
                        field.value as keyof typeof PAYOUT_PAYMENT_METHOD_LABELS
                      ] ?? 'Selecione'}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    {PAYOUT_PAYMENT_METHODS.map((m) => (
                      <SelectItem key={m} value={m}>
                        {PAYOUT_PAYMENT_METHOD_LABELS[m]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.payment_method && (
              <p className="text-destructive mt-1 text-xs">{errors.payment_method.message}</p>
            )}
          </div>

          <Controller
            control={control}
            name="paid_at"
            render={({ field }) => (
              <DatePickerField
                label="Data do pagamento *"
                placeholder="Selecione a data"
                value={field.value}
                onChange={field.onChange}
                error={errors.paid_at?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="payment_notes"
            render={({ field }) => (
              <InputField
                label="Observações (opcional)"
                placeholder="Ex: Pago via transferência..."
                error={errors.payment_notes?.message}
                {...field}
                value={field.value ?? ''}
              />
            )}
          />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending} className="gap-2">
              <CheckCircle2 className="size-4" />
              {isPending ? 'Registrando...' : 'Confirmar Pagamento'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
