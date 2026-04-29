import Link from 'next/link'
import { BrandMark } from '@/components/brand-mark'
import { siteConfig } from '@/lib/site'
import s from '../landing.module.css'

const underConstructionHref = '/em-construcao'

const productLinks = [
  { label: 'Funcionalidades', href: '/funcionalidades' },
  { label: 'Preços', href: '/#precos' },
  { label: 'Bot WhatsApp', href: '/#bot-whatsapp' },
  { label: 'Integrações', href: '/funcionalidades#integracoes' },
  { label: 'Novidades', href: '/funcionalidades#visao-geral' },
]

const companyLinks = [
  { label: 'Sobre nós', href: '/sobre-nos' },
  { label: 'Blog', href: underConstructionHref },
  { label: 'Casos de sucesso', href: underConstructionHref },
  { label: 'Parceiros', href: underConstructionHref },
  { label: 'Trabalhe conosco', href: underConstructionHref },
]

const supportLinks = [
  { label: 'Central de ajuda', href: underConstructionHref },
  { label: 'Documentação', href: underConstructionHref },
  { label: 'Status do sistema', href: underConstructionHref },
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
