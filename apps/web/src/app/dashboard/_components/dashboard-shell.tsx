'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home,
  ClipboardList,
  MessagesSquare,
  Package,
  DollarSign,
  Settings,
  Plus,
  Search,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronDown,
  ChevronRight,
  Folder,
  BarChart3,
  LockKeyhole,
  ArrowLeft,
} from 'lucide-react'
import { logout } from '@/app/actions/auth'
import { RouteTransitionProvider } from '@/components/ui/route-transition-indicator'
import { NotificationBell } from './notification-bell'
import { AtendimentoWaitingBadge } from './atendimento-waiting-badge'
import { LogoutButton } from './logout-button'
import { HeaderSlotProvider, useHeaderSlotConfig, type HeaderConfig } from './header-slot'

interface DashboardShellProps {
  children: React.ReactNode
  companyId: string
  companyName: string
  userEmail: string
  currentDate: string
  branchName: string | null
  isAdmin: boolean
  initialIsExpanded: boolean
  canAccessFinancial: boolean
  canAccessWhatsApp: boolean
  canAccessReports: boolean
  canManageSubscription: boolean
}

const SIDEBAR_EXPANDED_STORAGE_KEY = 'dashboard-sidebar-expanded'
const SIDEBAR_EXPANDED_COOKIE_KEY = 'dashboard_sidebar_expanded'

type SidebarMenuId = 'cadastros' | 'financeiro' | 'configuracoes'

function CollapsedSidebarBadge({ children }: { children: React.ReactNode }) {
  if (!children) return null
  return (
    <span className="pointer-events-none absolute bottom-1 right-1 flex items-center justify-center">
      {children}
    </span>
  )
}

function SidebarLink({
  href,
  icon: Icon,
  label,
  active = false,
  isExpanded,
  badge,
}: {
  href: string
  icon: React.ElementType
  label: string
  active?: boolean
  isExpanded: boolean
  badge?: React.ReactNode
}) {
  const content = (
    <>
      <div className="flex items-center justify-center min-w-6 relative">
        <Icon className={isExpanded ? 'size-4' : 'size-5'} />
      </div>

      <div
        className={`whitespace-nowrap text-sm font-medium transition-all duration-300 ${isExpanded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 pointer-events-none absolute left-14'}`}
      >
        {label}
      </div>

      {isExpanded && badge}
      {!isExpanded && <CollapsedSidebarBadge>{badge}</CollapsedSidebarBadge>}
    </>
  )

  const className = `flex items-center gap-4 py-2 px-3 mx-2 rounded-lg transition-colors group relative overflow-hidden ${
    active ? 'bg-white/[0.12] text-white' : 'text-slate-300 hover:bg-white/[0.08] hover:text-white'
  }`

  if (href === '#') {
    return (
      <button
        type="button"
        title={!isExpanded ? label : undefined}
        className={`${className} cursor-default`}
      >
        {content}
      </button>
    )
  }

  return (
    <Link
      href={href}
      title={!isExpanded ? label : undefined}
      className={`${className} cursor-pointer`}
    >
      {content}
    </Link>
  )
}

function SidebarSubItem({
  href,
  label,
  active = false,
  isExpanded,
  badge,
}: {
  href: string
  label: string
  active?: boolean
  isExpanded: boolean
  badge?: React.ReactNode
}) {
  const className = `flex items-center justify-between px-3 py-1.5 rounded-md transition-colors ${
    active
      ? 'bg-white/[0.12] text-white font-medium'
      : 'text-slate-300 hover:bg-white/[0.08] hover:text-white'
  } ${!isExpanded ? 'text-[11px] text-center px-1' : 'text-sm'}`

  const content = isExpanded
    ? <><span>{label}</span>{badge}</>
    : label.substring(0, 3)

  if (href === '#') {
    return (
      <button type="button" className={`${className} w-full cursor-default text-left`}>
        {content}
      </button>
    )
  }

  return (
    <Link href={href} className={className}>
      {content}
    </Link>
  )
}

