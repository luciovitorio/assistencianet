'use client'

import * as React from 'react'
import { ShieldOff } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { revokeEmployeeAccess } from '@/app/actions/employees'

interface RevokeDialogProps {
  employeeId: string
  employeeName: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (employeeId: string) => void
}

export function RevokeDialog({
  employeeId,
  employeeName,
  open,
  onOpenChange,
  onSuccess,
}: RevokeDialogProps) {
  const [isRevoking, setIsRevoking] = React.useState(false)

  async function handleRevoke() {
    setIsRevoking(true)
    try {
      const result = await revokeEmployeeAccess(employeeId)
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success(`Acesso de ${employeeName} revogado.`)
        onSuccess(employeeId)
        onOpenChange(false)
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro inesperado')
    } finally {
      setIsRevoking(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-106">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <ShieldOff className="size-5" />
            Revogar acesso
          </DialogTitle>
          <DialogDescription>
            Tem certeza que deseja revogar o acesso de <strong>{employeeName}</strong>? O login será desativado imediatamente. O cadastro do funcionário permanece.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-4 gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isRevoking}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleRevoke}
            disabled={isRevoking}
          >
            {isRevoking ? 'Revogando...' : 'Revogar acesso'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
