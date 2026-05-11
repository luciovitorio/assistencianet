'use client'

import React, { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  ClipboardList,
  DollarSign,
  Home,
  Loader2,
  MessagesSquare,
  Package,
  Search,
  Settings,
  Users,
  BarChart3,
  Wrench,
  Box,
  Tag,
  Truck,
  GitBranch,
  UserCog,
  FileText,
  CreditCard,
} from 'lucide-react'
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import { globalSearch, type GlobalSearchResults } from '@/app/actions/global-search'
import { STATUS_LABELS, STATUS_COLORS } from '@/lib/validations/service-order'
import { cn } from '@/lib/utils'

type NavItem = {
  type: 'nav'
  label: string
  description: string
  href: string
  icon: React.ReactNode
  keywords: string[]
}

const NAV_ITEMS: NavItem[] = [
  {
    type: 'nav',
    label: 'Dashboard',
    description: 'Visão geral',
    href: '/dashboard',
    icon: <Home className="size-4" />,
    keywords: ['dashboard', 'início', 'inicio', 'home', 'painel'],
  },
  {
    type: 'nav',
    label: 'Ordens de Serviço',
    description: 'Gerenciar OSs',
    href: '/dashboard/ordens-de-servico',
    icon: <ClipboardList className="size-4" />,
    keywords: ['os', 'ordens', 'serviço', 'servico', 'ordem'],
  },
  {
    type: 'nav',
    label: 'Atendimento',
    description: 'Fila de atendimento',
    href: '/dashboard/atendimento',
    icon: <MessagesSquare className="size-4" />,
    keywords: ['atendimento', 'fila', 'whatsapp'],
  },
  {
    type: 'nav',
    label: 'Estoque',
    description: 'Controle de estoque',
    href: '/dashboard/estoque',
    icon: <Package className="size-4" />,
    keywords: ['estoque', 'stock', 'inventário', 'inventario'],
  },
  {
    type: 'nav',
    label: 'Contas a Pagar',
    description: 'Financeiro — contas a pagar',
    href: '/dashboard/financeiro/contas-a-pagar',
    icon: <DollarSign className="size-4" />,
    keywords: ['contas', 'pagar', 'financeiro', 'despesa', 'conta'],
  },
  {
    type: 'nav',
    label: 'Contas a Receber',
    description: 'Financeiro — contas a receber',
    href: '/dashboard/financeiro/contas-a-receber',
    icon: <DollarSign className="size-4" />,
    keywords: ['contas', 'receber', 'financeiro', 'receita', 'conta'],
  },
  {
    type: 'nav',
    label: 'Produção de Técnicos',
    description: 'Fechamentos e produção',
    href: '/dashboard/financeiro/producao-tecnico',
    icon: <Wrench className="size-4" />,
    keywords: ['producao', 'produção', 'técnico', 'tecnico', 'fechamento'],
  },
  {
    type: 'nav',
    label: 'Clientes',
    description: 'Cadastro de clientes',
    href: '/dashboard/clientes',
    icon: <Users className="size-4" />,
    keywords: ['clientes', 'cliente', 'cadastro'],
  },
  {
    type: 'nav',
    label: 'Funcionários',
    description: 'Cadastro de funcionários',
    href: '/dashboard/funcionarios',
    icon: <UserCog className="size-4" />,
    keywords: ['funcionários', 'funcionarios', 'funcionário', 'funcionario', 'equipe'],
  },
  {
    type: 'nav',
    label: 'Equipamentos',
    description: 'Modelos de equipamento',
    href: '/dashboard/equipamentos',
    icon: <Box className="size-4" />,
    keywords: ['equipamentos', 'equipamento', 'modelo', 'aparelho'],
  },
  {
    type: 'nav',
    label: 'Peças',
    description: 'Catálogo de peças',
    href: '/dashboard/pecas',
    icon: <Tag className="size-4" />,
    keywords: ['peças', 'pecas', 'peça', 'peca', 'produto'],
  },
  {
    type: 'nav',
    label: 'Serviços',
    description: 'Catálogo de serviços',
    href: '/dashboard/servicos',
    icon: <Wrench className="size-4" />,
    keywords: ['serviços', 'servicos', 'serviço', 'servico'],
  },
  {
    type: 'nav',
    label: 'Fornecedores',
    description: 'Cadastro de fornecedores',
    href: '/dashboard/fornecedores',
    icon: <Truck className="size-4" />,
    keywords: ['fornecedores', 'fornecedor', 'fornecedores'],
  },
  {
    type: 'nav',
    label: 'Terceiros',
    description: 'Cadastro de terceiros',
    href: '/dashboard/terceiros',
    icon: <Users className="size-4" />,
    keywords: ['terceiros', 'terceiro'],
  },
  {
    type: 'nav',
    label: 'Filiais',
    description: 'Gerenciar filiais',
    href: '/dashboard/filiais',
    icon: <GitBranch className="size-4" />,
    keywords: ['filiais', 'filial', 'unidade'],
  },
  {
    type: 'nav',
    label: 'Relatórios',
    description: 'Relatórios e análises',
    href: '/dashboard/relatorios',
    icon: <BarChart3 className="size-4" />,
    keywords: ['relatorios', 'relatórios', 'relatorio', 'relatório', 'análise', 'analise'],
  },
  {
    type: 'nav',
    label: 'Configurações',
    description: 'Configurações da empresa',
    href: '/dashboard/configuracoes',
    icon: <Settings className="size-4" />,
    keywords: ['configuracoes', 'configurações', 'configuracao', 'configuração', 'config'],
  },
  {
    type: 'nav',
    label: 'Logs de Auditoria',
    description: 'Histórico de ações',
    href: '/dashboard/logs',
    icon: <FileText className="size-4" />,
    keywords: ['logs', 'auditoria', 'historico', 'histórico'],
  },
  {
    type: 'nav',
    label: 'Assinatura',
    description: 'Plano e faturamento',
    href: '/dashboard/assinatura',
    icon: <CreditCard className="size-4" />,
    keywords: ['assinatura', 'plano', 'faturamento', 'billing'],
  },
]

