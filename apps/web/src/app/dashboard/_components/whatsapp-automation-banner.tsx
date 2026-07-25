import Link from 'next/link'
import { ArrowRight, BellOff, WifiOff } from 'lucide-react'
import { getWhatsAppAutomationWarning } from '@/app/actions/dashboard'

const BANNER_CONTENT = {
  disconnected: {
    icon: WifiOff,
    title: 'WhatsApp desconectado',
    description:
      'A automação está habilitada, mas a sessão do WhatsApp caiu — nenhuma mensagem automática está sendo enviada aos clientes.',
    linkLabel: 'Reconectar agora',
    href: '/dashboard/configuracoes/automacao',
    container: 'border-red-200 bg-red-50',
    iconWrap: 'bg-red-100 text-red-700',
    title_cls: 'text-red-900',
    description_cls: 'text-red-800/80',
    link_cls: 'text-red-700 hover:text-red-900',
  },
  no_triggers: {
    icon: BellOff,
    title: 'Nenhum gatilho automático ativo',
    description:
      'O WhatsApp está conectado, mas nenhum aviso automático (OS aberta, orçamento pronto, serviço concluído…) está ligado — os clientes não recebem mensagens.',
    linkLabel: 'Ativar gatilhos',
    href: '/dashboard/configuracoes/bot',
    container: 'border-amber-200 bg-amber-50',
    iconWrap: 'bg-amber-100 text-amber-700',
    title_cls: 'text-amber-900',
    description_cls: 'text-amber-800/80',
    link_cls: 'text-amber-700 hover:text-amber-900',
  },
} as const

export async function WhatsAppAutomationBanner() {
  const warning = await getWhatsAppAutomationWarning()
  if (!warning) return null

  const content = BANNER_CONTENT[warning]
  const Icon = content.icon

  return (
    <section
      role="alert"
      className={`flex flex-col gap-3 rounded-lg border p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between ${content.container}`}
    >
      <div className="flex items-start gap-3">
        <div className={`rounded-lg p-2 ${content.iconWrap}`}>
          <Icon className="size-5" />
        </div>
        <div>
          <p className={`font-semibold ${content.title_cls}`}>{content.title}</p>
          <p className={`text-sm ${content.description_cls}`}>{content.description}</p>
        </div>
      </div>
      <Link
        href={content.href}
        className={`inline-flex shrink-0 items-center gap-1 text-sm font-semibold hover:underline ${content.link_cls}`}
      >
        {content.linkLabel}
        <ArrowRight className="size-4" />
      </Link>
    </section>
  )
}
