'use server'

import { createClient } from '@/lib/supabase/server'
import { getCompanyContext } from '@/lib/auth/company-context'

export interface Notification {
  id: string
  type:
    | 'estoque_baixo'
    | 'estoque_zerado'
    | 'nova_os'
    | 'retorno_terceiro_vencido'
    | 'cliente_inativo'
    | 'whatsapp_atendimento'
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
 * Deve ser chamada ao carregar o dashboard (sem bloquear o render).
 */
export async function checkThirdPartyOverdueNotifications(): Promise<void> {
  try {
    const supabase = await createClient()
    await supabase.rpc('fn_notify_third_party_overdue')
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
