'use client'

import { useMemo } from 'react'
import { useHeaderSlot } from '@/app/dashboard/_components/header-slot'

interface ServiceOrderHeaderSlotProps {
  number: number
}

export function ServiceOrderHeaderSlot({ number }: ServiceOrderHeaderSlotProps) {
  const config = useMemo(
    () => ({
      backHref: '/dashboard/ordens-de-servico',
      backLabel: 'Ordens de Serviço',
      title: 'Detalhe da OS',
      osNumber: String(number),
    }),
    [number],
  )
  useHeaderSlot(config)
  return null
}
