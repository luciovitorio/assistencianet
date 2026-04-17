'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAuditLog } from '@/lib/audit/audit-log'
import { getAdminContext } from '@/lib/auth/admin-context'
import { branchSchema, type BranchSchema } from '@/lib/validations/branch'

const revalidateBranchesPage = () => {
  revalidatePath('/dashboard/filiais')
}

export async function createBranch(data: BranchSchema) {
  try {
    const { companyId } = await getAdminContext('filiais')
    const parsed = branchSchema.safeParse(data)

    if (!parsed.success) {
      return { error: parsed.error.issues[0].message }
    }

    const supabase = await createClient()
    const { data: branch, error } = await supabase
      .from('branches')
      .insert({
        ...parsed.data,
        company_id: companyId,
      })
      .select('id, name, active, is_main')
      .single()

    if (error) {
      throw error
    }

    await createAuditLog({
      action: 'create',
      entityType: 'branch',
      entityId: branch.id,
      companyId,
      summary: `Filial "${branch.name}" cadastrada.`,
      metadata: {
        active: branch.active,
        is_main: branch.is_main,
      },
    })

    revalidateBranchesPage()
    return { success: true }
  } catch (error: unknown) {
    if (error instanceof Error) {
      return { error: error.message }
    }

    return { error: 'Erro ao criar filial' }
  }
}

export async function updateBranch(id: string, data: BranchSchema) {
  try {
    const { companyId } = await getAdminContext('filiais')
    const parsed = branchSchema.safeParse(data)

    if (!parsed.success) {
      return { error: parsed.error.issues[0].message }
    }

    const supabase = await createClient()
    const { data: currentBranch, error: currentBranchError } = await supabase
      .from('branches')
      .select('id, name')
      .eq('id', id)
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .single()

    if (currentBranchError || !currentBranch) {
      throw new Error('Filial não encontrada.')
    }

    const { error } = await supabase
      .from('branches')
      .update(parsed.data)
      .eq('id', id)
      .eq('company_id', companyId)
      .is('deleted_at', null)

    if (error) {
      throw error
    }

    await createAuditLog({
      action: 'update',
      entityType: 'branch',
      entityId: currentBranch.id,
      companyId,
      summary: `Filial "${currentBranch.name}" atualizada.`,
      metadata: {
        active: parsed.data.active,
        city: parsed.data.city,
        state: parsed.data.state,
      },
    })

    revalidateBranchesPage()
    return { success: true }
  } catch (error: unknown) {
    if (error instanceof Error) {
      return { error: error.message }
    }

    return { error: 'Erro ao atualizar filial' }
  }
}

export async function deleteBranch(id: string) {
  try {
    const { companyId, user } = await getAdminContext('filiais')
    const supabase = await createClient()

    const { data: branch, error: branchError } = await supabase
      .from('branches')
      .select('id, name')
      .eq('id', id)
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .single()

    if (branchError || !branch) {
      throw new Error('Filial não encontrada.')
    }

    const { count, error: employeeCountError } = await supabase
      .from('employees')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('branch_id', id)
      .is('deleted_at', null)

    if (employeeCountError) {
      throw employeeCountError
    }

    if ((count ?? 0) > 0) {
      throw new Error('Não é possível excluir uma filial com funcionários vinculados.')
    }

    const deletedAt = new Date().toISOString()
    const { error } = await supabase
      .from('branches')
      .update({
        active: false,
        deleted_at: deletedAt,
        deleted_by: user.id,
      })
      .eq('id', id)
      .eq('company_id', companyId)
      .is('deleted_at', null)

    if (error) {
      throw error
    }

    await createAuditLog({
      action: 'soft_delete',
      entityType: 'branch',
      entityId: branch.id,
      companyId,
      summary: `Filial "${branch.name}" removida da listagem.`,
      metadata: {
        deleted_at: deletedAt,
      },
    })

    revalidateBranchesPage()
    return { success: true }
  } catch (error: unknown) {
    if (error instanceof Error) {
      return { error: error.message }
    }

    return { error: 'Erro ao excluir filial' }
  }
}
