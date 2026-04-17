'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Building2, CheckCircle2, XCircle } from 'lucide-react'
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
import { cn } from '@/lib/utils'
import {
  returnFromThirdPartySchema,
  type ReturnFromThirdPartySchema,
} from '@/lib/validations/third-party'
import { returnFromThirdParty } from '@/app/actions/service-orders'

interface ReturnFromThirdPartyDialogProps {
  serviceOrderId: string
  serviceOrderNumber: number
  thirdPartyName: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ReturnFromThirdPartyDialog({
  serviceOrderId,
  serviceOrderNumber,
  thirdPartyName,
  open,
  onOpenChange,
}: ReturnFromThirdPartyDialogProps) {
  const router = useRouter()
  const [isPending, startTransition] = React.useTransition()

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<ReturnFromThirdPartySchema>({
    resolver: zodResolver(returnFromThirdPartySchema),
    defaultValues: {
      outcome: undefined,
      third_party_notes: '',
    },
  })

  React.useEffect(() => {
    if (open) {
      reset({ outcome: undefined, third_party_notes: '' })
    }
  }, [open, reset])

  const outcome = watch('outcome')

  const onSubmit = (data: ReturnFromThirdPartySchema) => {
    startTransition(async () => {
      try {
        const result = await returnFromThirdParty(serviceOrderId, data)
        if (result?.error) throw new Error(result.error)
        const label = data.outcome === 'pronto' ? 'voltou para análise' : 'encerrada — sem reparo viável'
        toast.success(`OS #${serviceOrderNumber}: retorno registrado — ${label}.`)
        router.refresh()
        onOpenChange(false)
      } catch (error: unknown) {
        toast.error((error as Error).message || 'Erro ao registrar retorno.')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[32rem]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="size-5 text-indigo-600" />
            Registrar Retorno do Terceiro
          </DialogTitle>
          <DialogDescription>
            {thirdPartyName
              ? `O equipamento retornou de "${thirdPartyName}". Informe o resultado.`
              : 'O equipamento retornou da terceirizada. Informe o resultado.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 py-2" id="return-form">
          <div>
            <Label className="mb-2 block text-sm font-medium">Resultado do serviço *</Label>
            <Controller
              control={control}
              name="outcome"
              render={({ field }) => (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => field.onChange('pronto')}
                    className={cn(
                      'flex flex-col items-center gap-2 rounded-lg border-2 p-4 text-sm font-medium transition-colors',
                      field.value === 'pronto'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                        : 'border-border text-muted-foreground hover:border-emerald-300',
                    )}
                  >
                    <CheckCircle2 className="size-6" />
                    Retornou consertado
                    <span className="text-xs font-normal text-center">
                      Volta para análise — orçamento e aprovação do cliente
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => field.onChange('reprovado')}
                    className={cn(
                      'flex flex-col items-center gap-2 rounded-lg border-2 p-4 text-sm font-medium transition-colors',
                      field.value === 'reprovado'
                        ? 'border-rose-500 bg-rose-50 text-rose-700'
                        : 'border-border text-muted-foreground hover:border-rose-300',
                    )}
                  >
                    <XCircle className="size-6" />
                    Sem reparo
                    <span className="text-xs font-normal text-center">
                      Não foi possível reparar — OS será encerrada
                    </span>
                  </button>
                </div>
              )}
            />
            {errors.outcome && (
              <p className="text-destructive text-xs mt-2">{errors.outcome.message}</p>
            )}
          </div>

          <Controller
            control={control}
            name="third_party_notes"
            render={({ field }) => (
              <div className="space-y-1.5">
                <Label>Observações do retorno</Label>
                <Textarea
                  placeholder="Laudo técnico, código de defeito, parecer do fabricante, etc."
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
            form="return-form"
            disabled={isPending || !outcome}
            loading={isPending}
          >
            Confirmar Retorno
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
