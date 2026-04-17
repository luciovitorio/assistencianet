'use client'

import { useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { login } from '@/app/actions/auth'
import { loginSchema, type LoginSchema } from '@/lib/validations/auth'
import { Button } from '@/components/ui/button'
import { InputField } from '@/components/ui/input-field'
import { AppLink } from '@/components/ui/app-link'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function LoginPage() {
  const [isPending, startTransition] = useTransition()

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginSchema>({ resolver: zodResolver(loginSchema) })

  function onSubmit(data: LoginSchema) {
    startTransition(async () => {
      const formData = new FormData()
      formData.set('email', data.email)
      formData.set('password', data.password)
      const result = await login(null, formData)
      if (result?.error) setError('root', { message: result.error })
    })
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-bold">Entrar</h1>
        <p className="text-muted-foreground text-sm">Acesse sua conta AssistênciaNet</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {errors.root && (
          <Alert variant="destructive">
            <AlertDescription>{errors.root.message}</AlertDescription>
          </Alert>
        )}

        <InputField
          label="E-mail"
          type="email"
          placeholder="seu@email.com"
          error={errors.email?.message}
          {...register('email')}
        />

        <div className="space-y-1">
          <InputField
            label="Senha"
            type="password"
            error={errors.password?.message}
            {...register('password')}
          />
          <div className="flex justify-end">
            <AppLink href="/forgot-password" variant="muted">
              Esqueceu a senha?
            </AppLink>
          </div>
        </div>

        <Button type="submit" className="w-full" loading={isPending}>
          Entrar
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Não tem conta?{' '}
        <AppLink href="/register" variant="inline">
          Criar conta
        </AppLink>
      </p>
    </div>
  )
}
