'use client'

import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button-variants'
import { cn } from '@/lib/utils'

export function LandingHeader() {
  return (
    <header className="border-b">
      <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
        <span className="text-lg font-bold">AssistênciaNet</span>
        <div className="flex items-center gap-3">
          <Link href="/login" className={cn(buttonVariants({ variant: 'ghost' }))}>
            Entrar
          </Link>
          <Link href="/register" className={cn(buttonVariants())}>
            Criar conta
          </Link>
        </div>
      </div>
    </header>
  )
}
