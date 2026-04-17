import * as z from 'zod'

export const SERVICE_CATEGORIES = [
  'diagnostico',
  'reparo',
  'manutencao',
  'instalacao',
  'limpeza',
  'outro',
] as const
export type ServiceCategory = (typeof SERVICE_CATEGORIES)[number]

export const CATEGORY_LABELS: Record<ServiceCategory, string> = {
  diagnostico: 'Diagnóstico',
  reparo: 'Reparo',
  manutencao: 'Manutenção',
  instalacao: 'Instalação',
  limpeza: 'Limpeza / Higienização',
  outro: 'Outro',
}

const positiveDecimal = z
  .union([z.string(), z.number()])
  .transform((val) => {
    if (typeof val === 'number') return val
    const normalized = val
      .trim()
      .replace(/R\$\s?/, '')
      .replace(/\./g, '')
      .replace(',', '.')
    return normalized === '' ? null : Number(normalized)
  })
  .pipe(z.number().min(0, 'Valor deve ser maior ou igual a zero').nullable())

export const serviceSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Nome é obrigatório')
    .min(2, 'O nome deve ter no mínimo 2 caracteres')
    .max(150, 'O nome deve ter no máximo 150 caracteres'),
  code: z
    .string()
    .trim()
    .max(50, 'Código deve ter no máximo 50 caracteres')
    .optional()
    .nullable()
    .or(z.literal('')),
  category: z.enum(SERVICE_CATEGORIES, { error: 'Categoria é obrigatória' }),
  price: positiveDecimal.optional(),
  estimated_duration_minutes: z.coerce
    .number({ message: 'Duração deve ser um número' })
    .int('Duração deve ser inteiro')
    .min(0, 'Duração deve ser maior ou igual a zero')
    .optional()
    .nullable(),
  warranty_days: z.coerce
    .number({ message: 'Garantia deve ser um número' })
    .int('Garantia deve ser inteiro')
    .min(0, 'Garantia deve ser maior ou igual a zero')
    .default(0),
  notes: z
    .string()
    .trim()
    .max(1000, 'Observações devem ter no máximo 1000 caracteres')
    .optional()
    .nullable()
    .or(z.literal('')),
  active: z.boolean().default(true),
})

export type ServiceSchema = z.input<typeof serviceSchema>
export type ServiceValues = z.output<typeof serviceSchema>
