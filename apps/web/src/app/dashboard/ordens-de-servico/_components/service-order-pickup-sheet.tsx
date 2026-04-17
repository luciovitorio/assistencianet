'use client'

import * as React from 'react'
import { Printer, Truck } from 'lucide-react'
import { toast } from 'sonner'
import { registerServiceOrderPickup } from '@/app/actions/service-orders'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { MaskedInputField } from '@/components/ui/masked-input-field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import {
  PAYMENT_METHOD_LABELS,
  type PaymentMethod,
} from '@/lib/validations/service-order'

interface ServiceOrderPickupSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  serviceOrderId: string
  serviceOrderNumber: number
  clientName: string | null
  amountDue: number | null
  onSuccess?: () => void
}

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

const PAYMENT_METHOD_OPTIONS: PaymentMethod[] = [
  'dinheiro',
  'pix',
  'cartao_credito',
  'cartao_debito',
  'transferencia',
  'isento',
]

const formatCurrency = (value: number) => currencyFormatter.format(value)

const parseMoneyValue = (value: string) => {
  if (!value) return 0

  const normalized = String(value)
    .trim()
    .replace(/R\$\s?/, '')
    .replace(/\./g, '')
    .replace(',', '.')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : 0
}

export function ServiceOrderPickupSheet({
  open,
  onOpenChange,
  serviceOrderId,
  serviceOrderNumber,
  clientName,
  amountDue,
  onSuccess,
}: ServiceOrderPickupSheetProps) {
  const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethod>('pix')
  const [discountAmount, setDiscountAmount] = React.useState('')
  const [amountReceived, setAmountReceived] = React.useState('')
  const [notes, setNotes] = React.useState('')
  const [printReceipt, setPrintReceipt] = React.useState(true)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const amountReceivedManualRef = React.useRef(false)

  const normalizedDiscountAmount = parseMoneyValue(discountAmount)
  const normalizedAmountReceived = parseMoneyValue(amountReceived)
  const isAmountDueMissing = amountDue == null
  const isCashPayment = paymentMethod === 'dinheiro'
  const isWaivedPayment = paymentMethod === 'isento'
  const isDiscountInvalid =
    !isAmountDueMissing && !isWaivedPayment && normalizedDiscountAmount > amountDue
  const effectiveDiscountAmount =
    amountDue == null
      ? 0
      : isWaivedPayment
        ? amountDue
        : Math.min(normalizedDiscountAmount, amountDue)
  const payableAmount =
    amountDue == null ? 0 : Math.max(amountDue - effectiveDiscountAmount, 0)
  const changeAmount =
    isCashPayment && amountDue != null
      ? Math.max(normalizedAmountReceived - payableAmount, 0)
      : 0
  const canSubmit =
    !isSubmitting &&
    !isAmountDueMissing &&
    !isDiscountInvalid &&
    (paymentMethod !== 'dinheiro' || normalizedAmountReceived >= payableAmount)

  React.useEffect(() => {
    if (!open) {
      setPaymentMethod('pix')
      setDiscountAmount('')
      setAmountReceived('')
      setNotes('')
      setPrintReceipt(true)
      setIsSubmitting(false)
      amountReceivedManualRef.current = false
      return
    }

    if (amountDue != null) {
      setAmountReceived(formatCurrency(amountDue))
      amountReceivedManualRef.current = false
    }
  }, [amountDue, open])

  // Reseta o flag de edição manual quando a forma de pagamento muda.
  // Deve ser definido ANTES do efeito de sync para garantir que rode primeiro.
  React.useEffect(() => {
    amountReceivedManualRef.current = false
  }, [paymentMethod])

  React.useEffect(() => {
    if (amountDue == null) return

    if (paymentMethod === 'isento') {
      setDiscountAmount('')
      setAmountReceived(formatCurrency(0))
      amountReceivedManualRef.current = false
      return
    }

    if (paymentMethod === 'dinheiro') {
      // Só atualiza automaticamente se o usuário não editou o campo manualmente.
      if (!amountReceivedManualRef.current) {
        setAmountReceived(formatCurrency(payableAmount))
      }
      return
    }

    // Pagamentos eletrônicos: sempre sincroniza com o valor a pagar.
    setAmountReceived(formatCurrency(payableAmount))
  }, [amountDue, payableAmount, paymentMethod])

  const handleSubmit = async () => {
    if (amountDue == null) {
      toast.error('Não foi possível identificar o valor do orçamento aprovado.')
      return
    }

    setIsSubmitting(true)
    try {
      const result = await registerServiceOrderPickup(serviceOrderId, {
        payment_method: paymentMethod,
        discount_amount: isWaivedPayment ? 0 : normalizedDiscountAmount,
        amount_received: paymentMethod === 'dinheiro' ? normalizedAmountReceived : undefined,
        notes,
      })

      if (result?.error) {
        toast.error(result.error)
        return
      }

      toast.success(`OS #${serviceOrderNumber}: retirada registrada com sucesso.`)

      if (printReceipt && result?.cashEntryId) {
        window.open(`/recibos/os/${result.cashEntryId}?autoPrint=1`, '_blank', 'noopener,noreferrer')
      }

      onSuccess?.()
      onOpenChange(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 data-[side=right]:w-full data-[side=right]:sm:w-[min(90vw,56rem)] data-[side=right]:sm:max-w-none data-[side=right]:lg:w-[min(82vw,64rem)]"
      >
        <SheetHeader className="border-b border-border px-6 py-4">
          <SheetTitle className="flex items-center gap-2">
            <Truck className="size-5 text-primary" />
            Registrar retirada
          </SheetTitle>
          <SheetDescription>
            Confirme a retirada da <strong>OS #{serviceOrderNumber}</strong>
            {clientName ? ` para ${clientName}` : ''}. O recebimento será lançado no caixa e a OS
            será finalizada.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
          <div className="rounded-xl border border-border bg-muted/30 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Valor do orçamento
                </p>
                <p className="mt-1 text-2xl font-bold text-foreground">
                  {amountDue == null ? 'Não disponível' : formatCurrency(amountDue)}
                </p>
              </div>
              <div className="rounded-full bg-primary/10 p-3 text-primary">
                <Printer className="size-5" />
              </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {effectiveDiscountAmount > 0 && amountDue != null
                ? `Desconto aplicado: ${formatCurrency(effectiveDiscountAmount)} · Total da retirada: ${formatCurrency(payableAmount)}.`
                : 'Esse valor será usado como base do recibo e do lançamento no caixa.'}
            </p>
          </div>

          {amountDue == null && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              Não foi possível localizar um orçamento aprovado para esta OS.
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="pickup-payment-method">Forma de pagamento</Label>
            <Select
              value={paymentMethod}
              onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}
            >
              <SelectTrigger id="pickup-payment-method">
                <SelectValue placeholder="Selecione a forma de pagamento">
                  {PAYMENT_METHOD_LABELS[paymentMethod]}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHOD_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {PAYMENT_METHOD_LABELS[option]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <MaskedInputField
                id="pickup-discount-amount"
                mask="money"
                label="Desconto na retirada"
                placeholder="R$ 0,00"
                value={isWaivedPayment ? '' : discountAmount}
                onChange={(event) => setDiscountAmount(event.target.value)}
                disabled={isAmountDueMissing || isWaivedPayment}
                error={
                  isDiscountInvalid
                    ? 'O desconto não pode ser maior que o orçamento.'
                    : undefined
                }
                helper={
                  isWaivedPayment
                    ? 'Cortesia/isento zera a cobrança automaticamente.'
                    : 'Use quando a assistência conceder abatimento na entrega.'
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pickup-amount-received">
                {isCashPayment
                  ? 'Valor recebido em dinheiro'
                  : paymentMethod === 'isento'
                    ? 'Valor recebido'
                    : 'Valor pago pelo cliente'}
              </Label>
              <MaskedInputField
                id="pickup-amount-received"
                mask="money"
                placeholder="R$ 0,00"
                value={amountReceived}
                onChange={(event) => {
                  setAmountReceived(event.target.value)
                  amountReceivedManualRef.current = true
                }}
                disabled={!isCashPayment}
              />
              <p className="text-xs text-muted-foreground">
                {isCashPayment
                  ? 'Informe o valor entregue pelo cliente para calcular o troco.'
                  : paymentMethod === 'isento'
                    ? 'Não haverá cobrança nesta retirada.'
                    : 'Para meios eletrônicos, o valor acompanha o total da retirada.'}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pickup-change">Troco</Label>
              <MaskedInputField
                id="pickup-change"
                mask="money"
                value={formatCurrency(changeAmount)}
                placeholder="R$ 0,00"
                readOnly
                disabled
              />
              <p className="text-xs text-muted-foreground">
                Calculado automaticamente quando a forma de pagamento for dinheiro.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pickup-notes">Observações da retirada</Label>
            <Textarea
              id="pickup-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Ex.: cliente conferiu o aparelho no balcão e retirou sem ressalvas."
              className="min-h-28"
            />
          </div>

          <div className="flex items-start gap-3 rounded-lg border border-border px-4 py-3">
            <Checkbox
              id="pickup-print-receipt"
              checked={printReceipt}
              onCheckedChange={(checked) => setPrintReceipt(checked === true)}
            />
            <div className="space-y-1">
              <Label htmlFor="pickup-print-receipt" className="cursor-pointer">
                Imprimir recibo após concluir
              </Label>
              <p className="text-xs text-muted-foreground">
                Abre o recibo em uma nova aba, pronto para impressão.
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-border px-6 py-4">
          <div className="mb-3 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Lançamento no caixa</span>
            <span className="font-semibold text-foreground">
              {amountDue == null
                ? 'Não disponível'
                : paymentMethod === 'isento'
                  ? 'Isento'
                  : formatCurrency(payableAmount)}
            </span>
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Voltar
            </Button>
            <Button onClick={handleSubmit} disabled={!canSubmit}>
              {isSubmitting ? 'Registrando...' : 'Concluir retirada'}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
