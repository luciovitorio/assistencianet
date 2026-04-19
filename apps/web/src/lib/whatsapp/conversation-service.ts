/**
 * conversation-service.ts
 * Camada de acesso a dados para o inbox do WhatsApp.
 * Usada pelo bot-engine e pelo webhook de entrada.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

// ── Tipos ────────────────────────────────────────────────────

export type WhatsAppConversation = {
  id: string
  company_id: string
  branch_id: string | null
  client_id: string | null
  phone_number: string
  contact_name: string | null
  status: 'bot' | 'waiting' | 'in_progress' | 'resolved'
  bot_state:
    | 'awaiting_menu'
    | 'awaiting_os_number'
    | 'awaiting_branch'
    | 'awaiting_estimate_response'
    | 'awaiting_rating_consent'
    | 'awaiting_rating'
    | null
  bot_enabled: boolean
  context: Record<string, unknown>
  attempts: number
  assigned_to: string | null
  unread_count: number
  last_message_at: string | null
  last_message_preview: string | null
  expires_at: string | null
}

export type ServiceOrderSummary = {
  id: string
  number: number
  device_type: string
  device_brand: string | null
  device_model: string | null
  status: string
  branch_id: string | null
  created_at: string
}

export type BranchOption = {
  id: string
  name: string
}

export type MenuItemRecord = {
  id: string
  position: number
  label: string
  emoji: string | null
  handler_type: 'check_os' | 'human_handoff' | 'info' | 'submenu' | 'url'
  handler_config: Record<string, unknown>
  enabled: boolean
}

// ── Constantes ───────────────────────────────────────────────

const inMinutes = (m: number) =>
  new Date(Date.now() + m * 60_000).toISOString()

const truncate = (text: string, max: number) =>
  text.length > max ? `${text.slice(0, max - 1)}…` : text

/** Menu padrão quando a empresa ainda não configurou itens customizados. */
export const DEFAULT_MENU_ITEMS: MenuItemRecord[] = [
  {
    id: 'default-1',
    position: 1,
    label: 'Verificar status da minha OS',
    emoji: '1️⃣',
    handler_type: 'check_os',
    handler_config: { limit: 5 },
    enabled: true,
  },
  {
    id: 'default-2',
    position: 2,
    label: 'Falar com um atendente',
    emoji: '2️⃣',
    handler_type: 'human_handoff',
    handler_config: {},
    enabled: true,
  },
]

// ── Conversa ─────────────────────────────────────────────────

/**
 * Retorna a conversa existente ou cria uma nova para o número.
 * Atualiza o contact_name caso tenha mudado.
 */
export const findOrCreateConversation = async (
  supabase: SupabaseClient,
  companyId: string,
  phoneNumber: string,
  pushName: string | null,
  timeoutMinutes: number,
): Promise<WhatsAppConversation> => {
  const { data: existing } = await supabase
    .from('whatsapp_conversations')
    .select('*')
    .eq('company_id', companyId)
    .eq('phone_number', phoneNumber)
    .maybeSingle<WhatsAppConversation>()

  if (existing) {
    if (pushName && existing.contact_name !== pushName) {
      await supabase
        .from('whatsapp_conversations')
        .update({ contact_name: pushName })
        .eq('id', existing.id)
      return { ...existing, contact_name: pushName }
    }
    return existing
  }

  const { data, error } = await supabase
    .from('whatsapp_conversations')
    .insert({
      company_id: companyId,
      phone_number: phoneNumber,
      contact_name: pushName,
      status: 'bot',
      bot_state: null,
      bot_enabled: true,
      context: {},
      attempts: 0,
      unread_count: 0,
      expires_at: inMinutes(timeoutMinutes),
    })
    .select('*')
    .single<WhatsAppConversation>()

  if (error) throw error
  return data
}

