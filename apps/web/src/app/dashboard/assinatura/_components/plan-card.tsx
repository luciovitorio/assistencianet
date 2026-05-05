'use client'

import { useTransition } from 'react'
import { createCheckoutSession } from '@/app/actions/billing'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckIcon, AlertTriangleIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PlanId } from '@/lib/stripe/plans'

type Plan = {
  id: PlanId
  name: string
  price_brl: number
  max_os_per_month: number | null
  max_users: number | null
  has_whatsapp_bot: boolean
  has_advanced_reports: boolean
  has_multiple_branches: boolean
  stripe_price_id: string
}

type CurrentUsage = {
  seats: number
  branches: number
}

type Props = {
  plan: Plan
  currentPlanId: string | null
  isPopular?: boolean
  hasStripeConfigured: boolean
  hasStripeSubscription: boolean
  cancelAtPeriodEnd: boolean
  currentUsage: CurrentUsage
}

export function PlanCard({ plan, currentPlanId, isPopular, hasStripeConfigured, hasStripeSubscription, cancelAtPeriodEnd, currentUsage }: Props) {
  const [isPending, startTransition] = useTransition()
  const isCurrent = hasStripeSubscription && currentPlanId === plan.id
  const isCanceling = isCurrent && cancelAtPeriodEnd

  const warnings: string[] = []
  if (!plan.has_multiple_branches && currentUsage.branches > 1) {
    const excess = currentUsage.branches - 1
    warnings.push(
      `Você tem ${currentUsage.branches} filiais ativas. Este plano permite apenas 1 — será necessário desativar ${excess} após assinar.`
    )
  }
  if (plan.max_users !== null && currentUsage.seats > plan.max_users) {
    const excess = currentUsage.seats - plan.max_users
    warnings.push(
      `Você tem ${currentUsage.seats} usuários ativos. Este plano permite até ${plan.max_users} — será necessário desativar ${excess} após assinar.`
    )
  }

  const features = [
    plan.id === 'empresarial' ? 'Tudo do Profissional' : null,
    plan.max_os_per_month ? `Até ${plan.max_os_per_month} OS por mês` : 'OS ilimitadas',
    'Cadastro ilimitado de clientes',
    plan.id === 'basico' ? 'Controle básico de estoque' : 'Estoque com alertas de mínimo',
    plan.max_users ? (plan.max_users === 1 ? '1 usuário' : `Até ${plan.max_users} usuários`) : 'Usuários ilimitados',
    plan.id !== 'basico' ? 'Módulo financeiro' : null,
    plan.has_whatsapp_bot ? 'Bot WhatsApp incluído' : null,
    plan.has_advanced_reports ? 'Relatórios completos + exportação' : null,
    plan.has_multiple_branches ? 'Múltiplas unidades' : null,
    plan.id === 'empresarial' ? 'API e integrações avançadas' : null,
    plan.id === 'empresarial' ? 'Suporte prioritário' : null,
    plan.id === 'empresarial' ? 'Onboarding personalizado' : null,
  ].filter(Boolean) as string[]

  const unavailable = [
    plan.id === 'basico' ? 'Alertas de estoque mínimo' : null,
    plan.id === 'basico' ? 'Módulo financeiro' : null,
    !plan.has_whatsapp_bot ? 'Bot WhatsApp' : null,
    !plan.has_advanced_reports ? 'Relatórios avançados' : null,
    !plan.has_multiple_branches ? 'Múltiplas unidades' : null,
  ].filter(Boolean) as string[]

  const hasCents = plan.price_brl % 100 !== 0
  const priceDisplay = (plan.price_brl / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: hasCents ? 2 : 0,
  })

  function handleCheckout() {
    const formData = new FormData()
    formData.set('plan_id', plan.id)
    startTransition(() => void createCheckoutSession(null, formData))
  }

  return (
    <div
      className={cn(
        'relative flex flex-col rounded-xl border bg-card p-6 shadow-sm transition-shadow hover:shadow-md',
        isPopular && 'border-primary shadow-md ring-1 ring-primary'
      )}
    >
      {isPopular && (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 px-3">
          Mais popular
        </Badge>
      )}

      <div className="mb-4">
        <p className={cn('text-sm font-semibold uppercase tracking-wide text-muted-foreground', isPopular && 'text-primary')}>
          {plan.name}
        </p>
        <p className="mt-1 flex items-baseline gap-1">
          <span className="text-sm text-muted-foreground">R$</span>
          <span className="text-4xl font-bold">{priceDisplay}</span>
          <span className="text-sm text-muted-foreground">/mês</span>
        </p>
      </div>

      <ul className="mb-6 flex-1 space-y-2">
        {features.map((f) => (
          <li key={f} className="flex items-center gap-2 text-sm">
            <CheckIcon className="size-4 shrink-0 text-primary" />
            {f}
          </li>
        ))}
        {unavailable.map((f) => (
          <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground line-through">
            <CheckIcon className="size-4 shrink-0 opacity-30" />
            {f}
          </li>
        ))}
      </ul>

      {warnings.length > 0 && (
        <div className="mb-4 space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
          {warnings.map((w) => (
            <div key={w} className="flex items-start gap-2">
              <AlertTriangleIcon className="mt-0.5 size-3.5 shrink-0 text-amber-600" />
              <p className="text-xs leading-5 text-amber-800">{w}</p>
            </div>
          ))}
        </div>
      )}

      {isCanceling ? (
        <Button variant="outline" disabled className="w-full border-destructive/40 text-destructive hover:text-destructive">
          <AlertTriangleIcon className="mr-2 size-4" />
          Cancelamento agendado
        </Button>
      ) : isCurrent ? (
        <Button variant="outline" disabled className="w-full">
          Plano atual
        </Button>
      ) : !hasStripeConfigured || !plan.stripe_price_id ? (
        <Button variant="outline" disabled className="w-full">
          Em breve
        </Button>
      ) : (
        <Button
          onClick={handleCheckout}
          disabled={isPending}
          className="w-full"
          variant={isPopular ? 'default' : 'outline'}
        >
          {isPending ? 'Redirecionando…' : 'Assinar agora'}
        </Button>
      )}
    </div>
  )
}
