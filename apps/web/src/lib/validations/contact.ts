import { z } from 'zod'

export const CONTACT_SUBJECTS = [
  'Quero conhecer o SmartConserto',
  'Preciso de uma demonstração',
  'Tenho uma dúvida comercial',
  'Tenho uma dúvida de suporte',
  'Quero falar sobre parceria',
] as const

const hasExpectedPhoneDigits = (value: string) => {
  const digits = value.replace(/\D/g, '')
  return digits.length === 10 || digits.length === 11
}

export const contactSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Informe seu nome')
    .max(120, 'O nome deve ter no máximo 120 caracteres'),
  company: z
    .string()
    .trim()
    .max(120, 'A empresa deve ter no máximo 120 caracteres')
    .optional()
    .or(z.literal('')),
  email: z
    .string()
    .trim()
    .min(1, 'Informe seu e-mail')
    .email('Informe um e-mail válido')
    .max(160, 'O e-mail deve ter no máximo 160 caracteres'),
  phone: z
    .string()
    .trim()
    .min(1, 'Informe seu WhatsApp')
    .refine(hasExpectedPhoneDigits, 'Informe um WhatsApp válido'),
  subject: z.enum(CONTACT_SUBJECTS, 'Selecione um assunto válido'),
  message: z
    .string()
    .trim()
    .min(10, 'A mensagem deve ter no mínimo 10 caracteres')
    .max(1000, 'A mensagem deve ter no máximo 1000 caracteres'),
  website: z.string().trim().max(0).optional().or(z.literal('')),
})

export type ContactSchema = z.input<typeof contactSchema>
export type ContactValues = z.output<typeof contactSchema>
