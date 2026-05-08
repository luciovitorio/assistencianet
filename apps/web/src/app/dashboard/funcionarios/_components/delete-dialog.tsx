'use client'

import { DeleteDialog } from '@/components/ui/delete-dialog'
import { deleteEmployee } from '@/app/actions/employees'

interface DeleteEmployeeDialogProps {
  employeeId: string
  employeeName: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (deletedId: string) => void
}

export function DeleteEmployeeDialog({
  employeeId,
  employeeName,
  open,
  onOpenChange,
  onSuccess,
}: DeleteEmployeeDialogProps) {
  return (
    <DeleteDialog
      entityId={employeeId}
      open={open}
      onOpenChange={onOpenChange}
      onSuccess={onSuccess}
      deleteAction={deleteEmployee}
      title="Excluir Funcionário"
      description={
        <>
          Tem certeza que deseja excluir <strong>{employeeName}</strong>? O cadastro será removido
          da listagem e o histórico ficará preservado para auditoria.
        </>
      }
      successMessage={`Funcionário "${employeeName}" removido da listagem com sucesso.`}
    />
  )
}
