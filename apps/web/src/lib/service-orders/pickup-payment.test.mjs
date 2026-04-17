import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { calculatePickupPayment } from './pickup-payment.ts'

describe('calculatePickupPayment', () => {
  it('aplica desconto na retirada paga por Pix sem alterar o valor base do orçamento', () => {
    const payment = calculatePickupPayment({
      amountDue: 300,
      discountAmount: 25,
      paymentMethod: 'pix',
    })

    assert.deepEqual(payment, {
      amountDue: 300,
      discountAmount: 25,
      payableAmount: 275,
      amountReceived: 275,
      changeAmount: 0,
      netAmount: 275,
      paymentStatus: 'pago',
    })
  })

  it('calcula troco sobre o valor com desconto quando pagamento e dinheiro', () => {
    const payment = calculatePickupPayment({
      amountDue: 300,
      discountAmount: 30,
      paymentMethod: 'dinheiro',
      amountReceived: 300,
    })

    assert.equal(payment.payableAmount, 270)
    assert.equal(payment.changeAmount, 30)
    assert.equal(payment.netAmount, 270)
  })

  it('rejeita desconto maior que o valor do orçamento', () => {
    assert.throws(
      () =>
        calculatePickupPayment({
          amountDue: 100,
          discountAmount: 100.01,
          paymentMethod: 'pix',
        }),
      /desconto não pode ser maior/i,
    )
  })
})
