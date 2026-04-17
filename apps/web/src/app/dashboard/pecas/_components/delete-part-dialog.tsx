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
import { deletePart } from '@/app/actions/parts'

interface DeletePartDialogProps {
  partId: string
  partName: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (deletedId: string) => void
}

export function DeletePartDialog({
  partId,
  partName,
  open,
  onOpenChange,
  onSuccess,
}: DeletePartDialogProps) {
  const [isDeleting, setIsDeleting] = React.useState(false)

  async function handleDelete() {
    setIsDeleting(true)
    try {
      const response = await deletePart(partId)
      if (response?.error) {
        toast.error(response.error)
      } else {
        toast.success(`Peça "${partName}" removida da listagem com sucesso.`)
        onSuccess(partId)
        onOpenChange(false)
      }
    } catch (e: unknown) {
      if (e instanceof Error) {
        toast.error(e.message)
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
            Excluir Peça
          </DialogTitle>
          <DialogDescription>
            Tem certeza que deseja excluir <strong>{partName}</strong>? O cadastro será removido da listagem e o histórico ficará preservado para auditoria.
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
