import type { Tables } from '@/lib/supabase/database.types'
import { DEFAULT_WHATSAPP_MESSAGES } from '@/lib/whatsapp/message-templates'

type WhatsAppAutomationSettingsRow = Pick<
  Tables<'whatsapp_automation_settings'>,
  | 'enabled'
  | 'provider'
  | 'base_url'
  | 'graph_api_version'
  | 'app_id'
  | 'app_secret'
  | 'phone_number_id'
  | 'business_account_id'
  | 'access_token'
  | 'webhook_verify_token'
  | 'evolution_base_url'
  | 'evolution_api_key'
  | 'evolution_instance_name'
  | 'evolution_webhook_url'
  | 'default_country_code'
  | 'templates_language'
  | 'notify_os_created'
  | 'notify_inbound_message'
  | 'notify_estimate_ready'
  | 'notify_service_completed'
  | 'notify_satisfaction_survey'
  | 'template_os_created'
  | 'template_estimate_ready'
  | 'template_service_completed'
  | 'template_satisfaction_survey'
  | 'message_inbound_auto_reply'
  | 'message_os_created'
  | 'message_estimate_ready'
  | 'message_service_completed'
  | 'message_satisfaction_survey'
  | 'authorized_brands'
  | 'session_timeout_minutes'
>

export type WhatsAppAutomationProvider = 'whatsapp_cloud_api' | 'evolution_api'

export interface ResolvedWhatsAppAutomationSettings {
  enabled: boolean
  provider: WhatsAppAutomationProvider
  baseUrl: string
  graphApiVersion: string
  appId: string | null
  appSecretConfigured: boolean
  phoneNumberId: string | null
  businessAccountId: string | null
  accessTokenConfigured: boolean
  webhookVerifyTokenConfigured: boolean
  evolutionBaseUrl: string
  evolutionApiKeyConfigured: boolean
  evolutionInstanceName: string | null
  evolutionWebhookUrl: string | null
  defaultCountryCode: string
  templatesLanguage: string
  notifyInboundMessage: boolean
  notifyOsCreated: boolean
  notifyEstimateReady: boolean
  notifyServiceCompleted: boolean
  notifySatisfactionSurvey: boolean
  templateOsCreated: string | null
  templateEstimateReady: string | null
  templateServiceCompleted: string | null
  templateSatisfactionSurvey: string | null
  messageInboundAutoReply: string
  messageOsCreated: string
  messageEstimateReady: string
  messageServiceCompleted: string
  messageSatisfactionSurvey: string
  authorizedBrands: string | null
  sessionTimeoutMinutes: number
}

export const WHATSAPP_AUTOMATION_DEFAULTS: ResolvedWhatsAppAutomationSettings = {
  enabled: false,
  provider: 'whatsapp_cloud_api',
  baseUrl: 'graph.facebook.com',
  graphApiVersion: 'v16.0',
  appId: null,
  appSecretConfigured: false,
  phoneNumberId: null,
  businessAccountId: null,
  accessTokenConfigured: false,
  webhookVerifyTokenConfigured: false,
  evolutionBaseUrl: 'http://127.0.0.1:8080',
  evolutionApiKeyConfigured: false,
  evolutionInstanceName: null,
  evolutionWebhookUrl: null,
  defaultCountryCode: '55',
  templatesLanguage: 'pt_BR',
  notifyInboundMessage: false,
  notifyOsCreated: false,
  notifyEstimateReady: false,
  notifyServiceCompleted: false,
  notifySatisfactionSurvey: false,
  templateOsCreated: null,
  templateEstimateReady: null,
  templateServiceCompleted: null,
  templateSatisfactionSurvey: null,
  messageInboundAutoReply: DEFAULT_WHATSAPP_MESSAGES.inboundAutoReply,
  messageOsCreated: DEFAULT_WHATSAPP_MESSAGES.osCreated,
  messageEstimateReady: DEFAULT_WHATSAPP_MESSAGES.estimateReady,
  messageServiceCompleted: DEFAULT_WHATSAPP_MESSAGES.serviceCompleted,
  messageSatisfactionSurvey: DEFAULT_WHATSAPP_MESSAGES.satisfactionSurvey,
  authorizedBrands: null,
  sessionTimeoutMinutes: 240,
}

