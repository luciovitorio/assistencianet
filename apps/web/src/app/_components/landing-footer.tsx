import Link from 'next/link'
import { BrandMark } from '@/components/brand-mark'
import { siteConfig } from '@/lib/site'
import s from '../landing.module.css'

const productLinks = [
  { label: 'Funcionalidades', href: '/funcionalidades' },
  { label: 'Preços', href: '/#precos' },
  { label: 'Bot WhatsApp', href: '/#bot-whatsapp' },
  { label: 'Integrações', href: '/funcionalidades#integracoes' },
  { label: 'Novidades', href: '/funcionalidades#visao-geral' },
]

const companyLinks = [
  { label: 'Sobre nós', href: `mailto:${siteConfig.contactEmail}` },
  { label: 'Blog', href: '/' },
  { label: 'Casos de sucesso', href: '/' },
  { label: 'Parceiros', href: `mailto:${siteConfig.contactEmail}` },
  { label: 'Trabalhe conosco', href: `mailto:${siteConfig.contactEmail}` },
]

const supportLinks = [
  { label: 'Central de ajuda', href: `mailto:${siteConfig.contactEmail}` },
  { label: 'Documentação', href: '/funcionalidades' },
  { label: 'Status do sistema', href: '/' },
  { label: 'Contato', href: `mailto:${siteConfig.contactEmail}` },
  { label: 'Falar no WhatsApp', href: `mailto:${siteConfig.contactEmail}` },
]

const legalLinks = ['Privacidade', 'Termos de uso', 'Cookies']

function FooterLink({ href, label }: { href: string; label: string }) {
  if (href.startsWith('mailto:')) {
    return (
      <a href={href} className={s['footer-link']}>
        {label}
      </a>
    )
  }

  return (
    <Link href={href} className={s['footer-link']}>
      {label}
    </Link>
  )
}

export function LandingFooter() {
  return (
    <footer className={s.footer}>
      <div className={s['footer-inner']}>
        <div className={s['footer-grid']}>
          <div>
            <Link href="/" className={s['footer-logo']} aria-label="Ir para a página inicial">
              <div className={s['footer-logo-mark']}>
                <BrandMark />
              </div>
              <span className={s['footer-logo-text']}>
                Smart<span>Conserto</span>
              </span>
            </Link>
            <p className={s['footer-tagline']}>
              O sistema de gestão para assistências técnicas mais completo do Brasil.
            </p>
          </div>
          <div>
            <div className={s['footer-col-title']}>Produto</div>
            <div className={s['footer-links']}>
              {productLinks.map((link) => (
                <FooterLink key={link.label} href={link.href} label={link.label} />
              ))}
            </div>
          </div>
          <div>
            <div className={s['footer-col-title']}>Empresa</div>
            <div className={s['footer-links']}>
              {companyLinks.map((link) => (
                <FooterLink key={link.label} href={link.href} label={link.label} />
              ))}
            </div>
          </div>
          <div>
            <div className={s['footer-col-title']}>Suporte</div>
            <div className={s['footer-links']}>
              {supportLinks.map((link) => (
                <FooterLink key={link.label} href={link.href} label={link.label} />
              ))}
            </div>
          </div>
        </div>
        <div className={s['footer-bottom']}>
          <span className={s['footer-bottom-text']}>© 2026 SmartConserto. Todos os direitos reservados.</span>
          <div className={s['footer-bottom-links']}>
            {legalLinks.map((label) => (
              <Link key={label} href="/" className={s['footer-bottom-link']}>
                {label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
