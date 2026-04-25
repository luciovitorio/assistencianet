import * as z from 'zod'

export const EMPLOYEE_ROLES = ['admin', 'atendente', 'tecnico'] as const
export type EmployeeRole = typeof EMPLOYEE_ROLES[number]

export const ROLE_LABELS: Record<EmployeeRole, string> = {
  admin: 'Administrador',
  atendente: 'Atendente',
  tecnico: 'Técnico',
}

const nullableMoneyField = z.preprocess((value) => {
  if (value === '' || value === null || value === undefined) {
    return null
  }

  if (typeof value === 'number') {
    return value
  }

  if (typeof value === 'string') {
    const normalized = value
      .trim()
      .replace(/R\$\s?/, '')
      .replace(/\./g, '')
      .replace(',', '.')

    return normalized === '' ? null : Number(normalized)
  }

  return value
}, z.number({ error: 'Valor inválido' }).nonnegative('O valor deve ser maior ou igual a zero').nullable().optional())

export const employeeSchema = z.object({
  name: z.string()
    .trim()
    .min(1, 'Nome é obrigatório')
    .min(3, 'O nome deve ter no mínimo 3 caracteres')
    .max(100, 'O nome deve ter no máximo 100 caracteres'),
  role: z.enum(EMPLOYEE_ROLES, { error: 'Cargo é obrigatório' }),
  email: z.string().email('E-mail inválido').optional().nullable().or(z.literal('')),
  phone: z.string().optional().nullable(),
  cpf: z.string().optional().nullable(),
  branch_id: z.string()
    .trim()
    .min(1, 'Filial é obrigatória')
    .uuid('Filial é obrigatória'),
  active: z.boolean().default(true),
  labor_rate: nullableMoneyField,
})

export type EmployeeSchema = z.input<typeof employeeSchema>
export type EmployeeValues = z.output<typeof employeeSchema>
