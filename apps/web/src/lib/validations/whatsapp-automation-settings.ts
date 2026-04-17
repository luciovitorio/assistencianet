import * as z from 'zod'

const nullableTrimmedString = (max: number, message: string) =>
  z.preprocess(
    (value) => {
      if (typeof value !== 'string') return value
      const trimmed = value.trim()
      return trimmed.length > 0 ? trimmed : null
    },
    z.string().max(max, message).nullable(),
  )

const nullableUrl = (message: string) =>
  z.preprocess(
    (value) => {
      if (typeof value !== 'string') return value
      const trimmed = value.trim()
      return trimmed.length > 0 ? trimmed : null
    },
    z.url(message).max(255, 'A URL deve ter no máximo 255 caracteres.').nullable(),
  )

export const whatsappAutomationSettingsSchema = z.object({
  enabled: z.boolean(),
  provider: z.enum(['whatsapp_cloud_api', 'evolution_api'], {
    error: 'Selecione o provedor do WhatsApp.',
  }),
  base_url: z
    .string()
    .trim()
    .min(1, 'Informe a URL base da Cloud API.')
    .max(120, 'A URL base deve ter no máximo 120 caracteres.')
    .refine((value) => !value.startsWith('http://') && !value.startsWith('https://'), {
      message: 'Informe apenas o host, sem http:// ou https://.',
    }),
  graph_api_version: z
    .string()
    .trim()
    .regex(/^v\d+\.\d+$/, 'Informe a versão no formato v16.0.'),
  app_id: nullableTrimmedString(80, 'O App ID deve ter no máximo 80 caracteres.'),
  app_secret: nullableTrimmedString(255, 'O App Secret deve ter no máximo 255 caracteres.'),
  phone_number_id: nullableTrimmedString(
    80,
    'O ID do número do WhatsApp deve ter no máximo 80 caracteres.',
  ),
  business_account_id: nullableTrimmedString(
    80,
    'O ID da conta WhatsApp Business deve ter no máximo 80 caracteres.',
  ),
  access_token: nullableTrimmedString(5000, 'O token de acesso deve ter no máximo 5000 caracteres.'),
  webhook_verify_token: nullableTrimmedString(
    255,
    'O token de verificação do webhook deve ter no máximo 255 caracteres.',
  ),
  evolution_base_url: z
    .string()
    .trim()
    .min(1, 'Informe a URL da Evolution API.')
    .max(255, 'A URL da Evolution API deve ter no máximo 255 caracteres.')
    .refine((value) => /^https?:\/\/.+/.test(value), {
      message: 'Informe a URL completa com http:// ou https://.',
    }),
  evolution_api_key: nullableTrimmedString(
    255,
    'A API key da Evolution deve ter no máximo 255 caracteres.',
  ),
  evolution_instance_name: nullableTrimmedString(
    80,
    'O nome da instância deve ter no máximo 80 caracteres.',
  ).refine((value) => !value || /^[A-Za-z0-9_-]+$/.test(value), {
    message: 'Use apenas letras, números, hífen ou underline no nome da instância.',
  }),
  evolution_webhook_url: nullableUrl('Informe uma URL de webhook válida.'),
  default_country_code: z
    .string()
    .trim()
    .regex(/^\d{1,4}$/, 'Informe apenas números no DDI.'),
  templates_language: z
    .string()
    .trim()
    .regex(/^[a-z]{2}(_[A-Z]{2})?$/, 'Informe o idioma no formato pt_BR.'),
  notify_inbound_message: z.boolean(),
  notify_os_created: z.boolean(),
  notify_estimate_ready: z.boolean(),
  notify_service_completed: z.boolean(),
  notify_satisfaction_survey: z.boolean(),
  template_os_created: nullableTrimmedString(
    120,
    'O template de OS aberta deve ter no máximo 120 caracteres.',
  ),
  template_estimate_ready: nullableTrimmedString(
    120,
    'O template de orçamento deve ter no máximo 120 caracteres.',
  ),
  template_service_completed: nullableTrimmedString(
    120,
    'O template de serviço concluído deve ter no máximo 120 caracteres.',
  ),
  template_satisfaction_survey: nullableTrimmedString(
    120,
    'O template de satisfação deve ter no máximo 120 caracteres.',
  ),
  message_inbound_auto_reply: nullableTrimmedString(
    2000,
    'A mensagem de resposta automática deve ter no máximo 2000 caracteres.',
  ),
  message_os_created: nullableTrimmedString(
    2000,
    'A mensagem de OS aberta deve ter no máximo 2000 caracteres.',
  ),
  message_estimate_ready: nullableTrimmedString(
    2000,
    'A mensagem de orçamento deve ter no máximo 2000 caracteres.',
  ),
  message_service_completed: nullableTrimmedString(
    2000,
    'A mensagem de serviço concluído deve ter no máximo 2000 caracteres.',
  ),
  message_satisfaction_survey: nullableTrimmedString(
    2000,
    'A mensagem de satisfação deve ter no máximo 2000 caracteres.',
  ),
  authorized_brands: nullableTrimmedString(
    500,
    'As marcas autorizadas devem ter no máximo 500 caracteres.',
  ),
  session_timeout_minutes: z.coerce
    .number()
    .int('O tempo de sessão deve ser um número inteiro.')
    .min(5, 'O tempo mínimo de sessão é 5 minutos.')
    .max(1440, 'O tempo máximo de sessão é 1440 minutos (24 horas).'),
})

export type WhatsAppAutomationSettingsSchema = z.input<
  typeof whatsappAutomationSettingsSchema
>
export type WhatsAppAutomationSettingsValues = z.output<
  typeof whatsappAutomationSettingsSchema
>
