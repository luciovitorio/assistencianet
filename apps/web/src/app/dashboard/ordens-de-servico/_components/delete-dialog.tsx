'use client'

import { DeleteDialog } from '@/components/ui/delete-dialog'
import { deleteServiceOrder } from '@/app/actions/service-orders'

interface DeleteServiceOrderDialogProps {
  serviceOrderId: string
  serviceOrderNumber: number
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (deletedId: string) => void
}

export function DeleteServiceOrderDialog({
  serviceOrderId,
  serviceOrderNumber,
  open,
  onOpenChange,
  onSuccess,
}: DeleteServiceOrderDialogProps) {
  return (
    <DeleteDialog
      entityId={serviceOrderId}
      open={open}
      onOpenChange={onOpenChange}
      onSuccess={onSuccess}
      deleteAction={deleteServiceOrder}
      title="Excluir Ordem de Serviço"
      description={
        <>
          Tem certeza que deseja excluir a <strong>OS #{serviceOrderNumber}</strong>? O registro
          será removido da listagem. Esta ação deve ser usada apenas para OS sem andamento e sem
          orçamento vinculado. Nos demais casos, use o cancelamento para preservar o histórico.
        </>
      }
      successMessage={`OS #${serviceOrderNumber} removida com sucesso.`}
      confirmLabel="Excluir OS"
    />
  )
}