function normalize(str: string) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

function filterNavItems(query: string): NavItem[] {
  if (!query.trim()) return NAV_ITEMS
  const q = normalize(query)
  return NAV_ITEMS.filter(
    (item) =>
      normalize(item.label).includes(q) ||
      normalize(item.description).includes(q) ||
      item.keywords.some((k) => k.includes(q))
  )
}

type FlatItem =
  | { kind: 'nav'; item: NavItem }
  | { kind: 'os'; id: string; number: number; status: string; device: string; clientName: string | null }
  | { kind: 'client'; id: string; name: string; phone: string | null; document: string | null }
  | { kind: 'part'; id: string; name: string; category: string | null }
  | { kind: 'service'; id: string; name: string; category: string | null }

function buildFlatItems(query: string, results: GlobalSearchResults | null, navItems: NavItem[]): FlatItem[] {
  const flat: FlatItem[] = []

  if (!query.trim()) {
    navItems.forEach((item) => flat.push({ kind: 'nav', item }))
    return flat
  }

  navItems.forEach((item) => flat.push({ kind: 'nav', item }))

  if (results) {
    results.serviceOrders.forEach((os) =>
      flat.push({
        kind: 'os',
        id: os.id,
        number: os.number,
        status: os.status,
        device: [os.device_brand, os.device_model].filter(Boolean).join(' ') || os.device_type || '—',
        clientName: os.client_name,
      })
    )
    results.clients.forEach((c) =>
      flat.push({ kind: 'client', id: c.id, name: c.name, phone: c.phone, document: c.document })
    )
    results.parts.forEach((p) =>
      flat.push({ kind: 'part', id: p.id, name: p.name, category: p.category })
    )
    results.services.forEach((s) =>
      flat.push({ kind: 'service', id: s.id, name: s.name, category: s.category })
    )
  }

  return flat
}

function getHref(item: FlatItem): string {
  if (item.kind === 'nav') return item.item.href
  if (item.kind === 'os') return `/dashboard/ordens-de-servico/${item.id}`
  if (item.kind === 'client') return `/dashboard/clientes/${item.id}`
  if (item.kind === 'part') return `/dashboard/pecas/${item.id}`
  if (item.kind === 'service') return `/dashboard/servicos/${item.id}`
  return '#'
}

