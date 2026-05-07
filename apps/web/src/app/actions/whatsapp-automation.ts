'use server'

import { revalidatePath } from 'next/cache'
import { createAuditLog } from '@/lib/audit/audit-log'
import { getAdminContext } from '@/lib/auth/admin-context'
import { assertBillingFeature } from '@/lib/billing/entitlements'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { maskSecretState } from '@/lib/whatsapp/automation-settings'
import { createEvolutionApiClient } from '@/lib/whatsapp/evolution-client'
import { upsertEvolutionHealthNotification } from '@/app/actions/notifications'
import { createWhatsAppCloudApiClient } from '@/lib/whatsapp/official-client'
import {
  whatsappAutomationSettingsSchema,
  type WhatsAppAutomationSettingsSchema,
} from '@/lib/validations/whatsapp-automation-settings'

const WHATSAPP_SETTINGS_SELECT = `
  id,
  enabled,
  provider,
  base_url,
  graph_api_version,
  app_id,
  app_secret,
  phone_number_id,
  business_account_id,
  access_token,
  webhook_verify_token,
  evolution_base_url,
  evolution_api_key,
  evolution_instance_name,
  evolution_webhook_url,
  default_country_code,
  templates_language,
  notify_inbound_message,
  notify_os_created,
  notify_estimate_ready,
  notify_service_completed,
  notify_satisfaction_survey,
  template_os_created,
  template_estimate_ready,
  template_service_completed,
  template_satisfaction_survey,
  message_inbound_auto_reply,
  message_os_created,
  message_estimate_ready,
  message_service_completed,
  message_satisfaction_survey,
  authorized_brands,
  session_timeout_minutes
`

type PersistedWhatsAppSettings = {
  id: string
  enabled: boolean
  provider: string
  base_url: string
  graph_api_version: string
  app_id: string | null
  app_secret: string | null
  phone_number_id: string | null
  business_account_id: string | null
  access_token: string | null
  webhook_verify_token: string | null
  evolution_base_url: string
  evolution_api_key: string | null
  evolution_instance_name: string | null
  evolution_webhook_url: string | null
  default_country_code: string
  templates_language: string
  notify_inbound_message: boolean
  notify_os_created: boolean
  notify_estimate_ready: boolean
  notify_service_completed: boolean
  notify_satisfaction_survey: boolean
  template_os_created: string | null
  template_estimate_ready: string | null
  template_service_completed: string | null
  template_satisfaction_survey: string | null
  message_inbound_auto_reply: string | null
  message_os_created: string | null
  message_estimate_ready: string | null
  message_service_completed: string | null
  message_satisfaction_survey: string | null
  authorized_brands: string | null
  session_timeout_minutes: number
}

const revalidateWhatsAppAutomationPaths = () => {
  revalidatePath('/dashboard/configuracoes')
  revalidatePath('/dashboard/configuracoes/automacao')
}

const preservedSecret = (
  incoming: string | null,
  previous: string | null | undefined,
) => incoming ?? previous ?? null

const requireWhenEnabled = (
  condition: boolean,
  value: string | null | undefined,
  message: string,
) => {
  if (condition && !value?.trim()) {
    return message
  }

  return null
}

const requireTemplateWhenEnabled = (
  enabled: boolean,
  template: string | null | undefined,
  label: string,
) =>
  requireWhenEnabled(
    enabled,
    template,
    `Informe o template aprovado para ${label}.`,
  )

const toAuditSnapshot = (settings: PersistedWhatsAppSettings | null) => {
  if (!settings) return null

  return {
    enabled: settings.enabled,
    provider: settings.provider,
    base_url: settings.base_url,
    graph_api_version: settings.graph_api_version,
    app_id: settings.app_id,
    app_secret: maskSecretState(settings.app_secret),
    phone_number_id: settings.phone_number_id,
    business_account_id: settings.business_account_id,
    access_token: maskSecretState(settings.access_token),
    webhook_verify_token: maskSecretState(settings.webhook_verify_token),
    evolution_base_url: settings.evolution_base_url,
    evolution_api_key: maskSecretState(settings.evolution_api_key),
    evolution_instance_name: settings.evolution_instance_name,
    evolution_webhook_url: settings.evolution_webhook_url,
    default_country_code: settings.default_country_code,
    templates_language: settings.templates_language,
    notify_inbound_message: settings.notify_inbound_message,
    notify_os_created: settings.notify_os_created,
    notify_estimate_ready: settings.notify_estimate_ready,
    notify_service_completed: settings.notify_service_completed,
    notify_satisfaction_survey: settings.notify_satisfaction_survey,
    template_os_created: settings.template_os_created,
    template_estimate_ready: settings.template_estimate_ready,
    template_service_completed: settings.template_service_completed,
    template_satisfaction_survey: settings.template_satisfaction_survey,
    message_inbound_auto_reply: settings.message_inbound_auto_reply,
    message_os_created: settings.message_os_created,
    message_estimate_ready: settings.message_estimate_ready,
    message_service_completed: settings.message_service_completed,
    message_satisfaction_survey: settings.message_satisfaction_survey,
    authorized_brands: settings.authorized_brands,
    session_timeout_minutes: settings.session_timeout_minutes,
  }
}

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error) {
    return error.message
  }

  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message
  }

  return fallback
}

