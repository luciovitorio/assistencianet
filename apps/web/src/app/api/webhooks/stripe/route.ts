import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { getStripe } from '@/lib/stripe/client'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

// Stripe envia o body como raw text — NÃO usar request.json() aqui.
export async function POST(request: NextRequest) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')

  if (!sig) {
    return new NextResponse('Missing stripe-signature', { status: 400 })
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error('STRIPE_WEBHOOK_SECRET não configurada.')
    return new NextResponse('Webhook secret not configured', { status: 500 })
  }

  // ── 1. Verificação de assinatura (segurança crítica) ─────────────────
  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('Stripe webhook signature verification failed:', msg)
    return new NextResponse(`Webhook Error: ${msg}`, { status: 400 })
  }

  const supabase = createAdminClient()

  // ── 2. Idempotência — evita processamento duplicado ──────────────────
  const { data: alreadyProcessed } = await supabase
    .from('stripe_webhook_events')
    .select('id')
    .eq('id', event.id)
    .maybeSingle()

  if (alreadyProcessed) {
    return NextResponse.json({ received: true, duplicate: true })
  }

  // Registra ANTES de processar — se falhar, remove e retorna 500 para retry do Stripe
  await supabase.from('stripe_webhook_events').insert({ id: event.id, type: event.type })

  // ── 3. Handlers por tipo de evento ──────────────────────────────────
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(supabase, event.data.object as Stripe.Checkout.Session)
        break
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpsert(supabase, event.data.object as Stripe.Subscription)
        break
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(supabase, event.data.object as Stripe.Subscription)
        break
      case 'invoice.payment_failed':
        await handlePaymentFailed(supabase, event.data.object as Stripe.Invoice)
        break
    }
  } catch (err) {
    console.error(`Erro ao processar evento Stripe ${event.type} (${event.id}):`, err)
    // Remove o registro para que o Stripe possa retentar
    await supabase.from('stripe_webhook_events').delete().eq('id', event.id)
    return new NextResponse('Internal Server Error', { status: 500 })
  }

  return NextResponse.json({ received: true })
}

// ── Helpers ──────────────────────────────────────────────────────────────────

type SupabaseAdmin = ReturnType<typeof createAdminClient>

function periodFromSubscription(subscription: Stripe.Subscription) {
  // current_period_start/end migraram para o item no Stripe API 2026+
  const item = subscription.items?.data?.[0]
  return {
    current_period_start: item?.current_period_start
      ? new Date(item.current_period_start * 1000).toISOString()
      : null,
    current_period_end: item?.current_period_end
      ? new Date(item.current_period_end * 1000).toISOString()
      : null,
  }
}

async function handleCheckoutCompleted(
  supabase: SupabaseAdmin,
  session: Stripe.Checkout.Session
) {
  const companyId = session.metadata?.company_id
  if (!companyId || !session.subscription || !session.customer) return

  // Re-fetch da assinatura para garantir dados atualizados (não confia só no webhook)
  const subscription = await getStripe().subscriptions.retrieve(session.subscription as string, {
    expand: ['items'],
  })
  const planId = subscription.metadata?.plan_id ?? null

  await supabase
    .from('subscriptions')
    .update({
      stripe_customer_id: session.customer as string,
      stripe_subscription_id: subscription.id,
      plan_id: planId,
      status: subscription.status,
      trial_ends_at: subscription.trial_end
        ? new Date(subscription.trial_end * 1000).toISOString()
        : null,
      ...periodFromSubscription(subscription),
      cancel_at_period_end: subscription.cancel_at_period_end,
    })
    .eq('company_id', companyId)
}

async function handleSubscriptionUpsert(supabase: SupabaseAdmin, subscription: Stripe.Subscription) {
  const companyId = subscription.metadata?.company_id
  if (!companyId) return

  const planId = subscription.metadata?.plan_id ?? null

  await supabase
    .from('subscriptions')
    .update({
      stripe_subscription_id: subscription.id,
      plan_id: planId,
      status: subscription.status,
      trial_ends_at: subscription.trial_end
        ? new Date(subscription.trial_end * 1000).toISOString()
        : null,
      ...periodFromSubscription(subscription),
      cancel_at_period_end: subscription.cancel_at_period_end,
      cancel_at: subscription.cancel_at
        ? new Date(subscription.cancel_at * 1000).toISOString()
        : null,
    })
    .eq('company_id', companyId)
}

async function handleSubscriptionDeleted(supabase: SupabaseAdmin, subscription: Stripe.Subscription) {
  const companyId = subscription.metadata?.company_id
  if (!companyId) return

  await supabase
    .from('subscriptions')
    .update({ status: 'canceled', cancel_at_period_end: false })
    .eq('company_id', companyId)
}

async function handlePaymentFailed(supabase: SupabaseAdmin, invoice: Stripe.Invoice) {
  // No Stripe API 2026+, subscription_id fica em invoice.parent.subscription_details.subscription
  const subscriptionId = invoice.parent?.subscription_details?.subscription
  if (!subscriptionId) return

  const subscriptionIdStr = typeof subscriptionId === 'string' ? subscriptionId : subscriptionId.id

  // Re-fetch para pegar o status real
  const subscription = await getStripe().subscriptions.retrieve(subscriptionIdStr)
  const companyId = subscription.metadata?.company_id
  if (!companyId) return

  await supabase
    .from('subscriptions')
    .update({ status: subscription.status })
    .eq('company_id', companyId)
}
