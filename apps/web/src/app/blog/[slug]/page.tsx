import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { JetBrains_Mono, Plus_Jakarta_Sans } from 'next/font/google'
import { MessageCircle } from 'lucide-react'
import { LandingFooter } from '../../_components/landing-footer'
import { LandingNav } from '../../_components/landing-nav'
import s from '../../landing.module.css'
import b from '../blog.module.css'
import { blogPosts, getBlogPost } from '@/lib/blog'
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

export function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const post = getBlogPost(slug)
  if (!post) return {}

  const url = `${siteConfig.url}/blog/${post.slug}`
  return {
    title: `${post.title} | SmartConserto`,
    description: post.description,
    keywords: post.keywords,
    alternates: { canonical: url },
    openGraph: {
      title: post.title,
      description: post.description,
      url,
      siteName: siteConfig.name,
      locale: 'pt_BR',
      type: 'article',
      publishedTime: post.publishedAt,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.description,
    },
  }
}

const dateFormatter = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = getBlogPost(slug)
  if (!post) notFound()

  const related = blogPosts.filter((p) => p.slug !== post.slug).slice(0, 3)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.description,
    datePublished: post.publishedAt,
    inLanguage: 'pt-BR',
    url: `${siteConfig.url}/blog/${post.slug}`,
    author: {
      '@type': 'Organization',
      name: siteConfig.name,
      url: siteConfig.url,
    },
    publisher: {
      '@type': 'Organization',
      name: siteConfig.name,
      url: siteConfig.url,
    },
  }

  return (
    <div className={`${s.root} ${plusJakarta.variable} ${jetbrainsMono.variable}`} id="inicio">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />

      <LandingNav />

      <main>
        <article className={b.article}>
          <Link href="/blog" className={b.backLink}>
            ← Todos os artigos
          </Link>
          <div className={b.articleMeta}>
            <span className={b.cardTag}>{post.tag}</span>
            <span>{dateFormatter.format(new Date(`${post.publishedAt}T12:00:00`))}</span>
            <span>·</span>
            <span>{post.readingMinutes} min de leitura</span>
          </div>
          <h1>{post.title}</h1>
          <p className={b.articleDescription}>{post.description}</p>

          <div className={b.articleBody}>
            {post.blocks.map((block, index) => {
              if (block.type === 'heading') return <h2 key={index}>{block.text}</h2>
              if (block.type === 'paragraph') return <p key={index}>{block.text}</p>
              if (block.type === 'list')
                return (
                  <ul key={index}>
                    {block.items.map((item, itemIndex) => (
                      <li key={itemIndex}>{item}</li>
                    ))}
                  </ul>
                )
              return (
                <div key={index} className={b.template}>
                  <div className={b.templateHeader}>
                    <MessageCircle size={14} aria-hidden="true" />
                    {block.title}
                  </div>
                  <p>{block.text}</p>
                </div>
              )
            })}
          </div>

          <div className={b.cta}>
            <strong>Coloque sua assistência para rodar no automático</strong>
            <p>
              OS, orçamento com aprovação pelo WhatsApp, estoque, caixa e notificações automáticas —
              teste o SmartConserto grátis por 30 dias, sem cartão de crédito.
            </p>
            <Link href="/register" className={b.ctaButton}>
              Começar teste grátis
            </Link>
          </div>
        </article>

        <aside className={b.related}>
          <h2>Leia também</h2>
          <div className={b.relatedList}>
            {related.map((p) => (
              <Link key={p.slug} href={`/blog/${p.slug}`}>
                {p.title}
              </Link>
            ))}
          </div>
        </aside>
      </main>

      <LandingFooter />
    </div>
  )
}
