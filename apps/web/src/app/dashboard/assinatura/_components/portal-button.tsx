'use client'

import { useTransition } from 'react'
import { createPortalSession } from '@/app/actions/billing'
import { Button } from '@/components/ui/button'
import { ExternalLinkIcon } from 'lucide-react'

export function PortalButton() {
  const [isPending, startTransition] = useTransition()

  return (
    <Button
      variant="outline"
      disabled={isPending}
      onClick={() => startTransition(() => void createPortalSession())}
    >
      <ExternalLinkIcon className="mr-2 size-4" />
      {isPending ? 'Abrindo portal…' : 'Gerenciar assinatura'}
    </Button>
  )
}
