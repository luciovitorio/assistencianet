import * as z from 'zod'
import {
  documentSchema,
  phoneSchema,
  emailOptionalSchema,
  notesOptionalSchema,
  addressSchema,
} from './shared'

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
  document: documentSchema,
  phone: phoneSchema,
  email: emailOptionalSchema,
  ...addressSchema.shape,
  notes: notesOptionalSchema,
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
