'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAuditLog } from '@/lib/audit/audit-log'
import { empresaSchema, filiaisSchema } from '@/lib/validations/onboarding'

async function ensureOwnerEmployee(params: {
  companyId: string
  userId: string
  mainBranchId: string | null
}) {
  const { companyId, userId, mainBranchId } = params
  const supabase = await createClient()

  const { data: existing } = await supabase
    .from('employees')
    .select('id')
    .eq('company_id', companyId)
    .eq('is_owner', true)
    .is('deleted_at', null)
    .maybeSingle()

  if (existing) {
    if (mainBranchId) {
      await supabase
        .from('employees')
        .update({ branch_id: mainBranchId, user_id: userId, active: true })
        .eq('id', existing.id)
    }
    return
  }

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('name')
    .eq('id', userId)
    .maybeSingle<{ name: string }>()

  const name = profile?.name?.trim() || (user?.user_metadata?.name as string | undefined) || 'Dono'
  const email = user?.email ?? null

  await supabase.from('employees').insert({
    company_id: companyId,
    branch_id: mainBranchId,
    user_id: userId,
    name,
    email,
    role: 'admin',
    active: true,
    is_owner: true,
  })
}

export async function saveEmpresa(_prev: unknown, formData: FormData) {
  const parsed = empresaSchema.safeParse({
    name: formData.get('name'),
    cnpj: formData.get('cnpj') || undefined,
    segment: formData.get('segment') || undefined,
    phone: formData.get('phone') || undefined,
    email: formData.get('email') || undefined,
    owner_operates: formData.get('owner_operates') !== 'false',
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: existing } = await supabase
    .from('companies')
    .select('id')
    .eq('owner_id', user.id)
    .single()

  const payload = { owner_id: user.id, ...parsed.data, onboarding_step: 2 }

  const operation = existing
    ? await supabase.from('companies').update(payload).eq('id', existing.id).select('id').single()
    : await supabase.from('companies').insert(payload).select('id').single()

  if (operation.error) return { error: operation.error.message }

  await createAuditLog({
    action: existing ? 'update' : 'create',
    entityType: 'company',
    entityId: operation.data.id,
    companyId: operation.data.id,
    summary: existing ? 'Dados da empresa atualizados no onboarding.' : 'Empresa criada no onboarding.',
    metadata: {
      onboarding_step: 2,
    },
  })

  redirect('/onboarding/filiais')
}

export async function saveFiliais(_prev: unknown, formData: FormData) {
  const branchCount = parseInt(formData.get('branch_count') as string, 10)
  const rawBranches = Array.from({ length: branchCount }, (_, i) => {
    const street = (formData.get(`branch_street_${i}`) as string) || ''
    const number = (formData.get(`branch_number_${i}`) as string) || ''
    const complement = (formData.get(`branch_complement_${i}`) as string) || ''
    const addressParts = [street, number, complement].filter(Boolean)
    return {
      name: formData.get(`branch_name_${i}`) as string,
      address: addressParts.length ? addressParts.join(', ') : undefined,
      city: (formData.get(`branch_city_${i}`) as string) || undefined,
      state: (formData.get(`branch_state_${i}`) as string) || undefined,
      zip_code: (formData.get(`branch_zip_code_${i}`) as string) || undefined,
      phone: (formData.get(`branch_phone_${i}`) as string) || undefined,
    }
  })

  const parsed = filiaisSchema.safeParse({ branches: rawBranches })
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: company } = await supabase
    .from('companies')
    .select('id, owner_operates')
    .eq('owner_id', user.id)
    .single()

  if (!company) redirect('/onboarding/empresa')

  await supabase
    .from('branches')
    .update({
      active: false,
      deleted_at: new Date().toISOString(),
      deleted_by: user.id,
    })
    .eq('company_id', company.id)
    .is('deleted_at', null)

  const branches = parsed.data.branches.map((b, i) => ({
    company_id: company.id,
    is_main: i === 0,
    ...b,
  }))

  const { data: insertedBranches, error } = await supabase
    .from('branches')
    .insert(branches)
    .select('id, is_main')

  if (error) return { error: error.message }

  if (company.owner_operates) {
    await ensureOwnerEmployee({
      companyId: company.id,
      userId: user.id,
      mainBranchId: insertedBranches?.find((b) => b.is_main)?.id ?? null,
    })
  }

  await supabase
    .from('companies')
    .update({ onboarding_step: 3, onboarding_completed: true })
    .eq('id', company.id)

  await createAuditLog({
    action: 'update',
    entityType: 'company',
    entityId: company.id,
    companyId: company.id,
    summary: 'Filiais configuradas no onboarding.',
    metadata: {
      branch_count: branches.length,
      onboarding_completed: true,
    },
  })

  redirect('/onboarding/conclusao')
}
