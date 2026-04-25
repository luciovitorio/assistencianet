'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Building2, CheckCircle2, Printer, ThumbsDown, ThumbsUp, Truck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRouteTransition } from '@/components/ui/route-transition-indicator'
import {
  registerClientResponse,
  registerManualClientResponse,
  updateServiceOrderPaymentStatus,
  updateServiceOrderStatus,
} from '@/app/actions/service-orders'
import {
  PAYMENT_STATUS_COLORS,
  PAYMENT_STATUS_LABELS,
  STATUS_COLORS,
  STATUS_LABELS,
  type PaymentStatus,
  type ServiceOrderStatus,
} from '@/lib/validations/service-order'
import { cn } from '@/lib/utils'
import { ServiceOrderPickupSheet } from '../../_components/service-order-pickup-sheet'
import {
  DispatchToThirdPartyDialog,
  type ThirdPartyOption,
} from './dispatch-to-third-party-dialog'
import { ReturnFromThirdPartyDialog } from './return-from-third-party-dialog'

interface ServiceOrderActionsProps {
  serviceOrderId: string
  serviceOrderNumber: number
  status: ServiceOrderStatus
  paymentStatus: PaymentStatus
  estimatesTabHref: string
  clientName: string | null
  approvedEstimateTotal: number | null
  receiptCashEntryId: string | null
  thirdParties: ThirdPartyOption[]
  currentThirdPartyName: string | null
  hasSentEstimate: boolean
  hasDraftEstimate: boolean
  clientPhone: string | null
  clientEmail: string | null
}

const DISPATCHABLE_STATUSES: ServiceOrderStatus[] = ['aguardando', 'em_analise', 'aprovado', 'aguardando_peca']

