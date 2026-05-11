'use server'

import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCompanyContext } from '@/lib/auth/company-context'

const THIRD_PARTY_CHECK_INTERVAL_MS = 60 * 60 * 1000 // 1 hora

export interface Notification {
  id: string
  type:
    | 'estoque_baixo'
    | 'estoque_zerado'
    | 'nova_os'
    | 'retorno_terceiro_vencido'
    | 'cliente_inativo'
    | 'whatsapp_atendimento'
    | 'whatsapp_desconectado'
  title: string
  body: string
  part_id: string | null
  branch_id: string | null
  service_order_id: string | null
  client_id: string | null
  created_at: string
}

export async function getNotifications(): Promise<Notification[]> {
  try {
    const { companyId, isAdmin, currentBranchId } = await getCompanyContext()
    if (!isAdmin && !currentBranchId) return []

    const supabase = await createClient()
    let query = supabase
      .from('notifications')
      .select('id, type, title, body, part_id, branch_id, service_order_id, client_id, created_at')
      .eq('company_id', companyId)
      .is('read_at', null)
      .order('created_at', { ascending: false })
      .limit(50)

    // Não-admin só vê notificações da sua filial (ignora as sem branch)
    if (!isAdmin && currentBranchId) {
      query = query.eq('branch_id', currentBranchId)
    }

    const { data } = await query
    return (data ?? []) as Notification[]
  } catch {
    return []
  }
}

export async function markNotificationAsRead(id: string): Promise<void> {
  const supabase = await createClient()
  await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id)
}

export async function markAllNotificationsAsRead(): Promise<void> {
  try {
    const { companyId } = await getCompanyContext()
    const supabase = await createClient()

    await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('company_id', companyId)
      .is('read_at', null)
  } catch {
    // silently fail — RLS also protects this
  }
}

/**
 * Verifica OS com prazo de retorno de terceiro vencido e cria notificações.
 * Rate-limitada a 1 chamada por hora via cookie.
 */
export async function checkThirdPartyOverdueNotifications(): Promise<void> {
  try {
    const jar = await cookies()
    const lastCheck = jar.get('tp_overdue_last_check')?.value
    if (lastCheck && Date.now() - Number(lastCheck) < THIRD_PARTY_CHECK_INTERVAL_MS) return

    const supabase = await createClient()
    await supabase.rpc('fn_notify_third_party_overdue')

    jar.set('tp_overdue_last_check', String(Date.now()), {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 3600,
      path: '/',
    })
  } catch {
    // Falha silenciosa — não impacta o carregamento do dashboard
  }
}

/**
 * Verifica clientes sem retorno há mais de `months` meses e cria notificações.
 * Deve ser chamada ao carregar o dashboard (sem bloquear o render).
 */
export async function checkInactiveClientNotifications(months = 3): Promise<void> {
  try {
    const supabase = await createClient()
    await supabase.rpc('fn_notify_inactive_clients', { p_months: months })
  } catch {
    // Falha silenciosa — não impacta o carregamento do dashboard
  }
}

/**
 * Cria ou limpa a notificação de saúde da Evolution API.
 * Usa admin client — pode ser chamada de qualquer server action com companyId.
 */
export async function upsertEvolutionHealthNotification(
  companyId: string,
  isOk: boolean,
  body: string,
): Promise<void> {
  const supabase = createAdminClient()

  if (!isOk) {
    const { count } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('type', 'whatsapp_desconectado')
      .is('read_at', null)

    if (!count) {
      await supabase.from('notifications').insert({
        company_id: companyId,
        type: 'whatsapp_desconectado',
        title: 'WhatsApp desconectado',
        body,
      })
    }
  } else {
    await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('company_id', companyId)
      .eq('type', 'whatsapp_desconectado')
      .is('read_at', null)
  }
}

/**
 * Verifica a saúde da conexão Evolution (conexão + webhook) e cria/limpa notificação.
 * Rate-limitada a 1 chamada por 10 minutos. Deve ser chamada fire-and-forget.
 */
export async function checkEvolutionConnectionNotifications(): Promise<void> {
  try {
    const { companyId, isAdmin } = await getCompanyContext()
    if (!isAdmin) return

    const supabase = await createClient()

    const { data: settings } = await supabase
      .from('whatsapp_automation_settings')
      .select(
        'id, evolution_base_url, evolution_api_key, evolution_instance_name, evolution_health_checked_at',
      )
      .eq('company_id', companyId)
      .eq('provider', 'evolution_api')
      .eq('enabled', true)
      .maybeSingle()

    if (!settings?.evolution_api_key || !settings.evolution_instance_name) return

    // Rate limit: pula se verificado há menos de 10 minutos
    if (settings.evolution_health_checked_at) {
      const minutesSince =
        (Date.now() - new Date(settings.evolution_health_checked_at).getTime()) / 60_000
      if (minutesSince < 10) return
    }

    // Atualiza timestamp antes de chamar a API externa
    await supabase
      .from('whatsapp_automation_settings')
      .update({ evolution_health_checked_at: new Date().toISOString() })
      .eq('id', settings.id)

    const { createEvolutionApiClient } = await import('@/lib/whatsapp/evolution-client')
    const client = createEvolutionApiClient({
      baseUrl: settings.evolution_base_url,
      apiKey: settings.evolution_api_key,
      instanceName: settings.evolution_instance_name,
    })

    const [connection, webhook] = await Promise.all([
      client.getConnectionState().catch(() => null),
      client.getWebhook().catch(() => ({ enabled: false, url: null })),
    ])

    const isConnected = connection?.state === 'open'
    const expectedUrl = process.env.APP_BASE_URL
      ? `${process.env.APP_BASE_URL.replace(/\/+$/, '')}/api/webhooks/evolution`
      : null
    const webhookOk =
      webhook.enabled && !!webhook.url && (!expectedUrl || webhook.url === expectedUrl)
    const isOk = isConnected && webhookOk

    const body = !isConnected
      ? 'O WhatsApp foi desconectado. Acesse Configurações → Automação para reconectar.'
      : 'Webhook desconfigurado — mensagens não chegam ao bot. Clique em "Registrar webhook".'

    await upsertEvolutionHealthNotification(companyId, isOk, body)
  } catch {
    // Falha silenciosa — não impacta o carregamento do dashboard
  }
}
