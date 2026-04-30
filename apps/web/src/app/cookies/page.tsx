import type { Metadata } from 'next'
import Link from 'next/link'
import { JetBrains_Mono, Plus_Jakarta_Sans } from 'next/font/google'
import {
  BarChart3,
  Cookie,
  FileText,
  LockKeyhole,
  Mail,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
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

type CookieHighlight = {
  title: string
  description: string
  icon: LucideIcon
}

type CookieSection = {
  id: string
  title: string
  body: string[]
}

const updatedAt = '30 de abril de 2026'

const highlights: CookieHighlight[] = [
  {
    title: 'Cookies técnicos',
    description:
      'Necessários para autenticação, segurança, sessão, preferências e funcionamento básico do site.',
    icon: LockKeyhole,
  },
  {
    title: 'Cookies de análise',
    description:
      'Podem ser usados para entender navegação, páginas acessadas e melhorias de experiência.',
    icon: BarChart3,
  },
  {
    title: 'Escolha do usuário',
    description:
      'O banner permite aceitar ou recusar cookies não essenciais, preservando os técnicos necessários.',
    icon: SlidersHorizontal,
  },
  {
    title: 'Transparência',
    description:
      'Esta política explica quais tecnologias podem ser usadas e como você pode controlar preferências.',
    icon: ShieldCheck,
  },
]

const summaryItems = [
  { label: 'Essenciais', value: 'mantêm login, sessão, segurança e preferências básicas' },
  { label: 'Análise', value: 'ajudam a entender uso do site quando autorizados' },
  { label: 'Controle', value: 'você pode aceitar ou recusar cookies não essenciais' },
  { label: 'Contato', value: siteConfig.contactEmail },
]

const cookieSections: CookieSection[] = [
  {
    id: 'o-que-sao',
    title: '1. O que são cookies',
    body: [
      'Cookies são pequenos arquivos ou identificadores armazenados no navegador para reconhecer preferências, manter sessões, melhorar segurança e entender como um site é utilizado.',
      'Tecnologias semelhantes, como armazenamento local do navegador, pixels ou identificadores técnicos, também podem ser usadas com finalidades parecidas.',
    ],
  },
  {
    id: 'como-usamos',
    title: '2. Como usamos cookies',
    body: [
      'Usamos cookies e tecnologias semelhantes para manter o funcionamento do SmartConserto, proteger acessos, lembrar preferências e melhorar a experiência de navegação.',
      'Quando houver ferramentas de análise ou marketing, elas deverão ser usadas para medir desempenho, entender páginas acessadas e orientar melhorias do produto e da comunicação.',
    ],
  },
  {
    id: 'tipos',
    title: '3. Tipos de cookies',
    body: [
      'Cookies essenciais são necessários para que o site e a plataforma funcionem corretamente. Eles podem incluir autenticação, segurança, sessão, prevenção de fraude, roteamento e preferências básicas.',
      'Cookies de análise ajudam a entender como visitantes usam páginas públicas, quais conteúdos têm maior uso e onde a experiência pode melhorar.',
      'Cookies de marketing ou terceiros podem ser usados apenas quando houver integrações específicas, campanhas ou ferramentas externas que dependam desse tipo de tecnologia.',
    ],
  },
  {
    id: 'consentimento',
    title: '4. Consentimento',
    body: [
      'Ao acessar o site, o visitante pode aceitar ou recusar cookies não essenciais pelo banner exibido na navegação.',
      'A recusa não impede o uso de cookies técnicos necessários para segurança, autenticação e funcionamento básico do serviço.',
      'A escolha fica registrada no navegador por período determinado ou até que o usuário limpe dados do navegador.',
    ],
  },
  {
    id: 'terceiros',
    title: '5. Cookies de terceiros',
    body: [
      'Alguns recursos podem depender de provedores externos, como hospedagem, autenticação, análise, suporte, pagamentos, WhatsApp, e-mail ou automações.',
      'Esses provedores podem operar cookies ou tecnologias semelhantes conforme suas próprias políticas, quando necessários para os serviços integrados.',
    ],
  },
  {
    id: 'gerenciar',
    title: '6. Como gerenciar cookies',
    body: [
      'Você pode controlar ou apagar cookies diretamente nas configurações do navegador.',
      'Também é possível limpar o armazenamento local do site no navegador para fazer com que o banner de consentimento apareça novamente.',
      'Bloquear cookies técnicos pode afetar login, segurança, sessão e funcionamento da plataforma.',
    ],
  },
  {
    id: 'relacao-privacidade',
    title: '7. Relação com a Política de Privacidade',
    body: [
      'Esta Política de Cookies complementa a Política de Privacidade do SmartConserto.',
      'Para entender como dados pessoais são tratados na plataforma, consulte também a página de privacidade.',
    ],
  },
  {
    id: 'alteracoes',
    title: '8. Alterações nesta política',
    body: [
      'Esta política pode ser atualizada para refletir mudanças no site, na plataforma, em integrações ou em ferramentas utilizadas.',
      'Quando houver mudanças relevantes, a nova versão será publicada nesta página com a data de atualização correspondente.',
    ],
  },
  {
    id: 'contato',
    title: '9. Contato',
    body: [`Para dúvidas sobre cookies, entre em contato pelo e-mail ${siteConfig.contactEmail}.`],
  },
]

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'Política de Cookies | SmartConserto',
  url: `${siteConfig.url}/cookies`,
  dateModified: '2026-04-30',
  publisher: {
    '@type': 'Organization',
    name: siteConfig.name,
    url: siteConfig.url,
    email: siteConfig.contactEmail,
  },
}

