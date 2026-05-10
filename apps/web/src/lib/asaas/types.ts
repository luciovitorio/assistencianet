export type AsaasEnvironment = 'sandbox' | 'production'

export interface AsaasCustomer {
  id: string
  name: string
  cpfCnpj: string | null
  email: string | null
  phone: string | null
  externalReference: string | null
}

export interface AsaasCharge {
  id: string
  status: string
  value: number
  netValue: number
  billingType: string
  dueDate: string
  invoiceUrl: string | null
  externalReference: string | null
  pixTransaction?: {
    qrCode?: {
      encodedImage?: string | null
      payload?: string | null
    } | null
    expirationDate?: string | null
  } | null
}

export interface AsaasPixQrCode {
  encodedImage: string | null
  payload: string | null
  expirationDate: string | null
}

export interface AsaasCreateCustomerInput {
  name: string
  cpfCnpj?: string
  email?: string
  mobilePhone?: string
  externalReference?: string
}

export interface AsaasCreateChargeInput {
  customer: string
  billingType: 'PIX'
  value: number
  dueDate: string
  description?: string
  externalReference?: string
}
