'use client'

import * as React from 'react'
import { FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import {
  SERVICE_ORDER_ESTIMATE_STATUS_COLORS,
  SERVICE_ORDER_ESTIMATE_STATUS_LABELS,
} from '@/lib/validations/service-order-estimate'
import { type ServiceOrderStatus } from '@/lib/validations/service-order'
import {
  ServiceOrderEstimatesPanel,
  type ServiceOrderEstimateRecord,
} from './service-order-estimates-panel'

interface CatalogServiceEntry {
  id: string
  name: string
  price: number | null
}

interface CatalogPartEntry {
  id: string
  name: string
  sale_price: number | null
}

interface EstimatesModalProps {
  serviceOrderId: string
  serviceOrderNumber: number
  initialEstimates: ServiceOrderEstimateRecord[]
  catalogServices: CatalogServiceEntry[]
  catalogParts: CatalogPartEntry[]
  stockAvailability: Record<string, number>
  defaultWarrantyDays: number
  defaultEstimateValidityDays: number
  serviceOrderStatus: ServiceOrderStatus
  clientName: string | null
  clientPhone: string | null
  clientEmail: string | null
  open?: boolean
  onOpenChange?: (open: boolean) => void
  hideSummaryCard?: boolean
}

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

export function EstimatesModal({
  serviceOrderId,
  serviceOrderNumber,
  initialEstimates,
  catalogServices,
  catalogParts,
  stockAvailability,
  defaultWarrantyDays,
  defaultEstimateValidityDays,
  serviceOrderStatus,
  clientName,
  clientPhone,
  clientEmail,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  hideSummaryCard = false,
}: EstimatesModalProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false)
  const open = controlledOpen ?? uncontrolledOpen
  const setOpen = controlledOnOpenChange ?? setUncontrolledOpen

  return (
    <>
      {!hideSummaryCard && (
        <Card className="overflow-hidden border-primary/20 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="size-4 text-primary" />
              Orçamentos
              {initialEstimates.length > 0 && (
                <span className="ml-1 rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary">
                  {initialEstimates.length}
                </span>
              )}
            </CardTitle>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setOpen(true)}>
              <FileText className="size-3.5" />
              Histórico de orçamento
            </Button>
          </CardHeader>

          <CardContent className="p-0">
            {initialEstimates.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
                <FileText className="mb-3 size-10 text-muted-foreground/25" />
                <p className="text-sm font-medium text-muted-foreground">Nenhum orçamento emitido</p>
                <p className="mt-1 text-xs text-muted-foreground/60">
                  O histórico aparecerá aqui assim que a OS receber a primeira versão.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {initialEstimates.map((estimate) => (
                  <div
                    key={estimate.id}
                    className="flex items-center justify-between px-5 py-3.5 transition-colors hover:bg-muted/20"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-muted-foreground">
                        v{estimate.version}
                      </span>
                      <span
                        className={cn(
                          'inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                          SERVICE_ORDER_ESTIMATE_STATUS_COLORS[
                            estimate.status as keyof typeof SERVICE_ORDER_ESTIMATE_STATUS_COLORS
                          ] ?? 'bg-muted text-muted-foreground',
                        )}
                      >
                        {SERVICE_ORDER_ESTIMATE_STATUS_LABELS[
                          estimate.status as keyof typeof SERVICE_ORDER_ESTIMATE_STATUS_LABELS
                        ] ?? estimate.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-muted-foreground">
                        {new Date(estimate.created_at).toLocaleDateString('pt-BR')}
                      </span>
                      <span className="text-sm font-semibold text-foreground">
                        {currencyFormatter.format(estimate.total_amount)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden p-0 sm:max-w-[min(96vw,88rem)]">
          <DialogHeader className="border-b px-6 py-4">
            <DialogTitle>Histórico de orçamentos</DialogTitle>
            <DialogDescription>
              OS #{serviceOrderNumber}. Consulte versões, status e itens já enviados ao cliente.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            <ServiceOrderEstimatesPanel
              mode="history"
              serviceOrderId={serviceOrderId}
              serviceOrderNumber={serviceOrderNumber}
              initialEstimates={initialEstimates}
              catalogServices={catalogServices}
              catalogParts={catalogParts}
              stockAvailability={stockAvailability}
              defaultWarrantyDays={defaultWarrantyDays}
              defaultEstimateValidityDays={defaultEstimateValidityDays}
              serviceOrderStatus={serviceOrderStatus}
              clientName={clientName}
              clientPhone={clientPhone}
              clientEmail={clientEmail}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
