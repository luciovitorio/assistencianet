import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { OnboardingProgress } from '@/components/onboarding/onboarding-progress'
import { ConclusaoActions } from './conclusao-actions'

export default async function OnboardingConclusaoPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: company } = await supabase
    .from('companies')
    .select('id, name')
    .eq('owner_id', user.id)
    .single()

  // Paralelo: branches não depende do company além do id, já resolvido acima
  const [{ data: branches }] = await Promise.all([
    supabase.from('branches').select('name').eq('company_id', company?.id ?? '').is('deleted_at', null),
  ])

  return (
    <div className="space-y-6">
      <OnboardingProgress current={3} />

      <div className="bg-background rounded-xl border p-6 space-y-6 text-center">
        <div className="mx-auto size-16 rounded-full bg-green-100 flex items-center justify-center">
          <svg
            className="size-8 text-green-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>

        <div>
          <h2 className="text-2xl font-bold">Tudo pronto!</h2>
          <p className="text-muted-foreground text-sm mt-2">
            Sua empresa foi configurada com sucesso. Você já pode começar a usar o sistema.
          </p>
        </div>

        <div className="rounded-lg bg-muted/40 p-4 text-left space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Empresa</span>
            <span className="font-medium">{company?.name}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Filiais</span>
            <span className="font-medium">{branches?.length ?? 0} cadastrada(s)</span>
          </div>
        </div>

        <div className="space-y-3">
          <ConclusaoActions />
          <p className="text-xs text-muted-foreground">
            Você pode completar ou alterar as configurações a qualquer momento em{' '}
            <strong>Configurações → Empresa</strong>
          </p>
        </div>
      </div>
    </div>
  )
}
