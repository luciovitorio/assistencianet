import type { Metadata } from 'next'
import Link from 'next/link'
import { JetBrains_Mono, Plus_Jakarta_Sans } from 'next/font/google'
import {
  Building2,
  ClipboardCheck,
  Eye,
  History,
  MessageCircle,
  ShieldCheck,
  Users,
  Wrench,
} from 'lucide-react'
import { LandingFooter } from '../_components/landing-footer'
import { Reveal, Stagger, StaggerItem } from '../_components/landing-motion'
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

const values = [
  {
    title: 'Simplicidade operacional',
    description:
      'A tela precisa acompanhar a pressa do balcão, a rotina do técnico e a visão do gestor sem exigir processos complicados.',
    icon: ClipboardCheck,
  },
  {
    title: 'Rastreabilidade',
    description:
      'Histórico, permissões e auditoria ajudam a empresa a entender o que aconteceu em cada ordem, cliente, peça e filial.',
    icon: History,
  },
  {
    title: 'Comunicação clara',
    description:
      'WhatsApp e atualizações de status reduzem ligações repetidas e deixam o cliente informado durante todo o atendimento.',
    icon: MessageCircle,
  },
  {
    title: 'Crescimento com controle',
    description:
      'Multi-filial, estoque, financeiro e equipe precisam crescer juntos, mantendo separação operacional e visão consolidada.',
    icon: Building2,
  },
]

const principles = [
  'Construir a partir de problemas reais da assistência técnica.',
  'Evitar complexidade que atrapalha a rotina do balcão.',
  'Preservar histórico antes de apagar contexto importante.',
  'Dar visibilidade para decisões de estoque, equipe e financeiro.',
]

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'AboutPage',
  name: 'Sobre nós | SmartConserto',
  url: `${siteConfig.url}/sobre-nos`,
  about: {
    '@type': 'Organization',
    name: siteConfig.name,
    url: siteConfig.url,
    email: siteConfig.contactEmail,
    description:
      'SaaS de gestão para assistências técnicas com ordens de serviço, clientes, estoque, financeiro, WhatsApp, filiais e auditoria.',
  },
}

export const metadata: Metadata = {
  title: 'Sobre nós | SmartConserto',
  description:
    'Conheça o SmartConserto, um sistema de gestão criado para simplificar a rotina de assistências técnicas com OS, WhatsApp, estoque, financeiro e controle por filial.',
  alternates: {
    canonical: `${siteConfig.url}/sobre-nos`,
  },
  openGraph: {
    title: 'Sobre nós | SmartConserto',
    description:
      'Criamos tecnologia para assistências técnicas operarem com simplicidade, rastreabilidade e visão de gestão.',
    url: `${siteConfig.url}/sobre-nos`,
    siteName: siteConfig.name,
    locale: 'pt_BR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sobre nós | SmartConserto',
    description: 'Gestão simples, rastreável e conectada para assistências técnicas.',
  },
}

