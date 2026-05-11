'use client'

import { useState, useTransition, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { login, loginWithGoogle } from '@/app/actions/auth'
import { loginSchema, type LoginSchema } from '@/lib/validations/auth'
import { Button } from '@/components/ui/button'
import { InputField } from '@/components/ui/input-field'
import { AppLink } from '@/components/ui/app-link'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Mail, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function LoginPage() {
  const [isPending, startTransition] = useTransition()
  const [isGooglePending, startGoogleTransition] = useTransition()
  const [googleError, setGoogleError] = useState<string | null>(null)
  const [remembered, setRemembered] = useState(false)
  const [urlError, setUrlError] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const error = params.get('error')
    if (error === 'invite_expired') {
      setUrlError('Convite expirado ou inválido. Peça ao administrador um novo convite.')
    } else if (error === 'auth_callback') {
      setUrlError('Erro na autenticação. Tente fazer login normalmente ou contate o suporte.')
    }
  }, [])

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginSchema>({ resolver: zodResolver(loginSchema) })

  function handleGoogleLogin() {
    setGoogleError(null)
    startGoogleTransition(async () => {
      const result = await loginWithGoogle()
      if (result?.error) setGoogleError(result.error)
    })
  }

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
      {/* Header */}
      <div>
        <h1 className="text-[26px] font-extrabold tracking-tight text-gray-900">
          Bem-vindo de volta
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Não tem conta?{' '}
          <AppLink href="/register" variant="inline">
            Crie gratuitamente — 14 dias
          </AppLink>
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {urlError && (
          <Alert variant="destructive">
            <AlertDescription>{urlError}</AlertDescription>
          </Alert>
        )}
        {errors.root && (
          <Alert variant="destructive">
            <AlertDescription>{errors.root.message}</AlertDescription>
          </Alert>
        )}

        <InputField
          label="E-mail"
          type="email"
          placeholder="seu@email.com.br"
          error={errors.email?.message}
          leftIcon={<Mail />}
          {...register('email')}
        />

        <InputField
          label="Senha"
          type="password"
          placeholder="••••••••"
          error={errors.password?.message}
          leftIcon={<Lock />}
          {...register('password')}
        />

        {/* Remember / Forgot row */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setRemembered((v) => !v)}
            className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground select-none"
          >
            <span
              className={cn(
                'flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors',
                remembered
                  ? 'border-primary bg-primary'
                  : 'border-input bg-background'
              )}
            >
              {remembered && (
                <svg
                  viewBox="0 0 10 8"
                  className="h-2.5 w-2.5 text-white"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="1,4 4,7 9,1" />
                </svg>
              )}
            </span>
            Lembrar de mim
          </button>
          <AppLink href="/forgot-password" variant="muted">
            Esqueci minha senha
          </AppLink>
        </div>

        <Button type="submit" className="w-full" loading={isPending}>
          Entrar na conta
        </Button>
      </form>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">ou continue com</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      {/* Social buttons */}
      <div className="space-y-2.5">
        {googleError && (
          <Alert variant="destructive">
            <AlertDescription>{googleError}</AlertDescription>
          </Alert>
        )}

        <Button
          variant="outline"
          className="w-full gap-2.5"
          type="button"
          loading={isGooglePending}
          onClick={handleGoogleLogin}
        >
          {!isGooglePending && (
            <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
          )}
          Entrar com Google
        </Button>

        <Button variant="outline" className="w-full gap-2.5" type="button" disabled>
          <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="#25D366">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
          </svg>
          Entrar com WhatsApp
        </Button>
      </div>

      {/* Register link */}
      <p className="text-center text-sm text-muted-foreground">
        Não tem conta?{' '}
        <AppLink href="/register" variant="inline">
          Criar conta grátis — 14 dias sem cartão
        </AppLink>
      </p>
    </div>
  )
}
