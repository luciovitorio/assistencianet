import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStripe } from '@/lib/stripe/client'
import { PlanCard } from './_components/plan-card'
import { PortalButton } from './_components/portal-button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { AlertTriangleIcon, CheckCircle2Icon, ClockIcon, CalendarIcon, PartyPopperIcon } from 'lucide-react'
import type { PlanId } from '@/lib/stripe/plans'

const STATUS_LABELS: Record<string, { label: string; icon: React.ReactNode; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  trialing:   { label: 'Período de teste',    icon: <ClockIcon className="size-3.5" />,         variant: 'secondary' },
  active:     { label: 'Ativo',               icon: <CheckCircle2Icon className="size-3.5" />,  variant: 'default' },
  past_due:   { label: 'Pagamento pendente',  icon: <AlertTriangleIcon className="size-3.5" />, variant: 'destructive' },
  canceled:   { label: 'Cancelado',           icon: <AlertTriangleIcon className="size-3.5" />, variant: 'destructive' },
  incomplete: { label: 'Incompleto',          icon: <AlertTriangleIcon className="size-3.5" />, variant: 'destructive' },
}

async function syncCheckoutSession(companyId: string, sessionId: string) {
  try {
    const session = await getStripe().checkout.sessions.retrieve(sessionId, {
      expand: ['subscription', 'subscription.items'],
    })
    if (session.payment_status !== 'paid' && session.status !== 'complete') return
    const sub = session.subscription as import('stripe').default.Subscription | null
    if (!sub || !session.customer) return

    const item = sub.items?.data?.[0]
    const adminSupabase = createAdminClient()
    await adminSupabase
      .from('subscriptions')
      .update({
        stripe_customer_id: session.customer as string,
        stripe_subscription_id: sub.id,
        plan_id: sub.metadata?.plan_id ?? null,
        status: sub.status,
        trial_ends_at: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
        current_period_start: item?.current_period_start ? new Date(item.current_period_start * 1000).toISOString() : null,
        current_period_end: item?.current_period_end ? new Date(item.current_period_end * 1000).toISOString() : null,
        cancel_at_period_end: sub.cancel_at_period_end,
        cancel_at: sub.cancel_at ? new Date(sub.cancel_at * 1000).toISOString() : null,
      })
      .eq('company_id', companyId)
  } catch {
    // falha silenciosa — o webhook vai convergir depois
  }
}

async function syncPortalReturn(companyId: string, stripeSubscriptionId: string) {
  try {
    const sub = await getStripe().subscriptions.retrieve(stripeSubscriptionId, {
      expand: ['items'],
    })
    const item = sub.items?.data?.[0]
    const adminSupabase = createAdminClient()
    await adminSupabase
      .from('subscriptions')
      .update({
        status: sub.status,
        cancel_at_period_end: sub.cancel_at_period_end,
        cancel_at: sub.cancel_at ? new Date(sub.cancel_at * 1000).toISOString() : null,
        trial_ends_at: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
        current_period_start: item?.current_period_start ? new Date(item.current_period_start * 1000).toISOString() : null,
        current_period_end: item?.current_period_end ? new Date(item.current_period_end * 1000).toISOString() : null,
      })
      .eq('company_id', companyId)
  } catch {
    // falha silenciosa — o webhook vai convergir depois
  }
}

