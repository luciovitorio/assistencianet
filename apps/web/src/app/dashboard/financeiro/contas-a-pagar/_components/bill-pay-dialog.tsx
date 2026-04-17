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
  billMarkAsPaidSchema,
  BILL_PAYMENT_METHODS,
  BILL_PAYMENT_METHOD_LABELS,
  BILL_CATEGORY_LABELS,
  type BillMarkAsPaidSchema,
  type BillCategory,
} from '@/lib/validations/bills'
import { markBillAsPaid } from '@/app/actions/bills'
import type { BillRow } from '@/app/actions/bills'

interface BillPayDialogProps {
  bill: BillRow | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function BillPayDialog({ bill, open, onOpenChange, onSuccess }: BillPayDialogProps) {
  const [isPending, startTransition] = React.useTransition()

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<BillMarkAsPaidSchema>({
    resolver: zodResolver(billMarkAsPaidSchema),
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

  const onSubmit = (data: BillMarkAsPaidSchema) => {
    if (!bill) return
    startTransition(async () => {
      try {
        const result = await markBillAsPaid(bill.id, data)
        if (result?.error) throw new Error(result.error)
        toast.success('Pagamento registrado com sucesso.')
        onSuccess()
      } catch (e: unknown) {
        toast.error((e as Error).message || 'Erro ao registrar pagamento.')
      }
    })
  }

  if (!bill) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="size-5 text-emerald-600" />
            Registrar Pagamento
          </DialogTitle>
          <DialogDescription>
            <span className="font-medium text-foreground">{bill.description}</span>
            <span className="text-muted-foreground">
              {' '}· {BILL_CATEGORY_LABELS[bill.category as BillCategory] ?? bill.category}
            </span>
          </DialogDescription>
        </DialogHeader>

        {/* Resumo do lançamento */}
        <div className="rounded-lg bg-muted/60 px-4 py-3 text-sm space-y-1">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Valor</span>
            <span className="font-semibold tabular-nums">{formatCurrency(Number(bill.amount))}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Vencimento</span>
            <span className="tabular-nums">
              {bill.due_date.split('-').reverse().join('/')}
            </span>
          </div>
          {bill.branches?.name && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Filial</span>
              <span>{bill.branches.name}</span>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-1">
          {/* Forma de pagamento */}
          <div>
            <Label className="mb-1.5 block text-sm font-medium">Forma de pagamento *</Label>
            <Controller
              control={control}
              name="payment_method"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className={errors.payment_method ? 'border-destructive' : ''}>
                    <span className="text-foreground">
                      {BILL_PAYMENT_METHOD_LABELS[field.value as keyof typeof BILL_PAYMENT_METHOD_LABELS] ?? 'Selecione'}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    {BILL_PAYMENT_METHODS.map((m) => (
                      <SelectItem key={m} value={m}>{BILL_PAYMENT_METHOD_LABELS[m]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.payment_method && (
              <p className="text-destructive mt-1 text-xs">{errors.payment_method.message}</p>
            )}
          </div>

          {/* Data do pagamento */}
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

          {/* Observações */}
          <Controller
            control={control}
            name="payment_notes"
            render={({ field }) => (
              <InputField
                label="Observações (opcional)"
                placeholder="Ex: Comprovante enviado por e-mail..."
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
            <Button type="submit" disabled={isPending} className="gap-2 cursor-pointer">
              <CheckCircle2 className="size-4" />
              {isPending ? 'Registrando...' : 'Confirmar Pagamento'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
