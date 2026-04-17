import * as z from 'zod'

export const EMPLOYEE_ROLES = ['admin', 'atendente', 'tecnico'] as const
export type EmployeeRole = typeof EMPLOYEE_ROLES[number]

export const ROLE_LABELS: Record<EmployeeRole, string> = {
  admin: 'Administrador',
  atendente: 'Atendente',
  tecnico: 'Técnico',
}

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
  labor_rate: z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? null : Number(v)),
    z.number({ error: 'Valor inválido' })
      .nonnegative('O valor deve ser maior ou igual a zero')
      .nullable()
      .optional(),
  ),
})

export type EmployeeSchema = z.input<typeof employeeSchema>
export type EmployeeValues = z.output<typeof employeeSchema>
