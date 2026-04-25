import * as z from 'zod'

export const SERVICE_ORDER_ESTIMATE_STATUSES = [
  'rascunho',
  'enviado',
  'aprovado',
  'recusado',
  'substituido',
] as const
export type ServiceOrderEstimateStatus = (typeof SERVICE_ORDER_ESTIMATE_STATUSES)[number]

export const SERVICE_ORDER_ESTIMATE_STATUS_LABELS: Record<ServiceOrderEstimateStatus, string> = {
  rascunho: 'Rascunho',
  enviado: 'Enviado',
  aprovado: 'Aprovado',
  recusado: 'Recusado',
  substituido: 'Substituído',
}

export const SERVICE_ORDER_ESTIMATE_STATUS_COLORS: Record<ServiceOrderEstimateStatus, string> = {
  rascunho: 'bg-slate-100 text-slate-600',
  enviado: 'bg-blue-100 text-blue-700',
  aprovado: 'bg-emerald-100 text-emerald-700',
  recusado: 'bg-rose-100 text-rose-700',
  substituido: 'bg-amber-100 text-amber-700',
}

const EXPIRABLE_ESTIMATE_STATUSES = new Set<ServiceOrderEstimateStatus>(['rascunho', 'enviado'])

export const isServiceOrderEstimateExpired = (
  validUntil: string | null | undefined,
  status: string,
  referenceDate = new Date()
) => {
  if (!validUntil) return false
  if (!EXPIRABLE_ESTIMATE_STATUSES.has(status as ServiceOrderEstimateStatus)) return false

  const expirationDate = new Date(`${validUntil}T23:59:59`)
  if (Number.isNaN(expirationDate.getTime())) return false

  return expirationDate < referenceDate
}

export const ESTIMATE_ITEM_TYPES = ['servico', 'peca', 'avulso'] as const
export type EstimateItemType = (typeof ESTIMATE_ITEM_TYPES)[number]

export const ESTIMATE_ITEM_TYPE_LABELS: Record<EstimateItemType, string> = {
  servico: 'Servico',
  peca: 'Peca',
  avulso: 'Avulso',
}

const parseDecimal = (value: string | number) => {
  if (typeof value === 'number') return value

  const normalized = value
    .trim()
    .replace(/R\$\s?/, '')
    .replace(/\./g, '')
    .replace(',', '.')

  return normalized === '' ? Number.NaN : Number(normalized)
}

const nonNegativeCurrency = z
  .union([z.string(), z.number()])
  .transform(parseDecimal)
  .pipe(z.number().finite('Valor invalido').min(0, 'Valor deve ser maior ou igual a zero'))

const positiveDecimal = z
  .union([z.string(), z.number()])
  .transform(parseDecimal)
  .pipe(z.number().finite('Quantidade invalida').gt(0, 'Quantidade deve ser maior que zero'))

const optionalDate = z.string().trim().optional().nullable().or(z.literal(''))

export const serviceOrderEstimateItemSchema = z
  .object({
    part_id: z.string().uuid().optional().nullable().or(z.literal('')),
    item_type: z.enum(ESTIMATE_ITEM_TYPES, { error: 'Tipo do item e obrigatorio' }),
    description: z
      .string()
      .trim()
      .min(1, 'Descricao do item e obrigatoria')
      .max(200, 'Descricao do item deve ter no maximo 200 caracteres'),
    quantity: positiveDecimal,
    unit_price: nonNegativeCurrency,
    notes: z
      .string()
      .trim()
      .max(500, 'Observacoes do item devem ter no maximo 500 caracteres')
      .optional()
      .nullable()
      .or(z.literal('')),
  })
  .superRefine((item, ctx) => {
    const quantity = Number(item.quantity)

    if (item.item_type === 'servico' && quantity !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['quantity'],
        message: 'Servicos devem ter quantidade fixa igual a 1.',
      })
    }

    if (item.item_type === 'peca' && !Number.isInteger(quantity)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['quantity'],
        message: 'Quantidade de peca deve ser um numero inteiro.',
      })
    }

    if (item.item_type === 'peca' && !item.part_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['part_id'],
        message: 'Selecione a peca no catalogo.',
      })
    }
  })

export const serviceOrderEstimateSchema = z.object({
  valid_until: optionalDate,
  warranty_days: z
    .number({ error: 'Prazo de garantia e obrigatorio' })
    .int('Prazo de garantia invalido')
    .min(0, 'Prazo de garantia deve ser maior ou igual a zero')
    .max(3650, 'Prazo de garantia deve ser de no maximo 3650 dias'),
  discount_amount: nonNegativeCurrency,
  notes: z
    .string()
    .trim()
    .max(2000, 'Observacoes do orcamento devem ter no maximo 2000 caracteres')
    .optional()
    .nullable()
    .or(z.literal('')),
  items: z.array(serviceOrderEstimateItemSchema).min(1, 'Adicione pelo menos um item ao orcamento'),
})

export type ServiceOrderEstimateSchema = z.input<typeof serviceOrderEstimateSchema>
export type ServiceOrderEstimateValues = z.output<typeof serviceOrderEstimateSchema>