export const metadata: Metadata = {
  title: 'Política de Cookies | SmartConserto',
  description:
    'Entenda como o SmartConserto usa cookies técnicos, cookies de análise, consentimento, terceiros e preferências do navegador.',
  alternates: {
    canonical: `${siteConfig.url}/cookies`,
  },
  openGraph: {
    title: 'Política de Cookies | SmartConserto',
    description:
      'Informações sobre cookies técnicos, análise, consentimento e controle de preferências no SmartConserto.',
    url: `${siteConfig.url}/cookies`,
    siteName: siteConfig.name,
    locale: 'pt_BR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Política de Cookies | SmartConserto',
    description: 'Como o SmartConserto usa cookies e tecnologias semelhantes.',
  },
}

export default function CookiesPage() {
  return (
    <div className={`${s.root} ${plusJakarta.variable} ${jetbrainsMono.variable}`} id="inicio">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />

      <LandingNav />

      <main>
        <section className={`${s.hero} ${s['privacy-hero']}`}>
          <div className={`${s['hero-inner']} ${s['privacy-hero-inner']}`}>
            <Reveal className={s['privacy-copy']} direction="right">
              <div className={s['hero-badge']}>
                <div className={s['hero-badge-dot']}></div>
                Cookies e preferências
              </div>
              <h1>
                Política de Cookies do <em>SmartConserto</em>
              </h1>
              <p className={s['hero-sub']}>
                Esta página explica como usamos cookies e tecnologias semelhantes para manter o site
                funcionando, proteger acessos, lembrar preferências e melhorar a experiência.
              </p>
              <div className={s['privacy-meta-row']}>
                <span>Última atualização</span>
                <strong>{updatedAt}</strong>
              </div>
            </Reveal>

            <Reveal className={s['privacy-hero-card']} direction="left">
              <div className={s['privacy-card-header']}>
                <span>Resumo de cookies</span>
                <strong>Consentimento</strong>
              </div>
              <div className={s['privacy-card-focus']}>
                <Cookie aria-hidden="true" />
                <div>
                  <strong>Você controla cookies não essenciais</strong>
                  <span>
                    Cookies técnicos mantêm a plataforma funcionando. Cookies de análise dependem
                    da escolha registrada no navegador.
                  </span>
                </div>
              </div>
              <div className={s['privacy-summary-list']}>
                {summaryItems.map((item) => (
                  <div key={item.label} className={s['privacy-summary-item']}>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        <section className={`${s.section} ${s.features}`}>
          <div className={s['section-inner']}>
            <Reveal className={s['features-header']}>
              <div className={s['section-tag']}>Uso responsável</div>
              <h2 className={s['section-title']}>Cookies com finalidade clara</h2>
              <p className={s['section-sub']}>
                Mantemos o foco em funcionamento, segurança, preferências e melhoria da experiência
                nas páginas públicas e na plataforma.
              </p>
            </Reveal>

            <Stagger className={s['privacy-highlight-grid']}>
              {highlights.map((item) => {
                const Icon = item.icon
                return (
                  <StaggerItem key={item.title} className={s['privacy-highlight-card']}>
                    <Icon aria-hidden="true" />
                    <strong>{item.title}</strong>
                    <span>{item.description}</span>
                  </StaggerItem>
                )
              })}
            </Stagger>
          </div>
        </section>

        <section className={`${s.section} ${s['privacy-policy-section']}`}>
          <div className={s['privacy-policy-layout']}>
            <aside className={s['privacy-nav-card']} aria-label="Seções da política de cookies">
              <div className={s['privacy-nav-title']}>Nesta política</div>
              <nav className={s['privacy-nav-links']}>
                {cookieSections.map((section) => (
                  <a key={section.id} href={`#${section.id}`}>
                    {section.title.replace(/^\d+\.\s/, '')}
                  </a>
                ))}
              </nav>
            </aside>

            <div className={s['privacy-content']}>
              {cookieSections.map((section) => (
                <Reveal key={section.id} className={s['privacy-content-card']}>
                  <section id={section.id}>
                    <h2>{section.title}</h2>
                    {section.body.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                  </section>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section className={`${s.section} ${s['privacy-security-band']}`}>
          <div className={s['section-inner']}>
            <div className={s['privacy-security-grid']}>
              <Reveal direction="right">
                <div className={s['section-tag']}>Preferências do navegador</div>
                <h2 className={s['section-title']}>Você pode revisar suas escolhas no próprio navegador</h2>
                <p className={s['section-sub']}>
                  O banner registra sua decisão neste navegador. Se você limpar os dados do site,
                  trocar de navegador ou usar outro dispositivo, a mensagem poderá aparecer novamente.
                </p>
              </Reveal>

              <Reveal className={s['privacy-security-panel']} direction="left">
                <div className={s['privacy-security-row']}>
                  <Settings2 aria-hidden="true" />
                  <div>
                    <strong>Configurações do navegador</strong>
                    <span>Use as opções de privacidade do navegador para excluir ou bloquear cookies.</span>
                  </div>
                </div>
                <div className={s['privacy-security-row']}>
                  <LockKeyhole aria-hidden="true" />
                  <div>
                    <strong>Cookies necessários</strong>
                    <span>Alguns cookies são essenciais para login, sessão e segurança da plataforma.</span>
                  </div>
                </div>
                <div className={s['privacy-security-row']}>
                  <BarChart3 aria-hidden="true" />
                  <div>
                    <strong>Análise somente quando aplicável</strong>
                    <span>Ferramentas de análise devem respeitar a escolha registrada no banner.</span>
                  </div>
                </div>
                <div className={s['privacy-security-row']}>
                  <Mail aria-hidden="true" />
                  <div>
                    <strong>Dúvidas pelo canal oficial</strong>
                    <span>Solicitações sobre cookies podem ser enviadas ao e-mail de contato.</span>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        <section className={`${s.section} ${s['cta-final']}`}>
          <div className={s['cta-final-inner']}>
            <FileText aria-hidden="true" className={s['privacy-cta-icon']} />
            <h2>
              Quer entender
              <br />
              seus dados também?
            </h2>
            <p>
              A Política de Privacidade explica como o SmartConserto trata dados pessoais e
              informações operacionais da plataforma.
            </p>
            <div className={s['cta-final-actions']}>
              <Link href="/privacidade" className={s['btn-cta-white']}>
                Ver privacidade
              </Link>
              <a href={`mailto:${siteConfig.contactEmail}`} className={s['btn-cta-outline']}>
                Enviar e-mail
              </a>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  )
}
