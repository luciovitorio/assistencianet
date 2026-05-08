'use server'

import { createClient } from '@/lib/supabase/server'
import { getAdminContext } from '@/lib/auth/admin-context'
import {
  botTriggersSchema,
  type BotTriggersSchema,
} from '@/lib/validations/bot-triggers'

export type { BotTriggersSchema } from '@/lib/validations/bot-triggers'

// ── Tipo retornado pelo GET ───────────────────────────────────

export type BotTriggerSettings = BotTriggersSchema & {
  provider: 'evolution_api' | 'whatsapp_cloud_api'
  configured: boolean
}

// ── Actions ──────────────────────────────────────────────────

export async function getBotTriggerSettings(): Promise<
  { data: BotTriggerSettings } | { error: string }
> {
  try {
    const { companyId } = await getAdminContext('configuracoes')
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('whatsapp_automation_settings')
      .select(
        `provider, enabled,
         notify_inbound_message, notify_os_created, notify_estimate_ready,
         notify_service_completed, notify_satisfaction_survey,
         message_os_created, message_estimate_ready, message_service_completed, message_satisfaction_survey,
         template_os_created, template_estimate_ready, template_service_completed, template_satisfaction_survey`,
      )
      .eq('company_id', companyId)
      .maybeSingle()

    if (error) throw error

    return {
      data: {
        provider: (data?.provider as BotTriggerSettings['provider']) ?? 'evolution_api',
        configured: !!data?.enabled,
        notify_inbound_message: data?.notify_inbound_message ?? false,
        notify_os_created: data?.notify_os_created ?? false,
        message_os_created: data?.message_os_created ?? null,
        template_os_created: data?.template_os_created ?? null,
        notify_estimate_ready: data?.notify_estimate_ready ?? false,
        message_estimate_ready: data?.message_estimate_ready ?? null,
        template_estimate_ready: data?.template_estimate_ready ?? null,
        notify_service_completed: data?.notify_service_completed ?? false,
        message_service_completed: data?.message_service_completed ?? null,
        template_service_completed: data?.template_service_completed ?? null,
        notify_satisfaction_survey: data?.notify_satisfaction_survey ?? false,
        message_satisfaction_survey: data?.message_satisfaction_survey ?? null,
        template_satisfaction_survey: data?.template_satisfaction_survey ?? null,
      },
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao carregar gatilhos.' }
  }
}

export async function saveBotTriggers(
  input: BotTriggersSchema,
): Promise<{ success: true } | { error: string }> {
  try {
    const { companyId } = await getAdminContext('configuracoes')
    const parsed = botTriggersSchema.safeParse(input)
    if (!parsed.success) return { error: parsed.error.issues[0].message }

    const supabase = await createClient()
    const norm = (v: string | null) => (v && v.trim().length > 0 ? v.trim() : null)
    const d = parsed.data
    const { error } = await supabase
      .from('whatsapp_automation_settings')
      .update({
        notify_inbound_message: d.notify_inbound_message,
        notify_os_created: d.notify_os_created,
        message_os_created: norm(d.message_os_created),
        template_os_created: norm(d.template_os_created),
        notify_estimate_ready: d.notify_estimate_ready,
        message_estimate_ready: norm(d.message_estimate_ready),
        template_estimate_ready: norm(d.template_estimate_ready),
        notify_service_completed: d.notify_service_completed,
        message_service_completed: norm(d.message_service_completed),
        template_service_completed: norm(d.template_service_completed),
        notify_satisfaction_survey: d.notify_satisfaction_survey,
        message_satisfaction_survey: norm(d.message_satisfaction_survey),
        template_satisfaction_survey: norm(d.template_satisfaction_survey),
      })
      .eq('company_id', companyId)

    if (error) throw error
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao salvar gatilhos.' }
  }
}
