'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { getServiceOrderEstimatesHistory } from '@/app/actions/service-order-estimates'
import { type ServiceOrderStatus } from '@/lib/validations/service-order'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { EstimatesModal } from '../[id]/_components/estimates-modal'
import { type ServiceOrderEstimateRecord } from '../[id]/_components/service-order-estimates-panel'

interface LazyEstimatesModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  serviceOrderId: string
  serviceOrderNumber: number
  serviceOrderStatus: ServiceOrderStatus
  clientName: string | null
  clientPhone: string | null
  clientEmail: string | null
}

export function LazyEstimatesModal({
  open,
  onOpenChange,
  serviceOrderId,
  serviceOrderNumber,
  serviceOrderStatus,
  clientName,
  clientPhone,
  clientEmail,
}: LazyEstimatesModalProps) {
  const [estimates, setEstimates] = React.useState<ServiceOrderEstimateRecord[] | null>(null)
  const [loading, setLoading] = React.useState(false)

  React.useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    setEstimates(null)
    getServiceOrderEstimatesHistory(serviceOrderId)
      .then((result) => {
        if (cancelled) return
        if (result?.error) {
          toast.error(result.error)
          setEstimates([])
          return
        }
        setEstimates(result?.data ?? [])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, serviceOrderId])

  if (!open) return null

  if (loading || estimates === null) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden p-0 sm:max-w-[min(96vw,88rem)]">
          <DialogHeader className="border-b px-6 py-4">
            <DialogTitle>Histórico de orçamentos</DialogTitle>
            <DialogDescription>
              OS #{serviceOrderNumber}. Consulte versões, status e itens já enviados ao cliente.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-1 flex-col gap-3 px-6 py-5">
            <div className="h-24 animate-pulse rounded-xl bg-muted" />
            <div className="h-24 animate-pulse rounded-xl bg-muted" />
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <EstimatesModal
      hideSummaryCard
      open={open}
      onOpenChange={onOpenChange}
      serviceOrderId={serviceOrderId}
      serviceOrderNumber={serviceOrderNumber}
      initialEstimates={estimates}
      catalogServices={[]}
      catalogParts={[]}
      stockAvailability={{}}
      defaultWarrantyDays={0}
      defaultEstimateValidityDays={0}
      serviceOrderStatus={serviceOrderStatus}
      clientName={clientName}
      clientPhone={clientPhone}
      clientEmail={clientEmail}
    />
  )
}