const cleanNullableText = (value: string | null | undefined) => {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

export const resolveWhatsAppAutomationSettings = (
  settings: WhatsAppAutomationSettingsRow | null | undefined,
): ResolvedWhatsAppAutomationSettings => ({
  enabled: settings?.enabled ?? WHATSAPP_AUTOMATION_DEFAULTS.enabled,
  provider:
    settings?.provider === 'evolution_api'
      ? 'evolution_api'
      : WHATSAPP_AUTOMATION_DEFAULTS.provider,
  baseUrl: cleanNullableText(settings?.base_url) ?? WHATSAPP_AUTOMATION_DEFAULTS.baseUrl,
  graphApiVersion:
    cleanNullableText(settings?.graph_api_version) ??
    WHATSAPP_AUTOMATION_DEFAULTS.graphApiVersion,
  appId: cleanNullableText(settings?.app_id),
  appSecretConfigured: !!cleanNullableText(settings?.app_secret),
  phoneNumberId: cleanNullableText(settings?.phone_number_id),
  businessAccountId: cleanNullableText(settings?.business_account_id),
  accessTokenConfigured: !!cleanNullableText(settings?.access_token),
  webhookVerifyTokenConfigured: !!cleanNullableText(settings?.webhook_verify_token),
  evolutionBaseUrl:
    cleanNullableText(settings?.evolution_base_url) ??
    WHATSAPP_AUTOMATION_DEFAULTS.evolutionBaseUrl,
  evolutionApiKeyConfigured: !!cleanNullableText(settings?.evolution_api_key),
  evolutionInstanceName: cleanNullableText(settings?.evolution_instance_name),
  evolutionWebhookUrl: cleanNullableText(settings?.evolution_webhook_url),
  defaultCountryCode:
    cleanNullableText(settings?.default_country_code) ??
    WHATSAPP_AUTOMATION_DEFAULTS.defaultCountryCode,
  templatesLanguage:
    cleanNullableText(settings?.templates_language) ??
    WHATSAPP_AUTOMATION_DEFAULTS.templatesLanguage,
  notifyInboundMessage: settings?.notify_inbound_message ?? false,
  notifyOsCreated: settings?.notify_os_created ?? false,
  notifyEstimateReady: settings?.notify_estimate_ready ?? false,
  notifyServiceCompleted: settings?.notify_service_completed ?? false,
  notifySatisfactionSurvey: settings?.notify_satisfaction_survey ?? false,
  templateOsCreated: cleanNullableText(settings?.template_os_created),
  templateEstimateReady: cleanNullableText(settings?.template_estimate_ready),
  templateServiceCompleted: cleanNullableText(settings?.template_service_completed),
  templateSatisfactionSurvey: cleanNullableText(settings?.template_satisfaction_survey),
  messageInboundAutoReply:
    cleanNullableText(settings?.message_inbound_auto_reply) ??
    WHATSAPP_AUTOMATION_DEFAULTS.messageInboundAutoReply,
  messageOsCreated:
    cleanNullableText(settings?.message_os_created) ??
    WHATSAPP_AUTOMATION_DEFAULTS.messageOsCreated,
  messageEstimateReady:
    cleanNullableText(settings?.message_estimate_ready) ??
    WHATSAPP_AUTOMATION_DEFAULTS.messageEstimateReady,
  messageServiceCompleted:
    cleanNullableText(settings?.message_service_completed) ??
    WHATSAPP_AUTOMATION_DEFAULTS.messageServiceCompleted,
  messageSatisfactionSurvey:
    cleanNullableText(settings?.message_satisfaction_survey) ??
    WHATSAPP_AUTOMATION_DEFAULTS.messageSatisfactionSurvey,
  authorizedBrands: cleanNullableText(settings?.authorized_brands) ?? null,
  sessionTimeoutMinutes:
    settings?.session_timeout_minutes ?? WHATSAPP_AUTOMATION_DEFAULTS.sessionTimeoutMinutes,
})

export const maskSecretState = (value: string | null | undefined) =>
  cleanNullableText(value) ? 'configured' : 'empty'
