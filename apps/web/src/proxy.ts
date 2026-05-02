import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { hasSubscriptionAccess, isTrialActive } from '@/lib/stripe/plans'
import { createAdminClient } from '@/lib/supabase/admin'

const PUBLIC_ROUTES = [
  '/login',
  '/register',
  '/verify-email',
  '/auth',
  '/funcionalidades',
  '/sobre-nos',
  '/em-construcao',
  '/contato',
  '/privacidade',
  '/termos-de-uso',
  '/cookies',
  '/recursos-api-whatsapp.html',
  '/recursos-dashboard-admin.html',
  '/sem-plano',
]

const PUBLIC_FILE_ROUTES = [
  '/robots.txt',
  '/sitemap.xml',
  '/opengraph-image',
  '/twitter-image',
  '/icon',
  '/apple-icon',
  '/brand-icon',
]

type BillingPlan = {
  has_whatsapp_bot: boolean
  has_advanced_reports: boolean
  has_multiple_branches: boolean
  max_users: number | null
}

type BillingSubscription = {
  status: string | null
  trial_ends_at: string | null
  plan_id: string | null
}

async function getBillingAccess(
  companyId: string,
) {
  const adminSupabase = createAdminClient()
  const { data: subscription } = await adminSupabase
    .from('subscriptions')
    .select('status, trial_ends_at, plan_id')
    .eq('company_id', companyId)
    .maybeSingle()
  const subscriptionRecord = subscription as BillingSubscription | null

  if (!hasSubscriptionAccess(subscriptionRecord)) {
    return {
      active: false,
      hasWhatsAppBot: false,
      hasAdvancedReports: false,
      hasMultipleBranches: false,
      hasFinancialModule: false,
      maxUsers: 0,
    }
  }

  if (isTrialActive(subscriptionRecord)) {
    return {
      active: true,
      hasWhatsAppBot: true,
      hasAdvancedReports: true,
      hasMultipleBranches: true,
      hasFinancialModule: true,
      maxUsers: null,
    }
  }

  if (!subscriptionRecord?.plan_id) {
    return {
      active: false,
      hasWhatsAppBot: false,
      hasAdvancedReports: false,
      hasMultipleBranches: false,
      hasFinancialModule: false,
      maxUsers: 0,
    }
  }

  const { data: plan } = await adminSupabase
    .from('plans')
    .select('has_whatsapp_bot, has_advanced_reports, has_multiple_branches, max_users')
    .eq('id', subscriptionRecord.plan_id)
    .maybeSingle()
  const planRecord = plan as BillingPlan | null

  return {
    active: true,
    hasWhatsAppBot: Boolean(planRecord?.has_whatsapp_bot),
    hasAdvancedReports: Boolean(planRecord?.has_advanced_reports),
    hasMultipleBranches: Boolean(planRecord?.has_multiple_branches),
    hasFinancialModule: subscriptionRecord.plan_id !== 'basico',
    maxUsers: planRecord?.max_users ?? 0,
  }
}

async function canUserOccupyBillingSeat(
  companyId: string,
  userId: string,
  maxUsers: number | null,
) {
  if (maxUsers === null) return true
  if (maxUsers <= 0) return false

  const adminSupabase = createAdminClient()
  const [{ data: company }, { data: employees }] = await Promise.all([
    adminSupabase
      .from('companies')
      .select('owner_id')
      .eq('id', companyId)
      .maybeSingle(),
    adminSupabase
      .from('employees')
      .select('user_id, created_at')
      .eq('company_id', companyId)
      .eq('active', true)
      .is('deleted_at', null)
      .not('user_id', 'is', null)
      .order('created_at', { ascending: true }),
  ])

  const allowedUserIds: string[] = []
  const ownerId = (company as { owner_id?: string } | null)?.owner_id
  if (ownerId) allowedUserIds.push(ownerId)

  for (const employee of (employees ?? []) as { user_id: string | null }[]) {
    if (employee.user_id && !allowedUserIds.includes(employee.user_id)) {
      allowedUserIds.push(employee.user_id)
    }
  }

  return allowedUserIds.slice(0, maxUsers).includes(userId)
}