function ResultItem({
  item,
  isFocused,
  onMouseEnter,
  onClick,
  itemRef,
}: {
  item: FlatItem
  isFocused: boolean
  onMouseEnter: () => void
  onClick: () => void
  itemRef: (el: HTMLButtonElement | null) => void
}) {
  const base = cn(
    'flex items-center gap-3 w-full px-3 py-2 rounded-lg text-left transition-colors cursor-pointer',
    isFocused ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/60'
  )

  if (item.kind === 'nav') {
    return (
      <button ref={itemRef} className={base} onMouseEnter={onMouseEnter} onClick={onClick}>
        <span className="flex-shrink-0 text-muted-foreground">{item.item.icon}</span>
        <span className="flex flex-col min-w-0">
          <span className="text-sm font-medium leading-tight">{item.item.label}</span>
          <span className="text-xs text-muted-foreground truncate">{item.item.description}</span>
        </span>
      </button>
    )
  }

  if (item.kind === 'os') {
    const statusLabel = STATUS_LABELS[item.status as keyof typeof STATUS_LABELS] ?? item.status
    const statusColor = STATUS_COLORS[item.status as keyof typeof STATUS_COLORS] ?? ''
    return (
      <button ref={itemRef} className={base} onMouseEnter={onMouseEnter} onClick={onClick}>
        <span className="flex-shrink-0 text-muted-foreground">
          <ClipboardList className="size-4" />
        </span>
        <span className="flex flex-col min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="text-sm font-medium leading-tight">OS #{item.number}</span>
            <span className={cn('inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium leading-none', statusColor)}>
              {statusLabel}
            </span>
          </span>
          <span className="text-xs text-muted-foreground truncate">
            {item.device}{item.clientName ? ` · ${item.clientName}` : ''}
          </span>
        </span>
      </button>
    )
  }

  if (item.kind === 'client') {
    return (
      <button ref={itemRef} className={base} onMouseEnter={onMouseEnter} onClick={onClick}>
        <span className="flex-shrink-0 text-muted-foreground">
          <Users className="size-4" />
        </span>
        <span className="flex flex-col min-w-0">
          <span className="text-sm font-medium leading-tight">{item.name}</span>
          <span className="text-xs text-muted-foreground truncate">
            {[item.phone, item.document].filter(Boolean).join(' · ') || 'Cliente'}
          </span>
        </span>
      </button>
    )
  }

  if (item.kind === 'part') {
    return (
      <button ref={itemRef} className={base} onMouseEnter={onMouseEnter} onClick={onClick}>
        <span className="flex-shrink-0 text-muted-foreground">
          <Tag className="size-4" />
        </span>
        <span className="flex flex-col min-w-0">
          <span className="text-sm font-medium leading-tight">{item.name}</span>
          <span className="text-xs text-muted-foreground">{item.category ?? 'Peça'}</span>
        </span>
      </button>
    )
  }

  if (item.kind === 'service') {
    return (
      <button ref={itemRef} className={base} onMouseEnter={onMouseEnter} onClick={onClick}>
        <span className="flex-shrink-0 text-muted-foreground">
          <Wrench className="size-4" />
        </span>
        <span className="flex flex-col min-w-0">
          <span className="text-sm font-medium leading-tight">{item.name}</span>
          <span className="text-xs text-muted-foreground">{item.category ?? 'Serviço'}</span>
        </span>
      </button>
    )
  }

  return null
}

type GroupedSection = {
  label: string
  items: FlatItem[]
}

function groupItems(query: string, flat: FlatItem[]): GroupedSection[] {
  if (!query.trim()) {
    return [{ label: 'Navegação', items: flat }]
  }

  const nav = flat.filter((i) => i.kind === 'nav')
  const os = flat.filter((i) => i.kind === 'os')
  const clients = flat.filter((i) => i.kind === 'client')
  const parts = flat.filter((i) => i.kind === 'part')
  const services = flat.filter((i) => i.kind === 'service')

  const sections: GroupedSection[] = []
  if (nav.length) sections.push({ label: 'Navegação', items: nav })
  if (os.length) sections.push({ label: 'Ordens de Serviço', items: os })
  if (clients.length) sections.push({ label: 'Clientes', items: clients })
  if (parts.length) sections.push({ label: 'Peças', items: parts })
  if (services.length) sections.push({ label: 'Serviços', items: services })

  return sections
}

