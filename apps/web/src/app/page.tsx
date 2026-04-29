import type { Metadata } from 'next'
import Link from 'next/link'
import { Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google'
import { LandingFaq } from './_components/landing-faq'
import { LandingNav } from './_components/landing-nav'
import s from './landing.module.css'
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

const faqItems = [
  {
    q: 'Preciso instalar algum programa ou aplicativo?',
    a: 'Não. O SmartConserto é 100% online (SaaS). Funciona em qualquer navegador — computador, tablet ou celular. Sem instalação, sem atualização manual.',
  },
  {
    q: 'Como funciona o Bot WhatsApp? Precisa de número dedicado?',
    a: 'Sim, recomendamos usar um número de WhatsApp dedicado para a assistência. O SmartConserto usa a API oficial do WhatsApp Business — suas mensagens nunca são bloqueadas. A configuração leva menos de 10 minutos.',
  },
  {
    q: 'Posso migrar meus dados de outro sistema?',
    a: 'Sim. Nossa equipe ajuda a importar clientes, histórico de OS e estoque de qualquer planilha ou sistema. A migração é gratuita nos planos Profissional e Empresarial.',
  },
  {
    q: 'Os 14 dias grátis incluem todas as funcionalidades?',
    a: 'Sim. Durante o teste grátis você tem acesso completo ao plano Profissional, incluindo o Bot WhatsApp, sem precisar inserir cartão de crédito.',
  },
  {
    q: 'E se eu quiser cancelar?',
    a: 'Cancele quando quiser, sem multa e sem burocracia. Você pode exportar todos os seus dados antes de sair.',
  },
]

const mockupOsList = [
  { id: 'OS-2847', name: 'Maria Santos',  device: 'iPhone 14 Pro — Tela',      badge: 'reparo' as const, label: 'Em reparo' },
  { id: 'OS-2846', name: 'Carlos Oliveira', device: 'Samsung A54 — Bateria',   badge: 'pronto' as const, label: 'Pronto'    },
  { id: 'OS-2845', name: 'Ana Ferreira',  device: 'Notebook Dell — HD',        badge: 'aguard' as const, label: 'Aguardando'},
  { id: 'OS-2844', name: 'Pedro Rocha',   device: 'iPad Air — Conector',       badge: 'reparo' as const, label: 'Em reparo' },
]

const howSteps = [
  { n: 1, title: 'Cliente entra com o dispositivo', desc: 'Abra a OS em segundos: capture o problema, tire fotos, gere um orçamento e envie para aprovação via WhatsApp — sem papel.' },
  { n: 2, title: 'Acompanhe o reparo em tempo real', desc: 'Atualize o status da OS e o cliente recebe notificação automática no WhatsApp. Toda a equipe sabe o que está em andamento.' },
  { n: 3, title: 'Conclua, receba e fideliza', desc: 'Marque como pronto, o cliente é avisado automaticamente, você recebe via PIX e o histórico fica salvo para sempre.' },
]

export const metadata: Metadata = {
  title: 'SmartConserto | Sistema para assistência técnica',
  description: siteConfig.description,
  keywords: [
    'sistema para assistência técnica',
    'software para assistência técnica',
    'ordem de serviço assistência técnica',
    'gestão de assistência técnica',
    'bot WhatsApp assistência técnica',
  ],
  alternates: {
    canonical: siteConfig.url,
  },
  openGraph: {
    title: 'SmartConserto | Sistema para assistência técnica',
    description: siteConfig.description,
    url: siteConfig.url,
    siteName: siteConfig.name,
    locale: 'pt_BR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SmartConserto | Sistema para assistência técnica',
    description: siteConfig.description,
  },
  robots: {
    index: true,
    follow: true,
  },
}

const jsonLd = [
  {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: siteConfig.name,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    url: siteConfig.url,
    description: siteConfig.description,
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'BRL',
      lowPrice: '97',
      highPrice: '397',
      offerCount: '3',
    },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.a,
      },
    })),
  },
]

