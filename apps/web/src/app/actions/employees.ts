'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createAuditLog } from '@/lib/audit/audit-log'
import { getAdminContext } from '@/lib/auth/admin-context'
import { employeeSchema, type EmployeeSchema, type EmployeeValues } from '@/lib/validations/employee'
import { PASSWORD_MIN_LENGTH } from '@/lib/validations/auth'

const DUPLICATE_EMPLOYEE_EMAIL_ERROR = 'Este e-mail já está cadastrado no sistema.'
const EMPLOYEES_ACTIVE_EMAIL_UNIQUE_INDEX = 'employees_active_email_unique_idx'

const normalizeEmail = (email: string | null | undefined) => {
  const normalized = email?.trim().toLowerCase()
  return normalized ? normalized : null
}

const findAuthUserByEmail = async (email: string) => {
  const admin = createAdminClient()
  const perPage = 200
  let page = 1

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage })

    if (error) {
      throw error
    }

    const existingUser = data.users.find((user) => normalizeEmail(user.email) === email)
    if (existingUser) {
      return existingUser
    }

    if (data.users.length < perPage) {
      return null
    }

    page += 1
  }
}

const ensureEmployeeEmailIsAvailable = async (
  email: string | null,
  options?: {
    excludeEmployeeId?: string
    allowAuthUserId?: string | null
  },
) => {
  if (!email) {
    return
  }

  const supabase = await createClient()
  let existingEmployeeQuery = supabase
    .from('employees')
    .select('id')
    .ilike('email', email)
    .is('deleted_at', null)
    .limit(1)

  if (options?.excludeEmployeeId) {
    existingEmployeeQuery = existingEmployeeQuery.neq('id', options.excludeEmployeeId)
  }

  const { data: existingEmployee, error: existingEmployeeError } = await existingEmployeeQuery.maybeSingle()
  if (existingEmployeeError) {
    throw existingEmployeeError
  }

  if (existingEmployee) {
    throw new Error(DUPLICATE_EMPLOYEE_EMAIL_ERROR)
  }

  const existingAuthUser = await findAuthUserByEmail(email)
  if (existingAuthUser && existingAuthUser.id !== options?.allowAuthUserId) {
    throw new Error(DUPLICATE_EMPLOYEE_EMAIL_ERROR)
  }
}

const revalidateEmployeesPage = () => {
  revalidatePath('/dashboard/funcionarios')
}

const isDuplicateEmployeeEmailError = (error: unknown) =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  error.code === '23505' &&
  'message' in error &&
  typeof error.message === 'string' &&
  error.message.includes(EMPLOYEES_ACTIVE_EMAIL_UNIQUE_INDEX)

const getActionErrorMessage = (error: unknown, fallback: string) => {
  if (isDuplicateEmployeeEmailError(error)) {
    return DUPLICATE_EMPLOYEE_EMAIL_ERROR
  }

  if (error instanceof Error) {
    return error.message
  }

  return fallback
}

const isAuthUserMissingError = (error: unknown) =>
  typeof error === 'object' &&
  error !== null &&
  'message' in error &&
  typeof error.message === 'string' &&
  error.message.toLowerCase().includes('not found')

export async function createEmployee(data: EmployeeSchema | EmployeeValues) {
  try {
    const { companyId } = await getAdminContext('funcionarios')
    const parsed = employeeSchema.safeParse(data)

    if (!parsed.success) {
      return { error: parsed.error.issues[0].message }
    }

    const email = normalizeEmail(parsed.data.email)
    const { ...rest } = parsed.data
    const supabase = await createClient()

    await ensureEmployeeEmailIsAvailable(email)

    const { data: createdEmployee, error } = await supabase
      .from('employees')
      .insert({
        ...rest,
        email: email || null,
        company_id: companyId,
      })
      .select('id, name, role, branch_id, active')
      .single()

    if (error) {
      throw error
    }

    await createAuditLog({
      action: 'create',
      entityType: 'employee',
      entityId: createdEmployee.id,
      companyId,
      summary: `Funcionário "${createdEmployee.name}" cadastrado.`,
      metadata: {
        role: createdEmployee.role,
        branch_id: createdEmployee.branch_id,
        active: createdEmployee.active,
      },
    })

    revalidateEmployeesPage()
    return { success: true }
  } catch (error: unknown) {
    return { error: getActionErrorMessage(error, 'Erro ao cadastrar funcionário') }
  }
}

