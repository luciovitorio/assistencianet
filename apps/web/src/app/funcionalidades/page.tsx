import type { Metadata } from 'next'
import Link from 'next/link'
import { JetBrains_Mono, Plus_Jakarta_Sans } from 'next/font/google'
import {
  BellRing,
  Boxes,
  Building2,
  ChartColumn,
  ClipboardCheck,
  FileText,
  History,
  Landmark,
  MessageCircle,
  Package,
  QrCode,
  ShieldCheck,
  Users,
  WalletCards,
  Webhook,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { LandingFooter } from '../_components/landing-footer'
import { MotionCard, Reveal, Stagger, StaggerItem } from '../_components/landing-motion'
import { LandingNav } from '../_components/landing-nav'
import s from '../landing.module.css'
import { siteConfig } from '@/lib/site'

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--lp-font',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  display: 'swap',
  variable: '--lp-mono',
})

type Feature = {
  title: string
  description: string
  tags: string[]
  icon: LucideIcon
  tone?: 'green' | 'amber' | 'teal' | 'purple'
}

const coreFeatures: Feature[] = [
  {
    title: 'Ordens de serviço completas',
    description:
      'Abra OS com dados do cliente, equipamento, defeito relatado, fotos, orçamento, peças usadas, histórico técnico e status de execução.',
    tags: ['Entrada rápida', 'Fotos e laudos', 'PDF da OS'],
    icon: FileText,
  },
  {
    title: 'WhatsApp em cada etapa',
    description:
      'Automatize avisos de orçamento, aprovação, andamento, conclusão e retirada para reduzir ligações e manter o cliente informado.',
    tags: ['Mensagens automáticas', 'Status da OS', 'Aprovação online'],
    icon: MessageCircle,
    tone: 'green',
  },
  {
    title: 'Estoque e peças',
    description:
      'Controle entradas, saídas, fornecedores, estoque mínimo e custo real aplicado em cada ordem de serviço.',
    tags: ['Estoque mínimo', 'Custo por OS', 'Fornecedores'],
    icon: Package,
    tone: 'teal',
  },
  {
    title: 'Financeiro operacional',
    description:
      'Acompanhe recebimentos, contas, fluxo de caixa, valores em aberto e fechamento do período por filial.',
    tags: ['Contas a receber', 'Fluxo de caixa', 'PIX'],
    icon: WalletCards,
    tone: 'amber',
  },
  {
    title: 'Clientes e equipamentos',
    description:
      'Mantenha histórico por cliente e equipamento, com serviços anteriores, recorrência, contatos e observações importantes.',
    tags: ['Histórico completo', 'Multi-equipamentos', 'Busca rápida'],
    icon: Users,
    tone: 'purple',
  },
  {
    title: 'Relatórios e indicadores',
    description:
      'Veja OS abertas, prontas, atrasadas, faturamento, ticket médio, peças mais usadas e produtividade da equipe.',
    tags: ['Dashboard', 'Exportação', 'Produtividade'],
    icon: ChartColumn,
  },
]

const managementFeatures: Feature[] = [
  {
    title: 'Multi-filial com visibilidade',
    description:
      'Separe operações por unidade sem perder visão consolidada de ordens, estoque, financeiro e equipe.',
    tags: ['Filiais', 'Visão consolidada', 'Separação operacional'],
    icon: Building2,
  },
  {
    title: 'Permissões por função',
    description:
      'Controle o que cada perfil pode ver e executar, mantendo a rotina simples para balcão, técnico e gestor.',
    tags: ['Perfis', 'Equipe', 'Segurança'],
    icon: ShieldCheck,
    tone: 'purple',
  },
  {
    title: 'Auditoria de mudanças',
    description:
      'Preserve rastreabilidade em ações administrativas e alterações sensíveis para evitar perda de contexto.',
    tags: ['Log de ações', 'Rastreabilidade', 'Soft delete'],
    icon: History,
    tone: 'amber',
  },
]

const integrationItems = [
  {
    icon: BellRing,
    title: 'Notificações automáticas',
    description: 'Mensagens por evento da OS: orçamento enviado, aprovado, em reparo, pronto e entregue.',
  },
  {
    icon: QrCode,
    title: 'PIX e cobrança',
    description: 'Fluxo preparado para cobrança rápida, conciliação operacional e menos retrabalho no caixa.',
  },
  {
    icon: Webhook,
    title: 'Integrações por API',
    description: 'Base para conectar canais, ferramentas externas e automações conforme a operação crescer.',
  },
  {
    icon: ClipboardCheck,
    title: 'Checklist técnico',
    description: 'Padronize conferências de entrada, reparo e entrega para reduzir erros e disputas.',
  },
]

