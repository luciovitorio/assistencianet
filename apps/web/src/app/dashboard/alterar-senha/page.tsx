'use client'

import * as React from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { CircleCheck, Info, KeyRound } from 'lucide-react'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { InputField } from '@/components/ui/input-field'
import { useRouteTransition } from '@/components/ui/route-transition-indicator'
import { updatePasswordOnFirstLogin } from './actions'
import { PASSWORD_MIN_LENGTH } from '@/lib/validations/auth'

const schema = z
  .object({
    password: z.string().min(PASSWORD_MIN_LENGTH, `A senha deve ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres`),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: 'As senhas não coincidem',
    path: ['confirm'],
  })

type FormData = z.infer<typeof schema>

export default function AlterarSenhaPage() {
  const { navigate } = useRouteTransition()
  const [isPending, startTransition] = React.useTransition()
  const [isNavigatingAway, setIsNavigatingAway] = React.useState(false)

  const {
    control,
    handleSubmit,
    clearErrors,
    setError,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      password: '',
      confirm: '',
    },
  })

  const onSubmit = (data: FormData) => {
    if (isPending || isNavigatingAway) return
    startTransition(async () => {
      clearErrors('password')

      const result = await updatePasswordOnFirstLogin(data.password)
      if (result?.error) {
        if (result.field === 'password') {
          setError('password', { message: result.error })
        }
        toast.error(result.error)
        return
      }

      toast.success('Senha alterada com sucesso!')
      setIsNavigatingAway(true)
      navigate('/dashboard')
    })
  }

  const isBusy = isPending || isNavigatingAway

  return (
    <div className="flex min-h-[calc(100dvh-9rem)] items-center justify-center overflow-hidden px-4">
      <div className="w-full max-w-sm bg-card border border-border rounded-xl shadow-sm p-8 space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="p-3 bg-primary/10 rounded-full text-primary">
            <KeyRound className="size-6" />
          </div>
          <h1 className="text-xl font-bold">Defina sua nova senha</h1>
          <p className="text-sm text-muted-foreground">
            Por segurança, você precisa criar uma senha pessoal antes de continuar.
          </p>
        </div>

        <Alert className="border-primary/20 bg-primary/5">
          <Info className="size-4 text-primary" />
          <AlertTitle>Regras para a nova senha</AlertTitle>
          <AlertDescription>
            <div className="space-y-1.5">
              <p>Antes de salvar, sua senha precisa atender aos critérios abaixo:</p>
              <ul className="space-y-1">
                <li className="flex items-center gap-2">
                  <CircleCheck className="size-3.5 shrink-0 text-primary" />
                  Ter pelo menos {PASSWORD_MIN_LENGTH} caracteres
                </li>
                <li className="flex items-center gap-2">
                  <CircleCheck className="size-3.5 shrink-0 text-primary" />
                  Confirmar exatamente a mesma senha no segundo campo
                </li>
                <li className="flex items-center gap-2">
                  <CircleCheck className="size-3.5 shrink-0 text-primary" />
                  Ser diferente da senha provisoria usada no primeiro acesso
                </li>
                <li className="flex items-center gap-2">
                  <CircleCheck className="size-3.5 shrink-0 text-primary" />
                  Recomendado: combinar letras, números e símbolos para ficar mais forte
                </li>
              </ul>
            </div>
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Controller
            control={control}
            name="password"
            render={({ field }) => (
              <InputField
                label="Nova senha *"
                type="password"
                placeholder={`Pelo menos ${PASSWORD_MIN_LENGTH} caracteres`}
                error={errors.password?.message}
                helper={`Use no minimo ${PASSWORD_MIN_LENGTH} caracteres e escolha uma senha diferente da provisoria.`}
                {...field}
              />
            )}
          />
          <Controller
            control={control}
            name="confirm"
            render={({ field }) => (
              <InputField
                label="Confirmar nova senha *"
                type="password"
                placeholder="Repita a senha"
                error={errors.confirm?.message}
                {...field}
              />
            )}
          />
          <Button type="submit" className="w-full" disabled={isBusy} loading={isBusy}>
            Salvar senha
          </Button>
        </form>
      </div>
    </div>
  )
}
