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
import { deleteBranch } from '@/app/actions/branches'

interface DeleteBranchDialogProps {
  branchId: string
  branchName: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (deletedId: string) => void
}

export function DeleteBranchDialog({ branchId, branchName, open, onOpenChange, onSuccess }: DeleteBranchDialogProps) {
  const [isDeleting, setIsDeleting] = React.useState(false)

  async function handleDelete() {
    setIsDeleting(true)
    try {
      const response = await deleteBranch(branchId)
      if (response?.error) {
        toast.error(response.error)
      } else {
        toast.success(`Filial "${branchName}" removida da listagem com sucesso.`)
        onSuccess(branchId)
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
            Excluir Filial
          </DialogTitle>
          <DialogDescription>
            Tem certeza que deseja excluir a filial <strong>{branchName}</strong>? O registro será removido da listagem, mas o histórico continuará disponível para auditoria.
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
