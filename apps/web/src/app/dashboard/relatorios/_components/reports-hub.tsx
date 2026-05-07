'use client'

import Link from 'next/link'
import {
  AlertCircle,
  BarChart3,
  Building2,
  ClipboardList,
  FileText,
  Package,
  TrendingUp,
  UserCheck,
  Wrench,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

type ReportCard = {
  title: string
  description: string
  icon: React.ElementType
  href: string
  category: string
  available: boolean
}

const REPORT_CARDS: ReportCard[] = [
  {
    title: 'OS em Aberto / Atrasadas',
    description: 'Todas as ordens de serviço em andamento, com destaque para as que passaram do prazo.',
    icon: AlertCircle,
    href: '/dashboard/relatorios/os-abertas',
    category: 'Operacional',
    available: true,
  },
  {
    title: 'Orçamentos — Conversão',
    description: 'Taxa de aprovação, reprovação e ticket médio dos orçamentos no período.',
    icon: FileText,
    href: '/dashboard/relatorios/orcamentos',
    category: 'Comercial',
    available: true,
  },
  {
    title: 'Equipamentos Mais Atendidos',
    description: 'Ranking de marca e modelo com maior volume de OS no período.',
    icon: Wrench,
    href: '/dashboard/relatorios/equipamentos',
    category: 'Operacional',
    available: true,
  },
  {
    title: 'Recorrência de Clientes',
    description: 'Clientes com maior número de visitas e frequência de retorno.',
    icon: UserCheck,
    href: '/dashboard/relatorios/clientes-recorrentes',
    category: 'Comercial',
    available: true,
  },
  {
    title: 'Comparativo de Filiais',
    description: 'Volume de OS, faturamento e prazo médio lado a lado por filial.',
    icon: Building2,
    href: '/dashboard/relatorios/comparativo-filiais',
    category: 'Gerencial',
    available: true,
  },
  {
    title: 'OS por Período',
    description: 'Listagem detalhada de todas as OS concluídas com exportação para Excel.',
    icon: ClipboardList,
    href: '/dashboard/relatorios/os-por-periodo',
    category: 'Operacional',
    available: false,
  },
  {
    title: 'Faturamento por Período',
    description: 'Receita detalhada por serviço e peças, separada por filial.',
    icon: TrendingUp,
    href: '/dashboard/relatorios/faturamento',
    category: 'Financeiro',
    available: false,
  },
  {
    title: 'Produtividade por Técnico',
    description: 'OS abertas, concluídas e tempo médio de resolução por técnico.',
    icon: BarChart3,
    href: '/dashboard/relatorios/produtividade',
    category: 'Operacional',
    available: false,
  },
  {
    title: 'Peças / Giro de Estoque',
    description: 'Peças mais usadas, itens parados e valor do estoque por filial.',
    icon: Package,
    href: '/dashboard/relatorios/estoque',
    category: 'Estoque',
    available: false,
  },
]

const CATEGORY_ORDER = ['Operacional', 'Comercial', 'Gerencial', 'Financeiro', 'Estoque']

const CATEGORY_COLORS: Record<string, string> = {
  Operacional: 'bg-blue-50 text-blue-700 border-blue-200',
  Comercial: 'bg-violet-50 text-violet-700 border-violet-200',
  Gerencial: 'bg-amber-50 text-amber-700 border-amber-200',
  Financeiro: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Estoque: 'bg-orange-50 text-orange-700 border-orange-200',
}

export function ReportsHub() {
  const grouped = CATEGORY_ORDER.reduce<Record<string, ReportCard[]>>((acc, category) => {
    acc[category] = REPORT_CARDS.filter((c) => c.category === category)
    return acc
  }, {})

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-medium text-muted-foreground">Relatórios</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Central de Relatórios</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Consulte, imprima e exporte dados detalhados do seu negócio.
        </p>
      </div>

      <div className="space-y-8">
        {CATEGORY_ORDER.map((category) => {
          const cards = grouped[category]
          if (!cards || cards.length === 0) return null
          return (
            <section key={category}>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {category}
              </h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {cards.map((card) => {
                  const Icon = card.icon
                  return (
                    <div
                      key={card.href}
                      className={`flex flex-col rounded-xl border bg-card p-5 transition-shadow ${card.available ? 'hover:shadow-md' : 'opacity-60'}`}
                    >
                      <div className="mb-4 flex items-start justify-between">
                        <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
                          <Icon className="size-5 text-muted-foreground" />
                        </div>
                        <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${CATEGORY_COLORS[category]}`}>
                          {category}
                        </span>
                      </div>
                      <h3 className="mb-1 font-semibold">{card.title}</h3>
                      <p className="mb-4 flex-1 text-sm text-muted-foreground">{card.description}</p>
                      {card.available ? (
                        <Button asChild size="sm" variant="outline" className="w-full">
                          <Link href={card.href}>Ver relatório</Link>
                        </Button>
                      ) : (
                        <Badge variant="secondary" className="w-full justify-center py-1 text-xs">
                          Em breve
                        </Badge>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Visão Consolidada
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div className="flex flex-col rounded-xl border bg-card p-5 hover:shadow-md transition-shadow">
          <div className="mb-4 flex items-start justify-between">
            <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
              <BarChart3 className="size-5 text-muted-foreground" />
            </div>
          </div>
          <h3 className="mb-1 font-semibold">Painel BI — Visão Geral</h3>
          <p className="mb-4 flex-1 text-sm text-muted-foreground">
            Resumo executivo com KPIs de OS, financeiro e estoque em um único painel.
          </p>
          <Button asChild size="sm" variant="outline" className="w-full">
            <Link href="/dashboard/relatorios/visao-geral">Ver painel</Link>
          </Button>
        </div>
        </div>
      </section>
    </div>
  )
}