export async function updateEmployee(id: string, data: EmployeeSchema | EmployeeValues) {
  try {
    const { companyId } = await getAdminContext('funcionarios')
    const parsed = employeeSchema.safeParse(data)

    if (!parsed.success) {
      return { error: parsed.error.issues[0].message }
    }

    const email = normalizeEmail(parsed.data.email)
    const { ...rest } = parsed.data
    const supabase = await createClient()

    const { data: currentEmployee, error: currentEmployeeError } = await supabase
      .from('employees')
      .select('id, name, user_id, active, is_owner')
      .eq('id', id)
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .single()

    if (currentEmployeeError || !currentEmployee) {
      throw new Error('Funcionário não encontrado.')
    }

    if (currentEmployee.is_owner) {
      throw new Error('Este registro é do dono da empresa e deve ser gerenciado em Configurações.')
    }

    await ensureEmployeeEmailIsAvailable(email, {
      excludeEmployeeId: id,
      allowAuthUserId: currentEmployee.user_id,
    })

    const shouldRevokeAccess = Boolean(currentEmployee.user_id && !parsed.data.active)
    const { error } = await supabase
      .from('employees')
      .update({
        ...rest,
        email: email || null,
        ...(shouldRevokeAccess ? { user_id: null } : {}),
      })
      .eq('id', id)
      .eq('company_id', companyId)
      .is('deleted_at', null)

    if (error) {
      throw error
    }

    let accessRevoked = false

    if (currentEmployee.user_id) {
      const admin = createAdminClient()

      if (shouldRevokeAccess) {
        const { error: deleteAuthError } = await admin.auth.admin.deleteUser(currentEmployee.user_id)

        if (deleteAuthError && !isAuthUserMissingError(deleteAuthError)) {
          console.error(
            'Erro ao revogar acesso de funcionário inativo:',
            deleteAuthError.message,
          )
        } else {
          accessRevoked = true
        }
      } else {
        const { data: authUser, error: getAuthError } = await admin.auth.admin.getUserById(currentEmployee.user_id)

        if (getAuthError && !isAuthUserMissingError(getAuthError)) {
          throw getAuthError
        }

        if (authUser?.user) {
          const { error: updateAuthError } = await admin.auth.admin.updateUserById(currentEmployee.user_id, {
            app_metadata: {
              ...authUser.user.app_metadata,
              role: parsed.data.role,
              company_id: companyId,
            },
          })

          if (updateAuthError) {
            throw updateAuthError
          }
        }
      }
    }

    await createAuditLog({
      action: 'update',
      entityType: 'employee',
      entityId: id,
      companyId,
      summary: `Funcionário "${currentEmployee.name}" atualizado.`,
      metadata: {
        role: parsed.data.role,
        branch_id: parsed.data.branch_id,
        active: parsed.data.active,
        email: email,
        access_revoked: accessRevoked,
      },
    })

    revalidateEmployeesPage()
    return { success: true }
  } catch (error: unknown) {
    return { error: getActionErrorMessage(error, 'Erro ao atualizar funcionário') }
  }
}

