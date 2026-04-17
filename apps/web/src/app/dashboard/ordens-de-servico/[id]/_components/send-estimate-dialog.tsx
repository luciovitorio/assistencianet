'use client'

import * as React from 'react'
import { AlertTriangle, Clock3, Mail, MessageCircle, Send } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useRouteTransition } from '@/components/ui/route-transition-indicator'
import {
  checkEstimateSendability,
  sendEstimate,
} from '@/app/actions/service-order-estimates'

interface SendEstimateDialogProps {
  open: boolean
  onClose: (options?: { keepOnPage?: boolean }) => void
  serviceOrderId: string
  estimateId: string
  osNumber: number
  estimateVersion: number
  totalAmount: number
  validUntil: string | null
  clientName: string | null
  clientPhone: string | null
  clientEmail: string | null
}

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

const formatDate = (value: string | null) => {
  if (!value) return null
  return new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR')
}

const buildMessage = (
  clientName: string | null,
  osNumber: number,
  version: number,
  totalAmount: number,
  validUntil: string | null,
) => {
  const greeting = clientName ? `Olá, ${clientName}!` : 'Olá!'
  const validity = validUntil ? `\nVálido até: ${formatDate(validUntil)}` : ''
  return (
    `${greeting} Segue o orçamento v${version} referente à OS #${osNumber}.\n\n` +
    `Total: ${currencyFormatter.format(totalAmount)}${validity}\n\n` +
    `Para aprovar ou recusar, entre em contato conosco.`
  )
}