function SidebarMenu({
  id,
  icon: Icon,
  label,
  active = false,
  openMenu,
  setOpenMenu,
  isExpanded,
  setIsExpanded,
  children,
  badge,
}: {
  id: SidebarMenuId
  icon: React.ElementType
  label: string
  active?: boolean
  openMenu: SidebarMenuId | null
  setOpenMenu: (menu: SidebarMenuId | null) => void
  isExpanded: boolean
  setIsExpanded: (val: boolean) => void
  children: React.ReactNode
  badge?: React.ReactNode
}) {
  const isOpen = openMenu === id

  const handleToggle = () => {
    if (!isExpanded) {
      setIsExpanded(true)
      setOpenMenu(id)
    } else {
      setOpenMenu(isOpen ? null : id)
    }
  }

  return (
    <div className="flex flex-col">
      <div
        onClick={handleToggle}
        title={!isExpanded ? label : undefined}
        className={`flex items-center justify-between py-2 px-3 mx-2 rounded-lg transition-colors cursor-pointer group relative overflow-hidden ${
          active ? 'bg-white/[0.12] text-white' : 'text-slate-300 hover:bg-white/[0.08] hover:text-white'
        }`}
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center min-w-6 relative">
            <Icon className={isExpanded ? 'size-4' : 'size-5'} />
          </div>
          <div
            className={`flex items-center gap-2 whitespace-nowrap text-sm font-medium transition-all duration-300 ${isExpanded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 pointer-events-none absolute left-14'}`}
          >
            <span>{label}</span>
            {isExpanded && badge}
          </div>
        </div>
        {!isExpanded && <CollapsedSidebarBadge>{badge}</CollapsedSidebarBadge>}
        {isExpanded && (
          <div className="text-slate-300 whitespace-nowrap opacity-100 transition-opacity">
            {isOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
          </div>
        )}
      </div>

      {/* Submenu items */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isExpanded && isOpen ? 'max-h-128 opacity-100 mt-1' : 'max-h-0 opacity-0'
        }`}
      >
        <div
          className={`flex flex-col space-y-1 pl-12 pr-2 transition-transform duration-300 ease-in-out ${
            isExpanded && isOpen ? 'translate-y-0' : '-translate-y-2'
          }`}
        >
          {children}
        </div>
      </div>
    </div>
  )
}

function BreadcrumbHeader({
  config,
}: {
  config: HeaderConfig
}) {
  return (
    <div className="flex items-center gap-3">
      <Link
        href={config.backHref}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-3.5" />
        {config.backLabel}
      </Link>
      <div className="h-4.5 w-px bg-border" />
      <span className="text-sm font-semibold text-foreground">{config.title}</span>
      {config.badge && (
        <div className="inline-flex items-center gap-1.5 rounded-full bg-muted border border-border px-2.5 py-0.5">
          <span className="size-1.25 rounded-full bg-muted-foreground/50 inline-block shrink-0" />
          <span className="text-[11px] font-semibold text-muted-foreground">{config.badge}</span>
        </div>
      )}
      {config.osNumber && (
        <>
          <div className="h-4.5 w-px bg-border" />
          <span className="font-mono text-sm font-medium text-primary">#{config.osNumber}</span>
        </>
      )}
    </div>
  )
}

type RouteHeaderDefinition = {
  prefix: string
  title: string
  exact?: boolean
  backHref?: string
  backLabel?: string
  badge?: string
}

const ROUTE_HEADERS: RouteHeaderDefinition[] = [
  { prefix: '/dashboard/ordens-de-servico', title: 'Ordens de Serviço', exact: true },
  {
    prefix: '/dashboard/ordens-de-servico/nova',
    backHref: '/dashboard/ordens-de-servico',
    backLabel: 'Ordens de Serviço',
    title: 'Nova OS',
    badge: 'Em abertura',
  },
  { prefix: '/dashboard/atendimento', title: 'Atendimento' },
  { prefix: '/dashboard/estoque', title: 'Estoque' },
  { prefix: '/dashboard/financeiro/contas-a-pagar', title: 'Contas a Pagar' },
  { prefix: '/dashboard/financeiro/contas-a-receber', title: 'Contas a Receber' },
  { prefix: '/dashboard/financeiro/producao-tecnicos/fechamentos', title: 'Fechamentos' },
  { prefix: '/dashboard/financeiro/producao-tecnicos', title: 'Produção de Técnicos' },
  { prefix: '/dashboard/relatorios', title: 'Relatórios' },
  { prefix: '/dashboard/configuracoes/sistema', title: 'Sistema' },
  { prefix: '/dashboard/configuracoes/automacao', title: 'Automação' },
  { prefix: '/dashboard/assinatura', title: 'Assinatura' },
  { prefix: '/dashboard/logs', title: 'Logs do Sistema' },
  { prefix: '/dashboard/filiais', title: 'Filiais' },
  { prefix: '/dashboard/funcionarios', title: 'Funcionários' },
  { prefix: '/dashboard/clientes', title: 'Clientes' },
  { prefix: '/dashboard/fornecedores', title: 'Fornecedores' },
  { prefix: '/dashboard/terceiros', title: 'Terceirizadas' },
  { prefix: '/dashboard/equipamentos', title: 'Equipamentos' },
  { prefix: '/dashboard/pecas', title: 'Peças' },
  { prefix: '/dashboard/servicos', title: 'Serviços' },
]

function acceptsHeaderSlot(pathname: string) {
  return (
    pathname === '/dashboard/ordens-de-servico/nova' ||
    /^\/dashboard\/ordens-de-servico\/[^/]+$/.test(pathname) ||
    /^\/dashboard\/ordens-de-servico\/[^/]+\/editar$/.test(pathname)
  )
}

function getRouteHeaderConfig(pathname: string): HeaderConfig | null {
  const routeHeader = ROUTE_HEADERS.find((route) =>
    route.exact ? pathname === route.prefix : pathname.startsWith(route.prefix),
  )

  if (routeHeader) {
    return {
      backHref: routeHeader.backHref ?? '/dashboard',
      backLabel: routeHeader.backLabel ?? 'Início',
      title: routeHeader.title,
      badge: routeHeader.badge,
    }
  }

  return null
}

function DashboardTopbar({
  isAdmin,
  currentDate,
  branchName,
  isExpanded,
  pathname,
}: {
  isAdmin: boolean
  currentDate: string
  branchName: string | null
  isExpanded: boolean
  pathname: string
}) {
  const config = useHeaderSlotConfig()
  const routeConfig = getRouteHeaderConfig(pathname)
  const slotConfig = acceptsHeaderSlot(pathname) ? config : null
  const effectiveConfig = slotConfig ?? routeConfig

  return (
    <header
      className={`fixed top-0 right-0 h-16 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md flex justify-between items-center px-8 z-40 border-b border-border transition-all duration-300 ${
        isExpanded ? 'w-[calc(100%-16rem)]' : 'w-[calc(100%-5rem)]'
      }`}
    >
      <div className="flex items-center gap-4">
        {effectiveConfig ? (
          <BreadcrumbHeader config={effectiveConfig} />
        ) : (
          <h1 className="text-foreground font-semibold text-lg">
            {isAdmin ? 'Dashboard Geral' : 'Meu Painel'}
          </h1>
        )}
      </div>

      <div className="flex items-center space-x-4">
        <div className="hidden lg:flex flex-col items-end leading-tight">
          <span className="text-muted-foreground text-sm font-medium tracking-tight">
            {currentDate}
          </span>
          {branchName && (
            <span className="text-muted-foreground/70 text-xs font-normal">
              {branchName}
            </span>
          )}
        </div>
        <button className="p-2 text-muted-foreground hover:text-primary transition-colors cursor-pointer">
          <Search className="size-5" />
        </button>
        <NotificationBell />
        <div className="h-6 w-px bg-border"></div>
        <form action={logout}>
          <LogoutButton />
        </form>
      </div>
    </header>
  )
}

export function DashboardShell({
  children,
  companyId,
  companyName,
  userEmail,
  currentDate,
  branchName,
  isAdmin,
  initialIsExpanded,
  canAccessFinancial,
  canAccessWhatsApp,
  canAccessReports,
  canManageSubscription,
}: DashboardShellProps) {
  const [isExpanded, setIsExpanded] = useState(initialIsExpanded)
  const pathname = usePathname()
  const inCadastros =
    pathname.startsWith('/dashboard/filiais') ||
    pathname.startsWith('/dashboard/funcionarios') ||
    pathname.startsWith('/dashboard/clientes') ||
    pathname.startsWith('/dashboard/fornecedores') ||
    pathname.startsWith('/dashboard/terceiros') ||
    pathname.startsWith('/dashboard/equipamentos') ||
    pathname.startsWith('/dashboard/pecas') ||
    pathname.startsWith('/dashboard/servicos')
  const inOrdens = pathname.startsWith('/dashboard/ordens-de-servico')
  const inAtendimento = pathname.startsWith('/dashboard/atendimento')
  const inEstoque = pathname.startsWith('/dashboard/estoque')
  const inFinanceiro = pathname.startsWith('/dashboard/financeiro')
  const inRelatorios = pathname.startsWith('/dashboard/relatorios')
  const inConfiguracoes =
    pathname.startsWith('/dashboard/configuracoes') ||
    pathname.startsWith('/dashboard/logs') ||
    pathname.startsWith('/dashboard/assinatura')
  const activeSidebarMenu: SidebarMenuId | null = inCadastros
    ? 'cadastros'
    : inFinanceiro
      ? 'financeiro'
      : inConfiguracoes
        ? 'configuracoes'
        : null
  const [openMenu, setOpenMenu] = useState<SidebarMenuId | null>(activeSidebarMenu)

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_EXPANDED_STORAGE_KEY, String(isExpanded))
    document.cookie = `${SIDEBAR_EXPANDED_COOKIE_KEY}=${String(isExpanded)}; path=/; max-age=31536000; samesite=lax`
  }, [isExpanded])

  useEffect(() => {
    setOpenMenu(activeSidebarMenu)
  }, [activeSidebarMenu])

  const upgradeToProBadge = (
    <span className={`inline-flex items-center justify-center rounded-full bg-blue-100 font-semibold leading-none text-blue-700 ${
      isExpanded ? 'gap-1 px-1.5 py-0.5 text-[10px]' : 'size-4 shadow-sm'
    }`}>
      <LockKeyhole className="size-3" />
      {isExpanded && 'Pro'}
    </span>
  )
  const lockedFinancialBadge = canAccessFinancial ? undefined : upgradeToProBadge
  const lockedFinancialSubItemBadge = canAccessFinancial ? undefined : upgradeToProBadge
  const lockedWhatsAppBadge = canAccessWhatsApp ? undefined : upgradeToProBadge
  const lockedWhatsAppSubItemBadge = canAccessWhatsApp ? undefined : upgradeToProBadge
  const lockedReportsBadge = canAccessReports ? undefined : upgradeToProBadge
  const upgradeHref = canManageSubscription ? '/dashboard/assinatura' : '/sem-plano'
  const financialHref = (href: string) => canAccessFinancial ? href : upgradeHref
  const whatsappHref = (href: string) => canAccessWhatsApp ? href : upgradeHref
  const reportsHref = canAccessReports ? '/dashboard/relatorios' : upgradeHref

  return (
    <RouteTransitionProvider>
      <HeaderSlotProvider>
      <div className="bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased min-h-screen">
      {/* SIDEBAR */}
      <aside
        className={`fixed left-0 top-0 h-screen bg-[#0F1B3D] border-r border-white/10 py-4 flex flex-col space-y-4 z-50 transition-all duration-300 ease-in-out ${
          isExpanded ? 'w-64' : 'w-20'
        }`}
      >
        <div className="flex items-center mb-6 px-4">
          <div className="w-10 h-10 min-w-10 flex items-center justify-center">
            <img src="/brand-icon.svg" alt="SmartConserto" width={40} height={40} className="rounded-lg" />
          </div>
          <div
            className={`overflow-hidden transition-all duration-300 ml-3 ${
              isExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0'
            }`}
          >
            <span className="font-bold text-base leading-tight block text-white">SmartConserto</span>
            <span className="text-[9px] text-slate-300 uppercase tracking-widest font-semibold">
              Gestão
            </span>
          </div>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="ml-auto text-slate-300 hover:text-white transition-colors p-1"
          >
            {isExpanded ? (
              <PanelLeftClose className="size-5" />
            ) : (
              <PanelLeftOpen className="size-5" />
            )}
          </button>
        </div>

        <nav className="flex-1 flex flex-col space-y-2 px-2 overflow-y-auto overflow-x-hidden">
          <SidebarLink
            href="/dashboard"
            icon={Home}
            label="Início"
            active={pathname === '/dashboard'}
            isExpanded={isExpanded}
          />

          {isAdmin && (
            <SidebarMenu
              id="cadastros"
              icon={Folder}
              label="Cadastros"
              active={inCadastros}
              openMenu={openMenu}
              setOpenMenu={setOpenMenu}
              isExpanded={isExpanded}
              setIsExpanded={setIsExpanded}
            >
              <SidebarSubItem
                href="/dashboard/filiais"
                label="Filiais"
                active={pathname.startsWith('/dashboard/filiais')}
                isExpanded={isExpanded}
              />
              <SidebarSubItem
                href="/dashboard/funcionarios"
                label="Funcionários"
                active={pathname.startsWith('/dashboard/funcionarios')}
                isExpanded={isExpanded}
              />
              <SidebarSubItem
                href="/dashboard/clientes"
                label="Clientes"
                active={pathname.startsWith('/dashboard/clientes')}
                isExpanded={isExpanded}
              />
              <SidebarSubItem
                href="/dashboard/fornecedores"
                label="Fornecedores"
                active={pathname.startsWith('/dashboard/fornecedores')}
                isExpanded={isExpanded}
              />
              <SidebarSubItem
                href="/dashboard/terceiros"
                label="Terceirizadas"
                active={pathname.startsWith('/dashboard/terceiros')}
                isExpanded={isExpanded}
              />
              <SidebarSubItem
                href="/dashboard/equipamentos"
                label="Equipamentos"
                active={pathname.startsWith('/dashboard/equipamentos')}
                isExpanded={isExpanded}
              />
              <SidebarSubItem
                href="/dashboard/pecas"
                label="Peças"
                active={pathname.startsWith('/dashboard/pecas')}
                isExpanded={isExpanded}
              />
              <SidebarSubItem
                href="/dashboard/servicos"
                label="Serviços"
                active={pathname.startsWith('/dashboard/servicos')}
                isExpanded={isExpanded}
              />
            </SidebarMenu>
          )}

          <SidebarLink
            href="/dashboard/ordens-de-servico"
            icon={ClipboardList}
            label="Ordens de Serviço"
            active={inOrdens}
            isExpanded={isExpanded}
          />
          <SidebarLink
            href={whatsappHref('/dashboard/atendimento')}
            icon={MessagesSquare}
            label="Atendimento"
            active={canAccessWhatsApp && inAtendimento}
            isExpanded={isExpanded}
            badge={canAccessWhatsApp
              ? <AtendimentoWaitingBadge companyId={companyId} isExpanded={isExpanded} />
              : lockedWhatsAppBadge}
          />
          <SidebarLink
            href="/dashboard/estoque"
            icon={Package}
            label="Estoque"
            active={inEstoque}
            isExpanded={isExpanded}
          />
          {isAdmin && (
            <SidebarMenu
              id="financeiro"
              icon={DollarSign}
              label="Financeiro"
              active={inFinanceiro}
              openMenu={openMenu}
              setOpenMenu={setOpenMenu}
              isExpanded={isExpanded}
              setIsExpanded={setIsExpanded}
              badge={lockedFinancialBadge}
            >
              <SidebarSubItem
                href={financialHref('/dashboard/financeiro/contas-a-pagar')}
                label="Contas a Pagar"
                active={canAccessFinancial && pathname.startsWith('/dashboard/financeiro/contas-a-pagar')}
                isExpanded={isExpanded}
                badge={lockedFinancialSubItemBadge}
              />
              <SidebarSubItem
                href={financialHref('/dashboard/financeiro/contas-a-receber')}
                label="Contas a Receber"
                active={canAccessFinancial && pathname.startsWith('/dashboard/financeiro/contas-a-receber')}
                isExpanded={isExpanded}
                badge={lockedFinancialSubItemBadge}
              />
              <SidebarSubItem
                href={financialHref('/dashboard/financeiro/producao-tecnicos')}
                label="Produção de Técnicos"
                active={
                  canAccessFinancial &&
                  pathname === '/dashboard/financeiro/producao-tecnicos' ||
                  (canAccessFinancial &&
                    pathname.startsWith('/dashboard/financeiro/producao-tecnicos') &&
                    !pathname.startsWith('/dashboard/financeiro/producao-tecnicos/fechamentos'))
                }
                isExpanded={isExpanded}
                badge={lockedFinancialSubItemBadge}
              />
              <SidebarSubItem
                href={financialHref('/dashboard/financeiro/producao-tecnicos/fechamentos')}
                label="Fechamentos"
                active={canAccessFinancial && pathname.startsWith('/dashboard/financeiro/producao-tecnicos/fechamentos')}
                isExpanded={isExpanded}
                badge={lockedFinancialSubItemBadge}
              />
            </SidebarMenu>
          )}
          {isAdmin && (
            <SidebarLink
              href={reportsHref}
              icon={BarChart3}
              label="Relatórios"
              active={canAccessReports && inRelatorios}
              isExpanded={isExpanded}
              badge={lockedReportsBadge}
            />
          )}
        </nav>

        <div className="mt-auto flex flex-col space-y-4 pb-2 px-2">
          {isAdmin && (
            <SidebarMenu
              id="configuracoes"
              icon={Settings}
              label="Configurações"
              active={inConfiguracoes}
              openMenu={openMenu}
              setOpenMenu={setOpenMenu}
              isExpanded={isExpanded}
              setIsExpanded={setIsExpanded}
            >
              <SidebarSubItem
                href="/dashboard/configuracoes/sistema"
                label="Sistema"
                active={pathname.startsWith('/dashboard/configuracoes/sistema')}
                isExpanded={isExpanded}
              />
              <SidebarSubItem
                href={whatsappHref('/dashboard/configuracoes/automacao')}
                label="Automação"
                active={canAccessWhatsApp && pathname.startsWith('/dashboard/configuracoes/automacao')}
                isExpanded={isExpanded}
                badge={lockedWhatsAppSubItemBadge}
              />
              {canManageSubscription && (
                <SidebarSubItem
                  href="/dashboard/assinatura"
                  label="Assinatura"
                  active={pathname.startsWith('/dashboard/assinatura')}
                  isExpanded={isExpanded}
                />
              )}
              <SidebarSubItem
                href="/dashboard/logs"
                label="Logs do Sistema"
                active={pathname.startsWith('/dashboard/logs')}
                isExpanded={isExpanded}
              />
            </SidebarMenu>
          )}

          <div className="px-2">
            <Link
              href="/dashboard/ordens-de-servico/nova"
              className={`bg-primary text-primary-foreground h-12 rounded-xl flex items-center justify-center shadow-lg hover:bg-primary/90 transition-all active:scale-95 cursor-pointer w-full`}
            >
              <Plus className="size-6 min-w-6" />
              <span
                className={`ml-2 text-xs font-semibold transition-all duration-300 whitespace-nowrap overflow-hidden ${isExpanded ? 'w-auto opacity-100' : 'w-0 opacity-0 hidden'}`}
              >
                Nova OS
              </span>
            </Link>
          </div>

          <div className="px-4 flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 min-w-10 rounded-full bg-white/10 overflow-hidden border-2 border-white/10 flex items-center justify-center text-xs font-bold text-white">
              {userEmail.charAt(0).toUpperCase()}
            </div>
            {isExpanded && (
              <div className="flex-col whitespace-nowrap opacity-100 transition-opacity duration-300">
                <p className="text-xs font-semibold text-white leading-none">{companyName}</p>
                <p className="text-[9px] text-slate-300 font-medium truncate max-w-30">
                  {userEmail}
                </p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT WRAPPER */}
      <div
        className={`transition-all duration-300 min-h-screen ${isExpanded ? 'ml-64' : 'ml-20'}`}
      >
        <DashboardTopbar
          isAdmin={isAdmin}
          currentDate={currentDate}
          branchName={branchName}
          isExpanded={isExpanded}
          pathname={pathname}
        />

        {/* PAGE CONTENT */}
        <main className="pt-24 pb-12 px-8 w-full max-w-none space-y-10">
          {children}
        </main>
      </div>
      </div>
      </HeaderSlotProvider>
    </RouteTransitionProvider>
  )
}
