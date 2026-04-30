'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

const CONSENT_STORAGE_KEY = 'smartconserto.cookieConsent'
const CONSENT_COOKIE_NAME = 'smartconserto_cookie_consent'
const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365

type CookieConsent = 'accepted' | 'rejected'

function hasStoredConsent() {
  const storedConsent = window.localStorage.getItem(CONSENT_STORAGE_KEY)
  return storedConsent === 'accepted' || storedConsent === 'rejected'
}

function persistConsent(value: CookieConsent) {
  window.localStorage.setItem(CONSENT_STORAGE_KEY, value)

  const secure = window.location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${CONSENT_COOKIE_NAME}=${value}; Max-Age=${ONE_YEAR_IN_SECONDS}; Path=/; SameSite=Lax${secure}`
}

export function CookieConsentBanner() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setIsVisible(!hasStoredConsent())
    })

    return () => window.cancelAnimationFrame(frame)
  }, [])

  function handleConsent(value: CookieConsent) {
    persistConsent(value)
    setIsVisible(false)
  }

  if (!isVisible) {
    return null
  }

  return (
    <section
      className="cookie-consent-banner"
      aria-label="Aviso de cookies"
      aria-live="polite"
    >
      <div className="cookie-consent-copy">
        <strong>Usamos cookies para melhorar sua experiência</strong>
        <p>
          Utilizamos cookies técnicos para manter o site funcionando e, com sua autorização,
          cookies de análise para entender o uso da plataforma. Você pode aceitar ou recusar os
          cookies não essenciais.
        </p>
        <Link href="/cookies">Ver política de cookies</Link>
      </div>
      <div className="cookie-consent-actions">
        <button type="button" className="cookie-consent-reject" onClick={() => handleConsent('rejected')}>
          Recusar
        </button>
        <button type="button" className="cookie-consent-accept" onClick={() => handleConsent('accepted')}>
          Aceitar
        </button>
      </div>
    </section>
  )
}
