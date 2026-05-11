'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'

export type HeaderConfig = {
  backHref: string
  backLabel: string
  title: string
  badge?: string
  osNumber?: string
}

type HeaderSlotContextValue = {
  config: HeaderConfig | null
  setConfig: (config: HeaderConfig | null) => void
}

const HeaderSlotContext = createContext<HeaderSlotContextValue>({
  config: null,
  setConfig: () => {},
})

export function HeaderSlotProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfigState] = useState<HeaderConfig | null>(null)
  const setConfig = useCallback((c: HeaderConfig | null) => setConfigState(c), [])
  return (
    <HeaderSlotContext.Provider value={{ config, setConfig }}>
      {children}
    </HeaderSlotContext.Provider>
  )
}

export function useHeaderSlot(config: HeaderConfig | null) {
  const { setConfig } = useContext(HeaderSlotContext)
  const backHref = config?.backHref
  const backLabel = config?.backLabel
  const title = config?.title
  const badge = config?.badge
  const osNumber = config?.osNumber
  useEffect(() => {
    if (backHref !== undefined && backLabel !== undefined && title !== undefined) {
      setConfig({ backHref, backLabel, title, badge, osNumber })
    } else {
      setConfig(null)
    }
    return () => setConfig(null)
  }, [backHref, backLabel, title, badge, osNumber, setConfig])
}

export function useHeaderSlotConfig(): HeaderConfig | null {
  return useContext(HeaderSlotContext).config
}
