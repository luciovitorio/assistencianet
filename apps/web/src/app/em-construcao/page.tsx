import type { Metadata } from 'next'
import Link from 'next/link'
import { JetBrains_Mono, Plus_Jakarta_Sans } from 'next/font/google'
import {
  BookOpen,
  BriefcaseBusiness,
  Clock3,
  FileText,
  Handshake,
  LifeBuoy,
  Newspaper,
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

const upcomingPages = [
  { label: 'Blog', icon: Newspaper },
  { label: 'Casos de sucesso', icon: FileText },
  { label: 'Parceiros', icon: Handshake },
  { label: 'Trabalhe conosco', icon: BriefcaseBusiness },
  { label: 'Central de ajuda', icon: LifeBuoy },
  { label: 'Documentação', icon: BookOpen },
  { label: 'Status do sistema', icon: Clock3 },
]

export const metadata: Metadata = {
  title: 'Em construção | SmartConserto',
  description:
    'Esta área do SmartConserto está em construção. Em breve teremos novos conteúdos e recursos disponíveis.',
  robots: {
    index: false,
    follow: false,
  },
}

export default function UnderConstructionPage() {
  return (
    <div className={`${s.root} ${plusJakarta.variable} ${jetbrainsMono.variable}`} id="inicio">
      <LandingNav />

      <main>
        <section className={`${s.hero} ${s['construction-hero']}`}>
          <div className={`${s['hero-inner']} ${s['construction-hero-inner']}`}>
            <Reveal className={s['construction-copy']} direction="right">
              <div className={s['construction-notice']}>
                <Clock3 aria-hidden="true" />
                <span>Página em construção</span>
              </div>

              <h1>
                Estamos preparando esta área do <em>SmartConserto</em>
              </h1>
              <p className={s['hero-sub']}>
                Este conteúdo ainda está sendo organizado para entregar informação útil, clara e
                alinhada com a rotina de assistências técnicas.
              </p>
              <div className={s['hero-actions']}>
                <Link href="/" className={s['btn-hero']}>
                  Voltar para a página inicial
                </Link>
                <a href={`mailto:${siteConfig.contactEmail}`} className={s['btn-hero-ghost']}>
                  Falar com o time
                </a>
              </div>
            </Reveal>

            <Reveal className={s['construction-panel']} direction="left">
              <div className={s['construction-panel-header']}>
                <span>Em desenvolvimento</span>
                <strong>Em breve</strong>
              </div>
              <div className={s['construction-progress']}>
                <span>Organizando conteúdo</span>
                <strong>72%</strong>
                <div className={s['construction-progress-track']}>
                  <div className={s['construction-progress-bar']} />
                </div>
              </div>
              <Stagger className={s['construction-list']}>
                {upcomingPages.map((item) => {
                  const Icon = item.icon
                  return (
                    <StaggerItem key={item.label} className={s['construction-list-item']}>
                      <Icon aria-hidden="true" />
                      <span>{item.label}</span>
                    </StaggerItem>
                  )
                })}
              </Stagger>
            </Reveal>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  )
}
