import * as z from 'zod'

export const MOVEMENT_TYPES = [
  'entrada',
  'saida',
  'ajuste',
  'transferencia_entrada',
  'transferencia_saida',
] as const

export type MovementType = typeof MOVEMENT_TYPES[number]

export const MOVEMENT_TYPE_LABELS: Record<MovementType, string> = {
  entrada: 'Entrada',
  saida: 'Saída',
  ajuste: 'Ajuste de Inventário',
  transferencia_entrada: 'Transferência (entrada)',
  transferencia_saida: 'Transferência (saída)',
}

// ── Schemas de custo (reutiliza lógica da máscara money) ─────────────────────

const optionalMoneyField = z.preprocess(
  (val) => {
    if (val === undefined || val === null || val === '') return undefined
    if (typeof val === 'number') return val
    const normalized = String(val)
      .trim()
      .replace(/R\$\s?/, '')
      .replace(/\./g, '')
      .replace(',', '.')
    return normalized === '' ? undefined : Number(normalized)
  },
  z.number().min(0, 'Custo deve ser maior ou igual a zero').optional(),
)

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

const optionalDateField = z
  .string()
  .trim()
  .optional()
  .nullable()
  .or(z.literal(''))
  .refine((value) => !value || isValidIsoDate(value), 'Selecione uma data válida')

// ── Schema: Registrar Entrada ────────────────────────────────────────────────
// Representa o recebimento de peças (compra, devolução, etc.)

export const stockEntradaSchema = z.object({
  part_id: z.string().uuid('Selecione uma peça válida'),
  branch_id: z.string().uuid('Selecione uma filial válida'),
  supplier_id: z.string().uuid('Selecione um fornecedor válido').optional().nullable().or(z.literal('')),
  set_as_default_supplier: z.boolean().default(false),
  invoice_date: optionalDateField,
  entry_date: requiredDateField,
  quantity: z.coerce
    .number()
    .int('Quantidade deve ser inteira')
    .positive('Quantidade deve ser maior que zero'),
  unit_cost: optionalMoneyField,
  notes: z
    .string()
    .trim()
    .max(500, 'Observações devem ter no máximo 500 caracteres')
    .optional()
    .nullable()
    .or(z.literal('')),
})

export type StockEntradaSchema = z.input<typeof stockEntradaSchema>
export type StockEntradaValues = z.output<typeof stockEntradaSchema>

// ── Schema: Ajuste de Inventário ─────────────────────────────────────────────
// O usuário informa a nova quantidade real contada.
// O delta (novo - atual) é calculado na action.

export const stockAjusteSchema = z.object({
  part_id: z.string().uuid('Selecione uma peça válida'),
  branch_id: z.string().uuid('Selecione uma filial válida'),
  current_stock: z.number(),
  new_quantity: z.coerce
    .number()
    .int('Quantidade deve ser inteira')
    .min(0, 'Quantidade não pode ser negativa'),
  notes: z
    .string()
    .trim()
    .max(500, 'Observações devem ter no máximo 500 caracteres')
    .optional()
    .nullable()
    .or(z.literal('')),
})

export type StockAjusteSchema = z.input<typeof stockAjusteSchema>
export type StockAjusteValues = z.output<typeof stockAjusteSchema>

// ── Schema: Transferência entre filiais ──────────────────────────────────────
// O usuário informa origem, destino e quantidade a transferir.
// A action verifica disponibilidade e insere os dois registros atomicamente.

export const stockTransferenciaSchema = z
  .object({
    part_id: z.string().uuid('Selecione uma peça válida'),
    from_branch_id: z.string().uuid('Selecione a filial de origem'),
    to_branch_id: z.string().uuid('Selecione a filial de destino'),
    quantity: z.coerce
      .number()
      .int('Quantidade deve ser inteira')
      .positive('Quantidade deve ser maior que zero'),
    notes: z
      .string()
      .trim()
      .max(500, 'Observações devem ter no máximo 500 caracteres')
      .optional()
      .nullable()
      .or(z.literal('')),
  })
  .refine((data) => data.from_branch_id !== data.to_branch_id, {
    message: 'A filial de destino deve ser diferente da filial de origem',
    path: ['to_branch_id'],
  })

export type StockTransferenciaSchema = z.input<typeof stockTransferenciaSchema>
export type StockTransferenciaValues = z.output<typeof stockTransferenciaSchema>
