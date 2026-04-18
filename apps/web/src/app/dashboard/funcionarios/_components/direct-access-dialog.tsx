'use client'

import * as React from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { KeyRound } from 'lucide-react'
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
import { InputField } from '@/components/ui/input-field'
import { createEmployeeDirectAccess } from '@/app/actions/employees'
import { PASSWORD_MIN_LENGTH } from '@/lib/validations/auth'

const schema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(PASSWORD_MIN_LENGTH, `A senha deve ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres`),
})
type FormData = z.infer<typeof schema>

interface DirectAccessDialogProps {
  employeeId: string
  employeeName: string
  defaultEmail?: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (employeeId: string) => void
}

export function DirectAccessDialog({
  employeeId,
  employeeName,
  defaultEmail,
  open,
  onOpenChange,
  onSuccess,
}: DirectAccessDialogProps) {
  const [isPending, startTransition] = React.useTransition()

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: defaultEmail || '', password: '' },
  })

  React.useEffect(() => {
    if (open) reset({ email: defaultEmail || '', password: '' })
  }, [open, defaultEmail, reset])

  const onSubmit = (data: FormData) => {
    startTransition(async () => {
      const result = await createEmployeeDirectAccess(employeeId, data.email, data.password)
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success(`Acesso criado para ${employeeName}. Informe a senha provisória ao funcionário.`)
        onSuccess(employeeId)
        onOpenChange(false)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-106">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="size-5 text-primary" />
            Definir acesso — {employeeName}
          </DialogTitle>
          <DialogDescription>
            Crie um acesso com senha provisória. No primeiro login, o funcionário será obrigado a definir uma nova senha.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} id="direct-access-form" className="space-y-4 py-2" noValidate>
          <Controller
            control={control}
            name="email"
            render={({ field }) => (
              <InputField
                label="E-mail de acesso *"
                type="email"
                placeholder="funcionario@email.com"
                error={errors.email?.message}
                disabled={!!defaultEmail}
                {...field}
              />
            )}
          />
          <Controller
            control={control}
            name="password"
            render={({ field }) => (
              <InputField
                label="Senha provisória *"
                type="password"
                placeholder={`Pelo menos ${PASSWORD_MIN_LENGTH} caracteres`}
                error={errors.password?.message}
                helper={`Use no mínimo ${PASSWORD_MIN_LENGTH} caracteres.`}
                {...field}
              />
            )}
          />
          <p className="text-xs text-muted-foreground">
            Anote a senha e repasse ao funcionário. Ela será válida apenas para o primeiro acesso.
          </p>
        </form>

        <DialogFooter className="gap-3 sm:gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            form="direct-access-form"
            disabled={isPending}
            loading={isPending}
          >
            Criar acesso
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
