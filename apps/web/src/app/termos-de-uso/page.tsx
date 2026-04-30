import type { Metadata } from 'next'
import Link from 'next/link'
import { JetBrains_Mono, Plus_Jakarta_Sans } from 'next/font/google'
import {
  BadgeCheck,
  ClipboardCheck,
  CreditCard,
  FileSignature,
  LifeBuoy,
  LockKeyhole,
  Mail,
  PlugZap,
  Scale,
  UserCog,
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

type TermsHighlight = {
  title: string
  description: string
  icon: LucideIcon
}

type TermsSection = {
  id: string
  title: string
  body: string[]
}

const updatedAt = '30 de abril de 2026'

const highlights: TermsHighlight[] = [
  {
    title: 'Uso profissional',
    description:
      'O SmartConserto é uma plataforma SaaS para gestão operacional de assistências técnicas.',
    icon: BadgeCheck,
  },
  {
    title: 'Conta sob responsabilidade',
    description:
      'A empresa contratante deve manter usuários, permissões, dados e credenciais sob controle adequado.',
    icon: UserCog,
  },
  {
    title: 'Rotina rastreável',
    description:
      'O sistema pode registrar ações relevantes para segurança, suporte, auditoria e histórico operacional.',
    icon: ClipboardCheck,
  },
  {
    title: 'Suporte pelo canal oficial',
    description:
      'Dúvidas sobre estes termos podem ser enviadas para o contato oficial do SmartConserto.',
    icon: Mail,
  },
]

const summaryItems = [
  { label: 'Serviço', value: 'SaaS para OS, clientes, estoque, financeiro, equipe e filiais' },
  { label: 'Usuários', value: 'acesso condicionado a conta ativa, permissões e uso adequado' },
  { label: 'Dados', value: 'informações inseridas pela operação continuam sob responsabilidade da conta' },
  { label: 'Contato', value: siteConfig.contactEmail },
]

const termsSections: TermsSection[] = [
  {
    id: 'aceite',
    title: '1. Aceite dos termos',
    body: [
      'Ao acessar, contratar ou utilizar o SmartConserto, o usuário e a empresa contratante declaram que leram, compreenderam e concordam com estes Termos de uso.',
      'Se uma pessoa utiliza a plataforma em nome de uma empresa, filial ou assistência técnica, ela declara possuir autorização para aceitar estes termos em nome dessa organização.',
    ],
  },
  {
    id: 'servico',
    title: '2. Descrição do serviço',
    body: [
      'O SmartConserto é uma plataforma online de gestão para assistências técnicas, com recursos relacionados a ordens de serviço, clientes, equipamentos, estoque, financeiro, equipe, filiais, relatórios e comunicação operacional.',
      'Recursos específicos podem variar conforme plano contratado, configuração da conta, disponibilidade técnica, integrações ativadas e evolução do produto.',
    ],
  },
  {
    id: 'cadastro',
    title: '3. Cadastro, usuários e permissões',
    body: [
      'A empresa contratante deve fornecer informações verdadeiras, atualizadas e suficientes para criação e manutenção da conta.',
      'Cada usuário deve utilizar seu próprio acesso. O compartilhamento de senhas ou credenciais é de responsabilidade da empresa contratante e pode comprometer segurança, auditoria e rastreabilidade.',
      'A administração de permissões, filiais, colaboradores e níveis de acesso deve ser feita pela própria empresa, conforme sua organização interna.',
    ],
  },
  {
    id: 'uso-adequado',
    title: '4. Uso adequado da plataforma',
    body: [
      'O usuário deve utilizar o SmartConserto apenas para finalidades lícitas, compatíveis com a gestão da assistência técnica e com estes termos.',
      'É proibido tentar acessar contas de terceiros, interferir na segurança da plataforma, explorar falhas, inserir conteúdo ilegal, realizar engenharia reversa indevida ou utilizar o serviço para fraude, abuso, spam ou violação de direitos.',
      'A empresa contratante é responsável pelas informações cadastradas por seus usuários, incluindo dados de clientes, equipamentos, mensagens, anexos, registros financeiros e históricos de atendimento.',
    ],
  },
  {
    id: 'planos-pagamentos',
    title: '5. Planos, pagamentos e cancelamento',
    body: [
      'O acesso a determinados recursos pode depender de plano pago, período de teste, contratação comercial ou condições específicas informadas no momento da adesão.',
      'Valores, periodicidade, forma de cobrança, limites de uso e benefícios do plano serão apresentados nos canais comerciais ou dentro da própria plataforma.',
      'A falta de pagamento, inadimplência, cancelamento ou encerramento da conta pode limitar, suspender ou encerrar o acesso ao serviço, observadas as condições aplicáveis ao plano contratado.',
    ],
  },
  {
    id: 'dados-conteudo',
    title: '6. Dados e conteúdo da operação',
    body: [
      'A empresa contratante mantém responsabilidade sobre os dados e conteúdos inseridos na plataforma por seus usuários.',
      'O SmartConserto poderá processar esses dados para prestar o serviço, manter histórico, gerar relatórios, enviar comunicações, oferecer suporte, proteger a plataforma e cumprir obrigações legais.',
      'O tratamento de dados pessoais também é descrito na Política de Privacidade, que complementa estes termos.',
    ],
  },
  {
    id: 'integracoes',
    title: '7. Integrações e serviços de terceiros',
    body: [
      'A plataforma pode se conectar a serviços de terceiros, como WhatsApp, e-mail, provedores de infraestrutura, meios de pagamento, automações e APIs externas.',
      'O funcionamento dessas integrações pode depender de regras, disponibilidade, limites técnicos, políticas e autorizações dos respectivos provedores.',
      'O SmartConserto não controla integralmente serviços externos e não se responsabiliza por falhas, bloqueios, alterações ou indisponibilidades causadas por terceiros.',
    ],
  },
  {
    id: 'disponibilidade-suporte',
    title: '8. Disponibilidade, manutenção e suporte',
    body: [
      'Buscamos manter a plataforma disponível e funcional, mas podem ocorrer interrupções por manutenção, atualizações, incidentes técnicos, serviços de terceiros ou eventos fora do nosso controle.',
      'O suporte é prestado pelos canais oficiais e pode variar conforme plano, prioridade, tipo de solicitação e informações fornecidas pela empresa contratante.',
    ],
  },
  {
    id: 'propriedade-intelectual',
    title: '9. Propriedade intelectual',
    body: [
      'O SmartConserto, sua marca, interface, código, identidade visual, textos, fluxos, componentes, documentação e demais elementos da plataforma pertencem aos seus titulares ou licenciadores.',
      'A contratação ou uso da plataforma não transfere propriedade intelectual ao usuário ou à empresa contratante, concedendo apenas direito limitado de uso conforme estes termos.',
    ],
  },
  {
    id: 'suspensao',
    title: '10. Suspensão ou encerramento de acesso',
    body: [
      'Podemos suspender ou restringir o acesso quando houver suspeita de uso indevido, violação destes termos, risco de segurança, inadimplência, ordem legal ou necessidade de proteção da plataforma e de terceiros.',
      'A empresa contratante também pode solicitar cancelamento ou encerramento da conta pelos canais oficiais, observadas as condições comerciais e técnicas aplicáveis.',
    ],
  },
  {
    id: 'responsabilidades',
    title: '11. Limitação de responsabilidades',
    body: [
      'O SmartConserto auxilia a gestão operacional, mas decisões comerciais, financeiras, técnicas, fiscais, trabalhistas, contábeis e jurídicas continuam sob responsabilidade da empresa contratante.',
      'A plataforma não substitui consultoria especializada nem garante resultados específicos de faturamento, produtividade, satisfação de clientes ou desempenho operacional.',
      'Na máxima extensão permitida pela legislação aplicável, não nos responsabilizamos por danos indiretos, perda de lucros, perda de oportunidade, falhas de terceiros ou uso inadequado da plataforma.',
    ],
  },
  {
    id: 'alteracoes',
    title: '12. Alterações nos termos',
    body: [
      'Estes termos podem ser atualizados para refletir mudanças no produto, planos, integrações, práticas operacionais ou exigências legais.',
      'Quando houver alterações relevantes, a nova versão será publicada nesta página com a data de atualização correspondente.',
    ],
  },
  {
    id: 'legislacao',
    title: '13. Legislação aplicável',
    body: [
      'Estes termos são regidos pelas leis da República Federativa do Brasil.',
      'Eventuais conflitos deverão ser tratados preferencialmente por contato direto entre as partes, buscando solução objetiva antes de qualquer medida formal.',
    ],
  },
  {
    id: 'contato',
    title: '14. Contato',
    body: [
      `Para dúvidas sobre estes Termos de uso, entre em contato pelo e-mail ${siteConfig.contactEmail}.`,
    ],
  },
]

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'Termos de uso | SmartConserto',
  url: `${siteConfig.url}/termos-de-uso`,
  dateModified: '2026-04-30',
  publisher: {
    '@type': 'Organization',
    name: siteConfig.name,
    url: siteConfig.url,
    email: siteConfig.contactEmail,
  },
}

