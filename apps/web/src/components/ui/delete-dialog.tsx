'use client'

import * as React from 'react'
import { AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface DeleteDialogProps {
  entityId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (deletedId: string) => void
  deleteAction: (id: string) => Promise<{ error?: string } | void>
  title: string
  description: React.ReactNode
  successMessage: string
  confirmLabel?: string
}

export function DeleteDialog({
  entityId,
  open,
  onOpenChange,
  onSuccess,
  deleteAction,
  title,
  description,
  successMessage,
  confirmLabel = 'Excluir da Listagem',
}: DeleteDialogProps) {
  const [isDeleting, setIsDeleting] = React.useState(false)

  async function handleDelete() {
    setIsDeleting(true)
    try {
      const response = await deleteAction(entityId)
      if (response?.error) {
        toast.error(response.error)
      } else {
        toast.success(successMessage)
        onSuccess(entityId)
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
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
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
            {isDeleting ? 'Excluindo...' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
