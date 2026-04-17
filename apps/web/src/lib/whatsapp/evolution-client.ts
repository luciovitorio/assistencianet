export interface EvolutionApiRuntimeConfig {
  baseUrl: string
  apiKey: string
  instanceName: string | null
}

export interface EvolutionApiValidationResult {
  instanceCount: number
  instanceFound: boolean | null
}

export interface EvolutionApiConnectionResult {
  instanceName: string
  state: string | null
  connectedPhone: string | null
}

export interface EvolutionApiQrCodeResult {
  base64: string | null
  code: string | null
  pairingCode: string | null
  count: number | null
}

export interface EvolutionApiSendTextInput {
  number: string
  text: string
  /** Tempo em ms para exibir o indicador "digitando…" antes de enviar. */
  delay?: number
}

type EvolutionInstance = {
  name?: string
  instanceName?: string
  connectionStatus?: string
  ownerJid?: string
  number?: string
  status?: string
  token?: string
  instance?: {
    instanceName?: string
    instanceId?: string
    ownerJid?: string
    number?: string
    status?: string
  }
}

type EvolutionConnectionResponse = {
  instance?: {
    instanceName?: string
    state?: string
  }
}

type EvolutionQrCodeResponse = {
  base64?: string
  code?: string
  pairingCode?: string
  count?: number
}

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '')

const getInstanceName = (instance: EvolutionInstance) =>
  instance.instanceName ?? instance.name ?? instance.instance?.instanceName ?? null

const normalizeEvolutionPhone = (value: string | null | undefined) => {
  const identifier = value?.split('@')[0]?.trim()
  if (!identifier) return null

  const digits = identifier.replace(/\D/g, '')
  return digits || null
}

const getConnectedPhone = (instance: EvolutionInstance) =>
  normalizeEvolutionPhone(
    instance.ownerJid ?? instance.number ?? instance.instance?.ownerJid ?? instance.instance?.number
  )

const getEvolutionErrorMessage = async (response: Response) => {
  if (response.status === 401) {
    return 'Evolution API respondeu Unauthorized. Confira se a API key da Evolution foi salva corretamente.'
  }

  try {
    const data = (await response.json()) as {
      message?: string
      error?: string
      response?: { message?: string | string[] }
    }
    const message = data.response?.message ?? data.message ?? data.error

    if (Array.isArray(message)) {
      return message.join(' ')
    }

    if (typeof message === 'string' && message.trim()) {
      return message
    }
  } catch {
    // Evolution may return an empty body for some 4xx/5xx responses.
  }

  return `Evolution API respondeu HTTP ${response.status}.`
}

export class EvolutionApiClient {
  private readonly baseUrl: string
  private readonly apiKey: string
  private readonly instanceName: string | null

  constructor(config: EvolutionApiRuntimeConfig) {
    this.baseUrl = trimTrailingSlash(config.baseUrl.trim())
    this.apiKey = config.apiKey.trim()
    this.instanceName = config.instanceName?.trim() || null
  }

  private async request<T>(path: string, init: RequestInit = {}) {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        apikey: this.apiKey,
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...init.headers,
      },
      cache: 'no-store',
    })

    if (!response.ok) {
      throw new Error(await getEvolutionErrorMessage(response))
    }

    if (response.status === 204) {
      return null as T
    }

    const text = await response.text()

    if (!text.trim()) {
      return null as T
    }

    return JSON.parse(text) as T
  }

  async fetchInstances() {
    const instances = await this.request<EvolutionInstance[]>('/instance/fetchInstances', {
      method: 'GET',
    })

    return Array.isArray(instances) ? instances : []
  }

  async validate(): Promise<EvolutionApiValidationResult> {
    const instances = await this.fetchInstances()
    const instanceFound = this.instanceName
      ? instances.some((instance) => getInstanceName(instance) === this.instanceName)
      : null

    return {
      instanceCount: instances.length,
      instanceFound,
    }
  }

  async createInstance() {
    if (!this.instanceName) {
      throw new Error('Informe o nome da instância da Evolution API.')
    }

    const instances = await this.fetchInstances()
    const existing = instances.find((instance) => getInstanceName(instance) === this.instanceName)

    if (existing) {
      return {
        instanceName: this.instanceName,
        alreadyExists: true,
      }
    }

    await this.request<unknown>('/instance/create', {
      method: 'POST',
      body: JSON.stringify({
        instanceName: this.instanceName,
        integration: 'WHATSAPP-BAILEYS',
      }),
    })

    return {
      instanceName: this.instanceName,
      alreadyExists: false,
    }
  }

  async connectInstance(): Promise<EvolutionApiQrCodeResult> {
    if (!this.instanceName) {
      throw new Error('Informe o nome da instância da Evolution API.')
    }

    const result = await this.request<EvolutionQrCodeResponse>(
      `/instance/connect/${encodeURIComponent(this.instanceName)}`,
      { method: 'GET' }
    )

    return {
      base64: result?.base64 ?? null,
      code: result?.code ?? null,
      pairingCode: result?.pairingCode ?? null,
      count: typeof result?.count === 'number' ? result.count : null,
    }
  }

  async getConnectionState(): Promise<EvolutionApiConnectionResult> {
    if (!this.instanceName) {
      throw new Error('Informe o nome da instância da Evolution API.')
    }

    const [result, instances] = await Promise.all([
      this.request<EvolutionConnectionResponse>(
        `/instance/connectionState/${encodeURIComponent(this.instanceName)}`,
        { method: 'GET' }
      ),
      this.fetchInstances(),
    ])
    const instanceName = result.instance?.instanceName ?? this.instanceName
    const currentInstance = instances.find((instance) => getInstanceName(instance) === instanceName)

    return {
      instanceName,
      state: result.instance?.state ?? null,
      connectedPhone: currentInstance ? getConnectedPhone(currentInstance) : null,
    }
  }

  async sendText({ number, text, delay }: EvolutionApiSendTextInput) {
    if (!this.instanceName) {
      throw new Error('Informe o nome da instância da Evolution API.')
    }

    await this.request<unknown>(`/message/sendText/${encodeURIComponent(this.instanceName)}`, {
      method: 'POST',
      body: JSON.stringify({
        number,
        text,
        delay,
        linkPreview: false,
      }),
    })

    return {
      instanceName: this.instanceName,
      number,
    }
  }

  async logoutInstance() {
    if (!this.instanceName) {
      throw new Error('Informe o nome da instância da Evolution API.')
    }

    await this.request<unknown>(`/instance/logout/${encodeURIComponent(this.instanceName)}`, {
      method: 'DELETE',
    })

    return {
      instanceName: this.instanceName,
    }
  }

  async deleteInstance() {
    if (!this.instanceName) {
      throw new Error('Informe o nome da instância da Evolution API.')
    }

    await this.request<unknown>(`/instance/delete/${encodeURIComponent(this.instanceName)}`, {
      method: 'DELETE',
    })

    return {
      instanceName: this.instanceName,
    }
  }
}

export const createEvolutionApiClient = (config: EvolutionApiRuntimeConfig) =>
  new EvolutionApiClient(config)
