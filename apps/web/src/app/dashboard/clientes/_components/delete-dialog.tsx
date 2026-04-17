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
import { deleteClient } from '@/app/actions/clients'

interface DeleteClientDialogProps {
  clientId: string
  clientName: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (deletedId: string) => void
}

export function DeleteClientDialog({
  clientId,
  clientName,
  open,
  onOpenChange,
  onSuccess,
}: DeleteClientDialogProps) {
  const [isDeleting, setIsDeleting] = React.useState(false)

  async function handleDelete() {
    setIsDeleting(true)
    try {
      const response = await deleteClient(clientId)
      if (response?.error) {
        toast.error(response.error)
      } else {
        toast.success(`Cliente "${clientName}" removido da listagem com sucesso.`)
        onSuccess(clientId)
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
            Excluir Cliente
          </DialogTitle>
          <DialogDescription>
            Tem certeza que deseja excluir <strong>{clientName}</strong>? O cadastro será removido da listagem e o histórico ficará preservado para auditoria.
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
            {isDeleting ? 'Excluindo...' : 'Excluir da Listagem'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