const buildMailtoUrl = (email: string, osNumber: number, version: number, message: string) => {
  const subject = `Orçamento v${version} — OS #${osNumber}`
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`
}

export function SendEstimateDialog({
  open,
  onClose,
  serviceOrderId,
  estimateId,
  osNumber,
  estimateVersion,
  totalAmount,
  validUntil,
  clientName,
  clientPhone,
  clientEmail,
}: SendEstimateDialogProps) {
  const { navigate } = useRouteTransition()
  const [isSending, startTransition] = React.useTransition()
  const [isChecking, startCheckTransition] = React.useTransition()
  const [validationError, setValidationError] = React.useState<string | null>(null)
  const [stockWarning, setStockWarning] = React.useState<string | null>(null)
  const [warningPartId, setWarningPartId] = React.useState<string | null>(null)
  const [warningBranchId, setWarningBranchId] = React.useState<string | null>(null)
  const message = buildMessage(clientName, osNumber, estimateVersion, totalAmount, validUntil)
  const hasWhatsApp = !!clientPhone
  const hasEmail = !!clientEmail
  const showSendButtons = !validationError && (hasWhatsApp || hasEmail)

  React.useEffect(() => {
    if (!open) return

    setValidationError(null)
    setStockWarning(null)
    setWarningPartId(null)
    setWarningBranchId(null)

    startCheckTransition(async () => {
      const result = await checkEstimateSendability(serviceOrderId, estimateId)

      if (!result.canSend) {
        setValidationError(result.error ?? 'Este orçamento não pode ser enviado no momento.')
        return
      }

      setStockWarning(result.warning ?? null)
      setWarningPartId(result.warningPartId ?? null)
      setWarningBranchId(result.warningBranchId ?? null)
    })
  }, [estimateId, open, serviceOrderId])

  const handleGoToStock = () => {
    if (!warningPartId) return

    const params = new URLSearchParams({ part: warningPartId })
    if (warningBranchId) {
      params.set('branch', warningBranchId)
    }

    navigate(`/dashboard/estoque?${params.toString()}`)
  }

  const handleClose = () => {
    onClose({ keepOnPage: !!validationError })
  }

  const handleWhatsAppSend = () => {
    startTransition(async () => {
      const result = await sendEstimate(serviceOrderId, estimateId, 'whatsapp')

      if (result?.error) {
        toast.error(result.error)
        return
      }

      toast.success('Orçamento enviado pelo WhatsApp.')
      onClose()
    })
  }

  const handleEmailSend = (url: string) => {
    const pendingWindow = window.open('', '_blank', 'noopener,noreferrer')

    startTransition(async () => {
      const result = await sendEstimate(serviceOrderId, estimateId, 'email')

      if (result?.error) {
        pendingWindow?.close()
        toast.error(result.error)
        return
      }

      if (pendingWindow) {
        pendingWindow.location.href = url
      } else {
        window.open(url, '_blank', 'noopener,noreferrer')
      }

      toast.success('Orçamento registrado para envio por e-mail.')
      onClose()
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) handleClose()
      }}
    >
      <DialogContent className="sm:max-w-md" showCloseButton>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-full bg-emerald-100">
              <Send className="size-4 text-emerald-700" />
            </div>
            <div>
              <DialogTitle>Orçamento v{estimateVersion} pronto</DialogTitle>
              <DialogDescription className="mt-0.5">
                Deseja enviar ao cliente agora?
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="rounded-xl border bg-muted/40 px-4 py-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Total</span>
            <span className="font-semibold">{currencyFormatter.format(totalAmount)}</span>
          </div>
          {validUntil && (
            <div className="mt-1.5 flex items-center justify-between">
              <span className="text-muted-foreground">Válido até</span>
              <span>{formatDate(validUntil)}</span>
            </div>
          )}
          {clientName && (
            <div className="mt-1.5 flex items-center justify-between">
              <span className="text-muted-foreground">Cliente</span>
              <span className="truncate pl-4">{clientName}</span>
            </div>
          )}
        </div>

        {validationError && (
          <Alert variant="destructive">
            <AlertTriangle className="size-4" />
            <AlertTitle>Envio bloqueado</AlertTitle>
            <AlertDescription className="space-y-3">
              <p>{validationError}</p>
            </AlertDescription>
          </Alert>
        )}

        {!validationError && stockWarning && (
          <Alert className="border-amber-200 bg-amber-50 text-amber-900">
            <AlertTriangle className="size-4 text-amber-700" />
            <AlertTitle className="text-amber-900">Enviar com pendência de estoque</AlertTitle>
            <AlertDescription className="space-y-3 text-amber-800">
              <p>{stockWarning}</p>
              {warningPartId && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full border-amber-300 bg-white text-amber-900 hover:bg-amber-100"
                  onClick={handleGoToStock}
                >
                  Ir para estoque
                </Button>
              )}
            </AlertDescription>
          </Alert>
        )}

        {!validationError && !isChecking && !hasWhatsApp && !hasEmail && (
          <p className="text-center text-sm text-muted-foreground">
            Nenhum contato cadastrado para este cliente.
          </p>
        )}

        {!validationError && isChecking ? (
          <p className="text-center text-sm text-muted-foreground">
            Verificando pendências de estoque para envio...
          </p>
        ) : showSendButtons ? (
          <div className="flex flex-col gap-2">
            {hasWhatsApp && (
            <button
              type="button"
              onClick={handleWhatsAppSend}
              disabled={isSending}
              className="flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              <MessageCircle className="size-4" />
              Enviar pelo WhatsApp
              <span className="ml-1 font-normal opacity-80">{clientPhone}</span>
            </button>
            )}

            {hasEmail && (
            <button
              type="button"
              onClick={() =>
                handleEmailSend(buildMailtoUrl(clientEmail!, osNumber, estimateVersion, message))
              }
              disabled={isSending}
              className="flex items-center justify-center gap-2 rounded-xl border border-input bg-background px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-muted"
            >
              <Mail className="size-4" />
              Enviar por e-mail
              <span className="ml-1 font-normal text-muted-foreground">{clientEmail}</span>
            </button>
            )}
          </div>
        ) : null}

        <DialogFooter>
          <DialogClose
            render={
              <Button
                variant="outline"
                className="w-full gap-2 sm:w-auto"
                onClick={handleClose}
                disabled={isSending || isChecking}
              >
                <Clock3 className="size-4" />
                {validationError ? 'Retornar ao orçamento' : 'Enviar depois'}
              </Button>
            }
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