const flowSteps = [
  { label: 'Entrada', value: 'OS aberta', detail: 'cliente, aparelho e problema' },
  { label: 'Orçamento', value: 'Aprovação', detail: 'envio e resposta no WhatsApp' },
  { label: 'Reparo', value: 'Execução', detail: 'peças, status e responsável' },
  { label: 'Entrega', value: 'Finalização', detail: 'pagamento e histórico salvo' },
]

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  name: 'Funcionalidades do SmartConserto',
  itemListElement: coreFeatures.map((feature, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: feature.title,
    description: feature.description,
  })),
}

export const metadata: Metadata = {
  title: 'Funcionalidades | SmartConserto',
  description:
    'Conheça as funcionalidades do SmartConserto para assistência técnica: OS, WhatsApp, estoque, financeiro, clientes, relatórios, multi-filial e auditoria.',
  alternates: {
    canonical: `${siteConfig.url}/funcionalidades`,
  },
  openGraph: {
    title: 'Funcionalidades | SmartConserto',
    description:
      'Tudo que sua assistência técnica precisa para controlar OS, clientes, estoque, financeiro, WhatsApp e filiais.',
    url: `${siteConfig.url}/funcionalidades`,
    siteName: siteConfig.name,
    locale: 'pt_BR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Funcionalidades | SmartConserto',
    description: 'Gestão completa para assistência técnica com operação simples e rastreável.',
  },
}

function FeatureCard({ feature }: { feature: Feature }) {
  const Icon = feature.icon
  const iconClassName = feature.tone
    ? `${s['feature-icon']} ${s[feature.tone]}`
    : s['feature-icon']

  return (
    <MotionCard className={s['feature-card']}>
      <div className={iconClassName}>
        <Icon aria-hidden="true" />
      </div>
      <div className={s['feature-title']}>{feature.title}</div>
      <div className={s['feature-desc']}>{feature.description}</div>
      <div className={s['feature-tags']}>
        {feature.tags.map((tag) => (
          <span key={tag} className={s['feature-tag']}>
            {tag}
          </span>
        ))}
      </div>
    </MotionCard>
  )
}

