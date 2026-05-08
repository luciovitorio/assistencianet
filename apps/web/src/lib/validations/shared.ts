import * as z from 'zod'

export const hasExpectedDigits = (value: string, allowedDigits: number[]) => {
  const digits = value.replace(/\D/g, '')
  return allowedDigits.includes(digits.length)
}

export const documentSchema = z
  .string()
  .trim()
  .min(1, 'CPF/CNPJ é obrigatório')
  .refine((value) => hasExpectedDigits(value, [11, 14]), 'Informe um CPF/CNPJ válido')

export const documentOptionalSchema = z
  .string()
  .trim()
  .refine(
    (value) => !value || hasExpectedDigits(value, [11, 14]),
    'Informe um CPF/CNPJ válido',
  )
  .optional()
  .nullable()
  .or(z.literal(''))

export const phoneSchema = z
  .string()
  .trim()
  .min(1, 'Telefone é obrigatório')
  .refine((value) => hasExpectedDigits(value, [10, 11]), 'Informe um telefone válido')

export const phoneOptionalSchema = z
  .string()
  .trim()
  .refine(
    (value) => !value || hasExpectedDigits(value, [10, 11]),
    'Informe um telefone válido',
  )
  .optional()
  .nullable()
  .or(z.literal(''))

export const emailOptionalSchema = z
  .string()
  .email('E-mail inválido')
  .optional()
  .nullable()
  .or(z.literal(''))

export const notesOptionalSchema = z
  .string()
  .trim()
  .max(500, 'As observações devem ter no máximo 500 caracteres')
  .optional()
  .nullable()
  .or(z.literal(''))

export const addressSchema = z.object({
  zip_code: z.string().optional().nullable().or(z.literal('')),
  street: z
    .string()
    .trim()
    .max(255, 'A rua deve ter no máximo 255 caracteres')
    .optional()
    .nullable()
    .or(z.literal('')),
  number: z
    .string()
    .trim()
    .max(50, 'O número deve ter no máximo 50 caracteres')
    .optional()
    .nullable()
    .or(z.literal('')),
  complement: z
    .string()
    .trim()
    .max(120, 'O complemento deve ter no máximo 120 caracteres')
    .optional()
    .nullable()
    .or(z.literal('')),
  city: z
    .string()
    .trim()
    .max(120, 'A cidade deve ter no máximo 120 caracteres')
    .optional()
    .nullable()
    .or(z.literal('')),
  state: z
    .string()
    .trim()
    .max(2, 'O estado deve ter no máximo 2 caracteres')
    .optional()
    .nullable()
    .or(z.literal('')),
})

export type AddressFields = z.input<typeof addressSchema>
