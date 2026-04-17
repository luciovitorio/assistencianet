import { z } from 'zod'

export const PASSWORD_MIN_LENGTH = 8

export const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(1, 'Senha obrigatória'),
})

export const registerSchema = z
  .object({
    name: z.string().min(2, 'Nome deve ter ao menos 2 caracteres'),
    company_name: z.string().min(2, 'Nome da empresa obrigatório'),
    whatsapp: z
      .string()
      .optional()
      .refine(
        (v) => !v || v.replace(/\D/g, '').length >= 10,
        'WhatsApp inválido'
      ),
    email: z.string().email('E-mail inválido'),
    password: z.string().min(PASSWORD_MIN_LENGTH, `Senha deve ter ao menos ${PASSWORD_MIN_LENGTH} caracteres`),
    confirm_password: z.string(),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: 'As senhas não coincidem',
    path: ['confirm_password'],
  })

export type LoginSchema = z.infer<typeof loginSchema>
export type RegisterSchema = z.infer<typeof registerSchema>
