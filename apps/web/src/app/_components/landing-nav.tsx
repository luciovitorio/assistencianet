'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion, useReducedMotion } from 'motion/react'
import { BrandMark } from '@/components/brand-mark'
import s from '../landing.module.css'

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false)
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20)
    handler()
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  return (
    <motion.nav
      className={`${s.nav} ${scrolled ? s['nav-scrolled'] : ''}`}
      aria-label="Navegação principal"
      initial={reduceMotion ? false : { opacity: 0, y: -12 }}
      animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className={s['nav-inner']}>
        <a href="#inicio" className={s['nav-logo']} aria-label="Ir para o início">
          <div className={s['nav-logo-mark']} aria-hidden="true">
            <BrandMark />
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
    </motion.nav>
  )
}
