'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import s from '../landing.module.css'

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20)
    handler()
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  return (
    <nav className={`${s.nav} ${scrolled ? s['nav-scrolled'] : ''}`} aria-label="Navegação principal">
      <div className={s['nav-inner']}>
        <a href="#inicio" className={s['nav-logo']} aria-label="Ir para o início">
          <div className={s['nav-logo-mark']} aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
            </svg>
          </div>
          <span className={s['nav-logo-text']}>
            Smart<span>Conserto</span>
          </span>
        </a>
        <div className={s['nav-links']}>
          <a href="#funcionalidades" className={s['nav-link']}>
            Funcionalidades
          </a>
          <a href="#como-funciona" className={s['nav-link']}>
            Como funciona
          </a>
          <a href="#precos" className={s['nav-link']}>
            Preços
          </a>
        </div>
        <div className={s['nav-ctas']}>
          <Link href="/login" className={s['btn-ghost']}>
            Entrar
          </Link>
          <Link href="/register" className={s['btn-primary']}>
            Começar grátis
          </Link>
        </div>
      </div>
    </nav>
  )
}