export async function deleteEmployee(id: string) {
  try {
    const { companyId, user } = await getAdminContext('funcionarios')
    const supabase = await createClient()
    const admin = createAdminClient()

    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select('id, name, user_id, active, is_owner')
      .eq('id', id)
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .single()

    if (employeeError || !employee) {
      throw new Error('Funcionário não encontrado.')
    }

    if (employee.is_owner) {
      throw new Error('Não é possível excluir o registro do dono da empresa.')
    }

    const deletedAt = new Date().toISOString()
    const { error } = await supabase
      .from('employees')
      .update({
        active: false,
        deleted_at: deletedAt,
        deleted_by: user.id,
        user_id: null,
      })
      .eq('id', id)
      .eq('company_id', companyId)
      .is('deleted_at', null)

    if (error) {
      throw error
    }

    if (employee.user_id) {
      const { error: deleteAuthError } = await admin.auth.admin.deleteUser(employee.user_id)

      if (deleteAuthError && !isAuthUserMissingError(deleteAuthError)) {
        const { error: rollbackError } = await supabase
          .from('employees')
          .update({
            active: employee.active,
            deleted_at: null,
            deleted_by: null,
            user_id: employee.user_id,
          })
          .eq('id', id)
          .eq('company_id', companyId)

        if (rollbackError) {
          console.error(
            'Erro ao reverter soft delete após falha ao revogar acesso do funcionário:',
            rollbackError.message,
          )
        }

        throw deleteAuthError
      }
    }

    await createAuditLog({
      action: 'soft_delete',
      entityType: 'employee',
      entityId: employee.id,
      companyId,
      summary: `Funcionário "${employee.name}" removido da listagem.`,
      metadata: {
        deleted_at: deletedAt,
        had_access: Boolean(employee.user_id),
        access_revoked: Boolean(employee.user_id),
      },
    })

    revalidateEmployeesPage()
    return { success: true }
  } catch (error: unknown) {
    if (error instanceof Error) {
      return { error: error.message }
    }

    return { error: 'Erro ao excluir funcionário' }
  }
}

