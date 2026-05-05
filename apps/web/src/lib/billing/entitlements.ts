import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'
import type { PlanId } from '@/lib/stripe/plans'
import { hasSubscriptionAccess, isTrialActive } from '@/lib/stripe/plans'
import { createAdminClient } from '@/lib/supabase/admin'

type SupabaseServerClient = SupabaseClient<Database>

type PlanRow = {
  id: string
  name: string
  max_os_per_month: number | null
  max_users: number | null
  has_whatsapp_bot: boolean
  has_advanced_reports: boolean
  has_multiple_branches: boolean
}

type SubscriptionRow = {
  status: string | null
  trial_ends_at: string | null
  plan_id: string | null
}

export type BillingFeature =
  | 'whatsapp_bot'
  | 'advanced_reports'
  | 'multiple_branches'
  | 'stock_alerts'
  | 'financial_module'

export type SubscriptionAccess = {
  active: boolean
  trial: boolean
  planId: PlanId | null
  planName: string | null
  maxOsPerMonth: number | null
  maxUsers: number | null
  hasWhatsAppBot: boolean
  hasAdvancedReports: boolean
  hasMultipleBranches: boolean
  hasStockAlerts: boolean
  hasFinancialModule: boolean
}

const INACTIVE_ACCESS: SubscriptionAccess = {
  active: false,
  trial: false,
  planId: null,
  planName: null,
  maxOsPerMonth: 0,
  maxUsers: 0,
  hasWhatsAppBot: false,
  hasAdvancedReports: false,
  hasMultipleBranches: false,
  hasStockAlerts: false,
  hasFinancialModule: false,
}

const TRIAL_ACCESS: SubscriptionAccess = {
  active: true,
  trial: true,
  planId: null,
  planName: 'Teste grátis',
  maxOsPerMonth: null,
  maxUsers: null,
  hasWhatsAppBot: true,
  hasAdvancedReports: true,
  hasMultipleBranches: true,
  hasStockAlerts: true,
  hasFinancialModule: true,
}

export const SUBSCRIPTION_REQUIRED_MESSAGE =
  'Seu período de teste terminou. Escolha um plano para continuar usando o sistema.'

const FEATURE_MESSAGES: Record<BillingFeature, string> = {
  whatsapp_bot: 'Este recurso está disponível nos planos Profissional e Empresarial.',
  advanced_reports: 'Relatórios completos estão disponíveis nos planos Profissional e Empresarial.',
  multiple_branches: 'Múltiplas unidades estão disponíveis apenas no plano Empresarial.',
  stock_alerts: 'Alertas de estoque mínimo estão disponíveis nos planos Profissional e Empresarial.',
  financial_module: 'O módulo financeiro está disponível nos planos Profissional e Empresarial.',
}

const getMonthBounds = (date = new Date()) => {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1))
  const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1))
  return {
    start: start.toISOString(),
    end: end.toISOString(),
  }
}

export async function getCompanySubscriptionAccess(
  supabase: SupabaseServerClient,
  companyId: string,
): Promise<SubscriptionAccess> {
  let { data: subscription, error: subscriptionError } = await supabase
    .from('subscriptions')
    .select('status, trial_ends_at, plan_id')
    .eq('company_id', companyId)
    .maybeSingle<SubscriptionRow>()

  if (!subscriptionError && !subscription) {
    const billingSupabase = createAdminClient()
    const fallback = await billingSupabase
      .from('subscriptions')
      .select('status, trial_ends_at, plan_id')
      .eq('company_id', companyId)
      .maybeSingle<SubscriptionRow>()

    subscription = fallback.data
    subscriptionError = fallback.error
  }

  if (subscriptionError) throw subscriptionError
  if (!hasSubscriptionAccess(subscription)) return INACTIVE_ACCESS
  // Trial sem plano ainda = período gratuito inicial com acesso total
  // Trial com plano = Stripe trial de plano pago; usa limites do plano
  if (isTrialActive(subscription) && !subscription?.plan_id) return TRIAL_ACCESS
  if (!subscription?.plan_id) return INACTIVE_ACCESS

  let { data: plan, error: planError } = await supabase
    .from('plans')
    .select('id, name, max_os_per_month, max_users, has_whatsapp_bot, has_advanced_reports, has_multiple_branches')
    .eq('id', subscription.plan_id)
    .maybeSingle<PlanRow>()

  if (!planError && !plan) {
    const billingSupabase = createAdminClient()
    const fallback = await billingSupabase
      .from('plans')
      .select('id, name, max_os_per_month, max_users, has_whatsapp_bot, has_advanced_reports, has_multiple_branches')
      .eq('id', subscription.plan_id)
      .maybeSingle<PlanRow>()

    plan = fallback.data
    planError = fallback.error
  }

  if (planError) throw planError
  if (!plan) return INACTIVE_ACCESS

  const planId = plan.id as PlanId

  return {
    active: true,
    trial: false,
    planId,
    planName: plan.name,
    maxOsPerMonth: plan.max_os_per_month,
    maxUsers: plan.max_users,
    hasWhatsAppBot: plan.has_whatsapp_bot,
    hasAdvancedReports: plan.has_advanced_reports,
    hasMultipleBranches: plan.has_multiple_branches,
    hasStockAlerts: planId !== 'basico',
    hasFinancialModule: planId !== 'basico',
  }
}

