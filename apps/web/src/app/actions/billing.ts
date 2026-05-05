'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStripe } from '@/lib/stripe/client'
import type { PlanId } from '@/lib/stripe/plans'

// ── Helpers internos ─────────────────────────────────────────────────────────

async function getAuthenticatedOwner() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: company } = await supabase
    .from('companies')
    .select('id, name, email')
    .eq('owner_id', user.id)
    .single()

  if (!company) redirect('/onboarding/empresa')

  return { user, company, supabase }
}

async function getOrCreateStripeCustomer(
  companyId: string,
  companyName: string,
  email: string
): Promise<string> {
  const adminSupabase = createAdminClient()

  const { data: sub } = await adminSupabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('company_id', companyId)
    .maybeSingle()

  if (sub?.stripe_customer_id) {
    try {
      const existing = await getStripe().customers.retrieve(sub.stripe_customer_id)
      if (!existing.deleted) return sub.stripe_customer_id
    } catch {
      // customer não existe mais no Stripe — recria abaixo
    }
  }

  const customer = await getStripe().customers.create({
    name: companyName,
    email,
    metadata: { company_id: companyId },
  })

  await adminSupabase
    .from('subscriptions')
    .update({ stripe_customer_id: customer.id })
    .eq('company_id', companyId)

  return customer.id
}

// ── Actions públicas ─────────────────────────────────────────────────────────

/**
 * Cria uma Stripe Checkout Session para o plano escolhido.
 * Redireciona o usuário para a página de pagamento do Stripe (hosted).
 */
export async function createCheckoutSession(_prev: unknown, formData: FormData) {
  const planId = formData.get('plan_id') as PlanId | null
  if (!planId || !['basico', 'profissional', 'empresarial'].includes(planId)) {
    return { error: 'Plano inválido.' }
  }

  const { user, company } = await getAuthenticatedOwner()

  // Busca o stripe_price_id do plano no banco
  const adminSupabase = createAdminClient()
  const { data: plan } = await adminSupabase
    .from('plans')
    .select('stripe_price_id, name')
    .eq('id', planId)
    .single()

  if (!plan?.stripe_price_id) {
    return { error: 'Plano não encontrado ou sem price configurado.' }
  }

  const email = company.email ?? user.email ?? ''
  const customerId = await getOrCreateStripeCustomer(company.id, company.name, email)

  const { data: currentSub } = await adminSupabase
    .from('subscriptions')
    .select('trial_ends_at')
    .eq('company_id', company.id)
    .maybeSingle()

  const trialEndsAt = currentSub?.trial_ends_at ? new Date(currentSub.trial_ends_at) : null
  const trialEndUnix =
    trialEndsAt && trialEndsAt > new Date()
      ? Math.floor(trialEndsAt.getTime() / 1000)
      : undefined

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3001'

  const session = await getStripe().checkout.sessions.create({
    customer: customerId,
    payment_method_types: ['card'],
    mode: 'subscription',
    line_items: [{ price: plan.stripe_price_id, quantity: 1 }],
    subscription_data: {
      ...(trialEndUnix ? { trial_end: trialEndUnix } : {}),
      metadata: {
        company_id: company.id,
        plan_id: planId,
      },
    },
    metadata: { company_id: company.id },
    success_url: `${baseUrl}/dashboard/assinatura?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/dashboard/assinatura?checkout=canceled`,
    allow_promotion_codes: true,
    locale: 'pt-BR',
  })

  if (!session.url) return { error: 'Erro ao criar sessão de pagamento.' }

  redirect(session.url)
}

/**
 * Cria uma Stripe Customer Portal Session para o tenant gerenciar
 * cartão, faturas e cancelamento sem precisar de código customizado.
 */
export async function createPortalSession() {
  const { company } = await getAuthenticatedOwner()

  const adminSupabase = createAdminClient()
  const { data: sub } = await adminSupabase
    .from('subscriptions')
    .select('stripe_customer_id, status')
    .eq('company_id', company.id)
    .maybeSingle()

  const MANAGEABLE_STATUSES = ['active', 'trialing', 'past_due']

  if (!sub?.stripe_customer_id || !MANAGEABLE_STATUSES.includes(sub.status ?? '')) {
    return { error: 'Sem assinatura ativa. Escolha um plano para continuar.' }
  }

  try {
    const existing = await getStripe().customers.retrieve(sub.stripe_customer_id)
    if (existing.deleted) return { error: 'Customer Stripe não encontrado. Inicie uma nova assinatura primeiro.' }
  } catch {
    return { error: 'Customer Stripe não encontrado. Inicie uma nova assinatura primeiro.' }
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3001'

  const portalSession = await getStripe().billingPortal.sessions.create({
    customer: sub.stripe_customer_id,
    return_url: `${baseUrl}/dashboard/assinatura?portal=return`,
  })

  redirect(portalSession.url)
}
