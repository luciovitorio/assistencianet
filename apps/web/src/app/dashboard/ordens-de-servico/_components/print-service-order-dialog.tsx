'use client'

import { Printer, SkipForward } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface PrintServiceOrderDialogProps {
  open: boolean
  onClose: () => void
  serviceOrderId: string
  serviceOrderNumber: number
  clientName: string | null
}

export function PrintServiceOrderDialog({
  open,
  onClose,
  serviceOrderId,
  serviceOrderNumber,
  clientName,
}: PrintServiceOrderDialogProps) {
  const handlePrint = () => {
    window.open(
      `/recibos/ordem-de-servico/${serviceOrderId}?autoPrint=1`,
      '_blank',
      'noopener,noreferrer',
    )
    onClose()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose()
      }}
    >
      <DialogContent className="sm:max-w-md" showCloseButton>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-full bg-emerald-100">
              <Printer className="size-4 text-emerald-700" />
            </div>
            <div>
              <DialogTitle>OS #{serviceOrderNumber} criada</DialogTitle>
              <DialogDescription className="mt-0.5">
                Deseja imprimir a ordem de serviço agora?
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="rounded-xl border bg-muted/40 px-4 py-3 text-sm">
          {clientName && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Cliente</span>
              <span className="truncate pl-4 font-medium">{clientName}</span>
            </div>
          )}
          <p className="mt-1.5 text-xs leading-snug text-muted-foreground">
            A impressão é gerada em meia folha A4 (A5) com os dados básicos para assinatura do
            cliente.
          </p>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button variant="outline" className="gap-2" onClick={onClose}>
            <SkipForward className="size-4" />
            Pular
          </Button>
          <Button className="gap-2" onClick={handlePrint}>
            <Printer className="size-4" />
            Imprimir OS
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