export async function assertSubscriptionAccess(
  supabase: SupabaseServerClient,
  companyId: string,
): Promise<SubscriptionAccess> {
  const access = await getCompanySubscriptionAccess(supabase, companyId)
  if (!access.active) throw new Error(SUBSCRIPTION_REQUIRED_MESSAGE)
  return access
}

export async function assertBillingFeature(
  supabase: SupabaseServerClient,
  companyId: string,
  feature: BillingFeature,
): Promise<SubscriptionAccess> {
  const access = await assertSubscriptionAccess(supabase, companyId)
  const allowed = {
    whatsapp_bot: access.hasWhatsAppBot,
    advanced_reports: access.hasAdvancedReports,
    multiple_branches: access.hasMultipleBranches,
    stock_alerts: access.hasStockAlerts,
    financial_module: access.hasFinancialModule,
  }[feature]

  if (!allowed) throw new Error(FEATURE_MESSAGES[feature])
  return access
}

export async function canUseStockAlerts(
  supabase: SupabaseServerClient,
  companyId: string,
) {
  const access = await getCompanySubscriptionAccess(supabase, companyId)
  return access.active && access.hasStockAlerts
}

export async function assertCanCreateServiceOrder(
  supabase: SupabaseServerClient,
  companyId: string,
) {
  const access = await assertSubscriptionAccess(supabase, companyId)
  if (access.maxOsPerMonth === null) return

  const used = await getCurrentMonthServiceOrderCount(supabase, companyId)

  if (used >= access.maxOsPerMonth) {
    throw new Error(
      `Seu plano permite até ${access.maxOsPerMonth} OS por mês. Você já atingiu esse limite neste mês.`,
    )
  }
}

async function getCurrentMonthServiceOrderCount(
  supabase: SupabaseServerClient,
  companyId: string,
) {
  const { start, end } = getMonthBounds()
  const { count, error } = await supabase
    .from('service_orders')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .gte('created_at', start)
    .lt('created_at', end)

  if (error) throw error
  return count ?? 0
}

export async function getBillingServiceOrderUsage(
  supabase: SupabaseServerClient,
  companyId: string,
) {
  const access = await getCompanySubscriptionAccess(supabase, companyId)
  const used = await getCurrentMonthServiceOrderCount(supabase, companyId)

  return {
    used,
    limit: access.maxOsPerMonth,
    reached: access.maxOsPerMonth !== null && used >= access.maxOsPerMonth,
    planName: access.planName,
    planId: access.planId,
  }
}

async function getActiveUserSeatCount(
  supabase: SupabaseServerClient,
  companyId: string,
) {
  const [{ data: company, error: companyError }, { data: employees, error: employeesError }] =
    await Promise.all([
      supabase
        .from('companies')
        .select('owner_id')
        .eq('id', companyId)
        .single<{ owner_id: string }>(),
      supabase
        .from('employees')
        .select('user_id')
        .eq('company_id', companyId)
        .eq('active', true)
        .is('deleted_at', null)
        .not('user_id', 'is', null),
    ])

  if (companyError) throw companyError
  if (employeesError) throw employeesError

  const activeUserIds = new Set<string>()
  if (company?.owner_id) activeUserIds.add(company.owner_id)

  for (const employee of employees ?? []) {
    if (employee.user_id) activeUserIds.add(employee.user_id)
  }

  return activeUserIds.size
}

export async function getBillingSeatUsage(
  supabase: SupabaseServerClient,
  companyId: string,
) {
  const access = await getCompanySubscriptionAccess(supabase, companyId)
  const used = await getActiveUserSeatCount(supabase, companyId)

  return {
    used,
    limit: access.maxUsers,
    reached: access.maxUsers !== null && used >= access.maxUsers,
    planName: access.planName,
    planId: access.planId,
  }
}

export async function getBillingBranchUsage(
  supabase: SupabaseServerClient,
  companyId: string,
) {
  const access = await getCompanySubscriptionAccess(supabase, companyId)
  const { count, error } = await supabase
    .from('branches')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .eq('active', true)
    .is('deleted_at', null)

  if (error) throw error

  const used = count ?? 0
  const limit = access.hasMultipleBranches ? null : 1

  return {
    used,
    limit,
    reached: limit !== null && used >= limit,
    planName: access.planName,
    planId: access.planId,
  }
}

export async function assertCanCreateEmployee(
  supabase: SupabaseServerClient,
  companyId: string,
) {
  const access = await assertSubscriptionAccess(supabase, companyId)
  if (access.maxUsers === null) return

  const activeUserCount = await getActiveUserSeatCount(supabase, companyId)

  if (activeUserCount >= access.maxUsers) {
    throw new Error(
      `Seu plano permite até ${access.maxUsers} usuário${access.maxUsers === 1 ? '' : 's'}. Altere o plano para cadastrar novos funcionários.`,
    )
  }
}

export async function assertCanCreateEmployeeAccess(
  supabase: SupabaseServerClient,
  companyId: string,
) {
  await assertCanCreateEmployee(supabase, companyId)
}

export async function assertCanCreateBranch(
  supabase: SupabaseServerClient,
  companyId: string,
) {
  const access = await assertSubscriptionAccess(supabase, companyId)
  if (access.hasMultipleBranches) return

  const { count, error } = await supabase
    .from('branches')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .eq('active', true)
    .is('deleted_at', null)

  if (error) throw error
  if ((count ?? 0) >= 1) throw new Error(FEATURE_MESSAGES.multiple_branches)
}
