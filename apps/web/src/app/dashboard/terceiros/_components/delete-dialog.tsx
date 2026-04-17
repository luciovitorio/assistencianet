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
import { deleteThirdParty } from '@/app/actions/third-parties'

interface DeleteThirdPartyDialogProps {
  id: string
  name: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (deletedId: string) => void
}

export function DeleteThirdPartyDialog({
  id,
  name,
  open,
  onOpenChange,
  onSuccess,
}: DeleteThirdPartyDialogProps) {
  const [isDeleting, setIsDeleting] = React.useState(false)

  async function handleDelete() {
    setIsDeleting(true)
    try {
      const response = await deleteThirdParty(id)
      if (response?.error) {
        toast.error(response.error)
      } else {
        toast.success(`"${name}" removida da listagem com sucesso.`)
        onSuccess(id)
        onOpenChange(false)
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Erro inesperado')
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
            Excluir Terceirizada
          </DialogTitle>
          <DialogDescription>
            Tem certeza que deseja excluir <strong>{name}</strong>? O cadastro será removido da
            listagem e o histórico ficará preservado para auditoria.
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
