'use client'

import { DeleteDialog } from '@/components/ui/delete-dialog'
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
  return (
    <DeleteDialog
      entityId={partId}
      open={open}
      onOpenChange={onOpenChange}
      onSuccess={onSuccess}
      deleteAction={deletePart}
      title="Excluir Peça"
      description={
        <>
          Tem certeza que deseja excluir <strong>{partName}</strong>? O cadastro será removido da
          listagem e o histórico ficará preservado para auditoria.
        </>
      }
      successMessage={`Peça "${partName}" removida da listagem com sucesso.`}
    />
  )
}
