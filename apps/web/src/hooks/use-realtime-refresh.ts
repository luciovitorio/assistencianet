'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

/**
 * Subscribes to Supabase Realtime changes on a table and calls router.refresh()
 * so Server Components re-fetch data automatically.
 *
 * @param table  - Table name to watch (e.g. 'service_orders')
 * @param filter - Optional PostgREST filter string (e.g. 'id=eq.abc-123')
 */
export function useRealtimeRefresh(table: string, filter?: string) {
  const router = useRouter()

  React.useEffect(() => {
    const supabase = createClient()
    const channelName = filter ? `realtime:${table}:${filter}` : `realtime:${table}`

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table, ...(filter ? { filter } : {}) },
        () => {
          router.refresh()
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [table, filter, router])
}
