import * as z from 'zod'

export const PAYOUT_STATUSES = ['aberto', 'pago', 'cancelado'] as const
export type PayoutStatus = (typeof PAYOUT_STATUSES)[number]

export const PAYOUT_STATUS_LABELS: Record<PayoutStatus, string> = {
  aberto: 'Aberto',
  pago: 'Pago',
  cancelado: 'Cancelado',
}

export const PAYOUT_STATUS_COLORS: Record<PayoutStatus, string> = {
  aberto: 'bg-yellow-100 text-yellow-700',
  pago: 'bg-emerald-100 text-emerald-700',
  cancelado: 'bg-neutral-200 text-neutral-600',
}

export const PAYOUT_PAYMENT_METHODS = [
  'dinheiro',
  'pix',
  'cartao_credito',
  'cartao_debito',
  'transferencia',
] as const

export type PayoutPaymentMethod = (typeof PAYOUT_PAYMENT_METHODS)[number]

export const PAYOUT_PAYMENT_METHOD_LABELS: Record<PayoutPaymentMethod, string> = {
  dinheiro: 'Dinheiro',
  pix: 'Pix',
  cartao_credito: 'Cartão de crédito',
  cartao_debito: 'Cartão de débito',
  transferencia: 'Transferência',
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const isValidIsoDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00`)
  return !Number.isNaN(parsed.getTime())
}

const requiredDateField = z
  .string()
  .trim()
  .min(1, 'Selecione uma data válida')
  .refine(isValidIsoDate, 'Selecione uma data válida')

const moneyField = z
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
  .pipe(z.number().min(0, 'O valor não pode ser negativo'))

// ── Schema: criar fechamento ─────────────────────────────────────────────────

export const payoutLineSchema = z.object({
  technician_id: z.string().uuid('Técnico inválido'),
  total_amount: moneyField,
  notes: z
    .string()
    .trim()
    .max(500, 'Observações devem ter no máximo 500 caracteres')
    .optional()
    .nullable()
    .or(z.literal('')),
})

export const payoutCreateSchema = z.object({
  period_start: requiredDateField,
  period_end: requiredDateField,
  lines: z.array(payoutLineSchema).min(1, 'Selecione ao menos um técnico'),
})

export type PayoutCreateSchema = z.input<typeof payoutCreateSchema>
export type PayoutCreateValues = z.output<typeof payoutCreateSchema>

// ── Schema: marcar como pago ─────────────────────────────────────────────────

export const payoutMarkAsPaidSchema = z.object({
  payment_method: z.enum(PAYOUT_PAYMENT_METHODS, {
    error: 'Selecione a forma de pagamento',
  }),
  paid_at: requiredDateField,
  payment_notes: z
    .string()
    .trim()
    .max(500, 'Observações devem ter no máximo 500 caracteres')
    .optional()
    .nullable()
    .or(z.literal('')),
})

export type PayoutMarkAsPaidSchema = z.input<typeof payoutMarkAsPaidSchema>
export type PayoutMarkAsPaidValues = z.output<typeof payoutMarkAsPaidSchema>