/** Verifica se a sessão do bot expirou (inatividade > TTL). */
export const isSessionExpired = (conversation: WhatsAppConversation) =>
  !!conversation.expires_at && new Date(conversation.expires_at) < new Date()

/** Atualiza campos da conversa. */
export const updateConversation = async (
  supabase: SupabaseClient,
  conversationId: string,
  updates: Partial<
    Pick<
      WhatsAppConversation,
      | 'status'
      | 'bot_state'
      | 'bot_enabled'
      | 'branch_id'
      | 'client_id'
      | 'context'
      | 'attempts'
      | 'assigned_to'
      | 'unread_count'
      | 'last_message_at'
      | 'last_message_preview'
      | 'expires_at'
    >
  >,
) => {
  const { error } = await supabase
    .from('whatsapp_conversations')
    .update(updates)
    .eq('id', conversationId)

  if (error) throw error
}

/** Atualiza preview e contador de não lidas após mensagem recebida. */
export const touchConversation = async (
  supabase: SupabaseClient,
  conversation: WhatsAppConversation,
  messageText: string,
  timeoutMinutes: number,
) => {
  await updateConversation(supabase, conversation.id, {
    unread_count: conversation.unread_count + 1,
    last_message_at: new Date().toISOString(),
    last_message_preview: truncate(messageText, 80),
    expires_at: inMinutes(timeoutMinutes),
  })
}

// ── Mensagens ────────────────────────────────────────────────

export type SaveMessageParams = {
  conversationId: string
  companyId: string
  direction: 'inbound' | 'outbound'
  content: string
  sentByBot: boolean
  senderName?: string | null
  externalId?: string | null
}

export const saveMessage = async (
  supabase: SupabaseClient,
  params: SaveMessageParams,
) => {
  const { error } = await supabase.from('whatsapp_messages').insert({
    conversation_id: params.conversationId,
    company_id: params.companyId,
    direction: params.direction,
    content: params.content,
    sent_by_bot: params.sentByBot,
    sender_name: params.senderName ?? null,
    external_id: params.externalId ?? null,
    status: 'sent',
  })

  if (error) throw error
}

// ── Helpers de normalização de telefone ──────────────────────

const normalizePhone = (phone: string): string => {
  const digits = phone.replace(/\D/g, '')
  return digits.startsWith('55') ? digits.slice(2) : digits
}

const phonesMatch = (a: string, b: string): boolean => {
  const na = normalizePhone(a)
  const nb = normalizePhone(b)
  return na === nb || na.slice(-9) === nb.slice(-9)
}

// ── Cliente ──────────────────────────────────────────────────

/** Busca o cliente pelo telefone normalizado (apenas dígitos). */
export const findClientByPhone = async (
  supabase: SupabaseClient,
  companyId: string,
  phone: string,
): Promise<{ id: string; name: string } | null> => {
  const { data } = await supabase
    .from('clients')
    .select('id, name, phone')
    .eq('company_id', companyId)
    .eq('active', true)
    .is('deleted_at', null)

  if (!data) return null

  const match = data.find((c) => phonesMatch(phone, c.phone ?? ''))

  return match ? { id: match.id, name: match.name } : null
}

// ── Ordens de Serviço ────────────────────────────────────────

const OS_STATUS_LABELS: Record<string, string> = {
  aguardando_atendimento: 'Aguardando atendimento',
  em_analise: 'Em análise',
  aguardando_orcamento: 'Aguardando orçamento',
  aguardando_aprovacao: 'Aguardando aprovação do orçamento',
  aprovado: 'Orçamento aprovado',
  em_manutencao: 'Em manutenção',
  enviado_terceiro: 'Enviado para assistência terceirizada',
  pronto: 'Pronto para retirada',
  entregue: 'Entregue',
  cancelada: 'Cancelada',
}

export const formatOsStatus = (status: string) =>
  OS_STATUS_LABELS[status] ?? status

export const formatOsDate = (isoDate: string) =>
  new Date(isoDate).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

