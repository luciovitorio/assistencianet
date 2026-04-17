'use client'

import * as React from 'react'
import { AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { cancelServiceOrder } from '@/app/actions/service-orders'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  SERVICE_ORDER_CANCEL_REASON_OPTIONS,
  type ServiceOrderCancelReasonValue,
} from '@/lib/validations/service-order'

interface CancelServiceOrderDialogProps {
  serviceOrderId: string
  serviceOrderNumber: number
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function CancelServiceOrderDialog({
  serviceOrderId,
  serviceOrderNumber,
  open,
  onOpenChange,
  onSuccess,
}: CancelServiceOrderDialogProps) {
  const [reason, setReason] = React.useState<ServiceOrderCancelReasonValue | ''>('')
  const [details, setDetails] = React.useState('')
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  React.useEffect(() => {
    if (!open) {
      setReason('')
      setDetails('')
      setIsSubmitting(false)
    }
  }, [open])

  const needsDetails = reason === 'outro'
  const canSubmit = reason !== '' && (!needsDetails || details.trim().length > 0)
  const selectedReasonLabel =
    SERVICE_ORDER_CANCEL_REASON_OPTIONS.find((option) => option.value === reason)?.label ?? ''

  const handleSubmit = async () => {
    if (!reason) {
      toast.error('Selecione o motivo do cancelamento.')
      return
    }

    setIsSubmitting(true)
    try {
      const result = await cancelServiceOrder(serviceOrderId, { reason, details })
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success(`OS #${serviceOrderNumber} cancelada com sucesso.`)
        onSuccess?.()
        onOpenChange(false)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="size-5" />
            Cancelar Ordem de Serviço
          </DialogTitle>
          <DialogDescription>
            Informe o motivo do cancelamento da <strong>OS #{serviceOrderNumber}</strong>. Essa
            informação ficará registrada no histórico da OS.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cancel-reason">Motivo</Label>
            <Select
              value={reason}
              onValueChange={(value) => setReason(value as ServiceOrderCancelReasonValue)}
            >
              <SelectTrigger id="cancel-reason" className="w-full">
                <SelectValue placeholder="Selecione o motivo">
                  {selectedReasonLabel}
                </SelectValue>
              </SelectTrigger>
              <SelectContent align="start" className="min-w-[28rem]">
                {SERVICE_ORDER_CANCEL_REASON_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {needsDetails && (
            <div className="space-y-2">
              <Label htmlFor="cancel-details">Descreva o motivo</Label>
              <Textarea
                id="cancel-details"
                value={details}
                onChange={(event) => setDetails(event.target.value)}
                placeholder="Explique o motivo do cancelamento"
                className="min-h-28"
              />
            </div>
          )}
        </div>

        <DialogFooter className="mt-4 gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Voltar
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleSubmit}
            disabled={isSubmitting || !canSubmit}
          >
            {isSubmitting ? 'Cancelando...' : 'Confirmar cancelamento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
