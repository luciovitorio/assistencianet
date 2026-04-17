'use client'

import * as React from 'react'
import { Printer, X } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'

export function ReceiptPrintActions() {
  const searchParams = useSearchParams()
  const hasAutoPrintedRef = React.useRef(false)

  React.useEffect(() => {
    if (searchParams.get('autoPrint') !== '1' || hasAutoPrintedRef.current) {
      return
    }

    hasAutoPrintedRef.current = true
    window.setTimeout(() => window.print(), 200)
  }, [searchParams])

  return (
    <div className="print:hidden flex items-center justify-end gap-2">
      <Button variant="outline" onClick={() => window.close()}>
        <X className="size-4" />
        Fechar
      </Button>
      <Button onClick={() => window.print()}>
        <Printer className="size-4" />
        Imprimir
      </Button>
    </div>
  )
}
