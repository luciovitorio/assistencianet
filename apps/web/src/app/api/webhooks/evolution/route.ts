import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createEvolutionApiClient } from '@/lib/whatsapp/evolution-client'
import { runBotEngine } from '@/lib/whatsapp/bot-engine'
import {
  findOrCreateConversation,
  saveMessage,
  touchConversation,
} from '@/lib/whatsapp/conversation-service'

export const runtime = 'nodejs'

// ── Tipos do payload Evolution ───────────────────────────────

type EvolutionWebhookPayload = {
  event?: unknown
  instance?: unknown
  instanceName?: unknown
  data?: {
    key?: {
      remoteJid?: unknown
      fromMe?: unknown
      id?: unknown
    }
    pushName?: unknown
    messageType?: unknown
    message?: unknown
  }
}

type EvolutionSettings = {
  id: string
  company_id: string
  enabled: boolean
  provider: string
  evolution_base_url: string
  evolution_api_key: string | null
  evolution_instance_name: string | null
  notify_inbound_message: boolean
  message_inbound_auto_reply: string | null
  authorized_brands: string | null
  session_timeout_minutes: number
}

// ── Helpers de parse ─────────────────────────────────────────

const getString = (value: unknown) => (typeof value === 'string' ? value : null)

const getObject = (value: unknown) =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : null

const getEventName = (payload: EvolutionWebhookPayload) =>
  getString(payload.event)?.toLowerCase() ?? null

const isMessagesUpsertEvent = (eventName: string | null) =>
  eventName === 'messages.upsert' || eventName === 'messages_upsert'

const getPayloadInstanceName = (payload: EvolutionWebhookPayload) =>
  getString(payload.instance) ?? getString(payload.instanceName)

/** Extrai o texto de mensagens de texto simples ou estendidas. */
const extractMessageText = (payload: EvolutionWebhookPayload): string | null => {
  const message = getObject(payload.data?.message)
  if (!message) return null

  if (typeof message.conversation === 'string') return message.conversation

  const extended = getObject(message.extendedTextMessage)
  if (typeof extended?.text === 'string') return extended.text

  const listResponse = getObject(message.listResponseMessage)
  const singleSelectReply = getObject(listResponse?.singleSelectReply)
  const selectedRowId = getString(singleSelectReply?.selectedRowId)
  if (selectedRowId) return selectedRowId

  const buttonsResponse = getObject(message.buttonsResponseMessage)
  const selectedButtonId = getString(buttonsResponse?.selectedButtonId)
  if (selectedButtonId) return selectedButtonId

  const templateButtonReply = getObject(message.templateButtonReplyMessage)
  const selectedTemplateId = getString(templateButtonReply?.selectedId)
  if (selectedTemplateId) return selectedTemplateId

  const listTitle = getString(listResponse?.title)
  if (listTitle) return listTitle

  return null
}

/**
 * Retorna os dados da mensagem inbound ou null se deve ser ignorada
 * (outbound, grupos, status, sem número).
 */
const getInboundMessage = (payload: EvolutionWebhookPayload) => {
  const key = payload.data?.key
  const remoteJid = getString(key?.remoteJid)

  if (!remoteJid || key?.fromMe === true) return null
  if (remoteJid.endsWith('@g.us') || remoteJid === 'status@broadcast') return null

  const number = remoteJid.split('@')[0]?.replace(/\D/g, '')
  if (!number) return null

  return {
    id: getString(key?.id),
    number,
    remoteJid,
    pushName: getString(payload.data?.pushName),
    messageType: getString(payload.data?.messageType),
  }
}

// ── Consultas ao banco ───────────────────────────────────────

const findEvolutionSettings = async (
  instanceName: string | null
): Promise<EvolutionSettings | null> => {
  if (!instanceName) return null

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('whatsapp_automation_settings')
    .select(
      `id, company_id, enabled, provider,
       evolution_base_url, evolution_api_key, evolution_instance_name,
       notify_inbound_message, message_inbound_auto_reply, authorized_brands,
       session_timeout_minutes`
    )
    .eq('enabled', true)
    .eq('provider', 'evolution_api')
    .eq('evolution_instance_name', instanceName)
    .limit(1)
    .maybeSingle<EvolutionSettings>()

  if (error) throw error
  return data
}

const getCompanyName = async (companyId: string): Promise<string> => {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('companies')
    .select('name')
    .eq('id', companyId)
    .maybeSingle<{ name: string }>()

  return data?.name?.trim() || 'Assistência'
}

// ── Handler principal ────────────────────────────────────────

export async function POST(request: NextRequest) {
  // 1. Parse do payload
  let payload: EvolutionWebhookPayload
  try {
    payload = (await request.json()) as EvolutionWebhookPayload
  } catch {
    return new NextResponse('Payload inválido.', { status: 400 })
  }

  // 2. Filtra eventos que não são de mensagem
  const eventName = getEventName(payload)
  if (!isMessagesUpsertEvent(eventName)) {
    return NextResponse.json({ received: true, ignored: 'event' })
  }

  // 3. Filtra mensagens que não devem ser processadas
  const inboundMessage = getInboundMessage(payload)
  if (!inboundMessage) {
    return NextResponse.json({ received: true, ignored: 'message' })
  }

  // 4. Busca configurações da instância
  const instanceName = getPayloadInstanceName(payload)
  const settings = await findEvolutionSettings(instanceName)

  if (!settings?.evolution_api_key || !settings.evolution_instance_name) {
    return new NextResponse('Automação Evolution não configurada.', { status: 403 })
  }

  // 5. Valida segredo do webhook
  const secret = request.headers.get('x-assistencianet-webhook-secret')
  if (secret !== settings.evolution_api_key) {
    return new NextResponse('Segredo inválido.', { status: 403 })
  }

  // 6. Automação desabilitada: apenas registra
  if (!settings.notify_inbound_message) {
    return NextResponse.json({ received: true, ignored: 'trigger' })
  }

  const supabase = createAdminClient()
  const messageText = extractMessageText(payload) ?? '[mídia]'

  // 7. Encontra ou cria a conversa
  const conversation = await findOrCreateConversation(
    supabase,
    settings.company_id,
    inboundMessage.number,
    inboundMessage.pushName,
    settings.session_timeout_minutes
  )

  // 8. Persiste a mensagem recebida
  await saveMessage(supabase, {
    conversationId: conversation.id,
    companyId: settings.company_id,
    direction: 'inbound',
    content: messageText,
    sentByBot: false,
    senderName: inboundMessage.pushName ?? inboundMessage.number,
    externalId: inboundMessage.id,
  })

  // 9. Atualiza preview e contador de não lidas
  await touchConversation(supabase, conversation, messageText, settings.session_timeout_minutes)

  // 10. Bot em modo silencioso (atendente assumiu): não responde
  if (
    !conversation.bot_enabled ||
    conversation.status === 'waiting' ||
    conversation.status === 'in_progress'
  ) {
    return NextResponse.json({ received: true, bot: false })
  }

  // 11. Executa o bot engine
  const evolutionClient = createEvolutionApiClient({
    baseUrl: settings.evolution_base_url,
    apiKey: settings.evolution_api_key,
    instanceName: settings.evolution_instance_name,
  })

  const companyName = await getCompanyName(settings.company_id)

  await runBotEngine({
    supabase,
    conversation,
    messageText,
    phoneNumber: inboundMessage.number,
    companyName,
    authorizedBrands: settings.authorized_brands,
    evolutionClient,
  })

  return NextResponse.json({ received: true, bot: true })
}
