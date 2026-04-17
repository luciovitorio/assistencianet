'use client'

import * as React from 'react'
import { Mail } from 'lucide-react'
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
import { inviteEmployee } from '@/app/actions/employees'

interface InviteDialogProps {
  employeeId: string
  employeeName: string
  employeeEmail: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (employeeId: string, userId: string) => void
}

export function InviteDialog({
  employeeId,
  employeeName,
  employeeEmail,
  open,
  onOpenChange,
  onSuccess,
}: InviteDialogProps) {
  const [isSending, setIsSending] = React.useState(false)

  async function handleInvite() {
    setIsSending(true)
    try {
      const result = await inviteEmployee(employeeId)
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success(`Convite enviado para ${employeeEmail}.`)
        onSuccess(employeeId, '')
        onOpenChange(false)
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro inesperado')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-106">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="size-5 text-primary" />
            Convidar para o sistema
          </DialogTitle>
          <DialogDescription>
            Um e-mail de convite será enviado para <strong>{employeeEmail}</strong>. {employeeName} receberá um link para criar sua senha e acessar o sistema.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-4 gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSending}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleInvite}
            disabled={isSending}
            loading={isSending}
          >
            Enviar convite
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
