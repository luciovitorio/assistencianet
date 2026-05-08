'use client'

import { DeleteDialog } from '@/components/ui/delete-dialog'
import { deleteBranch } from '@/app/actions/branches'

interface DeleteBranchDialogProps {
  branchId: string
  branchName: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (deletedId: string) => void
}

export function DeleteBranchDialog({
  branchId,
  branchName,
  open,
  onOpenChange,
  onSuccess,
}: DeleteBranchDialogProps) {
  return (
    <DeleteDialog
      entityId={branchId}
      open={open}
      onOpenChange={onOpenChange}
      onSuccess={onSuccess}
      deleteAction={deleteBranch}
      title="Excluir Filial"
      description={
        <>
          Tem certeza que deseja excluir a filial <strong>{branchName}</strong>? O registro será
          removido da listagem, mas o histórico continuará disponível para auditoria.
        </>
      }
      successMessage={`Filial "${branchName}" removida da listagem com sucesso.`}
    />
  )
}
