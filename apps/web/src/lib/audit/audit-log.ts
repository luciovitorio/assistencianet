import { createClient } from '@/lib/supabase/server'
import type { Json } from '@/lib/supabase/database.types'

type AuditEntityType =
  | 'auth'
  | 'bill'
  | 'branch'
  | 'client'
  | 'company'
  | 'employee'
  | 'part'
  | 'service'
  | 'service_order'
  | 'service_order_estimate'
  | 'stock_movement'
  | 'supplier'
  | 'system'
  | 'third_party'

type AuditAction =
  | 'create'
  | 'delete'
  | 'login'
  | 'logout'
  | 'revoke_access'
  | 'send_invite'
  | 'set_password'
  | 'soft_delete'
  | 'update'

interface AuditActorContext {
  companyId: string | null
  actorUserId: string | null
  actorName: string | null
  actorEmail: string | null
}

interface CreateAuditLogInput {
  action: AuditAction
  entityType: AuditEntityType
  entityId?: string | null
  summary: string
  metadata?: Json
  companyId?: string | null
}

const getActorAuditContext = async (): Promise<AuditActorContext> => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      companyId: null,
      actorUserId: null,
      actorName: null,
      actorEmail: null,
    }
  }

  const { data: company } = await supabase
    .from('companies')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle()

  let companyId = company?.id ?? null

  if (!companyId) {
    const { data: employee } = await supabase
      .from('employees')
      .select('company_id')
      .eq('user_id', user.id)
      .eq('active', true)
      .is('deleted_at', null)
      .maybeSingle()

    companyId = employee?.company_id ?? null
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('name')
    .eq('id', user.id)
    .maybeSingle()

  return {
    companyId,
    actorUserId: user.id,
    actorName: profile?.name ?? (typeof user.user_metadata?.name === 'string' ? user.user_metadata.name : null),
    actorEmail: user.email ?? null,
  }
}

export const createAuditLog = async ({
  action,
  entityType,
  entityId = null,
  summary,
  metadata = {},
  companyId,
}: CreateAuditLogInput) => {
  try {
    const supabase = await createClient()
    const actor = await getActorAuditContext()
    const resolvedCompanyId = companyId ?? actor.companyId

    if (!resolvedCompanyId) {
      return
    }

    const { error } = await supabase
      .from('audit_logs')
      .insert({
        company_id: resolvedCompanyId,
        actor_user_id: actor.actorUserId,
        actor_name: actor.actorName,
        actor_email: actor.actorEmail,
        entity_type: entityType,
        entity_id: entityId,
        action,
        summary,
        metadata,
      })

    if (error) {
      console.error('Erro ao registrar auditoria:', error.message)
    }
  } catch (error) {
    console.error('Erro inesperado ao registrar auditoria:', error)
  }
}
