export type PlanId = 'basico' | 'profissional' | 'empresarial'
export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'incomplete'

export const ACTIVE_STATUSES: SubscriptionStatus[] = ['trialing', 'active', 'past_due']

export function isSubscriptionActive(status: string | null | undefined): boolean {
  if (!status) return false
  return ACTIVE_STATUSES.includes(status as SubscriptionStatus)
}

export const TRIAL_DAYS = 14
