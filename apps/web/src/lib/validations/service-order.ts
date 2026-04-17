import * as z from 'zod'

export const SERVICE_ORDER_STATUSES = [
  'aguardando',
  'em_analise',
  'aguardando_aprovacao',
  'aprovado',
  'reprovado',
  'aguardando_peca',
  'enviado_terceiro',
  'pronto',
  'finalizado',
  'cancelado',
] as const
export type ServiceOrderStatus = (typeof SERVICE_ORDER_STATUSES)[number]

export const SERVICE_ORDER_CANCEL_REASON_OPTIONS = [
  { value: 'cliente_desistiu', label: 'Cliente desistiu do serviço' },
  { value: 'orcamento_nao_aprovado', label: 'Orçamento não aprovado' },
  { value: 'sem_reparo_viavel', label: 'Sem reparo viável' },
  { value: 'peca_sem_previsao', label: 'Peça sem previsão' },
  { value: 'abertura_indevida', label: 'OS aberta por engano ou duplicada' },
  { value: 'outro', label: 'Outro' },
] as const

export const SERVICE_ORDER_CANCEL_REASON_VALUES = SERVICE_ORDER_CANCEL_REASON_OPTIONS.map(
  (option) => option.value
) as [string, ...string[]]

export type ServiceOrderCancelReasonValue =
  (typeof SERVICE_ORDER_CANCEL_REASON_OPTIONS)[number]['value']

export const SERVICE_ORDER_CANCEL_REASON_LABELS: Record<
  ServiceOrderCancelReasonValue,
  string
> = Object.fromEntries(
  SERVICE_ORDER_CANCEL_REASON_OPTIONS.map((option) => [option.value, option.label])
) as Record<ServiceOrderCancelReasonValue, string>

export const STATUS_LABELS: Record<ServiceOrderStatus, string> = {
  aguardando: 'Aguardando Orçamento',
  em_analise: 'Em Análise',
  aguardando_aprovacao: 'Aguardando Aprovação',
  aprovado: 'Aprovado',
  reprovado: 'Reprovado',
  aguardando_peca: 'Aguardando Peça',
  enviado_terceiro: 'Enviado p/ Terceiro',
  pronto: 'Pronto para Retirada',
  finalizado: 'Finalizado',
  cancelado: 'Cancelado',
}

export const STATUS_COLORS: Record<ServiceOrderStatus, string> = {
  aguardando: 'bg-yellow-100 text-yellow-700',
  em_analise: 'bg-blue-100 text-blue-700',
  aguardando_aprovacao: 'bg-purple-100 text-purple-700',
  aprovado: 'bg-emerald-100 text-emerald-700',
  reprovado: 'bg-rose-100 text-rose-700',
  aguardando_peca: 'bg-orange-100 text-orange-700',
  enviado_terceiro: 'bg-indigo-100 text-indigo-700',
  pronto: 'bg-teal-100 text-teal-700',
  finalizado: 'bg-muted text-muted-foreground',
  cancelado: 'bg-red-100 text-red-700',
}

export const PAYMENT_STATUSES = ['pendente', 'pago', 'isento'] as const
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number]

export const PAYMENT_METHODS = [
  'dinheiro',
  'pix',
  'cartao_credito',
  'cartao_debito',
  'transferencia',
  'isento',
] as const
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pendente: 'Pendente',
  pago: 'Pago',
  isento: 'Isento',
}

export const PAYMENT_STATUS_COLORS: Record<PaymentStatus, string> = {
  pendente: 'bg-yellow-100 text-yellow-700',
  pago: 'bg-emerald-100 text-emerald-700',
  isento: 'bg-slate-100 text-slate-600',
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  dinheiro: 'Dinheiro',
  pix: 'Pix',
  cartao_credito: 'Cartão de crédito',
  cartao_debito: 'Cartão de débito',
  transferencia: 'Transferência',
  isento: 'Isento / cortesia',
}

export type DeviceType = string

