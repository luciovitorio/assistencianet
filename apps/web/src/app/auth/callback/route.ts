import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const supabase = await createClient()

  // Fluxo de convite: token_hash + type=invite
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')

  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as 'invite' | 'email' | 'magiclink' | 'recovery',
    })

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()
      // Funcionários têm role em app_metadata — vão direto ao dashboard
      if (user?.app_metadata?.role) {
        return NextResponse.redirect(`${origin}/dashboard`)
      }
      return NextResponse.redirect(`${origin}/dashboard`)
    }
  }

  // Fluxo OAuth / magic link: code
  const code = searchParams.get('code')

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()

      // Funcionários vão direto ao dashboard, sem onboarding
      if (user?.app_metadata?.role) {
        return NextResponse.redirect(`${origin}/dashboard`)
      }

      // Owners: verificar se completou onboarding
      const { data: company } = await supabase
        .from('companies')
        .select('onboarding_completed, onboarding_step')
        .eq('owner_id', user!.id)
        .single()

      if (!company || !company.onboarding_completed) {
        const step = company?.onboarding_step ?? 0
        const onboardingRoutes = [
          '/onboarding/empresa',
          '/onboarding/empresa',
          '/onboarding/filiais',
          '/onboarding/conclusao',
        ]
        return NextResponse.redirect(`${origin}${onboardingRoutes[step]}`)
      }

      return NextResponse.redirect(`${origin}/dashboard`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback`)
}
