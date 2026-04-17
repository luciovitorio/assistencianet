'use client'

import * as React from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { deleteServiceOrder } from '@/app/actions/service-orders'

interface DeleteServiceOrderDialogProps {
  serviceOrderId: string
  serviceOrderNumber: number
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (deletedId: string) => void
}

export function DeleteServiceOrderDialog({
  serviceOrderId,
  serviceOrderNumber,
  open,
  onOpenChange,
  onSuccess,
}: DeleteServiceOrderDialogProps) {
  const [isDeleting, setIsDeleting] = React.useState(false)

  async function handleDelete() {
    setIsDeleting(true)
    try {
      const response = await deleteServiceOrder(serviceOrderId)
      if (response?.error) {
        toast.error(response.error)
      } else {
        toast.success(`OS #${serviceOrderNumber} removida com sucesso.`)
        onSuccess(serviceOrderId)
        onOpenChange(false)
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast.error(error.message)
      } else {
        toast.error('Erro inesperado')
      }
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-106">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="size-5" />
            Excluir Ordem de Serviço
          </DialogTitle>
          <DialogDescription>
            Tem certeza que deseja excluir a <strong>OS #{serviceOrderNumber}</strong>? O registro
            será removido da listagem. Esta ação deve ser usada apenas para OS sem andamento e sem
            orçamento vinculado. Nos demais casos, use o cancelamento para preservar o histórico.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-4 gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? 'Excluindo...' : 'Excluir OS'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
