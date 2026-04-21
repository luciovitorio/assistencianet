'use server'

import { revalidatePath } from 'next/cache'
import { createAuditLog } from '@/lib/audit/audit-log'
import { getAdminContext } from '@/lib/auth/admin-context'
import { createClient } from '@/lib/supabase/server'
import {
  companySettingsSchema,
  type CompanySettingsSchema,
} from '@/lib/validations/company-settings'

const revalidateCompanySettingsPaths = () => {
  revalidatePath('/dashboard/configuracoes')
  revalidatePath('/dashboard/ordens-de-servico')
  revalidatePath('/dashboard/ordens-de-servico/nova')
}

export async function saveCompanySettings(data: CompanySettingsSchema) {
  try {
    const { companyId } = await getAdminContext('configuracoes')
    const parsed = companySettingsSchema.safeParse(data)

    if (!parsed.success) {
      return { error: parsed.error.issues[0].message }
    }

    const supabase = await createClient()
    const { data: previousSettings } = await supabase
      .from('company_settings')
      .select(
        'id, default_warranty_days, default_estimate_validity_days',
      )
      .eq('company_id', companyId)
      .maybeSingle()

    const { data: savedSettings, error } = await supabase
      .from('company_settings')
      .upsert(
        {
          company_id: companyId,
          default_warranty_days: parsed.data.default_warranty_days,
          default_estimate_validity_days: parsed.data.default_estimate_validity_days,
        },
        { onConflict: 'company_id' },
      )
      .select(
        'id, default_warranty_days, default_estimate_validity_days',
      )
      .single()

    if (error) {
      throw error
    }

    await createAuditLog({
      action: previousSettings ? 'update' : 'create',
      entityType: 'company',
      entityId: savedSettings.id,
      companyId,
      summary: 'Configuracoes operacionais da assistencia atualizadas.',
      metadata: {
        before: previousSettings
          ? {
              default_warranty_days: previousSettings.default_warranty_days,
              default_estimate_validity_days:
                previousSettings.default_estimate_validity_days,
            }
          : null,
        after: {
          default_warranty_days: savedSettings.default_warranty_days,
          default_estimate_validity_days:
            savedSettings.default_estimate_validity_days,
        },
      },
    })

    revalidateCompanySettingsPaths()

    return { success: true }
  } catch (error: unknown) {
    if (error instanceof Error) {
      return { error: error.message }
    }

    return { error: 'Erro ao salvar configuracoes.' }
  }
}
