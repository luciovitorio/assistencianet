'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ThumbsDown, ThumbsUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { registerClientResponse } from '@/app/actions/service-orders'

interface ClientResponseButtonsProps {
  serviceOrderId: string
  serviceOrderNumber: number
}

export function ClientResponseButtons({ serviceOrderId, serviceOrderNumber }: ClientResponseButtonsProps) {
  const router = useRouter()
  const [isPending, startTransition] = React.useTransition()

  const handle = (response: 'aprovado' | 'reprovado') => {
    startTransition(async () => {
      const result = await registerClientResponse(serviceOrderId, response)
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success(
          response === 'aprovado'
            ? `OS #${serviceOrderNumber}: orçamento aprovado pelo cliente.`
            : `OS #${serviceOrderNumber}: orçamento recusado pelo cliente.`
        )
        router.refresh()
      }
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3">
      <p className="text-sm font-medium text-muted-foreground mr-1">
        O cliente entrou em contato?
      </p>
      <Button
        size="sm"
        disabled={isPending}
        onClick={() => handle('aprovado')}
        className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
      >
        <ThumbsUp className="size-3.5" />
        Cliente aprovou
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={isPending}
        onClick={() => handle('reprovado')}
        className="gap-1.5 border-rose-200 text-rose-700 hover:bg-rose-50"
      >
        <ThumbsDown className="size-3.5" />
        Cliente reprovou
      </Button>
    </div>
  )
}
