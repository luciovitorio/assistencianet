'use server'

import { revalidatePath } from 'next/cache'
import { getCompanyContext } from '@/lib/auth/company-context'
import { createAdminClient } from '@/lib/supabase/admin'
import { firstRelation } from '@/lib/supabase/relations'
import { createClient } from '@/lib/supabase/server'
import { createEvolutionApiClient } from '@/lib/whatsapp/evolution-client'

// ── Tipos exportados ─────────────────────────────────────────

export type ConversationRow = {
  id: string
  phone_number: string
  contact_name: string | null
  status: 'bot' | 'waiting' | 'in_progress' | 'resolved'
  bot_state: string | null
  bot_enabled: boolean
  unread_count: number
  last_message_at: string | null
  last_message_preview: string | null
  branch_id: string | null
  client_id: string | null
  assigned_to: string | null
  created_at: string
  branches: { name: string } | null
  clients: { name: string } | null
}

export type MessageRow = {
  id: string
  conversation_id: string
  direction: 'inbound' | 'outbound'
  content: string
  sent_by_bot: boolean
  sender_name: string | null
  created_at: string
}

type RelationValue<T> = T | T[] | null

type ConversationQueryRow = Omit<ConversationRow, 'branches' | 'clients'> & {
  branches: RelationValue<{ name: string }>
  clients: RelationValue<{ name: string }>
}

// ── Helpers ───────────────────────────────────────────────────

const getEvolutionClient = async (companyId: string) => {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('whatsapp_automation_settings')
    .select('evolution_base_url, evolution_api_key, evolution_instance_name')
    .eq('company_id', companyId)
    .eq('enabled', true)
    .eq('provider', 'evolution_api')
    .maybeSingle<{
      evolution_base_url: string
      evolution_api_key: string | null
      evolution_instance_name: string | null
    }>()

  if (!data?.evolution_api_key || !data.evolution_instance_name) return null

  return createEvolutionApiClient({
    baseUrl: data.evolution_base_url,
    apiKey: data.evolution_api_key,
    instanceName: data.evolution_instance_name,
  })
}

// ── Conversas ────────────────────────────────────────────────

export type ConversationFilters = {
  status?: string
  branchId?: string
  search?: string
}

export async function getConversations(
  filters: ConversationFilters = {},
): Promise<ConversationRow[]> {
  try {
    const { companyId } = await getCompanyContext()
    const supabase = await createClient()

    let query = supabase
      .from('whatsapp_conversations')
      .select(
        `id, phone_number, contact_name, status, bot_state, bot_enabled,
         unread_count, last_message_at, last_message_preview,
         branch_id, client_id, assigned_to, created_at,
         branches(name), clients(name)`,
      )
      .eq('company_id', companyId)
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .limit(100)

    if (filters.status) query = query.eq('status', filters.status)
    if (filters.branchId) query = query.eq('branch_id', filters.branchId)

    const { data } = await query
    let rows = ((data ?? []) as ConversationQueryRow[]).map((row) => ({
      ...row,
      branches: firstRelation(row.branches),
      clients: firstRelation(row.clients),
    }))

    if (filters.search) {
      const term = filters.search.toLowerCase()
      rows = rows.filter(
        (c) =>
          c.contact_name?.toLowerCase().includes(term) ||
          c.phone_number.includes(term) ||
          c.clients?.name?.toLowerCase().includes(term),
      )
    }

    return rows
  } catch {
    return []
  }
}

export async function getWaitingConversationsCount(): Promise<number> {
  try {
    const { companyId } = await getCompanyContext()
    const supabase = await createClient()
    const { count } = await supabase
      .from('whatsapp_conversations')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('status', 'waiting')
    return count ?? 0
  } catch {
    return 0
  }
}

// ── Mensagens ────────────────────────────────────────────────

export async function getConversationMessages(
  conversationId: string,
): Promise<MessageRow[]> {
  try {
    const { companyId } = await getCompanyContext()
    const supabase = await createClient()

    const { data } = await supabase
      .from('whatsapp_messages')
      .select('id, conversation_id, direction, content, sent_by_bot, sender_name, created_at')
      .eq('conversation_id', conversationId)
      .eq('company_id', companyId)
      .order('created_at', { ascending: true })
      .limit(100)

    return (data ?? []) as MessageRow[]
  } catch {
    return []
  }
}

// ── Enviar resposta ───────────────────────────────────────────