const getSavedWhatsAppSettings = async (companyId: string) => {
  const supabase = await createClient()
  await assertBillingFeature(supabase, companyId, 'whatsapp_bot')

  const { data: settings, error } = await supabase
    .from('whatsapp_automation_settings')
    .select(WHATSAPP_SETTINGS_SELECT)
    .eq('company_id', companyId)
    .maybeSingle<PersistedWhatsAppSettings>()

  if (error) {
    throw error
  }

  return settings
}

const getEvolutionEnvConfig = () => {
  const baseUrl = process.env.EVOLUTION_BASE_URL
  const apiKey = process.env.EVOLUTION_API_KEY
  if (!baseUrl || !apiKey) {
    throw new Error('Evolution API não configurada no servidor. Contate o suporte.')
  }
  return { baseUrl, apiKey }
}

const generateInstanceName = (companyId: string) =>
  companyId.replace(/-/g, '').substring(0, 16)

const getEvolutionClientFromSavedSettings = async (companyId: string) => {
  const settings = await getSavedWhatsAppSettings(companyId)
  const { baseUrl, apiKey } = getEvolutionEnvConfig()

  if (!settings?.evolution_instance_name) {
    throw new Error('Salve as configurações de WhatsApp antes de continuar.')
  }

  return {
    settings,
    client: createEvolutionApiClient({
      baseUrl,
      apiKey,
      instanceName: settings.evolution_instance_name,
    }),
  }
}

