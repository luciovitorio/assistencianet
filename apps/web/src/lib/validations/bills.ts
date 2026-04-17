import * as z from 'zod'

// ── Categorias ───────────────────────────────────────────────────────────────

export const BILL_CATEGORIES = [
  'fornecedor',
  'aluguel',
  'energia',
  'agua',
  'internet',
  'folha',
  'imposto',
  'outro',
] as const

export type BillCategory = (typeof BILL_CATEGORIES)[number]

export const BILL_CATEGORY_LABELS: Record<BillCategory, string> = {
  fornecedor: 'Fornecedor',
  aluguel: 'Aluguel',
  energia: 'Energia',
  agua: 'Água',
  internet: 'Internet',
  folha: 'Folha de Pagamento',
  imposto: 'Imposto / Taxa',
  outro: 'Outro',
}

// ── Recorrência ──────────────────────────────────────────────────────────────

export const BILL_RECURRENCES = ['semanal', 'quinzenal', 'mensal', 'anual'] as const
export type BillRecurrence = (typeof BILL_RECURRENCES)[number]

export const BILL_RECURRENCE_LABELS: Record<BillRecurrence, string> = {
  semanal: 'Semanal',
  quinzenal: 'Quinzenal',
  mensal: 'Mensal',
  anual: 'Anual',
}

// Dias de offset por período (para gerar instâncias)
export const RECURRENCE_DAYS: Record<BillRecurrence, number> = {
  semanal: 7,
  quinzenal: 14,
  mensal: 0, // meses inteiros — tratado separadamente
  anual: 0,  // anos inteiros — tratado separadamente
}

// ── Status ───────────────────────────────────────────────────────────────────

export const BILL_STATUSES = ['pendente', 'pago'] as const
export type BillStatus = (typeof BILL_STATUSES)[number]

// vencido é derivado: due_date < hoje AND status = 'pendente'
export type BillStatusDerived = BillStatus | 'vencido'

export const BILL_STATUS_LABELS: Record<BillStatusDerived, string> = {
  pendente: 'Pendente',
  pago: 'Pago',
  vencido: 'Vencido',
}

export const BILL_STATUS_COLORS: Record<BillStatusDerived, string> = {
  pendente: 'bg-yellow-100 text-yellow-700',
  pago: 'bg-emerald-100 text-emerald-700',
  vencido: 'bg-red-100 text-red-700',
}

// ── Formas de pagamento ──────────────────────────────────────────────────────

export const BILL_PAYMENT_METHODS = [
  'dinheiro',
  'pix',
  'cartao_credito',
  'cartao_debito',
  'transferencia',
] as const

export type BillPaymentMethod = (typeof BILL_PAYMENT_METHODS)[number]

export const BILL_PAYMENT_METHOD_LABELS: Record<BillPaymentMethod, string> = {
  dinheiro: 'Dinheiro',
  pix: 'Pix',
  cartao_credito: 'Cartão de crédito',
  cartao_debito: 'Cartão de débito',
  transferencia: 'Transferência',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

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
  .pipe(z.number().positive('O valor deve ser maior que zero'))

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

// ── Schema: Criar lançamento (único ou recorrente) ───────────────────────────

export const billCreateSchema = z.object({
  branch_id: z.string().uuid('Selecione uma filial válida'),
  category: z.enum(BILL_CATEGORIES, { error: 'Selecione uma categoria válida' }),
  description: z
    .string()
    .trim()
    .max(200, 'Descrição deve ter no máximo 200 caracteres')
    .optional()
    .nullable()
    .or(z.literal('')),
  supplier_id: z
    .string()
    .uuid('Selecione um fornecedor válido')
    .optional()
    .nullable()
    .or(z.literal('')),
  amount: moneyField,
  due_date: requiredDateField,
  notes: z
    .string()
    .trim()
    .max(500, 'Observações devem ter no máximo 500 caracteres')
    .optional()
    .nullable()
    .or(z.literal('')),
  // Recorrência
  recurrence: z
    .enum(BILL_RECURRENCES)
    .optional()
    .nullable()
    .or(z.literal('')),
  // Número de instâncias a gerar (1 = avulso, N = N parcelas futuras)
  recurrence_count: z.coerce
    .number()
    .int()
    .min(1, 'Informe ao menos 1 parcela')
    .max(60, 'Máximo de 60 parcelas')
    .default(1),
})

export type BillCreateSchema = z.input<typeof billCreateSchema>
export type BillCreateValues = z.output<typeof billCreateSchema>

// ── Schema: Editar lançamento ────────────────────────────────────────────────

export const billEditSchema = z.object({
  branch_id: z.string().uuid('Selecione uma filial válida'),
  category: z.enum(BILL_CATEGORIES, { error: 'Selecione uma categoria válida' }),
  description: z
    .string()
    .trim()
    .max(200, 'Descrição deve ter no máximo 200 caracteres')
    .optional()
    .nullable()
    .or(z.literal('')),
  supplier_id: z
    .string()
    .uuid('Selecione um fornecedor válido')
    .optional()
    .nullable()
    .or(z.literal('')),
  amount: moneyField,
  due_date: requiredDateField,
  notes: z
    .string()
    .trim()
    .max(500, 'Observações devem ter no máximo 500 caracteres')
    .optional()
    .nullable()
    .or(z.literal('')),
})

export type BillEditSchema = z.input<typeof billEditSchema>
export type BillEditValues = z.output<typeof billEditSchema>

// ── Schema: Registrar pagamento ───────────────────────────────────────────────

export const billMarkAsPaidSchema = z.object({
  payment_method: z.enum(BILL_PAYMENT_METHODS, { error: 'Selecione a forma de pagamento' }),
  paid_at: requiredDateField,
  payment_notes: z
    .string()
    .trim()
    .max(500, 'Observações devem ter no máximo 500 caracteres')
    .optional()
    .nullable()
    .or(z.literal('')),
})

export type BillMarkAsPaidSchema = z.input<typeof billMarkAsPaidSchema>
export type BillMarkAsPaidValues = z.output<typeof billMarkAsPaidSchema>
