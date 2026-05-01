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
  useEffect(() => {
    setConfig(config)
    return () => setConfig(null)
  }, [config, setConfig])
}

export function useHeaderSlotConfig(): HeaderConfig | null {
  return useContext(HeaderSlotContext).config
}
