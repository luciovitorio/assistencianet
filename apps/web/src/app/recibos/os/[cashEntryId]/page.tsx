import { notFound, redirect } from 'next/navigation'
import { getCompanyContext } from '@/lib/auth/company-context'
import { createClient } from '@/lib/supabase/server'
import {
  PAYMENT_METHOD_LABELS,
  type PaymentMethod,
} from '@/lib/validations/service-order'
import { ReceiptPrintActions } from './receipt-print-actions'

type ReceiptPageProps = {
  params: Promise<{ cashEntryId: string }>
}

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
})

const formatCurrency = (value: number) => currencyFormatter.format(value)

export default async function ServiceOrderReceiptPage({ params }: ReceiptPageProps) {
  const { cashEntryId } = await params
  const supabase = await createClient()

  let companyId: string
  try {
    const context = await getCompanyContext()
    companyId = context.companyId
  } catch {
    redirect('/dashboard')
  }

  const { data: cashEntry, error: cashEntryError } = await supabase
    .from('cash_entries')
    .select(
      'id, service_order_id, branch_id, estimate_id, payment_method, amount_due, amount_received, change_amount, net_amount, notes, created_at',
    )
    .eq('id', cashEntryId)
    .eq('company_id', companyId)
    .single()

  if (cashEntryError || !cashEntry) {
    notFound()
  }

  const [{ data: serviceOrder }, { data: company }, { data: estimate }] = await Promise.all([
    supabase
      .from('service_orders')
      .select(
        'id, number, status, payment_status, client_id, branch_id, created_at, delivered_at, warranty_expires_at, payment_method, amount_paid, change_amount, pickup_notes',
      )
      .eq('id', cashEntry.service_order_id)
      .eq('company_id', companyId)
      .single(),
    supabase
      .from('companies')
      .select('name, cnpj, phone, email')
      .eq('id', companyId)
      .single(),
    cashEntry.estimate_id
      ? supabase
          .from('service_order_estimates')
          .select('id, version, total_amount, approved_at')
          .eq('id', cashEntry.estimate_id)
          .eq('company_id', companyId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  if (!serviceOrder || !company) {
    notFound()
  }

  const [{ data: client }, { data: branch }] = await Promise.all([
    supabase
      .from('clients')
      .select('name, phone, email, document')
      .eq('id', serviceOrder.client_id)
      .eq('company_id', companyId)
      .maybeSingle(),
    serviceOrder.branch_id
      ? supabase
          .from('branches')
          .select('name, phone, city, state')
          .eq('id', serviceOrder.branch_id)
          .eq('company_id', companyId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ])
  const discountAmount = Math.max(cashEntry.amount_due - cashEntry.net_amount, 0)

  return (
    <main className="min-h-screen bg-neutral-100 px-4 py-6 print:bg-white print:px-0 print:py-0">
      <div className="mx-auto w-full max-w-[960px] space-y-3 print:max-w-none print:space-y-0">
        <ReceiptPrintActions />

        <section className="overflow-hidden rounded-3xl border border-border bg-white shadow-sm print:rounded-none print:border-0 print:shadow-none">
          <div className="border-b border-border px-6 py-5 print:px-5 print:py-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                  Recibo de retirada
                </p>
                <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-foreground print:text-[26px]">
                  OS #{serviceOrder.number}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground print:text-[12px]">
                  Emitido em {dateTimeFormatter.format(new Date(cashEntry.created_at))}
                </p>
              </div>

              <div className="max-w-sm text-right">
                <p className="text-base font-semibold text-foreground print:text-[17px]">{company.name}</p>
                {company.cnpj && <p className="text-sm text-muted-foreground print:text-[12px]">CNPJ {company.cnpj}</p>}
                {company.phone && <p className="text-sm text-muted-foreground print:text-[12px]">{company.phone}</p>}
                {company.email && <p className="text-sm text-muted-foreground print:text-[12px]">{company.email}</p>}
                {branch?.name && (
                  <p className="mt-1.5 text-sm text-muted-foreground print:text-[12px]">
                    {branch.name}
                    {branch.city || branch.state
                      ? ` · ${[branch.city, branch.state].filter(Boolean).join('/')}`
                      : ''}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-5 px-6 py-5 md:grid-cols-[1.1fr_0.9fr] print:gap-4 print:px-5 print:py-4">
            <div className="space-y-4 print:space-y-3">
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Cliente
                </h2>
                <div className="mt-2 space-y-0.5 text-sm print:text-[12px]">
                  <p className="text-base font-semibold text-foreground print:text-[15px]">{client?.name ?? 'Não informado'}</p>
                  {client?.document && <p className="text-muted-foreground">{client.document}</p>}
                  {client?.phone && <p className="text-muted-foreground">{client.phone}</p>}
                  {client?.email && <p className="truncate text-muted-foreground">{client.email}</p>}
                </div>
              </div>

              <div>
                <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Resumo da retirada
                </h2>
                <dl className="mt-2 space-y-2 text-sm print:text-[12px]">
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-muted-foreground">Status da OS</dt>
                    <dd className="font-medium text-foreground">Finalizado</dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-muted-foreground">Forma de pagamento</dt>
                    <dd className="font-medium text-foreground">
                      {
                        PAYMENT_METHOD_LABELS[
                          cashEntry.payment_method as PaymentMethod
                        ]
                      }
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-muted-foreground">Data da retirada</dt>
                    <dd className="font-medium text-foreground">
                      {serviceOrder.delivered_at
                        ? dateTimeFormatter.format(new Date(serviceOrder.delivered_at))
                        : dateTimeFormatter.format(new Date(cashEntry.created_at))}
                    </dd>
                  </div>
                  {serviceOrder.warranty_expires_at && (
                    <div className="flex items-center justify-between gap-4">
                      <dt className="text-muted-foreground">Garantia válida até</dt>
                      <dd className="font-medium text-foreground">
                        {new Date(serviceOrder.warranty_expires_at + 'T12:00:00').toLocaleDateString('pt-BR')}
                      </dd>
                    </div>
                  )}
                  {estimate?.version != null && (
                    <div className="flex items-center justify-between gap-4">
                      <dt className="text-muted-foreground">Orçamento aprovado</dt>
                      <dd className="font-medium text-foreground">Versão {estimate.version}</dd>
                    </div>
                  )}
                </dl>
              </div>

              {(cashEntry.notes || serviceOrder.pickup_notes) && (
                <div>
                  <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    Observações
                  </h2>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-snug text-foreground print:text-[12px]">
                    {cashEntry.notes ?? serviceOrder.pickup_notes}
                  </p>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-border bg-muted/20 p-5 print:p-4">
              <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Fechamento financeiro
              </h2>

              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between gap-4 text-sm print:text-[12px]">
                  <span className="text-muted-foreground">Valor do orçamento</span>
                  <span className="font-medium text-foreground">
                    {formatCurrency(cashEntry.amount_due)}
                  </span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex items-center justify-between gap-4 text-sm print:text-[12px]">
                    <span className="text-muted-foreground">Desconto na retirada</span>
                    <span className="font-medium text-foreground">
                      {formatCurrency(discountAmount)}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between gap-4 text-sm print:text-[12px]">
                  <span className="text-muted-foreground">Valor recebido</span>
                  <span className="font-medium text-foreground">
                    {formatCurrency(cashEntry.amount_received)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4 text-sm print:text-[12px]">
                  <span className="text-muted-foreground">Troco</span>
                  <span className="font-medium text-foreground">
                    {formatCurrency(cashEntry.change_amount)}
                  </span>
                </div>
                <div className="border-t border-dashed border-border pt-3">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm font-semibold text-foreground print:text-[12px]">Valor liquidado</span>
                    <span className="text-xl font-bold text-foreground print:text-[24px]">
                      {formatCurrency(cashEntry.net_amount)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-5 rounded-xl bg-white px-4 py-2.5 text-xs leading-snug text-muted-foreground print:mt-4 print:text-[11px]">
                Este recibo confirma a retirada do equipamento e o registro do recebimento no
                caixa da assistência.
              </div>
            </div>
          </div>

          <div className="border-t border-border px-6 py-5 print:px-5 print:py-4">
            <div className="grid gap-6 md:grid-cols-2 print:gap-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Assinatura da assistência
                </p>
                <div className="mt-8 border-b border-dashed border-muted-foreground/40" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Assinatura do cliente
                </p>
                <div className="mt-8 border-b border-dashed border-muted-foreground/40" />
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
