'use client'

import { useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { register as registerAction } from '@/app/actions/auth'
import { registerSchema, type RegisterSchema } from '@/lib/validations/auth'
import { Button } from '@/components/ui/button'
import { InputField } from '@/components/ui/input-field'
import { MaskedInputField } from '@/components/ui/masked-input-field'
import { AppLink } from '@/components/ui/app-link'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function RegisterPage() {
  const [isPending, startTransition] = useTransition()

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<RegisterSchema>({ resolver: zodResolver(registerSchema) })

  function onSubmit(data: RegisterSchema) {
    startTransition(async () => {
      const formData = new FormData()
      Object.entries(data).forEach(([k, v]) => formData.set(k, v ?? ''))
      const result = await registerAction(null, formData)
      if (result?.error) setError('root', { message: result.error })
    })
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-bold">Criar conta</h1>
        <p className="text-muted-foreground text-sm">
          Comece a gerenciar sua assistência técnica
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {errors.root && (
          <Alert variant="destructive">
            <AlertDescription>{errors.root.message}</AlertDescription>
          </Alert>
        )}

        <InputField
          label="Seu nome"
          placeholder="Nome completo"
          error={errors.name?.message}
          {...register('name')}
        />

        <InputField
          label="Nome da empresa"
          placeholder="Ex: Orquídia Assistência Técnica"
          error={errors.company_name?.message}
          {...register('company_name')}
        />

        <MaskedInputField
          mask="phone"
          label="WhatsApp"
          placeholder="(11) 99999-9999"
          error={errors.whatsapp?.message}
          {...register('whatsapp')}
        />

        <InputField
          label="E-mail"
          type="email"
          placeholder="seu@email.com"
          error={errors.email?.message}
          {...register('email')}
        />

        <InputField
          label="Senha"
          type="password"
          placeholder="Mínimo 8 caracteres"
          error={errors.password?.message}
          {...register('password')}
        />

        <InputField
          label="Confirmar senha"
          type="password"
          placeholder="Repita a senha"
          error={errors.confirm_password?.message}
          {...register('confirm_password')}
        />

        <Button type="submit" className="w-full" loading={isPending}>
          Criar conta
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Já tem conta?{' '}
        <AppLink href="/login" variant="inline">
          Entrar
        </AppLink>
      </p>
    </div>
  )
}
