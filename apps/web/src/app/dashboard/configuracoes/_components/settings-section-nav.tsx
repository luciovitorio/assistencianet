'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bot, Settings2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const ITEMS = [
  {
    href: '/dashboard/configuracoes/sistema',
    label: 'Sistema',
    description: 'Equipamentos, garantia e padrões da OS',
    icon: Settings2,
  },
  {
    href: '/dashboard/configuracoes/automacao',
    label: 'Automação',
    description: 'Meta, Evolution e gatilhos',
    icon: Bot,
  },
] as const

export function SettingsSectionNav() {
  const pathname = usePathname()

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm shadow-slate-950/5 md:flex-row">
      {ITEMS.map((item) => {
        const active = pathname === item.href
        const Icon = item.icon

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex flex-1 items-start gap-3 rounded-xl px-4 py-3 transition-colors',
              active
                ? 'bg-slate-950 text-white'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950',
            )}
          >
            <Icon
              className={cn(
                'mt-0.5 size-4 shrink-0',
                active ? 'text-emerald-300' : 'text-slate-500',
              )}
            />
            <span>
              <span className="block text-sm font-semibold">{item.label}</span>
              <span
                className={cn(
                  'block text-xs leading-5',
                  active ? 'text-slate-300' : 'text-slate-500',
                )}
              >
                {item.description}
              </span>
            </span>
          </Link>
        )
      })}
    </div>
  )
}
