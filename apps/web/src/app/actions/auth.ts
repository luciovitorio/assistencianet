'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAuditLog } from '@/lib/audit/audit-log'
import { loginSchema, registerSchema } from '@/lib/validations/auth'

const AUTH_ERRORS: Record<string, string> = {
  'Invalid login credentials':          'E-mail ou senha incorretos.',
  'Email not confirmed':                 'E-mail não confirmado. Verifique sua caixa de entrada.',
  'User already registered':            'Este e-mail já está cadastrado.',
  'Password should be at least 6 characters': 'A senha deve ter no mínimo 6 caracteres.',
  'Email rate limit exceeded':          'Muitas tentativas. Aguarde alguns minutos e tente novamente.',
  'over_email_send_rate_limit':         'Muitas tentativas de envio. Aguarde alguns minutos.',
  'Email link is invalid or has expired': 'Link expirado ou inválido. Solicite um novo.',
  'signup_disabled':                    'Cadastro temporariamente desabilitado.',
  'weak_password':                      'Senha muito fraca. Use letras, números e símbolos.',
}

function translateAuthError(message: string): string {
  return AUTH_ERRORS[message] ?? 'Ocorreu um erro. Tente novamente.'
}

async function ensureActiveEmployeeSession() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.app_metadata?.role) {
    return { ok: true as const }
  }

  const { data: employee, error } = await supabase
    .from('employees')
    .select('active')
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) {
    await supabase.auth.signOut()
    return { ok: false as const, error: 'Não foi possível validar o acesso do funcionário.' }
  }

  if (!employee?.active) {
    await supabase.auth.signOut()
    return { ok: false as const, error: 'Funcionário inativo. Entre em contato com o administrador.' }
  }

  return { ok: true as const }
}

export async function login(_prev: unknown, formData: FormData) {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data)

  if (error) return { error: translateAuthError(error.message) }

  const employeeStatus = await ensureActiveEmployeeSession()
  if (!employeeStatus.ok) {
    return { error: employeeStatus.error }
  }

  await createAuditLog({
    action: 'login',
    entityType: 'auth',
    entityId: data.user?.id ?? null,
    summary: 'Login realizado no sistema.',
  })

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function register(_prev: unknown, formData: FormData) {
  const parsed = registerSchema.safeParse({
    name: formData.get('name'),
    company_name: formData.get('company_name'),
    whatsapp: formData.get('whatsapp'),
    email: formData.get('email'),
    password: formData.get('password'),
    confirm_password: formData.get('confirm_password'),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { name, email, password, company_name, whatsapp } = parsed.data

  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name, whatsapp, company_name },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/auth/callback`,
    },
  })

  if (error) return { error: translateAuthError(error.message) }

  redirect('/verify-email')
}

export async function logout() {
  const supabase = await createClient()
  await createAuditLog({
    action: 'logout',
    entityType: 'auth',
    summary: 'Logout realizado no sistema.',
  })
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}