export default function AboutPage() {
  return (
    <div className={`${s.root} ${plusJakarta.variable} ${jetbrainsMono.variable}`} id="inicio">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />

      <LandingNav />

      <main>
        <section className={`${s.hero} ${s['about-hero']}`}>
          <div className={`${s['hero-inner']} ${s['about-hero-inner']}`}>
            <Reveal className={s['about-hero-copy']} direction="right">
              <div className={s['hero-badge']}>
                <div className={s['hero-badge-dot']}></div>
                Sobre o SmartConserto
              </div>
              <h1>
                Tecnologia feita para a rotina real da <em>assistência técnica</em>
              </h1>
              <p className={s['hero-sub']}>
                O SmartConserto nasceu para organizar ordens de serviço, clientes, peças,
                financeiro e comunicação em uma operação simples de usar e fácil de auditar.
              </p>
              <div className={s['hero-actions']}>
                <Link href="/register" className={s['btn-hero']}>
                  Começar grátis
                </Link>
                <Link href="/funcionalidades" className={s['btn-hero-ghost']}>
                  Ver funcionalidades
                </Link>
              </div>
            </Reveal>

            <Reveal className={s['about-hero-panel']} direction="left">
              <div className={s['about-panel-header']}>
                <span>O que defendemos</span>
                <strong>Operação clara</strong>
              </div>
              <div className={s['about-panel-focus']}>
                <Wrench aria-hidden="true" />
                <div>
                  <strong>Menos improviso, mais controle</strong>
                  <span>OS, WhatsApp, estoque, financeiro e filial conectados no mesmo fluxo.</span>
                </div>
              </div>
              <div className={s['about-panel-grid']}>
                <div>
                  <span>Visão</span>
                  <strong>Multi-filial</strong>
                </div>
                <div>
                  <span>Base</span>
                  <strong>Histórico</strong>
                </div>
                <div>
                  <span>Rotina</span>
                  <strong>Balcão</strong>
                </div>
                <div>
                  <span>Canal</span>
                  <strong>WhatsApp</strong>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        <section className={`${s.section} ${s['about-story']}`}>
          <div className={s['section-inner']}>
            <div className={s['about-story-grid']}>
              <Reveal direction="right">
                <div className={s['section-tag']}>Nossa história</div>
                <h2 className={s['section-title']}>Começamos pelo problema operacional</h2>
                <p className={s['section-sub']}>
                  Assistências técnicas costumam crescer com informações espalhadas entre caderno,
                  planilhas, conversas no WhatsApp e memória da equipe. Isso funciona por um tempo,
                  mas dificulta cobrança, garantia, reposição de peças e gestão por filial.
                </p>
              </Reveal>

              <Reveal className={s['about-story-card']} direction="left">
                <p>
                  Nosso foco é transformar essa rotina em um sistema direto: cada atendimento tem
                  histórico, cada etapa pode avisar o cliente e cada gestor enxerga o que precisa
                  para decidir sem depender de retrabalho manual.
                </p>
                <div className={s['about-story-mark']}>
                  <Eye aria-hidden="true" />
                  <span>Visibilidade para decidir melhor todos os dias.</span>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        <section className={`${s.section} ${s.features}`}>
          <div className={s['section-inner']}>
            <Reveal className={s['features-header']}>
              <div className={s['section-tag']}>Valores do produto</div>
              <h2 className={s['section-title']}>O que guia cada decisão</h2>
              <p className={s['section-sub']}>
                O produto é desenhado para apoiar empresas que precisam atender rápido, manter
                controle e preservar confiança com o cliente.
              </p>
            </Reveal>
            <Stagger className={s['about-values-grid']}>
              {values.map((value) => {
                const Icon = value.icon
                return (
                  <StaggerItem key={value.title} className={s['about-value-card']}>
                    <div className={s['feature-icon']}>
                      <Icon aria-hidden="true" />
                    </div>
                    <strong>{value.title}</strong>
                    <span>{value.description}</span>
                  </StaggerItem>
                )
              })}
            </Stagger>
          </div>
        </section>

        <section className={`${s.section} ${s['about-ops']}`}>
          <div className={s['section-inner']}>
            <div className={s['about-ops-grid']}>
              <Reveal className={s['about-ops-panel']} direction="right">
                <div className={s['about-ops-row']}>
                  <Users aria-hidden="true" />
                  <div>
                    <strong>Para equipe de balcão, técnica e gestão</strong>
                    <span>Cada perfil trabalha no que importa, sem perder contexto do atendimento.</span>
                  </div>
                </div>
                <div className={s['about-ops-row']}>
                  <ShieldCheck aria-hidden="true" />
                  <div>
                    <strong>Com permissões e auditoria</strong>
                    <span>Alterações importantes ficam rastreáveis para reduzir dúvidas internas.</span>
                  </div>
                </div>
                <div className={s['about-ops-row']}>
                  <MessageCircle aria-hidden="true" />
                  <div>
                    <strong>Com comunicação automática</strong>
                    <span>Status da OS e mensagens reduzem follow-up manual com o cliente.</span>
                  </div>
                </div>
              </Reveal>

              <Reveal direction="left">
                <div className={s['section-tag']}>Como pensamos</div>
                <h2 className={s['section-title']}>Sistema bom é o que a equipe consegue usar todo dia</h2>
                <div className={s['about-principles-list']}>
                  {principles.map((item) => (
                    <div key={item} className={s['features-page-check']}>
                      <ClipboardCheck aria-hidden="true" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        <section className={`${s.section} ${s['cta-final']}`}>
          <div className={s['cta-final-inner']}>
            <h2>
              Vamos simplificar
              <br />
              sua assistência técnica
            </h2>
            <p>
              Teste o SmartConserto com sua equipe e veja como OS, clientes, WhatsApp, estoque e
              financeiro ficam mais claros no mesmo lugar.
            </p>
            <div className={s['cta-final-actions']}>
              <Link href="/register" className={s['btn-cta-white']}>
                Criar conta grátis
              </Link>
              <a href={`mailto:${siteConfig.contactEmail}`} className={s['btn-cta-outline']}>
                Falar com o time
              </a>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  )
}
