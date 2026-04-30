import Stripe from 'stripe'

let _stripe: Stripe | null = null

// Lazy initialization — não lança erro na importação do módulo,
// só quando uma chamada real ao Stripe é feita.
export function getStripe(): Stripe {
  if (_stripe) return _stripe

  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY não configurada.')
  }

  _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2026-04-22.dahlia',
    typescript: true,
  })

  return _stripe
}