export async function saveWhatsAppAutomationSettings(
  data: WhatsAppAutomationSettingsSchema,
) {
  try {
    const { companyId } = await getAdminContext('configuracoes')
    const parsed = whatsappAutomationSettingsSchema.safeParse(data)

    if (!parsed.success) {
      return { error: parsed.error.issues[0].message }
    }

    const supabase = await createClient()
    await assertBillingFeature(supabase, companyId, 'whatsapp_bot')

    const { data: previousSettings } = await supabase
      .from('whatsapp_automation_settings')
      .select(WHATSAPP_SETTINGS_SELECT)
      .eq('company_id', companyId)
      .maybeSingle<PersistedWhatsAppSettings>()

    const nextAccessToken = preservedSecret(
      parsed.data.access_token,
      previousSettings?.access_token,
    )
    const nextAppSecret = preservedSecret(
      parsed.data.app_secret,
      previousSettings?.app_secret,
    )
    const nextWebhookVerifyToken = preservedSecret(
      parsed.data.webhook_verify_token,
      previousSettings?.webhook_verify_token,
    )

    const isMetaProvider = parsed.data.provider === 'whatsapp_cloud_api'
    const isEvolutionProvider = parsed.data.provider === 'evolution_api'

    const requiredError =
      requireWhenEnabled(
        parsed.data.enabled && isMetaProvider,
        parsed.data.app_id,
        'Informe o App ID da Meta.',
      ) ??
      requireWhenEnabled(
        parsed.data.enabled && isMetaProvider,
        nextAppSecret,
        'Informe o App Secret da Meta.',
      ) ??
      requireWhenEnabled(
        parsed.data.enabled && isMetaProvider,
        parsed.data.phone_number_id,
        'Informe o ID do número do WhatsApp.',
      ) ??
      requireWhenEnabled(
        parsed.data.enabled && isMetaProvider,
        parsed.data.business_account_id,
        'Informe o ID da conta WhatsApp Business.',
      ) ??
      requireWhenEnabled(
        parsed.data.enabled && isMetaProvider,
        nextAccessToken,
        'Informe o token permanente de acesso.',
      ) ??
      requireWhenEnabled(
        parsed.data.enabled && isMetaProvider,
        nextWebhookVerifyToken,
        'Informe o token de verificação do webhook.',
      ) ??
      (parsed.data.enabled && isEvolutionProvider && (!process.env.EVOLUTION_BASE_URL || !process.env.EVOLUTION_API_KEY)
        ? 'Evolution API não configurada no servidor. Contate o suporte.'
        : null) ??
      requireWhenEnabled(
        isEvolutionProvider && parsed.data.notify_inbound_message,
        parsed.data.message_inbound_auto_reply,
        'Informe a mensagem de resposta automática.',
      ) ??
      requireWhenEnabled(
        isEvolutionProvider && parsed.data.notify_os_created,
        parsed.data.message_os_created,
        'Informe a mensagem de OS aberta.',
      ) ??
      requireWhenEnabled(
        isEvolutionProvider && parsed.data.notify_estimate_ready,
        parsed.data.message_estimate_ready,
        'Informe a mensagem de orçamento pronto.',
      ) ??
      requireWhenEnabled(
        isEvolutionProvider && parsed.data.notify_service_completed,
        parsed.data.message_service_completed,
        'Informe a mensagem de serviço concluído.',
      ) ??
      requireWhenEnabled(
        isEvolutionProvider && parsed.data.notify_satisfaction_survey,
        parsed.data.message_satisfaction_survey,
        'Informe a mensagem de pesquisa de satisfação.',
      ) ??
      requireTemplateWhenEnabled(
        isMetaProvider && parsed.data.notify_os_created,
        parsed.data.template_os_created,
        'confirmação de OS aberta',
      ) ??
      requireTemplateWhenEnabled(
        isMetaProvider && parsed.data.notify_estimate_ready,
        parsed.data.template_estimate_ready,
        'orçamento pronto',
      ) ??
      requireTemplateWhenEnabled(
        isMetaProvider && parsed.data.notify_service_completed,
        parsed.data.template_service_completed,
        'serviço concluído',
      ) ??
      requireTemplateWhenEnabled(
        isMetaProvider && parsed.data.notify_satisfaction_survey,
        parsed.data.template_satisfaction_survey,
        'pesquisa de satisfação',
      )

    if (requiredError) {
      return { error: requiredError }
    }

    const existingInstanceName = previousSettings?.evolution_instance_name
    const instanceName = existingInstanceName ?? generateInstanceName(companyId)

    const payload = {
      company_id: companyId,
      enabled: parsed.data.enabled,
      provider: parsed.data.provider,
      base_url: parsed.data.base_url,
      graph_api_version: parsed.data.graph_api_version,
      app_id: parsed.data.app_id,
      app_secret: nextAppSecret,
      phone_number_id: parsed.data.phone_number_id,
      business_account_id: parsed.data.business_account_id,
      access_token: nextAccessToken,
      webhook_verify_token: nextWebhookVerifyToken,
      evolution_base_url: process.env.EVOLUTION_BASE_URL ?? undefined,
      evolution_api_key: process.env.EVOLUTION_API_KEY ?? undefined,
      evolution_instance_name: instanceName,
      evolution_webhook_url: undefined,
      default_country_code: parsed.data.default_country_code,
      templates_language: parsed.data.templates_language,
      notify_inbound_message: parsed.data.notify_inbound_message,
      notify_os_created: parsed.data.notify_os_created,
      notify_estimate_ready: parsed.data.notify_estimate_ready,
      notify_service_completed: parsed.data.notify_service_completed,
      notify_satisfaction_survey: parsed.data.notify_satisfaction_survey,
      template_os_created: parsed.data.template_os_created,
      template_estimate_ready: parsed.data.template_estimate_ready,
      template_service_completed: parsed.data.template_service_completed,
      template_satisfaction_survey: parsed.data.template_satisfaction_survey,
      message_inbound_auto_reply: parsed.data.message_inbound_auto_reply,
      message_os_created: parsed.data.message_os_created,
      message_estimate_ready: parsed.data.message_estimate_ready,
      message_service_completed: parsed.data.message_service_completed,
      message_satisfaction_survey: parsed.data.message_satisfaction_survey,
      authorized_brands: parsed.data.authorized_brands,
      session_timeout_minutes: parsed.data.session_timeout_minutes,
    }

    const { data: savedSettings, error } = await supabase
      .from('whatsapp_automation_settings')
      .upsert(payload, { onConflict: 'company_id' })
      .select(WHATSAPP_SETTINGS_SELECT)
      .single<PersistedWhatsAppSettings>()

    if (error) {
      throw error
    }

    await createAuditLog({
      action: previousSettings ? 'update' : 'create',
      entityType: 'company',
      entityId: savedSettings.id,
      companyId,
      summary: 'Configurações da automação do WhatsApp atualizadas.',
      metadata: {
        before: toAuditSnapshot(previousSettings),
        after: toAuditSnapshot(savedSettings),
      },
    })

    revalidateWhatsAppAutomationPaths()

    return { success: true }
  } catch (error: unknown) {
    return {
      error: getErrorMessage(error, 'Erro ao salvar a automação do WhatsApp.'),
    }
  }
}

