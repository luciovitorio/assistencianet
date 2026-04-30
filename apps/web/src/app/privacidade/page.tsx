import type { Metadata } from 'next'
import Link from 'next/link'
import { JetBrains_Mono, Plus_Jakarta_Sans } from 'next/font/google'
import {
  ClipboardList,
  Database,
  FileText,
  KeyRound,
  LockKeyhole,
  Mail,
  MessageCircle,
  ServerCog,
  ShieldCheck,
  UserCheck,
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

type PrivacyHighlight = {
  title: string
  description: string
  icon: LucideIcon
}

type PrivacySection = {
  id: string
  title: string
  body: string[]
}

const updatedAt = '30 de abril de 2026'

const highlights: PrivacyHighlight[] = [
  {
    title: 'Dados tratados com finalidade',
    description:
      'Usamos informações apenas para operar a conta, prestar suporte, manter segurança e melhorar a plataforma.',
    icon: ClipboardList,
  },
  {
    title: 'Controle da assistência',
    description:
      'Os dados de clientes, equipamentos, ordens de serviço e equipe pertencem à operação cadastrada no sistema.',
    icon: UserCheck,
  },
  {
    title: 'Segurança e rastreabilidade',
    description:
      'Aplicamos controles de acesso, registros operacionais e medidas técnicas para proteger o uso do sistema.',
    icon: LockKeyhole,
  },
  {
    title: 'Canal direto',
    description:
      'Dúvidas e solicitações sobre privacidade podem ser enviadas para o contato oficial do SmartConserto.',
    icon: Mail,
  },
]

const summaryItems = [
  { label: 'Conta e identificação', value: 'nome, e-mail, telefone e dados da empresa' },
  { label: 'Operação da assistência', value: 'clientes, equipamentos, OS, estoque e financeiro' },
  { label: 'Comunicação', value: 'mensagens, notificações e registros de atendimento' },
  { label: 'Segurança', value: 'logs, permissões, sessão e eventos de auditoria' },
]

const privacySections: PrivacySection[] = [
  {
    id: 'dados-coletados',
    title: '1. Quais dados coletamos',
    body: [
      'Podemos coletar dados de cadastro, identificação e contato, como nome, e-mail, telefone, empresa, filial e função do usuário.',
      'Também tratamos informações inseridas durante o uso da plataforma, incluindo clientes, equipamentos, ordens de serviço, fotos, laudos, peças, estoque, histórico financeiro, mensagens e registros de atendimento.',
      'Para manter a segurança e a operação do sistema, registramos dados técnicos como endereço IP, navegador, dispositivo, data de acesso, eventos de sessão e ações relevantes realizadas na conta.',
    ],
  },
  {
    id: 'finalidades',
    title: '2. Como usamos os dados',
    body: [
      'Usamos dados pessoais para criar e administrar contas, autenticar usuários, organizar a rotina da assistência técnica, gerar históricos operacionais, enviar notificações, prestar suporte e cumprir obrigações legais ou regulatórias.',
      'Também podemos usar informações agregadas ou estatísticas para entender o uso da plataforma, melhorar recursos, priorizar correções e reforçar a segurança.',
    ],
  },
  {
    id: 'compartilhamento',
    title: '3. Compartilhamento de informações',
    body: [
      'Podemos compartilhar dados com fornecedores necessários para hospedar, proteger, enviar comunicações, processar integrações e manter a plataforma funcionando.',
      'Quando a assistência ativa recursos de WhatsApp, mensagens, e-mail, pagamentos ou integrações externas, os dados necessários ao funcionamento desses recursos podem ser enviados aos respectivos provedores.',
      'Não vendemos dados pessoais. O compartilhamento ocorre apenas quando necessário para prestação do serviço, cumprimento legal, proteção de direitos ou mediante solicitação da própria operação.',
    ],
  },
  {
    id: 'lgpd',
    title: '4. Direitos previstos na LGPD',
    body: [
      'Titulares de dados podem solicitar confirmação de tratamento, acesso, correção, anonimização, bloqueio, eliminação, portabilidade e informações sobre compartilhamento, conforme a Lei Geral de Proteção de Dados.',
      'Quando os dados estiverem sob controle de uma assistência técnica cliente do SmartConserto, algumas solicitações podem precisar ser direcionadas ou validadas por essa empresa, pois ela define a finalidade do tratamento na rotina operacional.',
    ],
  },
  {
    id: 'retencao',
    title: '5. Retenção e exclusão',
    body: [
      'Mantemos dados pelo tempo necessário para operar a conta, preservar histórico de atendimento, cumprir obrigações legais, resolver disputas, manter auditoria e proteger a segurança da plataforma.',
      'A exclusão de dados pode ser solicitada pelo canal de contato. Algumas informações poderão ser preservadas quando houver obrigação legal, necessidade de auditoria, prevenção a fraude ou defesa de direitos.',
    ],
  },
  {
    id: 'seguranca',
    title: '6. Segurança da informação',
    body: [
      'Adotamos medidas técnicas e organizacionais para reduzir riscos de acesso não autorizado, perda, alteração indevida ou uso inadequado de dados.',
      'Usuários também devem proteger suas credenciais, definir permissões adequadas para a equipe e evitar inserir dados desnecessários ou sensíveis fora dos campos apropriados.',
    ],
  },
  {
    id: 'cookies',
    title: '7. Cookies e tecnologias semelhantes',
    body: [
      'Podemos usar cookies e tecnologias semelhantes para autenticação, segurança, preferências, análise de uso e melhoria da experiência.',
      'O usuário pode ajustar permissões de cookies no navegador, mas alguns recursos essenciais podem deixar de funcionar corretamente sem cookies técnicos.',
    ],
  },
  {
    id: 'alteracoes',
    title: '8. Alterações nesta política',
    body: [
      'Esta política pode ser atualizada para refletir mudanças no produto, em integrações, em obrigações legais ou em práticas de segurança.',
      'Quando houver mudanças relevantes, a nova versão será publicada nesta página com a data de atualização correspondente.',
    ],
  },
  {
    id: 'contato',
    title: '9. Contato',
    body: [
      `Para dúvidas, solicitações ou orientações sobre privacidade, entre em contato pelo e-mail ${siteConfig.contactEmail}.`,
    ],
  },
]

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'PrivacyPolicy',
  name: 'Política de Privacidade | SmartConserto',
  url: `${siteConfig.url}/privacidade`,
  dateModified: '2026-04-30',
  publisher: {
    '@type': 'Organization',
    name: siteConfig.name,
    url: siteConfig.url,
    email: siteConfig.contactEmail,
  },
}

