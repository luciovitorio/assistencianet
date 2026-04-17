import * as z from 'zod'

export const THIRD_PARTY_TYPES = ['fabricante', 'tecnico_especializado', 'outro'] as const
export type ThirdPartyType = (typeof THIRD_PARTY_TYPES)[number]

export const THIRD_PARTY_TYPE_LABELS: Record<ThirdPartyType, string> = {
  fabricante: 'Fabricante',
  tecnico_especializado: 'Técnico especializado',
  outro: 'Outro',
}

const hasExpectedDigits = (value: string, allowedDigits: number[]) => {
  const digits = value.replace(/\D/g, '')
  return allowedDigits.includes(digits.length)
}

export const thirdPartySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Nome é obrigatório')
    .min(3, 'O nome deve ter no mínimo 3 caracteres')
    .max(120, 'O nome deve ter no máximo 120 caracteres'),
  type: z.enum(THIRD_PARTY_TYPES, { error: 'Tipo inválido' }),
  document: z
    .string()
    .trim()
    .refine(
      (value) => !value || hasExpectedDigits(value, [11, 14]),
      'Informe um CPF/CNPJ válido',
    )
    .optional()
    .nullable()
    .or(z.literal('')),
  phone: z
    .string()
    .trim()
    .refine(
      (value) => !value || hasExpectedDigits(value, [10, 11]),
      'Informe um telefone válido',
    )
    .optional()
    .nullable()
    .or(z.literal('')),
  email: z.string().email('E-mail inválido').optional().nullable().or(z.literal('')),
  default_return_days: z
    .number({ error: 'Informe um número de dias válido' })
    .int('O prazo deve ser em dias inteiros')
    .min(1, 'O prazo deve ser de pelo menos 1 dia')
    .max(365, 'O prazo não pode ultrapassar 365 dias')
    .optional()
    .nullable(),
  notes: z
    .string()
    .trim()
    .max(500, 'As observações devem ter no máximo 500 caracteres')
    .optional()
    .nullable()
    .or(z.literal('')),
  active: z.boolean().default(true),
})

export type ThirdPartySchema = z.input<typeof thirdPartySchema>
export type ThirdPartyValues = z.output<typeof thirdPartySchema>

// Schema para o modal de envio para terceiro
export const dispatchToThirdPartySchema = z.object({
  third_party_id: z
    .string()
    .trim()
    .min(1, 'Selecione uma terceirizada')
    .uuid('Terceirizada inválida'),
  third_party_expected_return_at: z
    .string()
    .trim()
    .min(1, 'Informe a data prevista de retorno')
    .refine((val) => {
      const date = new Date(val)
      return !isNaN(date.getTime()) && date >= new Date(new Date().toDateString())
    }, 'A data de retorno deve ser hoje ou futura'),
  third_party_notes: z
    .string()
    .trim()
    .max(500, 'As observações devem ter no máximo 500 caracteres')
    .optional()
    .nullable()
    .or(z.literal('')),
})

export type DispatchToThirdPartySchema = z.input<typeof dispatchToThirdPartySchema>

// Schema para registrar retorno do terceiro
export const returnFromThirdPartySchema = z.object({
  outcome: z.enum(['pronto', 'reprovado'], { error: 'Selecione o resultado do serviço' }),
  third_party_notes: z
    .string()
    .trim()
    .max(500, 'As observações devem ter no máximo 500 caracteres')
    .optional()
    .nullable()
    .or(z.literal('')),
})

export type ReturnFromThirdPartySchema = z.input<typeof returnFromThirdPartySchema>