export async function validateWhatsAppAutomationSdk() {
  try {
    const { companyId } = await getAdminContext('configuracoes')
    const settings = await getSavedWhatsAppSettings(companyId)

    if (!settings?.phone_number_id || !settings.access_token) {
      return {
        error: 'Informe e salve o ID do número e o token permanente antes de validar.',
      }
    }

    const client = createWhatsAppCloudApiClient({
      baseUrl: settings.base_url,
      graphApiVersion: settings.graph_api_version,
      appId: settings.app_id,
      appSecret: settings.app_secret,
      phoneNumberId: settings.phone_number_id,
      businessAccountId: settings.business_account_id,
      accessToken: settings.access_token,
      webhookVerifyToken: settings.webhook_verify_token,
    })

    return {
      success: true,
      version: client.version(),
    }
  } catch (error: unknown) {
    return {
      error: getErrorMessage(error, 'Erro ao validar a SDK oficial do WhatsApp.'),
    }
  }
}

export async function validateEvolutionApiSettings() {
  try {
    const { companyId } = await getAdminContext('configuracoes')
    const settings = await getSavedWhatsAppSettings(companyId)
    const { baseUrl, apiKey } = getEvolutionEnvConfig()

    const client = createEvolutionApiClient({
      baseUrl,
      apiKey,
      instanceName: settings?.evolution_instance_name ?? null,
    })
    const validation = await client.validate()

    if (validation.instanceFound === false) {
      return {
        error: 'A Evolution respondeu, mas a instância salva não foi encontrada.',
      }
    }

    return {
      success: true,
      instanceCount: validation.instanceCount,
      instanceFound: validation.instanceFound,
    }
  } catch (error: unknown) {
    return {
      error: getErrorMessage(error, 'Erro ao validar a Evolution API.'),
    }
  }
}

export async function getEvolutionApiConnectionState() {
  try {
    const { companyId } = await getAdminContext('configuracoes')
    const { client } = await getEvolutionClientFromSavedSettings(companyId)
    const [connection, webhook] = await Promise.all([
      client.getConnectionState(),
      client.getWebhook(),
    ])

    const appBaseUrl = process.env.APP_BASE_URL?.replace(/\/+$/, '')
    const expectedUrl = appBaseUrl
      ? `${appBaseUrl}/api/webhooks/evolution`
      : null
    const isConnected = connection.state === 'open'
    // Normalize both URLs before comparing (case-insensitive, strip trailing slash)
    const normalizeUrl = (u: string) => u.replace(/\/+$/, '').toLowerCase()
    const webhookOk =
      webhook.enabled &&
      !!webhook.url &&
      (!expectedUrl || normalizeUrl(webhook.url) === normalizeUrl(expectedUrl))
    const isOk = isConnected && webhookOk

    const notifBody = !isConnected
      ? 'O WhatsApp foi desconectado. Acesse Configurações → Automação para reconectar.'
      : 'Webhook desconfigurado — mensagens não chegam ao bot. Clique em "Registrar webhook".'

    // Sincroniza notificação e reseta o rate-limit do check automático (fire-and-forget)
    void upsertEvolutionHealthNotification(companyId, isOk, notifBody)
    void createAdminClient()
      .from('whatsapp_automation_settings')
      .update({ evolution_health_checked_at: new Date().toISOString() })
      .eq('company_id', companyId)

    return {
      success: true,
      ...connection,
      webhookOk,
    }
  } catch (error: unknown) {
    return {
      error: getErrorMessage(
        error,
        'Erro ao consultar a conexão da Evolution API.',
      ),
    }
  }
}

