'use client'

import { Loader2 } from 'lucide-react'
import { useFormStatus } from 'react-dom'

export function LogoutButton() {
  const { pending } = useFormStatus()

  return (
    <button
      title="Sair"
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="flex items-center gap-1.5 p-2 text-muted-foreground hover:text-destructive transition-colors cursor-pointer font-medium text-sm disabled:opacity-60 disabled:cursor-wait"
    >
      {pending && <Loader2 className="size-3.5 animate-spin" aria-hidden />}
      {pending ? 'Saindo...' : 'Sair'}
    </button>
  )
}
