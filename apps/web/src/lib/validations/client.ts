import * as z from 'zod'

const hasExpectedDigits = (value: string, allowedDigits: number[]) => {
  const digits = value.replace(/\D/g, '')
  return allowedDigits.includes(digits.length)
}

export const CLIENT_CLASSIFICATIONS = ['novo', 'recorrente', 'vip', 'inadimplente'] as const
export type ClientClassification = (typeof CLIENT_CLASSIFICATIONS)[number]

export const CLIENT_CLASSIFICATION_LABELS: Record<ClientClassification, string> = {
  novo: 'Novo',
  recorrente: 'Recorrente',
  vip: 'VIP',
  inadimplente: 'Inadimplente',
}

export const CLIENT_CLASSIFICATION_COLORS: Record<ClientClassification, string> = {
  novo: 'bg-slate-100 text-slate-600',
  recorrente: 'bg-blue-100 text-blue-700',
  vip: 'bg-yellow-100 text-yellow-700',
  inadimplente: 'bg-red-100 text-red-700',
}

export const clientSchema = z.object({
  name: z.string()
    .trim()
    .min(1, 'Nome é obrigatório')
    .min(3, 'O nome deve ter no mínimo 3 caracteres')
    .max(120, 'O nome deve ter no máximo 120 caracteres'),
  document: z.string()
    .trim()
    .min(1, 'CPF/CNPJ é obrigatório')
    .refine((value) => hasExpectedDigits(value, [11, 14]), 'Informe um CPF/CNPJ válido'),
  phone: z.string()
    .trim()
    .min(1, 'Telefone é obrigatório')
    .refine((value) => hasExpectedDigits(value, [10, 11]), 'Informe um telefone válido'),
  email: z.string().email('E-mail inválido').optional().nullable().or(z.literal('')),
  zip_code: z.string().optional().nullable().or(z.literal('')),
  street: z.string().trim().max(255, 'A rua deve ter no máximo 255 caracteres').optional().nullable().or(z.literal('')),
  number: z.string().trim().max(50, 'O número deve ter no máximo 50 caracteres').optional().nullable().or(z.literal('')),
  complement: z.string().trim().max(120, 'O complemento deve ter no máximo 120 caracteres').optional().nullable().or(z.literal('')),
  city: z.string().trim().max(120, 'A cidade deve ter no máximo 120 caracteres').optional().nullable().or(z.literal('')),
  state: z.string().trim().max(2, 'O estado deve ter no máximo 2 caracteres').optional().nullable().or(z.literal('')),
  notes: z.string()
    .trim()
    .max(500, 'As observações devem ter no máximo 500 caracteres')
    .optional()
    .nullable()
    .or(z.literal('')),
  origin_branch_id: z.string()
    .trim()
    .min(1, 'Filial de origem é obrigatória')
    .uuid('Filial de origem é obrigatória'),
  active: z.boolean().default(true),
  classification: z.enum(CLIENT_CLASSIFICATIONS).default('novo'),
  classification_manual: z.boolean().default(false),
})

export type ClientSchema = z.input<typeof clientSchema>
export type ClientValues = z.output<typeof clientSchema>
