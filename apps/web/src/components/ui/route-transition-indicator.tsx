'use client'

import * as React from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'

interface RouteTransitionContextValue {
  navigate: (href: string) => void
}

const RouteTransitionContext = React.createContext<RouteTransitionContextValue | null>(null)

function isPlainLeftClick(event: MouseEvent) {
  return (
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  )
}

function getInternalNavigationHref(event: MouseEvent) {
  if (event.defaultPrevented || !isPlainLeftClick(event)) return null

  const target = event.target
  if (!(target instanceof Element)) return null

  const anchor = target.closest('a[href]')
  if (!(anchor instanceof HTMLAnchorElement)) return null
  if (anchor.target && anchor.target !== '_self') return null
  if (anchor.hasAttribute('download')) return null

  const url = new URL(anchor.href)
  if (url.origin !== window.location.origin) return null

  const isSamePage =
    url.pathname === window.location.pathname &&
    url.search === window.location.search

  if (isSamePage) return null

  return `${url.pathname}${url.search}${url.hash}`
}

function NavigationVisual({ active }: { active: boolean }) {
  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      aria-hidden={!active}
      className={cn(
        'pointer-events-none fixed inset-x-0 top-0 z-[100] transition-opacity duration-150',
        active ? 'opacity-100' : 'opacity-0'
      )}
    >
      <div className="h-1 overflow-hidden bg-primary/10">
        <div className="route-progress-bar h-full w-1/3 bg-primary shadow-sm" />
      </div>
    </div>
  )
}

export function RouteTransitionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const search = searchParams.toString()
  const [clickedHref, setClickedHref] = React.useState<string | null>(null)
  const [isPending, startTransition] = React.useTransition()
  const currentHref = search ? `${pathname}?${search}` : pathname

  React.useEffect(() => {
    setClickedHref(null)
  }, [currentHref])

  React.useEffect(() => {
    if (!clickedHref) return

    const timeout = window.setTimeout(() => {
      setClickedHref(null)
    }, 10_000)

    return () => window.clearTimeout(timeout)
  }, [clickedHref])

  React.useEffect(() => {
    function handleClick(event: MouseEvent) {
      const href = getInternalNavigationHref(event)
      if (href) setClickedHref(href)
    }

    document.addEventListener('click', handleClick, { capture: true })
    return () => document.removeEventListener('click', handleClick, { capture: true })
  }, [])

  const navigate = React.useCallback(
    (href: string) => {
      if (href === currentHref) return

      setClickedHref(href)
      startTransition(() => {
        router.push(href)
      })
    },
    [currentHref, router]
  )

  const value = React.useMemo<RouteTransitionContextValue>(() => ({ navigate }), [navigate])
  const active = clickedHref !== null || isPending

  return (
    <RouteTransitionContext.Provider value={value}>
      <NavigationVisual active={active} />
      {children}
    </RouteTransitionContext.Provider>
  )
}

export function useRouteTransition() {
  const context = React.useContext(RouteTransitionContext)
  if (!context) {
    throw new Error('useRouteTransition deve ser usado dentro de RouteTransitionProvider.')
  }

  return context
}