/** Retorna as últimas N ordens de serviço abertas de um cliente. */
export const getClientServiceOrders = async (
  supabase: SupabaseClient,
  companyId: string,
  clientId: string,
  limit = 5,
): Promise<ServiceOrderSummary[]> => {
  const { data } = await supabase
    .from('service_orders')
    .select('id, number, device_type, device_brand, device_model, status, branch_id, created_at')
    .eq('company_id', companyId)
    .eq('client_id', clientId)
    .not('status', 'in', '("entregue","cancelada")')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(limit + 1) // +1 para saber se há mais

  return (data ?? []) as ServiceOrderSummary[]
}

/**
 * Busca uma OS pelo número digitado pelo cliente.
 *
 * Quando `callerPhone` é informado (contato não cadastrado), valida que o
 * telefone do cliente vinculado à OS bate com o número de quem está
 * consultando. Se não bater — ou se a OS não tiver cliente — retorna null,
 * evitando exposição de dados de terceiros por adivinhação de número.
 */
export const getServiceOrderByNumber = async (
  supabase: SupabaseClient,
  companyId: string,
  osNumber: number,
  callerPhone?: string,
): Promise<ServiceOrderSummary | null> => {
  if (callerPhone) {
    const { data } = await supabase
      .from('service_orders')
      .select('id, number, device_type, device_brand, device_model, status, branch_id, created_at, clients(phone)')
      .eq('company_id', companyId)
      .eq('number', osNumber)
      .is('deleted_at', null)
      .maybeSingle()

    if (!data) return null

    const clientPhone = ((data.clients as unknown) as { phone: string | null } | null)?.phone ?? null
    if (!clientPhone || !phonesMatch(callerPhone, clientPhone)) return null

    const summary = { ...(data as Record<string, unknown>) }
    delete summary.clients
    return summary as ServiceOrderSummary
  }

  const { data } = await supabase
    .from('service_orders')
    .select('id, number, device_type, device_brand, device_model, status, branch_id, created_at')
    .eq('company_id', companyId)
    .eq('number', osNumber)
    .is('deleted_at', null)
    .maybeSingle<ServiceOrderSummary>()

  return data ?? null
}

// ── Filiais ──────────────────────────────────────────────────

/** Retorna as filiais ativas da empresa ordenadas por nome. */
export const getBranches = async (
  supabase: SupabaseClient,
  companyId: string,
): Promise<BranchOption[]> => {
  const { data } = await supabase
    .from('branches')
    .select('id, name')
    .eq('company_id', companyId)
    .eq('active', true)
    .is('deleted_at', null)
    .order('name')

  return (data ?? []) as BranchOption[]
}

// ── Menu ─────────────────────────────────────────────────────

/** Retorna os itens de menu da empresa ou o menu padrão. */
export const getMenuItems = async (
  supabase: SupabaseClient,
  companyId: string,
): Promise<MenuItemRecord[]> => {
  const { data } = await supabase
    .from('whatsapp_menu_items')
    .select('id, position, label, emoji, handler_type, handler_config, enabled')
    .eq('company_id', companyId)
    .eq('enabled', true)
    .order('position')

  const items = (data ?? []) as MenuItemRecord[]
  return items.length > 0 ? items : DEFAULT_MENU_ITEMS
}

// ── Notificação de handoff ────────────────────────────────────

/** Cria notificação no sistema quando um contato pede atendimento humano. */
export const createHandoffNotification = async (
  supabase: SupabaseClient,
  companyId: string,
  branchId: string | null,
  contactName: string | null,
  phone: string,
) => {
  const label = contactName ? `${contactName} (${phone})` : phone

  await supabase.from('notifications').insert({
    company_id: companyId,
    branch_id: branchId,
    type: 'whatsapp_atendimento',
    title: 'Novo atendimento no WhatsApp',
    body: `${label} solicita atendimento pelo WhatsApp.`,
  })
}
