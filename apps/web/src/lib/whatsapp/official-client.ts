import WhatsApp from 'whatsapp'

export interface WhatsAppCloudApiRuntimeConfig {
  baseUrl: string
  graphApiVersion: string
  appId: string | null
  appSecret: string | null
  phoneNumberId: string
  businessAccountId: string | null
  accessToken: string
  webhookVerifyToken: string | null
}

const SDK_ENV_KEYS = [
  'WA_BASE_URL',
  'M4D_APP_ID',
  'M4D_APP_SECRET',
  'WA_PHONE_NUMBER_ID',
  'WA_BUSINESS_ACCOUNT_ID',
  'CLOUD_API_VERSION',
  'CLOUD_API_ACCESS_TOKEN',
  'WEBHOOK_VERIFICATION_TOKEN',
] as const

type SdkEnvKey = (typeof SDK_ENV_KEYS)[number]

const withSdkEnv = <T>(config: WhatsAppCloudApiRuntimeConfig, callback: () => T) => {
  const previousValues = new Map<SdkEnvKey, string | undefined>()

  for (const key of SDK_ENV_KEYS) {
    previousValues.set(key, process.env[key])
  }

  process.env.WA_BASE_URL = config.baseUrl
  process.env.M4D_APP_ID = config.appId ?? ''
  process.env.M4D_APP_SECRET = config.appSecret ?? ''
  process.env.WA_PHONE_NUMBER_ID = config.phoneNumberId
  process.env.WA_BUSINESS_ACCOUNT_ID = config.businessAccountId ?? ''
  process.env.CLOUD_API_VERSION = config.graphApiVersion
  process.env.CLOUD_API_ACCESS_TOKEN = config.accessToken
  process.env.WEBHOOK_VERIFICATION_TOKEN = config.webhookVerifyToken ?? ''

  try {
    return callback()
  } finally {
    for (const [key, value] of previousValues) {
      if (value === undefined) {
        delete process.env[key]
      } else {
        process.env[key] = value
      }
    }
  }
}

export const createWhatsAppCloudApiClient = (config: WhatsAppCloudApiRuntimeConfig) =>
  withSdkEnv(config, () => new WhatsApp(config.phoneNumberId as unknown as number))
