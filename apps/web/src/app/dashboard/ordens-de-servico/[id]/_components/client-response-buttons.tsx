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
  const [pendingResponse, setPendingResponse] = React.useState<'aprovado' | 'reprovado' | null>(null)

  const handle = (response: 'aprovado' | 'reprovado') => {
    const loadingToastId = toast.loading(
      response === 'aprovado'
        ? `Registrando aprovação da OS #${serviceOrderNumber}...`
        : `Registrando recusa da OS #${serviceOrderNumber}...`
    )
    setPendingResponse(response)
    startTransition(async () => {
      try {
        const result = await registerClientResponse(serviceOrderId, response)
        if (result?.error) {
          toast.error(result.error, { id: loadingToastId })
        } else {
          toast.success(
            response === 'aprovado'
              ? `OS #${serviceOrderNumber}: orçamento aprovado pelo cliente.`
              : `OS #${serviceOrderNumber}: orçamento recusado pelo cliente.`,
            { id: loadingToastId }
          )
          router.refresh()
        }
      } catch (error: unknown) {
        toast.error(
          error instanceof Error ? error.message : 'Erro ao registrar resposta do cliente.',
          { id: loadingToastId }
        )
      } finally {
        setPendingResponse(null)
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
        disabled={isPending || pendingResponse !== null}
        loading={pendingResponse === 'aprovado'}
        onClick={() => handle('aprovado')}
        className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
      >
        <ThumbsUp className="size-3.5" />
        Cliente aprovou
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={isPending || pendingResponse !== null}
        loading={pendingResponse === 'reprovado'}
        onClick={() => handle('reprovado')}
        className="gap-1.5 border-rose-200 text-rose-700 hover:bg-rose-50"
      >
        <ThumbsDown className="size-3.5" />
        Cliente reprovou
      </Button>
    </div>
  )
}