export default function LandingPage() {
  return (
    <div className={`${s.root} ${plusJakarta.variable} ${jetbrainsMono.variable}`} id="inicio">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />

      <LandingNav />

      {/* ── HERO ── */}
      <section className={s.hero}>
        <div className={s['hero-inner']}>
          <div>
            <div className={s['hero-badge']}>
              <div className={s['hero-badge-dot']}></div>
              Novo: integração com PIX automático
            </div>
            <h1>Gerencie sua<br /><em>assistência técnica</em><br />em um só lugar</h1>
            <p className={s['hero-sub']}>Ordens de serviço, clientes, estoque e financeiro — tudo integrado com notificações automáticas pelo WhatsApp.</p>
            <div className={s['hero-actions']}>
              <Link href="/register" className={s['btn-hero']}>Começar grátis — 14 dias</Link>
              <a href="#como-funciona" className={s['btn-hero-ghost']}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                Ver demonstração
              </a>
            </div>
            <p className={s['hero-note']}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              Sem cartão de crédito. Cancele quando quiser.
            </p>
          </div>

          {/* APP MOCKUP */}
          <div className={s['mockup-wrap']}>
            <div className={s['mockup-glow']}></div>
            <div className={s['mockup-shell']}>
              <div className={s['mockup-topbar']}>
                <div className={s['mockup-topbar-dot']} style={{ background: '#FF5F57' }}></div>
                <div className={s['mockup-topbar-dot']} style={{ background: '#FFBD2E' }}></div>
                <div className={s['mockup-topbar-dot']} style={{ background: '#28C840' }}></div>
                <div style={{ marginLeft: '8px', fontSize: '10px', color: 'var(--gray-400)', fontFamily: 'var(--mono)' }}>smartconserto.com.br/app</div>
              </div>
              <div className={s['mockup-body']}>
                <div className={s['mockup-sidebar']}>
                  <div style={{ width: '24px', height: '24px', background: 'var(--primary)', borderRadius: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
                  </div>
                  <div className={`${s['mockup-sidebar-item']} ${s.active}`}><svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg></div>
                  <div className={s['mockup-sidebar-item']}><svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div>
                  <div className={s['mockup-sidebar-item']}><svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg></div>
                  <div className={s['mockup-sidebar-item']}><svg viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></div>
                </div>
                <div className={s['mockup-content']}>
                  <div className={s['mockup-stats']}>
                    <div className={s['mockup-stat']}>
                      <div className={s['mockup-stat-label']}>OS EM ABERTO</div>
                      <div className={s['mockup-stat-val']}>47</div>
                      <div className={s['mockup-stat-delta']}>↑ 12% hoje</div>
                    </div>
                    <div className={s['mockup-stat']}>
                      <div className={s['mockup-stat-label']}>RECEITA MÊS</div>
                      <div className={s['mockup-stat-val']} style={{ fontSize: '13px' }}>R$18.4k</div>
                      <div className={s['mockup-stat-delta']}>↑ 8% mês</div>
                    </div>
                    <div className={s['mockup-stat']}>
                      <div className={s['mockup-stat-label']}>PRONTOS</div>
                      <div className={s['mockup-stat-val']} style={{ color: '#128C7E' }}>14</div>
                      <div className={s['mockup-stat-delta']} style={{ color: 'var(--gray-400)' }}>p/ retirar</div>
                    </div>
                    <div className={s['mockup-stat']}>
                      <div className={s['mockup-stat-label']}>ATRASADAS</div>
                      <div className={s['mockup-stat-val']} style={{ color: '#EF4444' }}>3</div>
                      <div className={s['mockup-stat-delta']} style={{ color: '#EF4444' }}>⚠ atenção</div>
                    </div>
                  </div>
                  <div className={s['mockup-row']}>
                    <div className={s['mockup-table']}>
                      <div className={s['mockup-table-head']}>
                        <span>ORDENS RECENTES</span>
                        <span style={{ color: 'var(--primary)' }}>+ Nova OS</span>
                      </div>
                      {mockupOsList.map((os) => (
                        <div key={os.id} className={s['mockup-table-row']}>
                          <div>
                            <div className={s['mockup-os-id']}>{os.id}</div>
                            <div className={s['mockup-os-name']}>{os.name}</div>
                            <div className={s['mockup-os-device']}>{os.device}</div>
                          </div>
                          <div className={`${s['mockup-badge']} ${s[os.badge]}`}>{os.label}</div>
                        </div>
                      ))}
                    </div>
                    <div className={s['mockup-chart']}>
                      <div className={s['mockup-chart-title']}>OS concluídas / semana</div>
                      <div className={s['mockup-bars']}>
                        {[30, 55, 40, 70, 60, 85, 45].map((h, i) => (
                          <div key={i} className={s['mockup-bar']} style={{ height: `${h}%`, background: i === 5 ? 'var(--primary)' : 'var(--primary-mid)' }} />
                        ))}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                        {['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'].map((d, i) => (
                          <span key={d} style={{ fontSize: '6px', color: i === 5 ? 'var(--primary)' : 'var(--gray-300)' }}>{d}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className={s['mockup-wa-pill']}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              WhatsApp Bot ativo — 3 notificações enviadas
            </div>
          </div>
        </div>
      </section>

      {/* ── SOCIAL PROOF ── */}
      <div className={s.proof}>
        <div className={s['proof-inner']}>
          <div className={s['proof-stat']}>
            <div className={s['proof-stat-num']}>+<span>4.200</span></div>
            <div className={s['proof-stat-label']}>assistências técnicas</div>
          </div>
          <div className={s['proof-divider']}></div>
          <div className={s['proof-stat']}>
            <div className={s['proof-stat-num']}><span>R$ 12M</span></div>
            <div className={s['proof-stat-label']}>em OS gerenciadas por mês</div>
          </div>
          <div className={s['proof-divider']}></div>
          <div className={s['proof-stat']}>
            <div className={s['proof-stat-num']}><span>98</span>%</div>
            <div className={s['proof-stat-label']}>de satisfação dos clientes</div>
          </div>
          <div className={s['proof-divider']}></div>
          <div className={s['proof-stat']}>
            <div className={s['proof-stat-num']}><span>2.1M</span></div>
            <div className={s['proof-stat-label']}>mensagens WhatsApp enviadas</div>
          </div>
        </div>
      </div>

      {/* ── FEATURES ── */}
      <section className={`${s.section} ${s.features}`} id="funcionalidades">
        <div className={s['section-inner']}>
          <div className={s['features-header']}>
            <div className={s['section-tag']}>Funcionalidades</div>
            <h2 className={s['section-title']}>Tudo que sua assistência precisa</h2>
            <p className={s['section-sub']}>Do orçamento à entrega — controle completo do seu negócio em uma plataforma simples e poderosa.</p>
          </div>
          <div className={s['features-grid']}>
            <div className={s['feature-card']}>
              <div className={s['feature-icon']}>
                <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
              </div>
              <div className={s['feature-title']}>Ordens de Serviço</div>
              <div className={s['feature-desc']}>Crie, acompanhe e finalize OS com agilidade. Histórico completo, fotos do aparelho, laudos técnicos e assinatura digital.</div>
              <div className={s['feature-tags']}>
                <span className={s['feature-tag']}>Status em tempo real</span>
                <span className={s['feature-tag']}>Laudos PDF</span>
                <span className={s['feature-tag']}>Assinatura digital</span>
              </div>
            </div>
            <div className={s['feature-card']}>
              <div className={`${s['feature-icon']} ${s.green}`}>
                <svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              </div>
              <div className={s['feature-title']}>Bot WhatsApp</div>
              <div className={s['feature-desc']}>Notificações automáticas para seus clientes — orçamento aprovado, reparo concluído, pronto para retirada. Tudo sem digitar nada.</div>
              <div className={s['feature-tags']}>
                <span className={s['feature-tag']}>Notificações automáticas</span>
                <span className={s['feature-tag']}>Consulta de status</span>
                <span className={s['feature-tag']}>Aprovação de orçamento</span>
              </div>
            </div>
            <div className={s['feature-card']}>
              <div className={`${s['feature-icon']} ${s.amber}`}>
                <svg viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              </div>
              <div className={s['feature-title']}>Controle Financeiro</div>
              <div className={s['feature-desc']}>Fluxo de caixa, contas a pagar e receber, integração com PIX. Saiba exatamente quanto sua assistência está faturando.</div>
              <div className={s['feature-tags']}>
                <span className={s['feature-tag']}>Fluxo de caixa</span>
                <span className={s['feature-tag']}>PIX integrado</span>
                <span className={s['feature-tag']}>NF-e</span>
              </div>
            </div>
            <div className={s['feature-card']}>
              <div className={`${s['feature-icon']} ${s.teal}`}>
                <svg viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
              </div>
              <div className={s['feature-title']}>Estoque de Peças</div>
              <div className={s['feature-desc']}>Controle de entradas e saídas, alertas de estoque mínimo, custo por OS calculado automaticamente com as peças usadas.</div>
              <div className={s['feature-tags']}>
                <span className={s['feature-tag']}>Alerta de mínimo</span>
                <span className={s['feature-tag']}>Custo por OS</span>
                <span className={s['feature-tag']}>Fornecedores</span>
              </div>
            </div>
            <div className={s['feature-card']}>
              <div className={`${s['feature-icon']} ${s.purple}`}>
                <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </div>
              <div className={s['feature-title']}>Gestão de Clientes</div>
              <div className={s['feature-desc']}>Cadastro completo com histórico de atendimentos, dispositivos, orçamentos anteriores e canal direto de comunicação.</div>
              <div className={s['feature-tags']}>
                <span className={s['feature-tag']}>Histórico completo</span>
                <span className={s['feature-tag']}>Multi-dispositivos</span>
                <span className={s['feature-tag']}>CRM básico</span>
              </div>
            </div>
            <div className={s['feature-card']}>
              <div className={s['feature-icon']}>
                <svg viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
              </div>
              <div className={s['feature-title']}>Relatórios e Dashboards</div>
              <div className={s['feature-desc']}>Métricas de desempenho, tempo médio de reparo, peças mais usadas, faturamento por período e muito mais.</div>
              <div className={s['feature-tags']}>
                <span className={s['feature-tag']}>Exportação PDF/Excel</span>
                <span className={s['feature-tag']}>Metas</span>
                <span className={s['feature-tag']}>Comparativo</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className={`${s.section} ${s.how}`} id="como-funciona">
        <div className={s['section-inner']}>
          <div style={{ textAlign: 'center' }}>
            <div className={s['section-tag']}>Como funciona</div>
            <h2 className={s['section-title']}>Da entrada à entrega, sem complicação</h2>
            <p className={s['section-sub']} style={{ margin: '0 auto' }}>Configure em minutos e comece a usar no mesmo dia — sem precisar de treinamento técnico.</p>
          </div>
          <div className={s['how-grid']}>
            <ol className={s['how-steps']}>
              {howSteps.map((step) => (
                <li
                  key={step.n}
                  className={`${s['how-step']} ${step.n === 1 ? s.active : ''}`}
                >
                  <div className={s['how-step-num']}>{step.n}</div>
                  <div>
                    <div className={s['how-step-title']}>{step.title}</div>
                    <div className={s['how-step-desc']}>{step.desc}</div>
                  </div>
                </li>
              ))}
            </ol>
            <div className={s['how-visual']}>
              <div className={s['how-screen']}>
                <div className={s['how-screen-header']}>
                  <span>Ordens de Serviço</span>
                  <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--primary)', cursor: 'pointer' }}>+ Nova OS</span>
                </div>
                {[
                  { id: 'OS-2847', client: 'Maria Santos',   device: 'iPhone 14 Pro — Troca de tela', statusBg: '#EEF3FF',            statusColor: 'var(--primary)',    statusText: 'Em reparo'       },
                  { id: 'OS-2846', client: 'Carlos Oliveira',device: 'Samsung A54 — Bateria',         statusBg: 'var(--green-light)', statusColor: 'var(--green-dark)', statusText: 'Pronto ✓'        },
                  { id: 'OS-2845', client: 'Ana Ferreira',   device: 'Notebook Dell — SSD',           statusBg: 'var(--amber-light)', statusColor: '#B45309',           statusText: 'Aguardando peça' },
                ].map((os) => (
                  <div key={os.id} className={s['how-os-card']}>
                    <div className={s['how-os-top']}>
                      <span className={s['how-os-id']}>{os.id}</span>
                      <span className={s['how-os-status']} style={{ background: os.statusBg, color: os.statusColor }}>{os.statusText}</span>
                    </div>
                    <div className={s['how-os-client']}>{os.client}</div>
                    <div className={s['how-os-device']}>{os.device}</div>
                  </div>
                ))}
              </div>
              <div className={s['how-wa-notif']}>
                <div className={s['how-wa-icon']}>
                  <svg viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
                </div>
                <div className={s['how-wa-text']}>
                  <strong>SmartConserto 🔧</strong><br />
                  Olá, Carlos! Seu Samsung A54 está pronto para retirada. Valor: R$ 120,00 💚
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── WHATSAPP SECTION ── */}
      <section className={`${s.section} ${s.wapp}`}>
        <div className={s['section-inner']}>
          <div className={s['wapp-grid']}>
            <div>
              <div className={s['section-tag']} style={{ color: 'var(--green-dark)' }}>Bot WhatsApp</div>
              <h2 className={s['section-title']}>Seu cliente sempre<br />informado, sem esforço</h2>
              <p className={s['section-sub']}>O Bot SmartConserto envia mensagens automáticas em cada etapa do reparo — aprovação de orçamento, início do serviço, conclusão e cobrança.</p>
              <div className={s['wapp-features']}>
                {[
                  { icon: <svg viewBox="0 0 24 24"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>, title: 'Notificações automáticas', desc: 'Envios automáticos ao alterar o status da OS — sem digitar nada, sem esquecer de avisar.' },
                  { icon: <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>, title: 'Consulta de status pelo cliente', desc: 'O cliente digita o número da OS e recebe o status atualizado — sem ligar para a loja.' },
                  { icon: <svg viewBox="0 0 24 24"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>, title: 'Aprovação de orçamento online', desc: 'Cliente aprova ou recusa o orçamento direto pelo WhatsApp. A OS é atualizada automaticamente.' },
                ].map((feat) => (
                  <div key={feat.title} className={s['wapp-feat']}>
                    <div className={s['wapp-feat-icon']}>{feat.icon}</div>
                    <div>
                      <div className={s['wapp-feat-title']}>{feat.title}</div>
                      <div className={s['wapp-feat-desc']}>{feat.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className={s['phone-wrap']}>
              <div className={s.phone}>
                <div className={s['phone-screen']}>
                  <div className={s['phone-statusbar']}>
                    <span className={s['phone-statusbar-time']}>9:41</span>
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--gray-800)" strokeWidth="2.5"><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M10.54 16.1a6 6 0 0 1 2.92 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>
                      <svg width="14" height="12" viewBox="0 0 24 20"><rect x="1" y="4" width="18" height="13" rx="2" fill="none" stroke="var(--gray-800)" strokeWidth="2"/><rect x="3" y="6" width="12" height="9" rx="1" fill="var(--gray-800)"/><path d="M21 9v4" stroke="var(--gray-800)" strokeWidth="2" strokeLinecap="round"/></svg>
                    </div>
                  </div>
                  <div style={{ background: '#075E54', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#128C7E', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '800', color: '#fff' }}>SC</div>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: '700', color: '#fff' }}>SmartConserto 🔧</div>
                      <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.7)' }}>Bot de atendimento</div>
                    </div>
                  </div>
                  <div className={s['phone-chat']}>
                    <div className={`${s['chat-bubble']} ${s.bot}`}>
                      Olá! 👋 Bem-vindo à SmartConserto. Digite o número da sua OS para consultar o status.
                      <div className={s['chat-time']}>14:22</div>
                    </div>
                    <div className={`${s['chat-bubble']} ${s.sent}`}>
                      OS-2846
                      <div className={s['chat-time']}>14:23</div>
                    </div>
                    <div className={`${s['chat-bubble']} ${s.bot}`}>
                      📱 <strong>OS-2846</strong> — Samsung Galaxy A54<br />
                      🔧 Serviço: Troca de bateria<br /><br />
                      ✅ <strong>Status: Pronto para retirada!</strong><br />
                      💰 Valor: R$ 120,00
                      <div className={s['chat-time']}>14:23</div>
                    </div>
                    <div className={`${s['chat-status']} ${s.pronto}`}>✅ Seu aparelho está pronto!</div>
                    <div className={`${s['chat-bubble']} ${s.bot}`}>
                      Você pode retirar hoje das 9h às 18h. Aceita pagar via PIX? 😊
                      <div className={s['chat-time']}>14:23</div>
                    </div>
                    <div className={`${s['chat-bubble']} ${s.sent}`}>
                      Sim, mando o PIX agora!
                      <div className={s['chat-time']}>14:24</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section className={`${s.section} ${s.pricing}`} id="precos">
        <div className={s['section-inner']}>
          <div className={s['pricing-header']}>
            <div className={s['section-tag']}>Planos</div>
            <h2 className={s['section-title']}>Simples, transparente, sem surpresas</h2>
            <p className={s['section-sub']}>Escolha o plano certo para o tamanho da sua assistência. Todos incluem 14 dias grátis.</p>
          </div>
          <div className={s['pricing-grid']}>

            {/* Básico */}
            <div className={s['pricing-card']}>
              <div className={s['pricing-plan']}>Básico</div>
              <div className={s['pricing-price']}><sup>R$</sup>97<span className={s['pricing-period']}>/mês</span></div>
              <div className={s['pricing-desc']}>Para assistências iniciantes que querem organizar as OS e clientes.</div>
              <div className={s['pricing-divider']}></div>
              <div className={s['pricing-features-list']}>
                {['Até 100 OS por mês','Cadastro ilimitado de clientes','Controle básico de estoque','1 usuário'].map(f => (
                  <div key={f} className={s['pricing-feature']}><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg><span>{f}</span></div>
                ))}
                {['Bot WhatsApp','Relatórios avançados'].map(f => (
                  <div key={f} className={`${s['pricing-feature']} ${s.off}`}><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg><span>{f}</span></div>
                ))}
              </div>
              <Link href="/register" className={`${s['pricing-cta']} ${s.outline}`} style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>Começar grátis</Link>
            </div>

            {/* Profissional */}
            <div className={`${s['pricing-card']} ${s.popular}`}>
              <div className={s['pricing-popular-badge']}>Mais popular</div>
              <div className={s['pricing-plan']} style={{ color: 'var(--primary)' }}>Profissional</div>
              <div className={s['pricing-price']}><sup>R$</sup>197<span className={s['pricing-period']}>/mês</span></div>
              <div className={s['pricing-desc']}>Para assistências que querem crescer com automação e controle total.</div>
              <div className={s['pricing-divider']}></div>
              <div className={s['pricing-features-list']}>
                {['OS ilimitadas','Cadastro ilimitado de clientes','Estoque com alertas de mínimo','Até 3 usuários','Bot WhatsApp incluído','Relatórios completos + exportação'].map(f => (
                  <div key={f} className={s['pricing-feature']}><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg><span>{f}</span></div>
                ))}
              </div>
              <Link href="/register" className={`${s['pricing-cta']} ${s.filled}`} style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>Começar grátis</Link>
            </div>

            {/* Empresarial */}
            <div className={s['pricing-card']}>
              <div className={s['pricing-plan']}>Empresarial</div>
              <div className={s['pricing-price']}><sup>R$</sup>397<span className={s['pricing-period']}>/mês</span></div>
              <div className={s['pricing-desc']}>Para redes de assistências com múltiplas unidades e equipes grandes.</div>
              <div className={s['pricing-divider']}></div>
              <div className={s['pricing-features-list']}>
                {['Tudo do Profissional','Usuários ilimitados','Múltiplas unidades','API e integrações avançadas','Suporte prioritário','Onboarding personalizado'].map(f => (
                  <div key={f} className={s['pricing-feature']}><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg><span>{f}</span></div>
                ))}
              </div>
              <a href="mailto:contato@smartconserto.com.br" className={`${s['pricing-cta']} ${s.outline}`} style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>Falar com vendas</a>
            </div>

          </div>
          <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '13px', color: 'var(--gray-400)' }}>
            Todos os planos incluem 14 dias de teste grátis · Sem cartão de crédito · Cancele quando quiser
          </p>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className={`${s.section} ${s.testimonials}`}>
        <div className={s['section-inner']}>
          <div className={s['testimonials-header']}>
            <div className={s['section-tag']}>Depoimentos</div>
            <h2 className={s['section-title']}>Quem usa, recomenda</h2>
          </div>
          <div className={s['testi-grid']}>
            {[
              { quote: '"Antes eu usava caderno para controlar as OS. Com o SmartConserto, consigo ver tudo no celular, e meu cliente nem precisa ligar pra saber o andamento."', name: 'Ricardo Ferreira', role: 'Conserta Tudo — São Paulo, SP',   initials: 'RF', color: 'var(--primary)' },
              { quote: '"O bot do WhatsApp foi um divisor de águas. Reduzi em 80% as ligações de clientes perguntando sobre o conserto. Minha equipe ficou muito mais focada."', name: 'Patricia Oliveira',  role: 'iRepara — Belo Horizonte, MG',    initials: 'PO', color: '#128C7E'       },
              { quote: '"Finalmente consigo saber se minha assistência está dando lucro de verdade. O controle financeiro me mostrou onde estava perdendo dinheiro sem perceber."', name: 'Marcos Santos',    role: 'TechFix — Curitiba, PR',          initials: 'MS', color: '#7C3AED'       },
            ].map((t) => (
              <div key={t.name} className={s['testi-card']}>
                <div className={s['testi-stars']}>{'★★★★★'.split('').map((star, i) => <span key={i} className={s['testi-star']}>{star}</span>)}</div>
                <p className={s['testi-quote']}>{t.quote}</p>
                <div className={s['testi-author']}>
                  <div className={s['testi-avatar']} style={{ background: t.color }}>{t.initials}</div>
                  <div>
                    <div className={s['testi-name']}>{t.name}</div>
                    <div className={s['testi-role']}>{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <LandingFaq items={faqItems} />

      {/* ── CTA FINAL ── */}
      <section className={`${s.section} ${s['cta-final']}`}>
        <div className={s['cta-final-inner']}>
          <h2>Comece a usar hoje,<br />de graça</h2>
          <p>14 dias completos, sem cartão de crédito. Configure em minutos e veja sua assistência técnica ganhar nova vida.</p>
          <div className={s['cta-final-actions']}>
            <Link href="/register" className={s['btn-cta-white']}>Criar conta grátis</Link>
            <a href="mailto:contato@smartconserto.com.br" className={s['btn-cta-outline']}>Falar com um especialista</a>
          </div>
          <p className={s['cta-note']}>Mais de 4.200 assistências técnicas já confiam no SmartConserto</p>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className={s.footer}>
        <div className={s['footer-inner']}>
          <div className={s['footer-grid']}>
            <div>
              <div className={s['footer-logo']}>
                <div className={s['footer-logo-mark']}>
                  <svg viewBox="0 0 24 24"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
                </div>
                <span className={s['footer-logo-text']}>Smart<span>Conserto</span></span>
              </div>
              <p className={s['footer-tagline']}>O sistema de gestão para assistências técnicas mais completo do Brasil.</p>
            </div>
            <div>
              <div className={s['footer-col-title']}>Produto</div>
              <div className={s['footer-links']}>
                {['Funcionalidades','Preços','Bot WhatsApp','Integrações','Novidades'].map(l => (
                  <a key={l} href="#" className={s['footer-link']}>{l}</a>
                ))}
              </div>
            </div>
            <div>
              <div className={s['footer-col-title']}>Empresa</div>
              <div className={s['footer-links']}>
                {['Sobre nós','Blog','Casos de sucesso','Parceiros','Trabalhe conosco'].map(l => (
                  <a key={l} href="#" className={s['footer-link']}>{l}</a>
                ))}
              </div>
            </div>
            <div>
              <div className={s['footer-col-title']}>Suporte</div>
              <div className={s['footer-links']}>
                {['Central de ajuda','Documentação','Status do sistema','Contato','Falar no WhatsApp'].map(l => (
                  <a key={l} href="#" className={s['footer-link']}>{l}</a>
                ))}
              </div>
            </div>
          </div>
          <div className={s['footer-bottom']}>
            <span className={s['footer-bottom-text']}>© 2026 SmartConserto. Todos os direitos reservados.</span>
            <div className={s['footer-bottom-links']}>
              {['Privacidade','Termos de uso','Cookies'].map(l => (
                <a key={l} href="#" className={s['footer-bottom-link']}>{l}</a>
              ))}
            </div>
          </div>
        </div>
      </footer>

    </div>
  )
}