function getBlockedPlanFeature(pathname: string, access: Awaited<ReturnType<typeof getBillingAccess>>) {
  if (pathname.startsWith('/dashboard/relatorios') && !access.hasAdvancedReports) {
    return 'advanced_reports'
  }

  if (pathname.startsWith('/dashboard/financeiro') && !access.hasFinancialModule) {
    return 'financial_module'
  }

  if (
    (
      pathname.startsWith('/dashboard/atendimento') ||
      pathname.startsWith('/dashboard/configuracoes/bot') ||
      pathname.startsWith('/dashboard/configuracoes/automacao')
    ) &&
    !access.hasWhatsAppBot
  ) {
    return 'whatsapp_bot'
  }

  return null
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  let response = NextResponse.next({ request })

  if (PUBLIC_FILE_ROUTES.some((route) => pathname.startsWith(route))) {
    return response
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (user?.app_metadata?.role) {
    const { data: employee } = await supabase
      .from('employees')
      .select('active, company_id')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .maybeSingle()

    if (!employee?.active) {
      await supabase.auth.signOut()
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  // Prevent logged in users from accessing auth pages and landing page
  const AUTH_PAGES = ['/login', '/register']
  if (user && (pathname === '/' || AUTH_PAGES.some((r) => pathname.startsWith(r)))) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Allow other public routes and static assets for unauthenticated users
  const isPublic = PUBLIC_ROUTES.some((r) => pathname.startsWith(r))
  if (isPublic || pathname === '/') {
    return response
  }

  // Not authenticated and trying to access protected route → redirect to login
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Usuários com troca de senha pendente só podem acessar a própria página
  if (user.app_metadata?.force_password_change && pathname !== '/dashboard/alterar-senha') {
    return NextResponse.redirect(new URL('/dashboard/alterar-senha', request.url))
  }

  // Authenticated user accessing onboarding routes — allow
  if (pathname.startsWith('/onboarding')) {
    return response
  }

  // Authenticated user accessing dashboard — check onboarding + subscription
  if (pathname.startsWith('/dashboard')) {
    // Funcionários não passam por onboarding, mas obedecem ao billing da empresa.
    if (user.app_metadata?.role) {
      const { data: employee } = await supabase
        .from('employees')
        .select('company_id')
        .eq('user_id', user.id)
        .eq('active', true)
        .is('deleted_at', null)
        .maybeSingle()

      if (!employee?.company_id) {
        await supabase.auth.signOut()
        return NextResponse.redirect(new URL('/login', request.url))
      }

      const billingAccess = await getBillingAccess(employee.company_id)
      if (!billingAccess.active || getBlockedPlanFeature(pathname, billingAccess)) {
        return NextResponse.redirect(new URL('/sem-plano', request.url))
      }

      const userSeatAllowed = await canUserOccupyBillingSeat(
        employee.company_id,
        user.id,
        billingAccess.maxUsers,
      )

      if (!userSeatAllowed) {
        return NextResponse.redirect(new URL('/sem-plano', request.url))
      }

      return response
    }

    const { data: company } = await supabase
      .from('companies')
      .select('id, onboarding_completed, onboarding_step')
      .eq('owner_id', user.id)
      .single()

    if (!company || !company.onboarding_completed) {
      const step = company?.onboarding_step ?? 0
      const routes = [
        '/onboarding/empresa',
        '/onboarding/empresa',
        '/onboarding/filiais',
        '/onboarding/horarios',
        '/onboarding/conclusao',
      ]
      return NextResponse.redirect(new URL(routes[step], request.url))
    }

    // Página de assinatura é sempre acessível para owners (para que possam assinar)
    if (pathname === '/dashboard/assinatura') {
      return response
    }

    const billingAccess = await getBillingAccess(company.id)

    if (!billingAccess.active) {
      return NextResponse.redirect(new URL('/dashboard/assinatura', request.url))
    }

    if (getBlockedPlanFeature(pathname, billingAccess)) {
      return NextResponse.redirect(new URL('/dashboard/assinatura', request.url))
    }
  }

  return response
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)'],
}
