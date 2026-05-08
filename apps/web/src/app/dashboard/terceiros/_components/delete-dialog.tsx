'use client'

import { DeleteDialog } from '@/components/ui/delete-dialog'
import { deleteThirdParty } from '@/app/actions/third-parties'

interface DeleteThirdPartyDialogProps {
  id: string
  name: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (deletedId: string) => void
}

export function DeleteThirdPartyDialog({
  id,
  name,
  open,
  onOpenChange,
  onSuccess,
}: DeleteThirdPartyDialogProps) {
  return (
    <DeleteDialog
      entityId={id}
      open={open}
      onOpenChange={onOpenChange}
      onSuccess={onSuccess}
      deleteAction={deleteThirdParty}
      title="Excluir Terceirizada"
      description={
        <>
          Tem certeza que deseja excluir <strong>{name}</strong>? O cadastro será removido da
          listagem e o histórico ficará preservado para auditoria.
        </>
      }
      successMessage={`"${name}" removida da listagem com sucesso.`}
    />
  )
}