export default async function AssinaturaPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string; session_id?: string; portal?: string }>
}) {
  const { checkout, session_id, portal } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: company } = await supabase
    .from('companies')
    .select('id, name')
    .eq('owner_id', user.id)
    .single()

  if (!company) redirect('/onboarding/empresa')

  // Sincroniza com o Stripe antes de ler o banco, evitando race condition com o webhook
  if (checkout === 'success' && session_id) {
    await syncCheckoutSession(company.id, session_id)
  }

  const adminSupabase = createAdminClient()

  // Sync ao voltar do portal — busca stripe_subscription_id antes do Promise.all
  if (portal === 'return') {
    const { data: subForSync } = await adminSupabase
      .from('subscriptions')
      .select('stripe_subscription_id')
      .eq('company_id', company.id)
      .maybeSingle()
    if (subForSync?.stripe_subscription_id) {
      await syncPortalReturn(company.id, subForSync.stripe_subscription_id)
    }
  }

  const [{ data: subscription }, { data: plans }] = await Promise.all([
    adminSupabase
      .from('subscriptions')
      .select('status, plan_id, trial_ends_at, current_period_end, stripe_customer_id, stripe_subscription_id, cancel_at_period_end, cancel_at')
      .eq('company_id', company.id)
      .maybeSingle(),
    adminSupabase
      .from('plans')
      .select('id, name, price_brl, max_os_per_month, max_users, has_whatsapp_bot, has_advanced_reports, has_multiple_branches, stripe_price_id, sort_order')
      .order('sort_order'),
  ])

  const status = subscription?.status ?? 'trialing'
  const statusInfo = STATUS_LABELS[status] ?? STATUS_LABELS.trialing
  const MANAGEABLE_STATUSES = ['active', 'trialing', 'past_due']
  const hasManageableSubscription =
    !!subscription?.stripe_customer_id &&
    MANAGEABLE_STATUSES.includes(subscription?.status ?? '')
  const hasStripeConfigured = !!process.env.STRIPE_SECRET_KEY
  const currentPlanName = plans?.find((p) => p.id === subscription?.plan_id)?.name

  const trialEndsAt = subscription?.trial_ends_at ? new Date(subscription.trial_ends_at) : null
  const trialDaysLeft = trialEndsAt
    ? Math.max(0, Math.ceil((trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null

  const periodEnd = subscription?.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
    : null

  const cancelAt = subscription?.cancel_at ? new Date(subscription.cancel_at) : null
  const cancelAtFormatted = cancelAt
    ? cancelAt.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
    : null
  const isScheduledToCancel = subscription?.cancel_at_period_end || !!cancelAt

  const trialEndFormatted = trialEndsAt
    ? trialEndsAt.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
    : null

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Assinatura</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gerencie seu plano e formas de pagamento.
        </p>
      </div>

      {/* Banner de sucesso após checkout */}
      {checkout === 'success' && (
        <div className="flex items-start gap-4 rounded-xl border border-green-200 bg-green-50 p-5 dark:border-green-800 dark:bg-green-950">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
            <PartyPopperIcon className="size-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="font-semibold text-green-800 dark:text-green-200">
              Assinatura confirmada!
            </p>
            <p className="mt-0.5 text-sm text-green-700 dark:text-green-300">
              {currentPlanName
                ? `O Plano ${currentPlanName} foi ativado com sucesso. Aproveite todos os recursos.`
                : 'Seu plano foi ativado com sucesso. Aproveite todos os recursos.'}
            </p>
          </div>
        </div>
      )}

      {/* Banner de cancelamento */}
      {checkout === 'canceled' && (
        <div className="flex items-start gap-4 rounded-xl border border-destructive/30 bg-destructive/5 p-5">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangleIcon className="size-5 text-destructive" />
          </div>
          <div>
            <p className="font-semibold text-destructive">Pagamento cancelado</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              O pagamento não foi concluído. Escolha um plano abaixo para continuar.
            </p>
          </div>
        </div>
      )}

      {/* Card de status */}
      <div className="rounded-xl border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Status da assinatura
            </p>

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={statusInfo.variant} className="gap-1.5 text-sm px-2.5 py-1">
                {statusInfo.icon}
                {statusInfo.label}
              </Badge>
              {subscription?.plan_id && (
                <span className="text-sm font-semibold">
                  — Plano {currentPlanName ?? subscription.plan_id}
                </span>
              )}
            </div>

            {/* Datas */}
            <div className="space-y-1.5">
              {status === 'trialing' && trialEndsAt && (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <CalendarIcon className="size-3.5 shrink-0" />
                  {isScheduledToCancel
                    ? <>Acesso até <span className="font-medium text-foreground">{cancelAtFormatted ?? trialEndFormatted}</span> · <span className="text-destructive">cancelamento agendado</span></>
                    : trialDaysLeft !== null && trialDaysLeft > 0
                      ? <>Teste grátis até <span className="font-medium text-foreground">{trialEndFormatted}</span> · {trialDaysLeft} dia{trialDaysLeft !== 1 ? 's' : ''} restante{trialDaysLeft !== 1 ? 's' : ''}</>
                      : <span className="text-destructive">Período de teste encerrado — escolha um plano abaixo.</span>
                  }
                </div>
              )}

              {status === 'active' && periodEnd && (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <CalendarIcon className="size-3.5 shrink-0" />
                  {isScheduledToCancel
                    ? <>Acesso até <span className="font-medium text-foreground">{cancelAtFormatted ?? periodEnd}</span> · <span className="text-destructive">cancelamento agendado</span></>
                    : <>Próxima cobrança em <span className="font-medium text-foreground">{periodEnd}</span></>
                  }
                </div>
              )}

              {status === 'past_due' && (
                <div className="flex items-center gap-1.5 text-sm text-destructive">
                  <AlertTriangleIcon className="size-3.5 shrink-0" />
                  Pagamento com falha — atualize seu cartão no portal de assinatura.
                </div>
              )}
            </div>
          </div>

          {hasManageableSubscription && <PortalButton />}
        </div>
      </div>

      <Separator />

      {/* Grade de planos */}
      <div>
        <h2 className="mb-1 text-lg font-medium">Planos disponíveis</h2>
        <p className="mb-6 text-sm text-muted-foreground">
          Todos os planos incluem 14 dias grátis. Sem contrato, cancele quando quiser.
        </p>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {(plans ?? []).map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan as { id: PlanId; name: string; price_brl: number; max_os_per_month: number | null; max_users: number | null; has_whatsapp_bot: boolean; has_advanced_reports: boolean; has_multiple_branches: boolean; stripe_price_id: string }}
              currentPlanId={subscription?.plan_id ?? null}
              isPopular={plan.id === 'profissional'}
              hasStripeConfigured={hasStripeConfigured}
              hasStripeSubscription={!!subscription?.stripe_subscription_id}
              cancelAtPeriodEnd={(subscription?.cancel_at_period_end || !!subscription?.cancel_at) ?? false}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
