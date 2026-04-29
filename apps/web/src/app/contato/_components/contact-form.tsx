'use client'

import type { ChangeEvent, FormEvent } from 'react'
import { useState } from 'react'
import { Send } from 'lucide-react'
import { toast } from 'sonner'
import { submitContact } from '@/app/actions/contact'
import { applyPhoneMask } from '@/lib/masks'
import { CONTACT_SUBJECTS, contactSchema } from '@/lib/validations/contact'
import s from '../../landing.module.css'

type FieldErrors = Record<string, string>

function getValue(formData: FormData, key: string) {
  return String(formData.get(key) ?? '').trim()
}

function getClientFieldErrors(formErrors: ReturnType<typeof contactSchema.safeParse>) {
  if (formErrors.success) return {}

  return Object.fromEntries(
    Object.entries(formErrors.error.flatten().fieldErrors)
      .map(([field, messages]) => [field, messages?.[0]])
      .filter((entry): entry is [string, string] => typeof entry[1] === 'string')
  )
}

export function ContactForm() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [phone, setPhone] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  function handlePhoneChange(event: ChangeEvent<HTMLInputElement>) {
    setPhone(applyPhoneMask(event.target.value))
    if (fieldErrors.phone) {
      setFieldErrors((current) => ({ ...current, phone: '' }))
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFieldErrors({})
    setIsSubmitting(true)

    const formData = new FormData(event.currentTarget)
    const clientParsed = contactSchema.safeParse({
      name: getValue(formData, 'name'),
      company: getValue(formData, 'company'),
      email: getValue(formData, 'email'),
      phone: getValue(formData, 'phone'),
      subject: getValue(formData, 'subject'),
      message: getValue(formData, 'message'),
      website: getValue(formData, 'website'),
    })

    if (!clientParsed.success) {
      setFieldErrors(getClientFieldErrors(clientParsed))
      toast.error('Revise os campos destacados antes de enviar.')
      setIsSubmitting(false)
      return
    }

    const result = await submitContact(formData)

    if (!result.ok) {
      setFieldErrors(result.fieldErrors ?? {})
      toast.error(result.error)
      setIsSubmitting(false)
      return
    }

    window.location.href = result.mailto
    toast.success('Mensagem validada e preparada para envio.')
    setIsSubmitting(false)
  }

  return (
    <form className={s['contact-form']} onSubmit={handleSubmit} noValidate>
      <label className={s['contact-honeypot']} aria-hidden="true">
        <span>Site</span>
        <input name="website" type="text" tabIndex={-1} autoComplete="off" />
      </label>

      <div className={s['contact-field-grid']}>
        <label className={s['contact-field']}>
          <span>Nome *</span>
          <input
            name="name"
            type="text"
            autoComplete="name"
            required
            maxLength={120}
            placeholder="Seu nome"
            aria-invalid={Boolean(fieldErrors.name)}
          />
          {fieldErrors.name && <small className={s['contact-error']}>{fieldErrors.name}</small>}
        </label>
        <label className={s['contact-field']}>
          <span>Empresa</span>
          <input
            name="company"
            type="text"
            autoComplete="organization"
            maxLength={120}
            placeholder="Nome da assistência"
            aria-invalid={Boolean(fieldErrors.company)}
          />
          {fieldErrors.company && <small className={s['contact-error']}>{fieldErrors.company}</small>}
        </label>
      </div>

      <div className={s['contact-field-grid']}>
        <label className={s['contact-field']}>
          <span>E-mail *</span>
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={160}
            placeholder="voce@empresa.com.br"
            aria-invalid={Boolean(fieldErrors.email)}
          />
          {fieldErrors.email && <small className={s['contact-error']}>{fieldErrors.email}</small>}
        </label>
        <label className={s['contact-field']}>
          <span>WhatsApp *</span>
          <input
            name="phone"
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            required
            maxLength={15}
            value={phone}
            onChange={handlePhoneChange}
            placeholder="(00) 00000-0000"
            aria-invalid={Boolean(fieldErrors.phone)}
          />
          {fieldErrors.phone && <small className={s['contact-error']}>{fieldErrors.phone}</small>}
        </label>
      </div>

      <label className={s['contact-field']}>
        <span>Assunto *</span>
        <select name="subject" required defaultValue={CONTACT_SUBJECTS[0]} aria-invalid={Boolean(fieldErrors.subject)}>
          {CONTACT_SUBJECTS.map((subject) => (
            <option key={subject} value={subject}>
              {subject}
            </option>
          ))}
        </select>
        {fieldErrors.subject && <small className={s['contact-error']}>{fieldErrors.subject}</small>}
      </label>

      <label className={s['contact-field']}>
        <span>Mensagem *</span>
        <textarea
          name="message"
          required
          minLength={10}
          maxLength={1000}
          rows={6}
          placeholder="Conte rapidamente como podemos ajudar sua assistência técnica."
          aria-invalid={Boolean(fieldErrors.message)}
        />
        {fieldErrors.message && <small className={s['contact-error']}>{fieldErrors.message}</small>}
      </label>

      <button className={s['contact-submit']} type="submit" disabled={isSubmitting}>
        <Send aria-hidden="true" />
        {isSubmitting ? 'Preparando...' : 'Enviar mensagem'}
      </button>
    </form>
  )
}
