import type { Metadata } from 'next'
import Link from 'next/link'
import { JetBrains_Mono, Plus_Jakarta_Sans } from 'next/font/google'
import { Clock3, Mail, MessageCircle, ShieldCheck } from 'lucide-react'
import { LandingFooter } from '../_components/landing-footer'
import { Reveal, Stagger, StaggerItem } from '../_components/landing-motion'
import { LandingNav } from '../_components/landing-nav'
import s from '../landing.module.css'
import { siteConfig } from '@/lib/site'
import { ContactForm } from './_components/contact-form'

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

const contactCards = [
  {
    title: 'Resposta comercial',
    description: 'Falamos sobre planos, demonstração, implantação e dúvidas antes do teste.',
    icon: MessageCircle,
  },
  {
    title: 'E-mail direto',
    description: siteConfig.contactEmail,
    icon: Mail,
  },
  {
    title: 'Operação segura',
    description: 'Não peça senhas ou dados sensíveis pelo formulário de contato.',
    icon: ShieldCheck,
  },
  {
    title: 'Horário comercial',
    description: 'Atendimento em dias úteis para orientar os próximos passos.',
    icon: Clock3,
  },
]

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'ContactPage',
  name: 'Contato | SmartConserto',
  url: `${siteConfig.url}/contato`,
  about: {
    '@type': 'Organization',
    name: siteConfig.name,
    url: siteConfig.url,
    email: siteConfig.contactEmail,
  },
}

export const metadata: Metadata = {
  title: 'Contato | SmartConserto',
  description:
    'Entre em contato com o SmartConserto para tirar dúvidas, pedir uma demonstração ou falar sobre gestão para assistência técnica.',
  alternates: {
    canonical: `${siteConfig.url}/contato`,
  },
  openGraph: {
    title: 'Contato | SmartConserto',
    description:
      'Fale com o SmartConserto sobre gestão para assistência técnica, demonstração, implantação e dúvidas comerciais.',
    url: `${siteConfig.url}/contato`,
    siteName: siteConfig.name,
    locale: 'pt_BR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Contato | SmartConserto',
    description: 'Fale com o SmartConserto e tire dúvidas sobre a plataforma.',
  },
}

export default function ContactPage() {
  return (
    <div className={`${s.root} ${plusJakarta.variable} ${jetbrainsMono.variable}`} id="inicio">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />

      <LandingNav />

      <main>
        <section className={`${s.hero} ${s['contact-hero']}`}>
          <div className={`${s['hero-inner']} ${s['contact-hero-inner']}`}>
            <Reveal className={s['contact-copy']} direction="right">
              <div className={s['hero-badge']}>
                <div className={s['hero-badge-dot']}></div>
                Contato SmartConserto
              </div>
              <h1>
                Fale com a gente sobre a rotina da sua <em>assistência técnica</em>
              </h1>
              <p className={s['hero-sub']}>
                Tire dúvidas, peça uma demonstração ou conte o que sua operação precisa organizar:
                OS, WhatsApp, estoque, financeiro, filiais e equipe.
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

            <Reveal className={s['contact-form-card']} direction="left">
              <div className={s['contact-form-header']}>
                <span>Envie sua mensagem</span>
                <strong>Retorno direto</strong>
              </div>
              <ContactForm />
            </Reveal>
          </div>
        </section>

        <section className={`${s.section} ${s['contact-info-section']}`}>
          <div className={s['section-inner']}>
            <Reveal className={s['features-header']}>
              <div className={s['section-tag']}>Canais de atendimento</div>
              <h2 className={s['section-title']}>Caminhos rápidos para conversar</h2>
              <p className={s['section-sub']}>
                A equipe pode orientar sobre produto, implantação, operação e próximos passos para
                testar o SmartConserto.
              </p>
            </Reveal>

            <Stagger className={s['contact-card-grid']}>
              {contactCards.map((card) => {
                const Icon = card.icon
                return (
                  <StaggerItem key={card.title} className={s['contact-card']}>
                    <Icon aria-hidden="true" />
                    <strong>{card.title}</strong>
                    <span>{card.description}</span>
                  </StaggerItem>
                )
              })}
            </Stagger>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  )
}
