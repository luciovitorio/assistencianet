'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Wrench,
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
  History,
  BarChart3,
} from 'lucide-react'
import { logout } from '@/app/actions/auth'
import { RouteTransitionProvider } from '@/components/ui/route-transition-indicator'
import { NotificationBell } from './notification-bell'
import { AtendimentoWaitingBadge } from './atendimento-waiting-badge'

interface DashboardShellProps {
  children: React.ReactNode
  companyId: string
  companyName: string
  userEmail: string
  currentDate: string
  isAdmin: boolean
  initialIsExpanded: boolean
}

const SIDEBAR_EXPANDED_STORAGE_KEY = 'dashboard-sidebar-expanded'
const SIDEBAR_EXPANDED_COOKIE_KEY = 'dashboard_sidebar_expanded'

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
        <Icon className="size-5" />
        {!isExpanded && badge}
      </div>

      <div
        className={`whitespace-nowrap text-sm font-medium transition-all duration-300 ${isExpanded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 pointer-events-none absolute left-14'}`}
      >
        {label}
      </div>

      {isExpanded && badge}
    </>
  )

  const className = `flex items-center gap-4 p-3 mx-2 rounded-lg transition-colors group relative overflow-hidden ${
    active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'
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
}: {
  href: string
  label: string
  active?: boolean
  isExpanded: boolean
}) {
  const className = `block px-3 py-2 rounded-md transition-colors ${
    active
      ? 'bg-primary/10 text-primary font-medium'
      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
  } ${!isExpanded ? 'text-xs text-center px-1' : 'text-sm'}`

  if (href === '#') {
    return (
      <button type="button" className={`${className} w-full cursor-default text-left`}>
        {isExpanded ? label : label.substring(0, 3)}
      </button>
    )
  }

  return (
    <Link href={href} className={className}>
      {isExpanded ? label : label.substring(0, 3)}
    </Link>
  )
}

function SidebarMenu({
  icon: Icon,
  label,
  active = false,
  isExpanded,
  setIsExpanded,
  children,
}: {
  icon: React.ElementType
  label: string
  active?: boolean
  isExpanded: boolean
  setIsExpanded: (val: boolean) => void
  children: React.ReactNode
}) {
  const [isOpen, setIsOpen] = useState(false)

  const handleToggle = () => {
    if (!isExpanded) {
      setIsExpanded(true)
      setIsOpen(true)
    } else {
      setIsOpen(!isOpen)
    }
  }

  return (
    <div className="flex flex-col">
      <div
        onClick={handleToggle}
        title={!isExpanded ? label : undefined}
        className={`flex items-center justify-between p-3 mx-2 rounded-lg transition-colors cursor-pointer group relative overflow-hidden ${
          active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'
        }`}
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center min-w-6">
            <Icon className="size-5" />
          </div>
          <div
            className={`whitespace-nowrap text-sm font-medium transition-all duration-300 ${isExpanded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 pointer-events-none absolute left-14'}`}
          >
            {label}
          </div>
        </div>
        {isExpanded && (
          <div className="text-muted-foreground whitespace-nowrap opacity-100 transition-opacity">
            {isOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
          </div>
        )}
      </div>

      {/* Submenu items */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isExpanded && isOpen ? 'max-h-72 opacity-100 mt-1' : 'max-h-0 opacity-0'
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

export function DashboardShell({
  children,
  companyId,
  companyName,
  userEmail,
  currentDate,
  isAdmin,
  initialIsExpanded,
}: DashboardShellProps) {
  const [isExpanded, setIsExpanded] = useState(initialIsExpanded)
  const pathname = usePathname()
  const inCadastros =
    pathname.startsWith('/dashboard/filiais') ||
    pathname.startsWith('/dashboard/funcionarios') ||
    pathname.startsWith('/dashboard/clientes') ||
    pathname.startsWith('/dashboard/fornecedores') ||
    pathname.startsWith('/dashboard/terceiros') ||
    pathname.startsWith('/dashboard/pecas') ||
    pathname.startsWith('/dashboard/servicos')
  const inOrdens = pathname.startsWith('/dashboard/ordens-de-servico')
  const inAtendimento = pathname.startsWith('/dashboard/atendimento')
  const inEstoque = pathname.startsWith('/dashboard/estoque')
  const inFinanceiro = pathname.startsWith('/dashboard/financeiro')
  const inRelatorios = pathname.startsWith('/dashboard/relatorios')
  const inConfiguracoes = pathname.startsWith('/dashboard/configuracoes')

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_EXPANDED_STORAGE_KEY, String(isExpanded))
    document.cookie = `${SIDEBAR_EXPANDED_COOKIE_KEY}=${String(isExpanded)}; path=/; max-age=31536000; samesite=lax`
  }, [isExpanded])

  return (
    <RouteTransitionProvider>
      <div className="bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased min-h-screen flex">
      {/* SIDEBAR */}
      <aside
        className={`fixed left-0 top-0 h-screen bg-white dark:bg-slate-900 border-r border-border py-4 flex flex-col space-y-4 z-50 transition-all duration-300 ease-in-out ${
          isExpanded ? 'w-64' : 'w-20'
        }`}
      >
        <div className="flex items-center mb-6 px-4">
          <div className="w-10 h-10 min-w-10 bg-primary rounded-lg flex items-center justify-center text-primary-foreground shadow-sm">
            <Wrench className="size-6" />
          </div>
          <div
            className={`overflow-hidden transition-all duration-300 ml-3 ${
              isExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0'
            }`}
          >
            <span className="font-bold text-lg leading-tight block">AssistênciaNet</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">
              Gestão
            </span>
          </div>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="ml-auto text-muted-foreground hover:text-primary transition-colors p-1"
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
              icon={Folder}
              label="Cadastros"
              active={inCadastros}
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
            href="/dashboard/atendimento"
            icon={MessagesSquare}
            label="Atendimento"
            active={inAtendimento}
            isExpanded={isExpanded}
            badge={<AtendimentoWaitingBadge companyId={companyId} isExpanded={isExpanded} />}
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
              icon={DollarSign}
              label="Financeiro"
              active={inFinanceiro}
              isExpanded={isExpanded}
              setIsExpanded={setIsExpanded}
            >
              <SidebarSubItem
                href="/dashboard/financeiro/contas-a-pagar"
                label="Contas a Pagar"
                active={pathname.startsWith('/dashboard/financeiro/contas-a-pagar')}
                isExpanded={isExpanded}
              />
              <SidebarSubItem
                href="/dashboard/financeiro/contas-a-receber"
                label="Contas a Receber"
                active={pathname.startsWith('/dashboard/financeiro/contas-a-receber')}
                isExpanded={isExpanded}
              />
              <SidebarSubItem
                href="/dashboard/financeiro/producao-tecnicos"
                label="Produção de Técnicos"
                active={pathname.startsWith('/dashboard/financeiro/producao-tecnicos')}
                isExpanded={isExpanded}
              />
            </SidebarMenu>
          )}
          {isAdmin && (
            <SidebarLink
              href="/dashboard/relatorios"
              icon={BarChart3}
              label="Relatórios"
              active={inRelatorios}
              isExpanded={isExpanded}
            />
          )}
        </nav>

        <div className="mt-auto flex flex-col space-y-4 pb-2 px-2">
          {isAdmin && (
            <SidebarLink
              href="/dashboard/logs"
              icon={History}
              label="Logs do Sistema"
              active={pathname.startsWith('/dashboard/logs')}
              isExpanded={isExpanded}
            />
          )}

          <SidebarMenu
            icon={Settings}
            label="Configurações"
            active={inConfiguracoes}
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
              href="/dashboard/configuracoes/automacao"
              label="Automação"
              active={pathname.startsWith('/dashboard/configuracoes/automacao')}
              isExpanded={isExpanded}
            />
          </SidebarMenu>

          <div className="px-2">
            <Link
              href="/dashboard/ordens-de-servico/nova"
              className={`bg-primary text-primary-foreground h-12 rounded-xl flex items-center justify-center shadow-lg hover:bg-primary/90 transition-all active:scale-95 cursor-pointer w-full`}
            >
              <Plus className="size-6 min-w-6" />
              <span
                className={`font-semibold ml-2 transition-all duration-300 whitespace-nowrap overflow-hidden ${isExpanded ? 'w-auto opacity-100' : 'w-0 opacity-0 hidden'}`}
              >
                Nova OS
              </span>
            </Link>
          </div>

          <div className="px-4 flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 min-w-10 rounded-full bg-slate-200 overflow-hidden border-2 border-background flex items-center justify-center text-xs font-bold text-slate-500">
              {userEmail.charAt(0).toUpperCase()}
            </div>
            {isExpanded && (
              <div className="flex-col whitespace-nowrap opacity-100 transition-opacity duration-300">
                <p className="text-sm font-semibold text-foreground leading-none">{companyName}</p>
                <p className="text-[10px] text-muted-foreground font-medium truncate max-w-30">
                  {userEmail}
                </p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT WRAPPER */}
      <div
        className={`flex-1 transition-all duration-300 min-h-screen ${isExpanded ? 'ml-64' : 'ml-20'}`}
      >
        {/* TOP NAVBAR */}
        <header
          className={`fixed top-0 right-0 h-16 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md flex justify-between items-center px-8 z-40 border-b border-border transition-all duration-300 ${
            isExpanded ? 'w-[calc(100%-16rem)]' : 'w-[calc(100%-5rem)]'
          }`}
        >
          <div className="flex items-center gap-4">
            <h1 className="text-foreground font-semibold text-lg">
              {isAdmin ? 'Dashboard Geral' : 'Meu Painel'}
            </h1>
            <span className="text-muted-foreground text-sm font-medium tracking-tight bg-muted px-3 py-1 rounded-full border border-border hidden sm:block">
              {currentDate}
            </span>
          </div>

          <div className="flex items-center space-x-4">
            <button className="p-2 text-muted-foreground hover:text-primary transition-colors cursor-pointer">
              <Search className="size-5" />
            </button>
            <NotificationBell />
            <div className="h-6 w-px bg-border"></div>

            <form action={logout}>
              <button
                title="Sair"
                type="submit"
                className="p-2 text-muted-foreground hover:text-destructive transition-colors cursor-pointer font-medium text-sm"
              >
                Sair
              </button>
            </form>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main className="pt-24 pb-12 px-8 w-full max-w-none space-y-10">
          {children}
        </main>
      </div>
      </div>
    </RouteTransitionProvider>
  )
}
