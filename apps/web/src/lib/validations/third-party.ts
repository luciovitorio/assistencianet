import * as z from 'zod'
import {
  documentOptionalSchema,
  phoneOptionalSchema,
  emailOptionalSchema,
  notesOptionalSchema,
} from './shared'

export const THIRD_PARTY_TYPES = ['fabricante', 'tecnico_especializado', 'outro'] as const
export type ThirdPartyType = (typeof THIRD_PARTY_TYPES)[number]

export const THIRD_PARTY_TYPE_LABELS: Record<ThirdPartyType, string> = {
  fabricante: 'Fabricante',
  tecnico_especializado: 'Técnico especializado',
  outro: 'Outro',
}

export const thirdPartySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Nome é obrigatório')
    .min(3, 'O nome deve ter no mínimo 3 caracteres')
    .max(120, 'O nome deve ter no máximo 120 caracteres'),
  type: z.enum(THIRD_PARTY_TYPES, { error: 'Tipo inválido' }),
  document: documentOptionalSchema,
  phone: phoneOptionalSchema,
  email: emailOptionalSchema,
  default_return_days: z
    .number({ error: 'Informe um número de dias válido' })
    .int('O prazo deve ser em dias inteiros')
    .min(1, 'O prazo deve ser de pelo menos 1 dia')
    .max(365, 'O prazo não pode ultrapassar 365 dias')
    .optional()
    .nullable(),
  notes: notesOptionalSchema,
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
  third_party_notes: notesOptionalSchema,
})

export type DispatchToThirdPartySchema = z.input<typeof dispatchToThirdPartySchema>

// Schema para registrar retorno do terceiro
export const returnFromThirdPartySchema = z.object({
  outcome: z.enum(['pronto', 'reprovado'], { error: 'Selecione o resultado do serviço' }),
  third_party_notes: notesOptionalSchema,
})

export type ReturnFromThirdPartySchema = z.input<typeof returnFromThirdPartySchema>
