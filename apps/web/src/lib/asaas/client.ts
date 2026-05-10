import type {
  AsaasEnvironment,
  AsaasCustomer,
  AsaasCharge,
  AsaasPixQrCode,
  AsaasCreateCustomerInput,
  AsaasCreateChargeInput,
} from './types'

const BASE_URLS: Record<AsaasEnvironment, string> = {
  sandbox: 'https://sandbox.asaas.com/api/v3',
  production: 'https://api.asaas.com/api/v3',
}

export class AsaasClient {
  private readonly baseUrl: string
  private readonly apiKey: string

  constructor(apiKey: string, environment: AsaasEnvironment = 'sandbox') {
    this.baseUrl = BASE_URLS[environment]
    this.apiKey = apiKey
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        'access_token': this.apiKey,
        'Content-Type': 'application/json',
        ...init.headers,
      },
      cache: 'no-store',
    })

    if (!response.ok) {
      let message = `Asaas respondeu HTTP ${response.status}`
      try {
        const body = await response.json() as { errors?: Array<{ description?: string }> }
        const desc = body.errors?.[0]?.description
        if (desc) message = desc
      } catch { /* ignora */ }
      throw new Error(message)
    }

    return response.json() as Promise<T>
  }

  async findCustomerByExternalReference(ref: string): Promise<AsaasCustomer | null> {
    const data = await this.request<{ data: AsaasCustomer[] }>(
      `/customers?externalReference=${encodeURIComponent(ref)}&limit=1`,
    )
    return data.data[0] ?? null
  }

  async createCustomer(input: AsaasCreateCustomerInput): Promise<AsaasCustomer> {
    return this.request<AsaasCustomer>('/customers', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  }

  async findOrCreateCustomer(input: AsaasCreateCustomerInput & { externalReference: string }): Promise<AsaasCustomer> {
    const existing = await this.findCustomerByExternalReference(input.externalReference)
    if (existing) return existing
    return this.createCustomer(input)
  }

  async createCharge(input: AsaasCreateChargeInput): Promise<AsaasCharge> {
    return this.request<AsaasCharge>('/payments', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  }

  async getPixQrCode(chargeId: string): Promise<AsaasPixQrCode> {
    return this.request<AsaasPixQrCode>(`/payments/${encodeURIComponent(chargeId)}/pixQrCode`)
  }

  async getPixQrCodeSafe(charge: import('./types').AsaasCharge): Promise<AsaasPixQrCode> {
    // 1. Tenta extrair da própria resposta da cobrança (sem chamada extra)
    if (charge.pixTransaction?.qrCode?.payload) {
      return {
        encodedImage: charge.pixTransaction.qrCode.encodedImage ?? null,
        payload: charge.pixTransaction.qrCode.payload,
        expirationDate: charge.pixTransaction.expirationDate ?? null,
      }
    }
    // 2. Tenta o endpoint dedicado
    try {
      return await this.getPixQrCode(charge.id)
    } catch {
      // 3. Fallback: usa o invoiceUrl como "copia e cola" visual
      return {
        encodedImage: null,
        payload: charge.invoiceUrl ?? null,
        expirationDate: null,
      }
    }
  }
}

export const createAsaasClient = (apiKey: string, environment: AsaasEnvironment) =>
  new AsaasClient(apiKey, environment)
