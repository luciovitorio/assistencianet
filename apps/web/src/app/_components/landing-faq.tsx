'use client'

import { useState } from 'react'
import s from '../landing.module.css'

export type LandingFaqItem = {
  q: string
  a: string
}

type LandingFaqProps = {
  items: LandingFaqItem[]
}

export function LandingFaq({ items }: LandingFaqProps) {
  const [openFaq, setOpenFaq] = useState<number | null>(0)

  return (
    <section className={`${s.section} ${s.faq}`} id="duvidas" aria-labelledby="duvidas-title">
      <div className={s['section-inner']}>
        <div className={s['faq-inner']}>
          <div className={s['section-tag']}>Dúvidas frequentes</div>
          <h2 className={s['section-title']} id="duvidas-title">
            Perguntas frequentes
          </h2>
          <p className={s['section-sub']}>Não encontrou sua resposta? Fale com a gente pelo chat.</p>
          <div className={s['faq-list']}>
            {items.map((item, i) => {
              const isOpen = openFaq === i
              const answerId = `faq-answer-${i}`

              return (
                <div key={item.q} className={s['faq-item']}>
                  <button
                    className={`${s['faq-question']} ${isOpen ? s.open : ''}`}
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={answerId}
                    onClick={() => setOpenFaq(isOpen ? null : i)}
                  >
                    {item.q}
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>
                  <div
                    className={`${s['faq-answer']} ${isOpen ? s.open : ''}`}
                    id={answerId}
                    role="region"
                    hidden={!isOpen}
                  >
                    {item.a}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
