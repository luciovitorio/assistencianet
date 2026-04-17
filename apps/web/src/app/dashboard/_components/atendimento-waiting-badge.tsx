'use client'

import * as React from 'react'
import { getWaitingConversationsCount } from '@/app/actions/atendimento'
import { createClient } from '@/lib/supabase/client'

interface Props {
  companyId: string
  isExpanded: boolean
}

export function AtendimentoWaitingBadge({ companyId, isExpanded }: Props) {
  const [count, setCount] = React.useState(0)

  React.useEffect(() => {
    if (!companyId) return
    let cancelled = false

    const refresh = () => {
      getWaitingConversationsCount().then((n) => {
        if (!cancelled) setCount(n)
      })
    }

    refresh()

    const supabase = createClient()
    const channel = supabase
      .channel(`sidebar-atendimento-${companyId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'whatsapp_conversations',
          filter: `company_id=eq.${companyId}`,
        },
        refresh,
      )
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [companyId])

  if (count === 0) return null

  const label = count > 99 ? '99+' : String(count)

  if (!isExpanded) {
    return (
      <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 bg-destructive rounded-full text-[9px] text-white font-bold flex items-center justify-center px-1 leading-none">
        {label}
      </span>
    )
  }

  return (
    <span className="ml-auto mr-1 min-w-5 h-5 bg-destructive rounded-full text-[10px] text-white font-bold flex items-center justify-center px-1.5 leading-none">
      {label}
    </span>
  )
}
