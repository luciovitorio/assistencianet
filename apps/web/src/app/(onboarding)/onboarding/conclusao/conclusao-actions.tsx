'use client'

import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button-variants'
import { cn } from '@/lib/utils'

export function ConclusaoActions() {
  return (
    <Link href="/dashboard" className={cn(buttonVariants(), 'w-full justify-center')}>
      Ir para o Dashboard
    </Link>
  )
}
