export type PlanId = 'basico' | 'profissional' | 'empresarial'
export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'incomplete'

export const ACTIVE_STATUSES: SubscriptionStatus[] = ['trialing', 'active', 'past_due']

export function isSubscriptionActive(status: string | null | undefined): boolean {
  if (!status) return false
  return ACTIVE_STATUSES.includes(status as SubscriptionStatus)
}

export type SubscriptionAccessRecord = {
  status: string | null
  trial_ends_at: string | null
}

export function isTrialActive(subscription: SubscriptionAccessRecord | null | undefined): boolean {
  if (!subscription || subscription.status !== 'trialing') return false
  return !subscription.trial_ends_at || new Date(subscription.trial_ends_at) > new Date()
}

export function hasSubscriptionAccess(subscription: SubscriptionAccessRecord | null | undefined): boolean {
  if (!subscription || !isSubscriptionActive(subscription.status)) return false
  if (subscription.status === 'trialing') return isTrialActive(subscription)
  return true
}

export const TRIAL_DAYS = 14

export function getUpgradePlanName(planId: PlanId | null | undefined): string | null {
  if (planId === 'basico') return 'Profissional'
  if (planId === 'profissional') return 'Empresarial'
  return null
}
