import type { Metadata } from 'next'
import Link from 'next/link'
import { JetBrains_Mono, Plus_Jakarta_Sans } from 'next/font/google'
import { LandingFooter } from '../_components/landing-footer'
import { LandingNav } from '../_components/landing-nav'
import s from '../landing.module.css'
import b from './blog.module.css'
import { blogPosts } from '@/lib/blog'
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

export const metadata: Metadata = {
  title: 'Blog | SmartConserto',
  description:
    'Guias práticos de gestão para assistências técnicas: ordens de serviço, estoque de peças, atendimento pelo WhatsApp, caixa e crescimento.',
  alternates: {
    canonical: `${siteConfig.url}/blog`,
  },
  openGraph: {
    title: 'Blog | SmartConserto',
    description:
      'Guias práticos de gestão para assistências técnicas: OS, estoque, WhatsApp, caixa e crescimento.',
    url: `${siteConfig.url}/blog`,
    siteName: siteConfig.name,
    locale: 'pt_BR',
    type: 'website',
  },
}

const dateFormatter = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })

export default function BlogPage() {
  return (
    <div className={`${s.root} ${plusJakarta.variable} ${jetbrainsMono.variable}`} id="inicio">
      <LandingNav />

      <main>
        <section className={b.hero}>
          <div className={b.heroInner}>
            <div className={s['hero-badge']} style={{ margin: '0 auto' }}>
              <div className={s['hero-badge-dot']}></div>
              Blog do SmartConserto
            </div>
            <h1>Gestão prática para assistências técnicas</h1>
            <p>
              Guias diretos sobre ordem de serviço, estoque, WhatsApp e caixa — escritos para a
              rotina real do balcão, sem enrolação.
            </p>
          </div>
        </section>

        <section className={b.grid}>
          {blogPosts.map((post) => (
            <Link key={post.slug} href={`/blog/${post.slug}`} className={b.card}>
              <span className={b.cardTag}>{post.tag}</span>
              <h2>{post.title}</h2>
              <p>{post.description}</p>
              <div className={b.cardMeta}>
                <span>{dateFormatter.format(new Date(`${post.publishedAt}T12:00:00`))}</span>
                <span>·</span>
                <span>{post.readingMinutes} min de leitura</span>
              </div>
              <span className={b.cardLink}>Ler artigo →</span>
            </Link>
          ))}
        </section>
      </main>

      <LandingFooter />
    </div>
  )
}
