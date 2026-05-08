'use client'

import { DeleteDialog } from '@/components/ui/delete-dialog'
import { deleteService } from '@/app/actions/services'

interface DeleteServiceDialogProps {
  serviceId: string
  serviceName: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (deletedId: string) => void
}

export function DeleteServiceDialog({
  serviceId,
  serviceName,
  open,
  onOpenChange,
  onSuccess,
}: DeleteServiceDialogProps) {
  return (
    <DeleteDialog
      entityId={serviceId}
      open={open}
      onOpenChange={onOpenChange}
      onSuccess={onSuccess}
      deleteAction={deleteService}
      title="Excluir Serviço"
      description={
        <>
          Tem certeza que deseja excluir <strong>{serviceName}</strong>? O cadastro será removido da
          listagem e o histórico ficará preservado para auditoria.
        </>
      }
      successMessage={`Serviço "${serviceName}" removido da listagem com sucesso.`}
    />
  )
}