export const serviceOrderSchema = z.object({
  branch_id: z
    .string()
    .trim()
    .min(1, 'Filial é obrigatória')
    .uuid('Filial inválida'),
  client_id: z
    .string()
    .trim()
    .min(1, 'Cliente é obrigatório')
    .uuid('Cliente inválido'),
  device_type: z
    .string()
    .trim()
    .min(1, 'Tipo de equipamento é obrigatório')
    .max(100, 'Tipo de equipamento deve ter no máximo 100 caracteres'),
  device_brand: z
    .string()
    .trim()
    .max(100, 'Marca deve ter no máximo 100 caracteres')
    .optional()
    .nullable()
    .or(z.literal('')),
  device_model: z
    .string()
    .trim()
    .max(150, 'Modelo deve ter no máximo 150 caracteres')
    .optional()
    .nullable()
    .or(z.literal('')),
  device_serial: z
    .string()
    .trim()
    .max(100, 'Número de série deve ter no máximo 100 caracteres')
    .optional()
    .nullable()
    .or(z.literal('')),
  device_condition: z
    .string()
    .trim()
    .max(500, 'Condição de entrada deve ter no máximo 500 caracteres')
    .optional()
    .nullable()
    .or(z.literal('')),
  reported_issue: z
    .string()
    .trim()
    .min(1, 'Problema relatado é obrigatório')
    .min(5, 'Descreva o problema com pelo menos 5 caracteres')
    .max(2000, 'Problema relatado deve ter no máximo 2000 caracteres'),
  technician_id: z
    .string()
    .trim()
    .uuid('Técnico inválido')
    .optional()
    .nullable()
    .or(z.literal('')),
  estimated_delivery: z
    .string()
    .optional()
    .nullable()
    .or(z.literal('')),
  notes: z
    .string()
    .trim()
    .max(1000, 'Observações devem ter no máximo 1000 caracteres')
    .optional()
    .nullable()
    .or(z.literal('')),
})

export type ServiceOrderSchema = z.input<typeof serviceOrderSchema>
export type ServiceOrderValues = z.output<typeof serviceOrderSchema>

export const editServiceOrderSchema = serviceOrderSchema.omit({ client_id: true })
export type EditServiceOrderSchema = z.input<typeof editServiceOrderSchema>
export type EditServiceOrderValues = z.output<typeof editServiceOrderSchema>

export const cancelServiceOrderSchema = z
  .object({
    reason: z.enum(SERVICE_ORDER_CANCEL_REASON_VALUES, {
      error: 'Selecione o motivo do cancelamento',
    }),
    details: z
      .string()
      .trim()
      .max(500, 'Detalhes do cancelamento devem ter no máximo 500 caracteres')
      .optional()
      .nullable()
      .or(z.literal('')),
  })
  .superRefine((data, ctx) => {
    if (data.reason === 'outro' && !data.details?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['details'],
        message: 'Descreva o motivo do cancelamento',
      })
    }
  })

export type CancelServiceOrderSchema = z.input<typeof cancelServiceOrderSchema>

export const serviceOrderPickupSchema = z
  .object({
    payment_method: z.enum(PAYMENT_METHODS, {
      error: 'Selecione a forma de pagamento',
    }),
    amount_received: z
      .number({ error: 'Informe o valor recebido' })
      .min(0, 'O valor recebido não pode ser negativo')
      .max(999999.99, 'O valor recebido é inválido')
      .optional(),
    discount_amount: z
      .number({ error: 'Informe um desconto válido' })
      .min(0, 'O desconto não pode ser negativo')
      .max(999999.99, 'O desconto é inválido')
      .optional(),
    notes: z
      .string()
      .trim()
      .max(500, 'As observações da retirada devem ter no máximo 500 caracteres')
      .optional()
      .nullable()
      .or(z.literal('')),
  })
  .superRefine((data, ctx) => {
    if (data.payment_method === 'dinheiro' && data.amount_received == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['amount_received'],
        message: 'Informe o valor recebido em dinheiro',
      })
    }
  })

export type ServiceOrderPickupSchema = z.input<typeof serviceOrderPickupSchema>