export async function sendAtendimentoReply(
  conversationId: string,
  text: string,
): Promise<{ message?: MessageRow; error?: string }> {
  try {
    const { companyId, user } = await getCompanyContext()
    const supabase = await createClient()
    const adminSupabase = createAdminClient()

    const { data: employee } = await supabase
      .from('employees')
      .select('name')
      .eq('user_id', user.id)
      .maybeSingle<{ name: string }>()
    const senderName = employee?.name ?? 'Atendente'

    // Busca conversa
    const { data: conversation } = await supabase
      .from('whatsapp_conversations')
      .select('id, phone_number, status')
      .eq('id', conversationId)
      .eq('company_id', companyId)
      .maybeSingle<{ id: string; phone_number: string; status: string }>()

    if (!conversation) return { error: 'Conversa não encontrada.' }

    // Envia via Evolution API
    const evolutionClient = await getEvolutionClient(companyId)
    if (!evolutionClient) {
      return { error: 'WhatsApp não está configurado para esta empresa.' }
    }

    await evolutionClient.sendText({ number: conversation.phone_number, text })

    // Salva mensagem no banco
    const { data: saved, error } = await adminSupabase
      .from('whatsapp_messages')
      .insert({
        conversation_id: conversationId,
        company_id: companyId,
        direction: 'outbound',
        content: text,
        sent_by_bot: false,
        sender_name: senderName,
        status: 'sent',
      })
      .select('id, conversation_id, direction, content, sent_by_bot, sender_name, created_at')
      .single<MessageRow>()

    if (error) throw error

    // Atualiza preview da conversa e status se estava waiting
    const updates: Record<string, unknown> = {
      last_message_at: new Date().toISOString(),
      last_message_preview: text.length > 80 ? `${text.slice(0, 79)}…` : text,
    }
    if (conversation.status === 'waiting') {
      updates.status = 'in_progress'
      updates.bot_enabled = false
    }

    await adminSupabase
      .from('whatsapp_conversations')
      .update(updates)
      .eq('id', conversationId)

    return { message: saved }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao enviar mensagem.'
    return { error: msg }
  }
}

// ── Ações de status ───────────────────────────────────────────

export async function assumeConversation(
  conversationId: string,
): Promise<{ error?: string }> {
  try {
    const { companyId } = await getCompanyContext()
    const supabase = await createClient()

    await supabase
      .from('whatsapp_conversations')
      .update({ status: 'in_progress', bot_enabled: false })
      .eq('id', conversationId)
      .eq('company_id', companyId)

    revalidatePath('/dashboard/atendimento')
    return {}
  } catch {
    return { error: 'Erro ao assumir conversa.' }
  }
}

export async function resolveConversation(
  conversationId: string,
): Promise<{ error?: string }> {
  try {
    const { companyId } = await getCompanyContext()
    const supabase = await createClient()

    await supabase
      .from('whatsapp_conversations')
      .update({
        status: 'resolved',
        bot_enabled: true,
        bot_state: null,
        attempts: 0,
      })
      .eq('id', conversationId)
      .eq('company_id', companyId)

    revalidatePath('/dashboard/atendimento')
    return {}
  } catch {
    return { error: 'Erro ao resolver conversa.' }
  }
}

export async function reopenConversation(
  conversationId: string,
): Promise<{ error?: string }> {
  try {
    const { companyId } = await getCompanyContext()
    const supabase = await createClient()

    await supabase
      .from('whatsapp_conversations')
      .update({
        status: 'bot',
        bot_enabled: true,
        bot_state: null,
        context: {},
        attempts: 0,
      })
      .eq('id', conversationId)
      .eq('company_id', companyId)

    revalidatePath('/dashboard/atendimento')
    return {}
  } catch {
    return { error: 'Erro ao reabrir conversa.' }
  }
}

export async function toggleBotEnabled(
  conversationId: string,
  enabled: boolean,
): Promise<{ error?: string }> {
  try {
    const { companyId } = await getCompanyContext()
    const supabase = await createClient()

    const updates = enabled
      ? {
          bot_enabled: true,
          status: 'bot' as const,
          bot_state: null,
          attempts: 0,
        }
      : { bot_enabled: false, status: 'in_progress' as const }

    await supabase
      .from('whatsapp_conversations')
      .update(updates)
      .eq('id', conversationId)
      .eq('company_id', companyId)

    revalidatePath('/dashboard/atendimento')
    return {}
  } catch {
    return { error: 'Erro ao alterar bot.' }
  }
}

export async function markConversationRead(
  conversationId: string,
): Promise<void> {
  try {
    const { companyId } = await getCompanyContext()
    const supabase = await createClient()

    await supabase
      .from('whatsapp_conversations')
      .update({ unread_count: 0 })
      .eq('id', conversationId)
      .eq('company_id', companyId)
  } catch {
    // Silencioso — não crítico
  }
}

export async function deleteConversation(
  conversationId: string,
): Promise<{ error?: string }> {
  try {
    const { companyId } = await getCompanyContext()
    const supabase = createAdminClient()

    const { data: conversation, error: conversationError } = await supabase
      .from('whatsapp_conversations')
      .select('id')
      .eq('id', conversationId)
      .eq('company_id', companyId)
      .maybeSingle<{ id: string }>()

    if (conversationError) throw conversationError
    if (!conversation) return { error: 'Conversa não encontrada.' }

    const { error } = await supabase
      .from('whatsapp_conversations')
      .delete()
      .eq('id', conversationId)
      .eq('company_id', companyId)

    if (error) throw error

    revalidatePath('/dashboard/atendimento')
    return {}
  } catch {
    return { error: 'Erro ao excluir conversa.' }
  }
}
