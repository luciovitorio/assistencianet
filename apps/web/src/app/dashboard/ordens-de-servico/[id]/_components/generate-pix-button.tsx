'use client'

import { useState, useTransition } from 'react'
import { QrCode } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { generatePixChargeForOs } from '@/app/actions/asaas-settings'

export function GeneratePixButton({ osId }: { osId: string }) {
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    setMessage(null)
    startTransition(async () => {
      const result = await generatePixChargeForOs(osId)
      if ('error' in result) {
        setMessage({ type: 'error', text: result.error })
      } else {
        setMessage({ type: 'success', text: 'Cobrança PIX gerada! Recarregue a página para ver o QR Code.' })
      }
    })
  }

  return (
    <div className="space-y-2">
      <Button
        variant="outline"
        size="sm"
        className="w-full gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
        onClick={handleClick}
        disabled={isPending}
      >
        <QrCode className="size-3.5" />
        {isPending ? 'Gerando PIX…' : 'Gerar cobrança PIX'}
      </Button>
      {message && (
        <p className={`text-[11px] leading-4 ${message.type === 'error' ? 'text-red-600' : 'text-emerald-600'}`}>
          {message.text}
        </p>
      )}
    </div>
  )
}
