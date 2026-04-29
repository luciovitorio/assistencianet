'use server'

import { contactSchema } from '@/lib/validations/contact'
import { siteConfig } from '@/lib/site'

export type ContactActionResult =
  | {
      ok: true
      mailto: string
    }
  | {
      ok: false
      error: string
      fieldErrors?: Record<string, string>
    }

function getValue(formData: FormData, key: string) {
  return String(formData.get(key) ?? '').trim()
}

function getFirstFieldErrors(formErrors: ReturnType<typeof contactSchema.safeParse>) {
  if (formErrors.success) return undefined

  return Object.fromEntries(
    Object.entries(formErrors.error.flatten().fieldErrors)
      .map(([field, messages]) => [field, messages?.[0]])
      .filter((entry): entry is [string, string] => typeof entry[1] === 'string')
  )
}

export async function submitContact(formData: FormData): Promise<ContactActionResult> {
  const parsed = contactSchema.safeParse({
    name: getValue(formData, 'name'),
    company: getValue(formData, 'company'),
    email: getValue(formData, 'email'),
    phone: getValue(formData, 'phone'),
    subject: getValue(formData, 'subject'),
    message: getValue(formData, 'message'),
    website: getValue(formData, 'website'),
  })

  if (!parsed.success) {
    return {
      ok: false,
      error: 'Revise os campos destacados antes de enviar.',
      fieldErrors: getFirstFieldErrors(parsed),
    }
  }

  const { name, company, email, phone, subject, message } = parsed.data
  const body = [
    `Nome: ${name}`,
    `Empresa: ${company || 'Não informada'}`,
    `E-mail: ${email}`,
    `WhatsApp: ${phone}`,
    '',
    'Mensagem:',
    message,
  ].join('\n')

  const mailto = `mailto:${siteConfig.contactEmail}?subject=${encodeURIComponent(
    `[Contato pelo site] ${subject}`
  )}&body=${encodeURIComponent(body)}`

  return { ok: true, mailto }
}