export async function getEvolutionWebhookUrlWarning(): Promise<string | null> {
  const url = process.env.APP_BASE_URL ?? ''
  if (!url) return null
  const isLocal =
    url.includes('localhost') ||
    url.includes('127.0.0.1') ||
    url.includes('ngrok') ||
    url.startsWith('http://')
  if (!isLocal) return null
  return `Ambiente local detectado. O webhook será registrado com a URL "${url}/api/webhooks/evolution". Mensagens de produção deixarão de chegar se essa URL não estiver acessível publicamente. Continuar mesmo assim?`
}

export async function createEvolutionApiInstance() {
  try {
    const { companyId } = await getAdminContext('configuracoes')
    const supabase = await createClient()
    const { data: company } = await supabase.from('companies').select('name').eq('id', companyId).single()
    const { client, settings } = await getEvolutionClientFromSavedSettings(companyId)
    const result = await client.createInstance({ browserName: company?.name ?? undefined })

    const appBaseUrl = process.env.APP_BASE_URL?.replace(/\/+$/, '')
    const webhookSecret = process.env.EVOLUTION_WEBHOOK_SECRET
    let webhookConfigured = false

    if (appBaseUrl && webhookSecret) {
      try {
        await client.setWebhook({
          url: `${appBaseUrl}/api/webhooks/evolution`,
          headers: { 'x-smartconserto-webhook-secret': webhookSecret },
        })
        webhookConfigured = true
      } catch {
        // falha no webhook é não-fatal: instância e QR Code continuam funcionando
      }
    }

    if (!result.alreadyExists) {
      await createAuditLog({
        action: 'create',
        entityType: 'company',
        entityId: settings.id,
        companyId,
        summary: 'Instância da Evolution API criada.',
        metadata: {
          instance_name: result.instanceName,
          provider: 'evolution_api',
        },
      })
    }

    revalidateWhatsAppAutomationPaths()

    return {
      success: true,
      webhookConfigured,
      ...result,
    }
  } catch (error: unknown) {
    return {
      error: getErrorMessage(error, 'Erro ao criar a instância da Evolution API.'),
    }
  }
}

export async function connectEvolutionApiInstance() {
  try {
    const { companyId } = await getAdminContext('configuracoes')
    const { client, settings } = await getEvolutionClientFromSavedSettings(companyId)
    const qrcode = await client.connectInstance()

    await createAuditLog({
      action: 'update',
      entityType: 'company',
      entityId: settings.id,
      companyId,
      summary: 'QR Code da instância Evolution solicitado.',
      metadata: {
        instance_name: settings.evolution_instance_name,
        provider: 'evolution_api',
        qrcode_count: qrcode.count,
      },
    })

    return {
      success: true,
      instanceName: settings.evolution_instance_name,
      ...qrcode,
    }
  } catch (error: unknown) {
    return {
      error: getErrorMessage(error, 'Erro ao gerar o QR Code da Evolution API.'),
    }
  }
}

export async function logoutEvolutionApiInstance() {
  try {
    const { companyId } = await getAdminContext('configuracoes')
    const { client, settings } = await getEvolutionClientFromSavedSettings(companyId)
    const result = await client.logoutInstance()

    await createAuditLog({
      action: 'logout',
      entityType: 'company',
      entityId: settings.id,
      companyId,
      summary: 'Sessão da Evolution API desconectada.',
      metadata: {
        instance_name: result.instanceName,
        provider: 'evolution_api',
      },
    })

    revalidateWhatsAppAutomationPaths()

    return {
      success: true,
      ...result,
    }
  } catch (error: unknown) {
    return {
      error: getErrorMessage(
        error,
        'Erro ao desconectar a instância da Evolution API.',
      ),
    }
  }
}

export async function deleteEvolutionApiInstance() {
  try {
    const { companyId } = await getAdminContext('configuracoes')
    const { client, settings } = await getEvolutionClientFromSavedSettings(companyId)
    const result = await client.deleteInstance()

    await createAuditLog({
      action: 'delete',
      entityType: 'company',
      entityId: settings.id,
      companyId,
      summary: 'Instância da Evolution API removida.',
      metadata: {
        instance_name: result.instanceName,
        provider: 'evolution_api',
      },
    })

    revalidateWhatsAppAutomationPaths()

    return {
      success: true,
      ...result,
    }
  } catch (error: unknown) {
    return {
      error: getErrorMessage(error, 'Erro ao remover a instância da Evolution API.'),
    }
  }
}
