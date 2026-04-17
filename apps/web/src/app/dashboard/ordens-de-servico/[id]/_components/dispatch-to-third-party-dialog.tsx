'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Building2, Clock } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { InputField } from '@/components/ui/input-field'
import {
  dispatchToThirdPartySchema,
  type DispatchToThirdPartySchema,
} from '@/lib/validations/third-party'
import { THIRD_PARTY_TYPE_LABELS, type ThirdPartyType } from '@/lib/validations/third-party'
import { dispatchToThirdParty } from '@/app/actions/service-orders'

export interface ThirdPartyOption {
  id: string
  name: string
  type: string
  default_return_days: number | null
}

interface DispatchToThirdPartyDialogProps {
  serviceOrderId: string
  serviceOrderNumber: number
  thirdParties: ThirdPartyOption[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

function addDaysToToday(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

export function DispatchToThirdPartyDialog({
  serviceOrderId,
  serviceOrderNumber,
  thirdParties,
  open,
  onOpenChange,
}: DispatchToThirdPartyDialogProps) {
  const router = useRouter()
  const [isPending, startTransition] = React.useTransition()

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<DispatchToThirdPartySchema>({
    resolver: zodResolver(dispatchToThirdPartySchema),
    defaultValues: {
      third_party_id: '',
      third_party_expected_return_at: '',
      third_party_notes: '',
    },
  })

  React.useEffect(() => {
    if (open) {
      reset({ third_party_id: '', third_party_expected_return_at: '', third_party_notes: '' })
    }
  }, [open, reset])

  const selectedThirdPartyId = watch('third_party_id')
  const selectedThirdParty = thirdParties.find((tp) => tp.id === selectedThirdPartyId)

  // Auto-preenche a data prevista quando seleciona terceirizada com prazo padrão
  const handleThirdPartyChange = (value: string) => {
    setValue('third_party_id', value)
    const tp = thirdParties.find((t) => t.id === value)
    if (tp?.default_return_days) {
      setValue('third_party_expected_return_at', addDaysToToday(tp.default_return_days), {
        shouldValidate: false,
      })
    }
  }

  const onSubmit = (data: DispatchToThirdPartySchema) => {
    startTransition(async () => {
      try {
        const result = await dispatchToThirdParty(serviceOrderId, data)
        if (result?.error) throw new Error(result.error)
        toast.success(`OS #${serviceOrderNumber}: equipamento enviado para terceiro.`)
        router.refresh()
        onOpenChange(false)
      } catch (error: unknown) {
        toast.error((error as Error).message || 'Erro ao enviar para terceiro.')
      }
    })
  }

  const activeThirdParties = thirdParties.filter((tp) => tp)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[32rem]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="size-5 text-indigo-600" />
            Enviar para Terceiro
          </DialogTitle>
          <DialogDescription>
            Selecione a terceirizada e informe a data prevista de retorno do equipamento.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2" id="dispatch-form">
          <div>
            <Label className="mb-1.5 block text-sm font-medium">Terceirizada *</Label>
            <Controller
              control={control}
              name="third_party_id"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(value) => {
                    field.onChange(value ?? '')
                    if (value) handleThirdPartyChange(value)
                  }}
                >
                  <SelectTrigger className={errors.third_party_id ? 'border-destructive' : ''}>
                    <span className={field.value ? 'text-foreground' : 'text-muted-foreground'}>
                      {field.value
                        ? (activeThirdParties.find((tp) => tp.id === field.value)?.name ?? 'Selecione')
                        : 'Selecione a terceirizada'}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    {activeThirdParties.length === 0 ? (
                      <div className="p-3 text-sm text-muted-foreground text-center">
                        Nenhuma terceirizada ativa cadastrada.
                      </div>
                    ) : (
                      activeThirdParties.map((tp) => (
                        <SelectItem key={tp.id} value={tp.id}>
                          <div className="flex items-center gap-2">
                            <span>{tp.name}</span>
                            <span className="text-xs text-muted-foreground">
                              ({THIRD_PARTY_TYPE_LABELS[tp.type as ThirdPartyType] ?? tp.type})
                            </span>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.third_party_id && (
              <p className="text-destructive text-xs mt-1">{errors.third_party_id.message}</p>
            )}
            {selectedThirdParty?.default_return_days && (
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <Clock className="size-3" />
                Prazo padrão desta terceirizada: {selectedThirdParty.default_return_days} dias
              </p>
            )}
          </div>

          <Controller
            control={control}
            name="third_party_expected_return_at"
            render={({ field }) => (
              <InputField
                label="Data prevista de retorno *"
                type="date"
                error={errors.third_party_expected_return_at?.message}
                {...field}
              />
            )}
          />

          <Controller
            control={control}
            name="third_party_notes"
            render={({ field }) => (
              <div className="space-y-1.5">
                <Label>Observações</Label>
                <Textarea
                  placeholder="Número de protocolo, instruções de envio, etc."
                  className={errors.third_party_notes ? 'border-destructive' : ''}
                  {...field}
                  value={field.value || ''}
                />
                {errors.third_party_notes && (
                  <p className="text-destructive text-xs">{errors.third_party_notes.message}</p>
                )}
              </div>
            )}
          />
        </form>

        <DialogFooter className="gap-2">
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
            form="dispatch-form"
            disabled={isPending || activeThirdParties.length === 0}
            loading={isPending}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            Enviar para Terceiro
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
