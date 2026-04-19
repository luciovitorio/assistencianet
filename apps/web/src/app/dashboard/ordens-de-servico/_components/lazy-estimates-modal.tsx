'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { getServiceOrderEstimatesHistory } from '@/app/actions/service-order-estimates'
import { type ServiceOrderStatus } from '@/lib/validations/service-order'
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
      <EstimatesModal
        hideSummaryCard
        open={open}
        onOpenChange={onOpenChange}
        serviceOrderId={serviceOrderId}
        serviceOrderNumber={serviceOrderNumber}
        initialEstimates={[]}
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