export async function inviteEmployee(employeeId: string) {
  try {
    const { companyId } = await getAdminContext('funcionarios')
    const supabase = await createClient()
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select('id, name, email, role, user_id, company_id, is_owner')
      .eq('id', employeeId)
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .single()

    if (employeeError || !employee) {
      throw new Error('Funcionário não encontrado.')
    }

    if (employee.is_owner) {
      throw new Error('O dono da empresa já tem acesso próprio — não precisa de convite.')
    }

    if (!employee.email) {
      throw new Error('O funcionário não tem e-mail cadastrado.')
    }

    if (employee.user_id) {
      throw new Error('Este funcionário já possui acesso ao sistema.')
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3001'
    const admin = createAdminClient()
    const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(
      employee.email,
      { redirectTo: `${siteUrl}/auth/callback` },
    )

    if (inviteError) {
      const message = inviteError.message

      if (message.includes('already been registered') || message.includes('already registered')) {
        throw new Error('Este e-mail já possui uma conta no sistema. Use "Definir acesso" para vincular manualmente.')
      }

      throw new Error('Erro ao enviar convite. Verifique o e-mail e tente novamente.')
    }

    await admin.auth.admin.updateUserById(invited.user.id, {
      app_metadata: { role: employee.role, company_id: employee.company_id },
    })

    const { error: updateError } = await supabase
      .from('employees')
      .update({ user_id: invited.user.id })
      .eq('id', employee.id)
      .is('deleted_at', null)

    if (updateError) {
      const { error: rollbackError } = await admin.auth.admin.deleteUser(invited.user.id)
      if (rollbackError) {
        console.error('Erro ao reverter usuário convidado após falha no vínculo do funcionário:', rollbackError.message)
      }
      throw updateError
    }

    await createAuditLog({
      action: 'send_invite',
      entityType: 'employee',
      entityId: employee.id,
      companyId,
      summary: `Convite enviado para "${employee.name}".`,
      metadata: {
        email: employee.email,
        role: employee.role,
      },
    })

    revalidateEmployeesPage()
    return { success: true }
  } catch (error: unknown) {
    return { error: getActionErrorMessage(error, 'Erro ao enviar convite') }
  }
}

export async function revokeEmployeeAccess(employeeId: string) {
  try {
    const { companyId } = await getAdminContext('funcionarios')
    const supabase = await createClient()
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select('id, name, user_id, is_owner')
      .eq('id', employeeId)
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .single()

    if (employeeError || !employee) {
      throw new Error('Funcionário não encontrado.')
    }

    if (employee.is_owner) {
      throw new Error('Não é possível revogar o acesso do dono da empresa.')
    }

    if (!employee.user_id) {
      throw new Error('Este funcionário não possui acesso ao sistema.')
    }

    const admin = createAdminClient()
    const { error: deleteError } = await admin.auth.admin.deleteUser(employee.user_id)
    if (deleteError) {
      throw deleteError
    }

    const { error: updateError } = await supabase
      .from('employees')
      .update({ user_id: null })
      .eq('id', employee.id)
      .is('deleted_at', null)

    if (updateError) {
      throw updateError
    }

    await createAuditLog({
      action: 'revoke_access',
      entityType: 'employee',
      entityId: employee.id,
      companyId,
      summary: `Acesso revogado para "${employee.name}".`,
    })

    revalidateEmployeesPage()
    return { success: true }
  } catch (error: unknown) {
    return { error: getActionErrorMessage(error, 'Erro ao revogar acesso') }
  }
}

export async function createEmployeeDirectAccess(
  employeeId: string,
  email: string,
  password: string,
) {
  try {
    if (password.length < PASSWORD_MIN_LENGTH) {
      throw new Error(`A senha provisória deve ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres.`)
    }

    const { companyId } = await getAdminContext('funcionarios')
    const supabase = await createClient()
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select('id, name, role, company_id, user_id, is_owner')
      .eq('id', employeeId)
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .single()

    if (employeeError || !employee) {
      throw new Error('Funcionário não encontrado.')
    }

    if (employee.is_owner) {
      throw new Error('O dono da empresa já tem acesso próprio.')
    }

    if (employee.user_id) {
      throw new Error('Este funcionário já possui acesso ao sistema.')
    }

    const normalizedEmail = normalizeEmail(email)
    if (!normalizedEmail) {
      throw new Error('Informe um e-mail válido.')
    }

    await ensureEmployeeEmailIsAvailable(normalizedEmail, { excludeEmployeeId: employee.id })

    const admin = createAdminClient()
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      app_metadata: {
        role: employee.role,
        company_id: employee.company_id,
        force_password_change: true,
      },
    })

    if (createError) {
      if (createError.message.includes('Password should be at least')) {
        throw new Error(`A senha provisória deve ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres.`)
      }

      if (createError.message.includes('weak_password') || createError.message.toLowerCase().includes('weak password')) {
        throw new Error(`Senha provisória muito fraca. Use pelo menos ${PASSWORD_MIN_LENGTH} caracteres e combine letras, números e símbolos.`)
      }

      if (createError.message.includes('already been registered') || createError.message.includes('already registered')) {
        throw new Error('Este e-mail já possui uma conta no sistema.')
      }

      throw new Error('Erro ao criar acesso. Verifique os dados e tente novamente.')
    }

    const { error: updateError } = await supabase
      .from('employees')
      .update({ user_id: created.user.id, email: normalizedEmail })
      .eq('id', employee.id)
      .is('deleted_at', null)

    if (updateError) {
      const { error: rollbackError } = await admin.auth.admin.deleteUser(created.user.id)
      if (rollbackError) {
        console.error('Erro ao reverter usuário criado após falha no vínculo do funcionário:', rollbackError.message)
      }
      throw updateError
    }

    await createAuditLog({
      action: 'set_password',
      entityType: 'employee',
      entityId: employee.id,
      companyId,
      summary: `Acesso direto definido para "${employee.name}".`,
      metadata: {
        email: normalizedEmail,
        force_password_change: true,
      },
    })

    revalidateEmployeesPage()
    return { success: true }
  } catch (error: unknown) {
    return { error: getActionErrorMessage(error, 'Erro ao criar acesso direto') }
  }
}