export function ServiceOrderActions({
  serviceOrderId,
  serviceOrderNumber,
  status,
  paymentStatus,
  estimatesTabHref,
  clientName,
  approvedEstimateTotal,
  receiptCashEntryId,
  thirdParties,
  currentThirdPartyName,
  hasSentEstimate,
  hasDraftEstimate,
  clientPhone,
  clientEmail,
}: ServiceOrderActionsProps) {
  const router = useRouter()
  const { navigate } = useRouteTransition()
  const [isPending, startTransition] = React.useTransition()
  const [pickupSheetOpen, setPickupSheetOpen] = React.useState(false)
  const [dispatchOpen, setDispatchOpen] = React.useState(false)
  const [returnOpen, setReturnOpen] = React.useState(false)
  const hasClientDigitalContact = Boolean(clientPhone?.trim() || clientEmail?.trim())
  const canRegisterManualResponse =
    !hasClientDigitalContact &&
    hasDraftEstimate &&
    ['aguardando', 'em_analise', 'reprovado', 'enviado_terceiro'].includes(status)

  const handleReceiptReprint = () => {
    if (!receiptCashEntryId) {
      return
    }

    window.open(
      `/recibos/os/${receiptCashEntryId}?autoPrint=1`,
      '_blank',
      'noopener,noreferrer',
    )
  }

  const handleClientResponse = (response: 'aprovado' | 'reprovado') => {
    startTransition(async () => {
      const result = await registerClientResponse(serviceOrderId, response)
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success(
          response === 'aprovado'
            ? `OS #${serviceOrderNumber}: orçamento aprovado pelo cliente.`
            : `OS #${serviceOrderNumber}: orçamento recusado pelo cliente.`
        )
        router.refresh()
      }
    })
  }

  const handleManualClientResponse = (response: 'aprovado' | 'reprovado') => {
    startTransition(async () => {
      const result = await registerManualClientResponse(serviceOrderId, response)
      if (result?.error) {
        toast.error(result.error)
      } else {
        const label =
          result?.message ??
          (response === 'aprovado'
            ? 'orçamento aprovado manualmente pelo cliente'
            : 'orçamento recusado manualmente pelo cliente')
        toast.success(`OS #${serviceOrderNumber}: ${label}.`)
        router.refresh()
      }
    })
  }

  const handleMarkAsReady = () => {
    startTransition(async () => {
      const result = await updateServiceOrderStatus(serviceOrderId, 'pronto')
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success(`OS #${serviceOrderNumber}: marcada como pronta para retirada.`)
        router.refresh()
      }
    })
  }

  const handlePaymentChange = (nextPaymentStatus: PaymentStatus) => {
    startTransition(async () => {
      const result = await updateServiceOrderPaymentStatus(serviceOrderId, nextPaymentStatus)
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success(`OS #${serviceOrderNumber}: pagamento registrado como ${PAYMENT_STATUS_LABELS[nextPaymentStatus]}.`)
        router.refresh()
      }
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Badge de status operacional */}
      <span
        className={cn(
          'inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider',
          STATUS_COLORS[status] ?? 'bg-muted text-muted-foreground',
        )}
      >
        {STATUS_LABELS[status] ?? status}
      </span>

      {/* Badge de pagamento */}
      {(status === 'pronto' || status === 'finalizado' || paymentStatus !== 'pendente') && (
        <span
          className={cn(
            'inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider',
            PAYMENT_STATUS_COLORS[paymentStatus] ?? 'bg-muted text-muted-foreground',
          )}
        >
          {PAYMENT_STATUS_LABELS[paymentStatus] ?? paymentStatus}
        </span>
      )}

      {/* Ações contextuais por status */}

      {(status === 'aguardando_aprovacao' ||
        (status === 'enviado_terceiro' && hasSentEstimate)) && (
        <>
          <Button
            size="sm"
            disabled={isPending}
            onClick={() => handleClientResponse('aprovado')}
            className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
          >
            <ThumbsUp className="size-3.5" />
            Cliente aprovou
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={() => handleClientResponse('reprovado')}
            className="gap-1.5 border-rose-200 text-rose-700 hover:bg-rose-50"
          >
            <ThumbsDown className="size-3.5" />
            Cliente reprovou
          </Button>
        </>
      )}

      {canRegisterManualResponse && (
        <>
          <Button
            size="sm"
            disabled={isPending}
            onClick={() => handleManualClientResponse('aprovado')}
            className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
          >
            <ThumbsUp className="size-3.5" />
            Aceite manual
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={() => handleManualClientResponse('reprovado')}
            className="gap-1.5 border-rose-200 text-rose-700 hover:bg-rose-50"
          >
            <ThumbsDown className="size-3.5" />
            Recusa manual
          </Button>
        </>
      )}

      {DISPATCHABLE_STATUSES.includes(status) && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setDispatchOpen(true)}
          className="gap-1.5 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
        >
          <Building2 className="size-3.5" />
          Enviar p/ terceiro
        </Button>
      )}

      {status === 'enviado_terceiro' && (
        <Button
          size="sm"
          onClick={() => setReturnOpen(true)}
          className="gap-1.5 bg-indigo-600 text-white hover:bg-indigo-700"
        >
          <Building2 className="size-3.5" />
          Registrar retorno
        </Button>
      )}

      {status === 'reprovado' && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(estimatesTabHref)}
          className="gap-1.5"
        >
          Novo orçamento
        </Button>
      )}

      {status === 'aprovado' && (
        <Button
          size="sm"
          disabled={isPending}
          onClick={handleMarkAsReady}
          className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
        >
          <CheckCircle2 className="size-3.5" />
          Marcar como pronto
        </Button>
      )}

      {status === 'pronto' && (
        <Button
          size="sm"
          disabled={isPending}
          onClick={() => setPickupSheetOpen(true)}
          className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
        >
          <Truck className="size-3.5" />
          Registrar retirada
        </Button>
      )}

      {status === 'finalizado' && paymentStatus === 'pendente' && (
        <Button
          size="sm"
          disabled={isPending}
          onClick={() => handlePaymentChange('pago')}
          className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
        >
          <CheckCircle2 className="size-3.5" />
          Registrar pagamento
        </Button>
      )}

      {status === 'finalizado' && receiptCashEntryId && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleReceiptReprint}
          className="gap-1.5"
        >
          <Printer className="size-3.5" />
          Reimprimir recibo
        </Button>
      )}

      <ServiceOrderPickupSheet
        open={pickupSheetOpen}
        onOpenChange={setPickupSheetOpen}
        serviceOrderId={serviceOrderId}
        serviceOrderNumber={serviceOrderNumber}
        clientName={clientName}
        amountDue={approvedEstimateTotal}
        onSuccess={() => router.refresh()}
      />

      <DispatchToThirdPartyDialog
        serviceOrderId={serviceOrderId}
        serviceOrderNumber={serviceOrderNumber}
        thirdParties={thirdParties}
        open={dispatchOpen}
        onOpenChange={setDispatchOpen}
      />

      <ReturnFromThirdPartyDialog
        serviceOrderId={serviceOrderId}
        serviceOrderNumber={serviceOrderNumber}
        thirdPartyName={currentThirdPartyName}
        open={returnOpen}
        onOpenChange={setReturnOpen}
      />

    </div>
  )
}
