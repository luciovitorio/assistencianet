'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AuthInvitePage() {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    const params = new URLSearchParams(window.location.hash.slice(1))
    const access_token = params.get('access_token')
    const refresh_token = params.get('refresh_token')

    if (!access_token || !refresh_token) {
      router.replace('/login?error=invite_expired')
      return
    }

    supabase.auth
      .setSession({ access_token, refresh_token })
      .then(({ error }) => {
        if (error) {
          router.replace('/login?error=invite_expired')
        } else {
          router.replace('/dashboard')
        }
      })
  }, [router])

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F1F3F9]">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
          <span className="text-2xl text-white">S</span>
        </div>
        <div className="space-y-1">
          <p className="text-base font-semibold text-foreground">Configurando seu acesso…</p>
          <p className="text-sm text-muted-foreground">Aguarde um momento.</p>
        </div>
      </div>
    </div>
  )
}
