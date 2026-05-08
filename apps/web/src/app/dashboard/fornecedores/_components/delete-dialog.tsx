'use client'

import { DeleteDialog } from '@/components/ui/delete-dialog'
import { deleteSupplier } from '@/app/actions/suppliers'

interface DeleteSupplierDialogProps {
  supplierId: string
  supplierName: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (deletedId: string) => void
}

export function DeleteSupplierDialog({
  supplierId,
  supplierName,
  open,
  onOpenChange,
  onSuccess,
}: DeleteSupplierDialogProps) {
  return (
    <DeleteDialog
      entityId={supplierId}
      open={open}
      onOpenChange={onOpenChange}
      onSuccess={onSuccess}
      deleteAction={deleteSupplier}
      title="Excluir Fornecedor"
      description={
        <>
          Tem certeza que deseja excluir <strong>{supplierName}</strong>? O cadastro será removido
          da listagem e o histórico ficará preservado para auditoria.
        </>
      }
      successMessage={`Fornecedor "${supplierName}" removido da listagem com sucesso.`}
    />
  )
}
