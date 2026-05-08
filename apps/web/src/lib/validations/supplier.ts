import * as z from 'zod'
import {
  documentSchema,
  phoneSchema,
  emailOptionalSchema,
  notesOptionalSchema,
  addressSchema,
} from './shared'

export const supplierSchema = z.object({
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
    .min(1, 'Filial de cadastro é obrigatória')
    .uuid('Filial de cadastro é obrigatória'),
  active: z.boolean().default(true),
})

export type SupplierSchema = z.input<typeof supplierSchema>
export type SupplierValues = z.output<typeof supplierSchema>
