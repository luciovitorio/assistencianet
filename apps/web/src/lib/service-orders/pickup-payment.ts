import type {
  PaymentMethod,
  PaymentStatus,
} from '@/lib/validations/service-order'

export type PickupPaymentInput = {
  amountDue: number
  discountAmount?: number | null
  paymentMethod: PaymentMethod
  amountReceived?: number | null
}

export type PickupPaymentResult = {
  amountDue: number
  discountAmount: number
  payableAmount: number
  amountReceived: number
  changeAmount: number
  netAmount: number
  paymentStatus: PaymentStatus
}

export const calculatePickupPayment = ({
  amountDue: rawAmountDue,
  discountAmount: rawDiscountAmount,
  paymentMethod,
  amountReceived: rawAmountReceived,
}: PickupPaymentInput): PickupPaymentResult => {
  const amountDue = normalizeCurrency(rawAmountDue)
  const inputDiscountAmount = normalizeCurrency(rawDiscountAmount ?? 0)
  const isCashPayment = paymentMethod === 'dinheiro'
  const isWaivedPayment = paymentMethod === 'isento'

  if (inputDiscountAmount < 0) {
    throw new Error('O desconto não pode ser negativo.')
  }

  if (inputDiscountAmount > amountDue) {
    throw new Error('O desconto não pode ser maior que o valor do orçamento.')
  }

  const discountAmount = isWaivedPayment ? amountDue : inputDiscountAmount
  const payableAmount = normalizeCurrency(amountDue - discountAmount)
  const amountReceived = normalizeCurrency(
    isWaivedPayment
      ? 0
      : isCashPayment
        ? Number(rawAmountReceived ?? 0)
        : payableAmount,
  )

  if (isCashPayment && amountReceived < payableAmount) {
    throw new Error(
      `O valor recebido em dinheiro deve ser pelo menos ${formatCurrency(payableAmount)}.`,
    )
  }

  const changeAmount = normalizeCurrency(
    isCashPayment ? Math.max(amountReceived - payableAmount, 0) : 0,
  )
  const netAmount = normalizeCurrency(amountReceived - changeAmount)
  const paymentStatus: PaymentStatus = isWaivedPayment ? 'isento' : 'pago'

  return {
    amountDue,
    discountAmount,
    payableAmount,
    amountReceived,
    changeAmount,
    netAmount,
    paymentStatus,
  }
}

export const normalizeCurrency = (value: number) =>
  Math.round((Number(value) + Number.EPSILON) * 100) / 100

const formatCurrency = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