export default function FeaturesPage() {
  return (
    <div className={`${s.root} ${plusJakarta.variable} ${jetbrainsMono.variable}`} id="inicio">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />

      <LandingNav />

      <main>
        <section className={`${s.hero} ${s['features-page-hero']}`} id="visao-geral">
          <div className={`${s['hero-inner']} ${s['features-page-hero-inner']}`}>
            <Reveal className={s['features-page-copy']} direction="right">
              <div className={s['hero-badge']}>
                <div className={s['hero-badge-dot']}></div>
                Funcionalidades do SmartConserto
              </div>
              <h1>
                Controle a assistência técnica <em>do balcão ao financeiro</em>
              </h1>
              <p className={s['hero-sub']}>
                Uma plataforma para abrir OS, acompanhar reparos, avisar clientes pelo WhatsApp,
                controlar estoque, fechar caixa e enxergar cada filial com clareza.
              </p>
              <div className={s['hero-actions']}>
                <Link href="/register" className={s['btn-hero']}>
                  Começar grátis
                </Link>
                <Link href="/#precos" className={s['btn-hero-ghost']}>
                  Ver planos
                </Link>
              </div>
            </Reveal>

            <Reveal className={s['features-page-hero-card']} direction="left">
              <div className={s['features-page-panel-head']}>
                <span>Fluxo operacional</span>
                <strong>Hoje</strong>
              </div>
              <div className={s['features-page-metrics']}>
                <div className={s['features-page-metric']}>
                  <span>OS abertas</span>
                  <strong>47</strong>
                </div>
                <div className={s['features-page-metric']}>
                  <span>Prontas</span>
                  <strong>14</strong>
                </div>
                <div className={s['features-page-metric']}>
                  <span>Mensagens</span>
                  <strong>83</strong>
                </div>
              </div>
              <div className={s['features-page-flow']}>
                {flowSteps.map((step, index) => (
                  <div key={step.label} className={s['features-page-flow-step']}>
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    <div>
                      <strong>{step.label}</strong>
                      <p>{step.value}</p>
                      <small>{step.detail}</small>
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        <section className={`${s.section} ${s.features}`} id="funcionalidades">
          <div className={s['section-inner']}>
            <Reveal className={s['features-header']}>
              <div className={s['section-tag']}>Módulos principais</div>
              <h2 className={s['section-title']}>Tudo conectado na mesma rotina</h2>
              <p className={s['section-sub']}>
                As funções foram pensadas para a operação real da assistência técnica: rapidez no
                atendimento, histórico confiável, visibilidade por filial e menos trabalho manual.
              </p>
            </Reveal>
            <Stagger className={s['features-grid']}>
              {coreFeatures.map((feature) => (
                <FeatureCard key={feature.title} feature={feature} />
              ))}
            </Stagger>
          </div>
        </section>

        <section className={`${s.section} ${s['features-page-band']}`}>
          <div className={s['section-inner']}>
            <div className={s['feature-detail-grid']}>
              <Reveal direction="right">
                <div className={s['section-tag']}>Operação de ponta a ponta</div>
                <h2 className={s['section-title']}>Menos planilha, menos retrabalho, mais rastreabilidade</h2>
                <p className={s['section-sub']}>
                  O SmartConserto organiza a rotina que normalmente fica espalhada entre caderno,
                  WhatsApp, planilha e memória da equipe.
                </p>
                <div className={s['features-page-check-list']}>
                  {[
                    'Balcão abre a OS com dados essenciais e fotos.',
                    'Técnico atualiza status, peças e observações.',
                    'Cliente recebe avisos automáticos no WhatsApp.',
                    'Gestor acompanha financeiro, atrasos e produtividade.',
                  ].map((item) => (
                    <div key={item} className={s['features-page-check']}>
                      <ClipboardCheck aria-hidden="true" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </Reveal>

              <Reveal className={s['feature-detail-panel']} direction="left">
                <div className={s['detail-row']}>
                  <FileText aria-hidden="true" />
                  <div>
                    <strong>OS com histórico vivo</strong>
                    <span>Cliente, equipamento, fotos, status e registros técnicos no mesmo lugar.</span>
                  </div>
                </div>
                <div className={s['detail-row']}>
                  <MessageCircle aria-hidden="true" />
                  <div>
                    <strong>Comunicação sem depender de lembrete</strong>
                    <span>Eventos da OS disparam mensagens para reduzir ligações repetidas.</span>
                  </div>
                </div>
                <div className={s['detail-row']}>
                  <Landmark aria-hidden="true" />
                  <div>
                    <strong>Fechamento mais claro</strong>
                    <span>Valores recebidos, pendentes e custos ficam ligados ao atendimento.</span>
                  </div>
                </div>
                <div className={s['detail-row']}>
                  <Boxes aria-hidden="true" />
                  <div>
                    <strong>Peças com impacto no lucro</strong>
                    <span>Uso de estoque entra no custo real da OS e ajuda na reposição.</span>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        <section className={`${s.section} ${s.features}`} id="gestao">
          <div className={s['section-inner']}>
            <Reveal className={s['features-header']}>
              <div className={s['section-tag']}>Gestão e segurança</div>
              <h2 className={s['section-title']}>Controle para crescer com várias unidades</h2>
              <p className={s['section-sub']}>
                Recursos administrativos para manter a operação simples, com separação por filial,
                papéis claros e histórico confiável de ações.
              </p>
            </Reveal>
            <Stagger className={s['features-grid']}>
              {managementFeatures.map((feature) => (
                <FeatureCard key={feature.title} feature={feature} />
              ))}
            </Stagger>
          </div>
        </section>

        <section className={`${s.section} ${s['features-page-band']}`} id="integracoes">
          <div className={s['section-inner']}>
            <Reveal className={s['features-header']}>
              <div className={s['section-tag']}>Automações e integrações</div>
              <h2 className={s['section-title']}>Funções que tiram trabalho repetitivo da equipe</h2>
              <p className={s['section-sub']}>
                A base do sistema já considera WhatsApp, cobrança, checklists e integração com
                ferramentas externas quando a assistência precisar evoluir.
              </p>
            </Reveal>
            <Stagger className={s['integration-grid']}>
              {integrationItems.map((item) => {
                const Icon = item.icon
                return (
                  <StaggerItem key={item.title} className={s['integration-card']}>
                    <Icon aria-hidden="true" />
                    <strong>{item.title}</strong>
                    <span>{item.description}</span>
                  </StaggerItem>
                )
              })}
            </Stagger>
          </div>
        </section>

        <section className={`${s.section} ${s['cta-final']}`}>
          <div className={s['cta-final-inner']}>
            <h2>
              Veja as funcionalidades
              <br />
              funcionando na sua rotina
            </h2>
            <p>
              Comece com 30 dias grátis e teste o fluxo completo de OS, clientes, WhatsApp,
              estoque e financeiro sem cartão de crédito.
            </p>
            <div className={s['cta-final-actions']}>
              <Link href="/register" className={s['btn-cta-white']}>
                Criar conta grátis
              </Link>
              <a href={`mailto:${siteConfig.contactEmail}`} className={s['btn-cta-outline']}>
                Falar com um especialista
              </a>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  )
}
