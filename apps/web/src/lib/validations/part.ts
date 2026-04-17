import * as z from 'zod'

export const PART_CATEGORIES = ['peca_reposicao', 'acessorio', 'outro'] as const
export type PartCategory = typeof PART_CATEGORIES[number]

export const CATEGORY_LABELS: Record<PartCategory, string> = {
  peca_reposicao: 'Peça de Reposição',
  acessorio: 'Acessório',
  outro: 'Outro',
}

export const PART_UNITS = ['unidade', 'par', 'metro', 'cm', 'kit', 'rolo'] as const
export type PartUnit = typeof PART_UNITS[number]

export const UNIT_LABELS: Record<PartUnit, string> = {
  unidade: 'Unidade',
  par: 'Par',
  metro: 'Metro',
  cm: 'Centímetro',
  kit: 'Kit',
  rolo: 'Rolo',
}

const positiveDecimal = z
  .union([z.string(), z.number()])
  .transform((val) => {
    if (typeof val === 'number') return val
    const normalized = val
      .trim()
      .replace(/R\$\s?/, '')  // remove prefixo "R$ " da máscara money
      .replace(/\./g, '')      // remove separadores de milhar (pt-BR usa ".")
      .replace(',', '.')        // troca vírgula decimal por ponto
    return normalized === '' ? null : Number(normalized)
  })
  .pipe(z.number().min(0, 'Valor deve ser maior ou igual a zero').nullable())

export const partSchema = z.object({
  name: z.string()
    .trim()
    .min(1, 'Nome é obrigatório')
    .min(2, 'O nome deve ter no mínimo 2 caracteres')
    .max(150, 'O nome deve ter no máximo 150 caracteres'),
  sku: z.string().trim().max(50, 'SKU deve ter no máximo 50 caracteres').optional().nullable().or(z.literal('')),
  category: z.enum(PART_CATEGORIES, { error: 'Categoria é obrigatória' }),
  unit: z.enum(PART_UNITS, { error: 'Unidade é obrigatória' }),
  supplier_id: z.string().uuid().optional().nullable().or(z.literal('')),
  cost_price: positiveDecimal.optional(),
  sale_price: positiveDecimal.optional(),
  min_stock: z.coerce
    .number({ message: 'Estoque mínimo deve ser um número' })
    .int('Estoque mínimo deve ser inteiro')
    .min(0, 'Estoque mínimo deve ser maior ou igual a zero')
    .default(0),
  notes: z.string().trim().max(1000, 'Observações devem ter no máximo 1000 caracteres').optional().nullable().or(z.literal('')),
  active: z.boolean().default(true),
})

export type PartSchema = z.input<typeof partSchema>
export type PartValues = z.output<typeof partSchema>
