'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createAuditLog } from '@/lib/audit/audit-log'
import { PASSWORD_MIN_LENGTH } from '@/lib/validations/auth'

type UpdatePasswordResult = {
  error?: string
  field?: 'password'
}

function translatePasswordUpdateError(message: string): UpdatePasswordResult {
  if (message.includes('Password should be at least')) {
    return {
      error: `A senha deve ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres.`,
      field: 'password',
    }
  }

  if (message.includes('weak_password') || message.toLowerCase().includes('weak password')) {
    return {
      error: `Senha muito fraca. Use pelo menos ${PASSWORD_MIN_LENGTH} caracteres e combine letras, números e símbolos.`,
      field: 'password',
    }
  }

  if (message.includes('same_password') || message.toLowerCase().includes('same password')) {
    return {
      error: 'A nova senha deve ser diferente da senha provisoria.',
      field: 'password',
    }
  }

  return { error: 'Erro ao alterar a senha. Tente novamente.' }
}

export async function updatePasswordOnFirstLogin(password: string): Promise<UpdatePasswordResult> {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return {
      error: `A senha deve ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres.`,
      field: 'password',
    }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Não autenticado' }
  if (!user.app_metadata?.force_password_change) {
    return { error: 'Troca de senha não necessária para este usuário.' }
  }

  const { error: updatePasswordError } = await supabase.auth.updateUser({ password })
  if (updatePasswordError) {
    return translatePasswordUpdateError(updatePasswordError.message)
  }

  const admin = createAdminClient()
  const { error } = await admin.auth.admin.updateUserById(user.id, {
    app_metadata: { ...user.app_metadata, force_password_change: false },
  })

  if (error) {
    return { error: 'Erro ao liberar acesso. Contate o administrador.' }
  }

  await createAuditLog({
    action: 'set_password',
    entityType: 'auth',
    entityId: user.id,
    summary: 'Senha redefinida no primeiro acesso.',
  })

  return {}
}