export const metadata: Metadata = {
  title: 'Termos de uso | SmartConserto',
  description:
    'Conheça as condições de uso do SmartConserto para contas, usuários, planos, dados, integrações, suporte, responsabilidades e cancelamento.',
  alternates: {
    canonical: `${siteConfig.url}/termos-de-uso`,
  },
  openGraph: {
    title: 'Termos de uso | SmartConserto',
    description:
      'Condições aplicáveis ao uso do SmartConserto por assistências técnicas, usuários e empresas contratantes.',
    url: `${siteConfig.url}/termos-de-uso`,
    siteName: siteConfig.name,
    locale: 'pt_BR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Termos de uso | SmartConserto',
    description: 'Condições de uso da plataforma SmartConserto.',
  },
}

export default function TermsPage() {
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
                Condições de uso da plataforma
              </div>
              <h1>
                Termos de uso do <em>SmartConserto</em>
              </h1>
              <p className={s['hero-sub']}>
                Estes termos organizam as condições para acessar e utilizar o SmartConserto na
                rotina de assistências técnicas, incluindo contas, usuários, planos, dados,
                integrações, suporte e responsabilidades.
              </p>
              <div className={s['privacy-meta-row']}>
                <span>Última atualização</span>
                <strong>{updatedAt}</strong>
              </div>
            </Reveal>

            <Reveal className={s['privacy-hero-card']} direction="left">
              <div className={s['privacy-card-header']}>
                <span>Resumo dos termos</span>
                <strong>SaaS</strong>
              </div>
              <div className={s['privacy-card-focus']}>
                <FileSignature aria-hidden="true" />
                <div>
                  <strong>Uso vinculado à operação cadastrada</strong>
                  <span>
                    A conta deve ser usada de forma lícita, profissional e compatível com a gestão
                    da assistência técnica.
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
              <div className={s['section-tag']}>Base de relacionamento</div>
              <h2 className={s['section-title']}>Condições claras para operar com segurança</h2>
              <p className={s['section-sub']}>
                Os termos foram escritos para explicar responsabilidades práticas no uso diário da
                plataforma, preservando operação, dados, suporte e rastreabilidade.
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
            <aside className={s['privacy-nav-card']} aria-label="Seções dos termos">
              <div className={s['privacy-nav-title']}>Nestes termos</div>
              <nav className={s['privacy-nav-links']}>
                {termsSections.map((section) => (
                  <a key={section.id} href={`#${section.id}`}>
                    {section.title.replace(/^\d+\.\s/, '')}
                  </a>
                ))}
              </nav>
            </aside>

            <div className={s['privacy-content']}>
              {termsSections.map((section) => (
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
                <div className={s['section-tag']}>Responsabilidades práticas</div>
                <h2 className={s['section-title']}>O sistema ajuda, mas a operação continua no controle</h2>
                <p className={s['section-sub']}>
                  O SmartConserto centraliza processos e históricos, mas a empresa contratante
                  segue responsável por decisões técnicas, comerciais, financeiras e pelo uso
                  correto dos acessos da equipe.
                </p>
              </Reveal>

              <Reveal className={s['privacy-security-panel']} direction="left">
                <div className={s['privacy-security-row']}>
                  <LockKeyhole aria-hidden="true" />
                  <div>
                    <strong>Credenciais protegidas</strong>
                    <span>Usuários devem manter acessos individuais e evitar compartilhamento de senhas.</span>
                  </div>
                </div>
                <div className={s['privacy-security-row']}>
                  <CreditCard aria-hidden="true" />
                  <div>
                    <strong>Planos e cobrança</strong>
                    <span>Recursos, limites e valores seguem as condições comerciais contratadas.</span>
                  </div>
                </div>
                <div className={s['privacy-security-row']}>
                  <PlugZap aria-hidden="true" />
                  <div>
                    <strong>Integrações externas</strong>
                    <span>Serviços de terceiros podem ter regras, limites e disponibilidade próprios.</span>
                  </div>
                </div>
                <div className={s['privacy-security-row']}>
                  <LifeBuoy aria-hidden="true" />
                  <div>
                    <strong>Suporte com contexto</strong>
                    <span>Chamados devem trazer dados suficientes para localizar conta, usuário ou evento.</span>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        <section className={`${s.section} ${s['cta-final']}`}>
          <div className={s['cta-final-inner']}>
            <Scale aria-hidden="true" className={s['privacy-cta-icon']} />
            <h2>
              Dúvidas sobre
              <br />
              os termos?
            </h2>
            <p>
              Fale pelo canal oficial para esclarecer condições de uso, planos, suporte,
              cancelamento ou responsabilidades da conta.
            </p>
            <div className={s['cta-final-actions']}>
              <a href={`mailto:${siteConfig.contactEmail}`} className={s['btn-cta-white']}>
                Enviar e-mail
              </a>
              <Link href="/privacidade" className={s['btn-cta-outline']}>
                Ver privacidade
              </Link>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  )
}