export function GlobalSearchModal({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GlobalSearchResults | null>(null)
  const [focusedIndex, setFocusedIndex] = useState(0)
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([])

  const navItems = filterNavItems(query)
  const flat = buildFlatItems(query, results, navItems)
  const sections = groupItems(query, flat)

  useEffect(() => {
    if (open) {
      setQuery('')
      setResults(null)
      setFocusedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  const runSearch = useCallback((value: string) => {
    if (!value.trim()) {
      setResults(null)
      return
    }
    startTransition(async () => {
      const data = await globalSearch(value)
      setResults(data)
      setFocusedIndex(0)
    })
  }, [])

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setQuery(value)
    setFocusedIndex(0)

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => runSearch(value), 280)
  }

  const navigate = useCallback(
    (item: FlatItem) => {
      router.push(getHref(item))
      onOpenChange(false)
    },
    [router, onOpenChange]
  )

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setFocusedIndex((i) => Math.min(i + 1, flat.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setFocusedIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (flat[focusedIndex]) navigate(flat[focusedIndex])
    }
  }

  useEffect(() => {
    itemRefs.current[focusedIndex]?.scrollIntoView({ block: 'nearest' })
  }, [focusedIndex])

  const hasResults = flat.length > 0
  const showEmpty = query.trim() && !isPending && flat.length === 0

  let flatIndex = 0

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 isolate z-50 bg-black/20 backdrop-blur-sm data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 duration-150" />
        <DialogPrimitive.Popup
          className="fixed left-1/2 top-[12vh] z-50 w-full max-w-xl -translate-x-1/2 rounded-xl bg-popover ring-1 ring-foreground/10 shadow-2xl outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 duration-150"
          onKeyDown={handleKeyDown}
        >
          {/* Search input */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
            {isPending ? (
              <Loader2 className="size-4 text-muted-foreground animate-spin flex-shrink-0" />
            ) : (
              <Search className="size-4 text-muted-foreground flex-shrink-0" />
            )}
            <input
              ref={inputRef}
              value={query}
              onChange={handleQueryChange}
              placeholder="Buscar OS, clientes, peças, serviços..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            {query && (
              <button
                onClick={() => { setQuery(''); setResults(null); setFocusedIndex(0); inputRef.current?.focus() }}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors px-1"
              >
                Limpar
              </button>
            )}
            <kbd className="hidden sm:inline-flex h-5 items-center gap-0.5 rounded border border-border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
              Esc
            </kbd>
          </div>

          {/* Results */}
          <div className="max-h-[60vh] overflow-y-auto p-2 space-y-1">
            {showEmpty && (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Nenhum resultado para &ldquo;{query}&rdquo;
              </div>
            )}

            {!showEmpty && hasResults &&
              sections.map((section) => (
                <div key={section.label}>
                  <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {section.label}
                  </p>
                  {section.items.map((item) => {
                    const idx = flatIndex++
                    return (
                      <ResultItem
                        key={`${item.kind}-${item.kind === 'nav' ? item.item.href : item.id}`}
                        item={item}
                        isFocused={focusedIndex === idx}
                        onMouseEnter={() => setFocusedIndex(idx)}
                        onClick={() => navigate(item)}
                        itemRef={(el) => { itemRefs.current[idx] = el }}
                      />
                    )
                  })}
                </div>
              ))
            }
          </div>

          {/* Footer hint */}
          <div className="flex items-center gap-4 px-4 py-2 border-t border-border text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <kbd className="inline-flex h-4 items-center rounded border border-border bg-muted px-1 font-medium">↑↓</kbd>
              navegar
            </span>
            <span className="flex items-center gap-1">
              <kbd className="inline-flex h-4 items-center rounded border border-border bg-muted px-1 font-medium">↵</kbd>
              abrir
            </span>
            <span className="flex items-center gap-1">
              <kbd className="inline-flex h-4 items-center rounded border border-border bg-muted px-1 font-medium">Esc</kbd>
              fechar
            </span>
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
