'use client'

import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button-variants'
import { cn } from '@/lib/utils'

export default function VerifyEmailPage() {
  return (
    <div className="space-y-6 text-center">
      <div className="mx-auto size-16 rounded-full bg-primary/10 flex items-center justify-center">
        <svg
          className="size-8 text-primary"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
          />
        </svg>
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Verifique seu e-mail</h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Enviamos um link de confirmação para o seu e-mail.
          <br />
          Clique no link para ativar sua conta e continuar o cadastro.
        </p>
      </div>

      <div className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground space-y-1">
        <p>Não recebeu o e-mail?</p>
        <p>Verifique a pasta de spam ou lixo eletrônico.</p>
      </div>

      <Link href="/login" className={cn(buttonVariants({ variant: 'outline' }), 'w-full justify-center')}>
        Voltar para o login
      </Link>
    </div>
  )
}
