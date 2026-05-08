'use client'

import { DeleteDialog } from '@/components/ui/delete-dialog'
import { deleteEquipment } from '@/app/actions/equipments'

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
  return (
    <DeleteDialog
      entityId={equipmentId}
      open={open}
      onOpenChange={onOpenChange}
      onSuccess={onSuccess}
      deleteAction={deleteEquipment}
      title="Excluir Equipamento"
      description={
        <>
          Tem certeza que deseja excluir <strong>{equipmentName}</strong>? O cadastro será removido
          da listagem e o histórico das OS ficará preservado.
        </>
      }
      successMessage={`Equipamento "${equipmentName}" removido da listagem com sucesso.`}
    />
  )
}
