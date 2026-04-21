'use client'

import * as React from 'react'
import { AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { deleteEquipment } from '@/app/actions/equipments'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface DeleteEquipmentDialogProps {
  equipmentId: string
  equipmentName: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (deletedId: string) => void
}

export function DeleteEquipmentDialog({
  equipmentId,
  equipmentName,
  open,
  onOpenChange,
  onSuccess,
}: DeleteEquipmentDialogProps) {
  const [isDeleting, setIsDeleting] = React.useState(false)

  async function handleDelete() {
    setIsDeleting(true)
    try {
      const response = await deleteEquipment(equipmentId)
      if (response?.error) {
        toast.error(response.error)
      } else {
        toast.success(`Equipamento "${equipmentName}" removido da listagem com sucesso.`)
        onSuccess(equipmentId)
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
            Excluir Equipamento
          </DialogTitle>
          <DialogDescription>
            Tem certeza que deseja excluir <strong>{equipmentName}</strong>? O cadastro será
            removido da listagem e o histórico das OS ficará preservado.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-4 gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isDeleting}>
            Cancelar
          </Button>
          <Button type="button" variant="destructive" onClick={handleDelete} disabled={isDeleting}>
            {isDeleting ? 'Excluindo...' : 'Excluir da Listagem'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
