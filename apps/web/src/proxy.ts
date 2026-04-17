import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const PUBLIC_ROUTES = ['/login', '/register', '/verify-email', '/auth']

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  let response = NextResponse.next({ request })

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
      .select('active')
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

  // Authenticated user accessing dashboard — check onboarding
  if (pathname.startsWith('/dashboard')) {
    // Funcionários (têm role em app_metadata) não passam por onboarding
    if (user.app_metadata?.role) {
      return response
    }

    const { data: company } = await supabase
      .from('companies')
      .select('onboarding_completed, onboarding_step')
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
  }

  return response
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
