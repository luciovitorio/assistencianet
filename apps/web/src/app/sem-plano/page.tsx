import Link from 'next/link'
import { AlertTriangleIcon, CreditCardIcon } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button-variants'
import { createClient } from '@/lib/supabase/server'

export default async function SemPlanoPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const canManageSubscription = Boolean(user && !user.app_metadata?.role)

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-12 text-slate-900">
      <div className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center text-center">
        <div className="mb-5 flex size-14 items-center justify-center rounded-full bg-amber-100 text-amber-700">
          <AlertTriangleIcon className="size-7" />
        </div>

        <h1 className="text-2xl font-semibold">Acesso bloqueado</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          O período de teste da empresa terminou ou o recurso não faz parte do plano atual.
          Peça ao responsável pela conta para revisar a assinatura.
        </p>

        <div className="mt-7 flex flex-wrap justify-center gap-3">
          {canManageSubscription && (
            <Link href="/dashboard/assinatura" className={buttonVariants()}>
              <CreditCardIcon className="size-4" />
              Ver assinatura
            </Link>
          )}
          <Link href="/login" className={buttonVariants({ variant: 'outline' })}>
            {user ? 'Entrar com outra conta' : 'Ir para o login'}
          </Link>
        </div>
      </div>
    </main>
  )
}
