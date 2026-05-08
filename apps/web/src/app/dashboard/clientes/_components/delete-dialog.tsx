'use client'

import { DeleteDialog } from '@/components/ui/delete-dialog'
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
  return (
    <DeleteDialog
      entityId={clientId}
      open={open}
      onOpenChange={onOpenChange}
      onSuccess={onSuccess}
      deleteAction={deleteClient}
      title="Excluir Cliente"
      description={
        <>
          Tem certeza que deseja excluir <strong>{clientName}</strong>? O cadastro será removido da
          listagem e o histórico ficará preservado para auditoria.
        </>
      }
      successMessage={`Cliente "${clientName}" removido da listagem com sucesso.`}
    />
  )
}
