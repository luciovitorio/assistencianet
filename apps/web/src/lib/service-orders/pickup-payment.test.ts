import { describe, it, expect } from 'vitest'
import { calculatePickupPayment } from './pickup-payment'

describe('calculatePickupPayment', () => {
  it('aplica desconto na retirada paga por Pix sem alterar o valor base do orçamento', () => {
    const payment = calculatePickupPayment({
      amountDue: 300,
      discountAmount: 25,
      paymentMethod: 'pix',
    })

    expect(payment).toEqual({
      amountDue: 300,
      discountAmount: 25,
      payableAmount: 275,
      amountReceived: 275,
      changeAmount: 0,
      netAmount: 275,
      paymentStatus: 'pago',
    })
  })

  it('calcula troco sobre o valor com desconto quando pagamento é dinheiro', () => {
    const payment = calculatePickupPayment({
      amountDue: 300,
      discountAmount: 30,
      paymentMethod: 'dinheiro',
      amountReceived: 300,
    })

    expect(payment.payableAmount).toBe(270)
    expect(payment.changeAmount).toBe(30)
    expect(payment.netAmount).toBe(270)
  })

  it('rejeita desconto maior que o valor do orçamento', () => {
    expect(() =>
      calculatePickupPayment({
        amountDue: 100,
        discountAmount: 100.01,
        paymentMethod: 'pix',
      }),
    ).toThrow(/desconto não pode ser maior/i)
  })
})
