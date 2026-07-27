'use server'

import { revalidatePath } from 'next/cache'
import { createAuditLog } from '@/lib/audit/audit-log'
import { getAdminContext } from '@/lib/auth/admin-context'
import { createClient } from '@/lib/supabase/server'
import {
  companyProfileSchema,
  type CompanyProfileSchema,
} from '@/lib/validations/company-profile'

export async function saveCompanyProfile(data: CompanyProfileSchema) {
  try {
    const { companyId } = await getAdminContext('configuracoes')
    const parsed = companyProfileSchema.safeParse(data)

    if (!parsed.success) {
      return { error: parsed.error.issues[0].message }
    }

    const supabase = await createClient()
    const { data: previous } = await supabase
      .from('companies')
      .select('name, cnpj, segment, phone, email')
      .eq('id', companyId)
      .maybeSingle()

    const payload = {
      name: parsed.data.name,
      cnpj: parsed.data.cnpj || null,
      segment: parsed.data.segment || null,
      phone: parsed.data.phone || null,
      email: parsed.data.email || null,
    }

    const { error } = await supabase.from('companies').update(payload).eq('id', companyId)

    if (error) {
      throw error
    }

    await createAuditLog({
      action: 'update',
      entityType: 'company',
      entityId: companyId,
      companyId,
      summary: 'Dados da empresa atualizados em Configurações.',
      metadata: { before: previous, after: payload },
    })

    revalidatePath('/dashboard/configuracoes/empresa')
    revalidatePath('/dashboard')

    return { success: true }
  } catch (error: unknown) {
    if (error instanceof Error) {
      return { error: error.message }
    }

    return { error: 'Erro ao salvar dados da empresa.' }
  }
}
