'use client'

import { useMemo } from 'react'
import { useHeaderSlot } from '@/app/dashboard/_components/header-slot'

interface ServiceOrderHeaderSlotProps {
  number: number
  backHref?: string
  backLabel?: string
}

export function ServiceOrderHeaderSlot({ number, backHref, backLabel }: ServiceOrderHeaderSlotProps) {
  const config = useMemo(
    () => ({
      backHref: backHref ?? '/dashboard/ordens-de-servico',
      backLabel: backLabel ?? 'Ordens de Serviço',
      title: 'Detalhe da OS',
      osNumber: String(number),
    }),
    [number, backHref, backLabel],
  )
  useHeaderSlot(config)
  return null
}
