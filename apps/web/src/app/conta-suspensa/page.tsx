import { BanIcon } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button-variants'
import { logout } from '@/app/actions/auth'
import { createClient } from '@/lib/supabase/server'

export default async function ContaSuspensaPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-12 text-slate-900">
      <div className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center text-center">
        <div className="mb-5 flex size-14 items-center justify-center rounded-full bg-red-100 text-red-700">
          <BanIcon className="size-7" />
        </div>

        <h1 className="text-2xl font-semibold">Conta suspensa</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          O acesso desta empresa foi suspenso. Entre em contato com o suporte para mais
          informações.
        </p>

        <div className="mt-7 flex flex-wrap justify-center gap-3">
          {user ? (
            <form action={logout}>
              <button type="submit" className={buttonVariants({ variant: 'outline' })}>
                Entrar com outra conta
              </button>
            </form>
          ) : (
            <a href="/login" className={buttonVariants({ variant: 'outline' })}>
              Ir para o login
            </a>
          )}
        </div>
      </div>
    </main>
  )
}