export const metadata: Metadata = {
  title: 'Política de Privacidade | SmartConserto',
  description:
    'Entenda como o SmartConserto trata dados pessoais, informações operacionais, segurança, retenção, cookies e direitos previstos na LGPD.',
  alternates: {
    canonical: `${siteConfig.url}/privacidade`,
  },
  openGraph: {
    title: 'Política de Privacidade | SmartConserto',
    description:
      'Informações sobre coleta, uso, compartilhamento, segurança e direitos de privacidade no SmartConserto.',
    url: `${siteConfig.url}/privacidade`,
    siteName: siteConfig.name,
    locale: 'pt_BR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Política de Privacidade | SmartConserto',
    description: 'Como o SmartConserto trata dados e protege informações da operação.',
  },
}

export default function PrivacyPage() {
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
                Privacidade e proteção de dados
              </div>
              <h1>
                Política de Privacidade do <em>SmartConserto</em>
              </h1>
              <p className={s['hero-sub']}>
                Esta página explica como tratamos dados pessoais e informações operacionais usadas
                para gerenciar assistências técnicas, ordens de serviço, clientes, equipe,
                comunicação e segurança.
              </p>
              <div className={s['privacy-meta-row']}>
                <span>Última atualização</span>
                <strong>{updatedAt}</strong>
              </div>
            </Reveal>

            <Reveal className={s['privacy-hero-card']} direction="left">
              <div className={s['privacy-card-header']}>
                <span>Resumo operacional</span>
                <strong>LGPD</strong>
              </div>
              <div className={s['privacy-card-focus']}>
                <ShieldCheck aria-hidden="true" />
                <div>
                  <strong>Transparência para clientes e usuários</strong>
                  <span>
                    Dados são tratados para operar o sistema, proteger acessos e manter a rotina da
                    assistência rastreável.
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
              <div className={s['section-tag']}>Princípios de privacidade</div>
              <h2 className={s['section-title']}>O que orienta o tratamento de dados</h2>
              <p className={s['section-sub']}>
                A política segue a lógica do produto: simplicidade operacional, rastreabilidade e
                controle para quem administra a assistência técnica.
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
            <aside className={s['privacy-nav-card']} aria-label="Seções da política">
              <div className={s['privacy-nav-title']}>Nesta política</div>
              <nav className={s['privacy-nav-links']}>
                {privacySections.map((section) => (
                  <a key={section.id} href={`#${section.id}`}>
                    {section.title.replace(/^\d+\.\s/, '')}
                  </a>
                ))}
              </nav>
            </aside>

            <div className={s['privacy-content']}>
              {privacySections.map((section) => (
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
                <div className={s['section-tag']}>Segurança na rotina</div>
                <h2 className={s['section-title']}>Privacidade também depende da operação</h2>
                <p className={s['section-sub']}>
                  Para uma assistência técnica, dados pessoais aparecem junto de atendimentos,
                  equipamentos, orçamentos, peças, pagamentos e mensagens. Por isso, permissões e
                  histórico precisam fazer parte do processo.
                </p>
              </Reveal>

              <Reveal className={s['privacy-security-panel']} direction="left">
                <div className={s['privacy-security-row']}>
                  <KeyRound aria-hidden="true" />
                  <div>
                    <strong>Acessos por usuário</strong>
                    <span>Evite compartilhar senhas e revise permissões quando alguém sair da equipe.</span>
                  </div>
                </div>
                <div className={s['privacy-security-row']}>
                  <Database aria-hidden="true" />
                  <div>
                    <strong>Histórico operacional</strong>
                    <span>Registros ajudam a entender alterações em clientes, OS, financeiro e estoque.</span>
                  </div>
                </div>
                <div className={s['privacy-security-row']}>
                  <MessageCircle aria-hidden="true" />
                  <div>
                    <strong>Comunicação responsável</strong>
                    <span>Mensagens devem conter apenas o necessário para o atendimento e suporte.</span>
                  </div>
                </div>
                <div className={s['privacy-security-row']}>
                  <ServerCog aria-hidden="true" />
                  <div>
                    <strong>Provedores essenciais</strong>
                    <span>Serviços técnicos podem processar dados para hospedagem, entrega e segurança.</span>
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
              Precisa falar sobre
              <br />
              privacidade?
            </h2>
            <p>
              Envie sua solicitação pelo canal oficial e informe o máximo de contexto possível para
              localizarmos a conta, usuário ou atendimento relacionado.
            </p>
            <div className={s['cta-final-actions']}>
              <a href={`mailto:${siteConfig.contactEmail}`} className={s['btn-cta-white']}>
                Enviar e-mail
              </a>
              <Link href="/contato" className={s['btn-cta-outline']}>
                Ir para contato
              </Link>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  )
}
