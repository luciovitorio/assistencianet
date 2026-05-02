'use server'

import { revalidatePath } from 'next/cache'
import { getAdminContext } from '@/lib/auth/admin-context'
import { assertBillingFeature } from '@/lib/billing/entitlements'
import { createClient } from '@/lib/supabase/server'
import { mergeBotMessages, type BotMessages } from '@/lib/whatsapp/bot-messages'

const REVALIDATE = () => revalidatePath('/dashboard/configuracoes/bot')

async function getBotContext() {
  const { companyId } = await getAdminContext('configuracoes')
  const supabase = await createClient()
  await assertBillingFeature(supabase, companyId, 'whatsapp_bot')
  return { companyId, supabase }
}

/** Retorna as mensagens configuradas, mescladas com os defaults. */
export async function getBotMessages(): Promise<
  { data: BotMessages } | { error: string }
> {
  try {
    const { companyId, supabase } = await getBotContext()

    const { data, error } = await supabase
      .from('whatsapp_automation_settings')
      .select('bot_messages')
      .eq('company_id', companyId)
      .maybeSingle<{ bot_messages: unknown }>()

    if (error) throw error

    return { data: mergeBotMessages(data?.bot_messages ?? {}) }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao buscar mensagens do bot.' }
  }
}

/** Salva as mensagens do bot (sobrescreve apenas os campos fornecidos). */
export async function saveBotMessages(
  messages: Partial<BotMessages>
): Promise<{ success: true } | { error: string }> {
  try {
    const { companyId, supabase } = await getBotContext()

    const { error } = await supabase
      .from('whatsapp_automation_settings')
      .update({ bot_messages: messages })
      .eq('company_id', companyId)

    if (error) throw error

    REVALIDATE()
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao salvar mensagens do bot.' }
  }
}
