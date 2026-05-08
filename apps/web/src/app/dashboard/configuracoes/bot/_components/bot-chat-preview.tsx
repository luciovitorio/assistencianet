'use client'

import * as React from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { type BotMessages } from '@/lib/whatsapp/bot-messages'

// ── Variáveis de exemplo para o preview ─────────────────────

const VARS: Record<string, string> = {
  '{{cliente.nome}}': 'João Silva',
  '{{empresa.nome}}': 'ORQUÍDIA Assistência',
  '{{filial.nome}}': 'Filial Centro',
  '{{os_numero}}': '20260001',
  '{{os_dispositivo}}': 'Babyliss Prancha',
  '{{os_status}}': 'Finalizado',
  '{{os_data}}': '05/05/2026',
  '{{os_data_finalizacao}}': '07/05/2026',
}

const resolveVars = (text: string): string =>
  Object.entries(VARS).reduce((acc, [k, v]) => acc.replaceAll(k, v), text)

// ── Renderizador de texto com *negrito* ──────────────────────

const RichText = ({ text }: { text: string }) => {
  const lines = text.split('\n')
  return (
    <>
      {lines.map((line, li) => {
        const parts = line.split(/(\*[^*]+\*)/g)
        return (
          <React.Fragment key={li}>
            {li > 0 && <br />}
            {parts.map((part, pi) =>
              part.startsWith('*') && part.endsWith('*') ? (
                <strong key={pi}>{part.slice(1, -1)}</strong>
              ) : (
                <React.Fragment key={pi}>{part}</React.Fragment>
              ),
            )}
          </React.Fragment>
        )
      })}
    </>
  )
}

// ── Bolha de chat ────────────────────────────────────────────

const Bubble = ({ role, text }: { role: 'bot' | 'user'; text: string }) => {
  const isBot = role === 'bot'
  return (
    <div className={`flex mb-2 ${isBot ? 'justify-start' : 'justify-end'}`}>
      <div
        className={`max-w-[85%] rounded-lg px-3 py-2 text-xs shadow-sm ${
          isBot ? 'bg-[#d9fdd3] text-gray-900' : 'bg-white text-gray-900 border border-gray-200'
        }`}
      >
        <RichText text={resolveVars(text)} />
      </div>
    </div>
  )
}

// ── Fluxos de conversa por seção ─────────────────────────────

type Step = { role: 'bot' | 'user'; text: string | ((m: BotMessages) => string) }

const MENU_OPTIONS = '1️⃣ Consultar OS\n2️⃣ Falar com atendente'
const SUBMENU_OPTIONS = '1️⃣ Garantia\n2️⃣ Balcão\n0️⃣ Voltar'
const BRANCH_OPTIONS = '1️⃣ Filial Centro\n2️⃣ Filial Sul\n0️⃣ Voltar ao menu'

const FLOWS: Record<string, Step[]> = {
  'Menu principal': [
    {
      role: 'bot',
      text: (m) =>
        [m.menu_greeting, m.menu_question, MENU_OPTIONS, m.menu_footer].join('\n\n'),
    },
    { role: 'user', text: '1' },
    {
      role: 'bot',
      text: (m) => [m.more_help, MENU_OPTIONS, m.menu_footer].join('\n\n'),
    },
  ],
  Submenus: [
    { role: 'user', text: '2' },
    {
      role: 'bot',
      text: (m) => [m.submenu_header, SUBMENU_OPTIONS, m.submenu_footer].join('\n\n'),
    },
  ],
  'Consulta de OS': [
    { role: 'user', text: '1' },
    { role: 'bot', text: (m) => m.client_not_found },
    { role: 'user', text: '20260001' },
    {
      role: 'bot',
      text: (m) =>
        [m.os_list_header, m.os_list_item, m.os_list_footer].join('\n\n'),
    },
    { role: 'user', text: '20269999' },
    { role: 'bot', text: (m) => m.os_not_found },
    { role: 'user', text: '1' },
    { role: 'bot', text: (m) => m.no_open_orders },
  ],
  'Atendimento humano': [
    {
      role: 'bot',
      text: (m) => [m.ask_branch, BRANCH_OPTIONS, m.ask_branch_footer].join('\n\n'),
    },
    { role: 'user', text: '1' },
    { role: 'bot', text: (m) => m.handoff_confirmation },
  ],
  Orçamento: [
    {
      role: 'bot',
      text: 'Seu orçamento para a OS *#20260001* está pronto:\n\nValor: *R$ 250,00*\n\n1️⃣ Aprovar\n2️⃣ Recusar\n3️⃣ Falar com atendente\n0️⃣ Voltar',
    },
    { role: 'user', text: '1' },
    { role: 'bot', text: (m) => m.estimate_approved },
    { role: 'user', text: '2' },
    { role: 'bot', text: (m) => m.estimate_rejected },
    { role: 'user', text: '?' },
    { role: 'bot', text: (m) => m.estimate_error },
  ],
  Avaliação: [
    { role: 'bot', text: (m) => m.rating_request },
    { role: 'user', text: '5' },
    { role: 'bot', text: (m) => m.rating_thanks },
    { role: 'user', text: '2 (não avaliar)' },
    { role: 'bot', text: (m) => m.rating_skip },
  ],
  'Respostas inválidas': [
    { role: 'user', text: 'abc' },
    { role: 'bot', text: (m) => m.invalid_menu },
    { role: 'user', text: 'xyz' },
    { role: 'bot', text: (m) => m.invalid_os_number },
    { role: 'user', text: '???' },
    { role: 'bot', text: (m) => m.invalid_max_attempts },
  ],
}

// ── Componente principal ─────────────────────────────────────

type Props = {
  messages: BotMessages
  section: string
}

export function BotChatPreview({ messages, section }: Props) {
  const steps = FLOWS[section] ?? []

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border bg-white shadow-sm">
      {/* Cabeçalho estilo WhatsApp */}
      <div className="flex items-center gap-3 bg-[#075E54] px-4 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-xs font-bold text-white">
          B
        </div>
        <div>
          <p className="text-sm font-medium text-white">Bot</p>
          <p className="text-xs text-white/70">online</p>
        </div>
      </div>

      {/* Área de mensagens */}
      <ScrollArea className="flex-1 bg-[#efeae2] px-3 py-3">
        <div className="space-y-0.5">
          {steps.length === 0 ? (
            <p className="py-8 text-center text-xs text-gray-400">
              Sem preview para esta seção
            </p>
          ) : (
            steps.map((step, i) => (
              <Bubble
                key={i}
                role={step.role}
                text={typeof step.text === 'function' ? step.text(messages) : step.text}
              />
            ))
          )}
        </div>
      </ScrollArea>

      <div className="border-t bg-white px-3 py-2 text-center text-[10px] text-muted-foreground">
        Preview com dados de exemplo
      </div>
    </div>
  )
}
