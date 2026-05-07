import { notFound, redirect } from 'next/navigation'
import { getCompanyContext } from '@/lib/auth/company-context'
import { createClient } from '@/lib/supabase/server'
import {
  ESTIMATE_ITEM_TYPE_LABELS,
  SERVICE_ORDER_ESTIMATE_STATUS_LABELS,
} from '@/lib/validations/service-order-estimate'
import { EstimatePrintActions } from './estimate-print-actions'

type EstimatePrintPageProps = {
  params: Promise<{ estimateId: string }>
}

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

const dateFormatter = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' })
const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
})

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground print:text-[8.5px]">
        {label}
      </dt>
      <dd className="mt-0.5 text-xs font-medium text-foreground print:text-[10px]">
        {value || '—'}
      </dd>
    </div>
  )
}

export default async function EstimatePrintPage({ params }: EstimatePrintPageProps) {
  const { estimateId } = await params
  const supabase = await createClient()

  let companyId: string
  try {
    const context = await getCompanyContext()
    companyId = context.companyId
  } catch {
    redirect('/dashboard')
  }

  const { data: estimate, error: estimateError } = await supabase
    .from('service_order_estimates')
    .select(
      `id, version, status, subtotal_amount, discount_amount, total_amount,
       valid_until, warranty_days, notes, created_at, service_order_id,
       items:service_order_estimate_items(
         id, item_type, description, quantity, unit_price, line_total, notes
       )`,
    )
    .eq('id', estimateId)
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .single()

  if (estimateError || !estimate) notFound()

  const [
    { data: serviceOrder },
    { data: company },
  ] = await Promise.all([
    supabase
      .from('service_orders')
      .select(
        'number, client_id, technician_id, device_type, device_brand, device_model, device_serial, device_color, device_internal_code, reported_issue, created_at',
      )
      .eq('id', estimate.service_order_id)
      .eq('company_id', companyId)
      .maybeSingle(),
    supabase
      .from('companies')
      .select('name, cnpj, phone, email')
      .eq('id', companyId)
      .single(),
  ])

  if (!serviceOrder || !company) notFound()

  const { data: client } = await supabase
    .from('clients')
    .select('name, phone, email, document')
    .eq('id', serviceOrder.client_id)
    .eq('company_id', companyId)
    .maybeSingle()

  const statusLabel =
    SERVICE_ORDER_ESTIMATE_STATUS_LABELS[
      estimate.status as keyof typeof SERVICE_ORDER_ESTIMATE_STATUS_LABELS
    ] ?? estimate.status

  const items = (estimate.items ?? []) as {
    id: string
    item_type: string
    description: string
    quantity: number
    unit_price: number
    line_total: number
    notes: string | null
  }[]

  return (
    <main className="min-h-screen bg-neutral-100 px-4 py-6 print:block print:min-h-0 print:bg-white print:px-0 print:py-0">
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 10mm; }
          html, body { margin: 0 !important; padding: 0 !important; }
        }
      `}</style>

      <div className="mx-auto w-full max-w-3xl space-y-3 print:max-w-none print:space-y-0">
        <EstimatePrintActions />

        <section className="overflow-hidden rounded-3xl border border-border bg-white shadow-sm print:overflow-visible print:rounded-none print:border-0 print:shadow-none">
          {/* Header */}
          <div className="flex items-start justify-between gap-6 border-b border-border px-6 py-5 print:px-4 print:py-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground print:text-[8.5px]">
                Orçamento
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground print:mt-0 print:text-[17px]">
                OS #{serviceOrder.number} — v{estimate.version}
              </h1>
              <div className="mt-1.5 flex items-center gap-2 print:mt-0.5">
                <span className="text-xs text-muted-foreground print:text-[9px]">
                  {dateTimeFormatter.format(new Date(estimate.created_at))}
                </span>
                <span className="text-muted-foreground/40">·</span>
                <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-medium text-foreground print:rounded print:bg-transparent print:px-0 print:text-[9px]">
                  {statusLabel}
                </span>
              </div>
            </div>

            <div className="text-right">
              <p className="text-sm font-bold text-foreground print:text-[11px]">{company.name}</p>
              {company.cnpj && (
                <p className="mt-0.5 text-xs text-muted-foreground print:text-[9px]">
                  CNPJ {company.cnpj}
                </p>
              )}
              {company.phone && (
                <p className="text-xs text-muted-foreground print:text-[9px]">{company.phone}</p>
              )}
              {company.email && (
                <p className="text-xs text-muted-foreground print:text-[9px]">{company.email}</p>
              )}
            </div>
          </div>

          {/* Cliente + Equipamento */}
          <div className="grid grid-cols-3 gap-0 border-b border-border px-6 py-4 print:px-4 print:py-2.5">
            <div className="border-r border-border pr-5 print:pr-3">
              <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground print:text-[8.5px]">
                Cliente
              </h2>
              <p className="mt-2 text-sm font-semibold text-foreground print:mt-1 print:text-[11px]">
                {client?.name ?? 'Não informado'}
              </p>
              <div className="mt-1 space-y-0.5 text-xs text-muted-foreground print:text-[9.5px]">
                {client?.document && <p>{client.document}</p>}
                {client?.phone && <p>{client.phone}</p>}
                {client?.email && <p className="truncate">{client.email}</p>}
              </div>
            </div>

            <div className="col-span-2 pl-5 print:pl-3">
              <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground print:text-[8.5px]">
                Equipamento
              </h2>
              <dl className="mt-2 grid grid-cols-3 gap-x-5 gap-y-3 print:mt-1 print:gap-y-1.5">
                <Field label="Tipo" value={serviceOrder.device_type} />
                <Field label="Marca" value={serviceOrder.device_brand} />
                <Field label="Modelo" value={serviceOrder.device_model} />
                <Field label="Nº de Série" value={serviceOrder.device_serial} />
                <Field label="Cor" value={serviceOrder.device_color} />
                <Field label="Código Interno" value={serviceOrder.device_internal_code} />
              </dl>
            </div>
          </div>

          {/* Validade + Garantia */}
          <div className="border-b border-border px-6 py-4 print:px-4 print:py-2.5">
            <dl className="flex gap-10">
              <Field
                label="Válido até"
                value={
                  estimate.valid_until
                    ? dateFormatter.format(new Date(`${estimate.valid_until}T12:00:00`))
                    : null
                }
              />
              <Field
                label="Garantia"
                value={estimate.warranty_days != null ? `${estimate.warranty_days} dias` : null}
              />
            </dl>
          </div>

          {/* Itens */}
          <div className="border-b border-border px-6 py-4 print:px-4 print:py-2.5">
            <h2 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground print:mb-2 print:text-[8.5px]">
              Itens do orçamento
            </h2>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-1.5 pr-3 text-left font-medium text-muted-foreground print:text-[9px]">
                    Tipo
                  </th>
                  <th className="py-1.5 pr-3 text-left font-medium text-muted-foreground print:text-[9px]">
                    Descrição
                  </th>
                  <th className="py-1.5 pr-3 text-right font-medium text-muted-foreground print:text-[9px]">
                    Qtd.
                  </th>
                  <th className="py-1.5 pr-3 text-right font-medium text-muted-foreground print:text-[9px]">
                    Unitário
                  </th>
                  <th className="py-1.5 text-right font-medium text-muted-foreground print:text-[9px]">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="py-2 pr-3 text-muted-foreground print:py-1.5 print:text-[9.5px]">
                      {ESTIMATE_ITEM_TYPE_LABELS[
                        item.item_type as keyof typeof ESTIMATE_ITEM_TYPE_LABELS
                      ] ?? item.item_type}
                    </td>
                    <td className="py-2 pr-3 print:py-1.5 print:text-[9.5px]">
                      <div>{item.description}</div>
                      {item.notes && (
                        <div className="text-[10px] text-muted-foreground print:text-[8.5px]">
                          {item.notes}
                        </div>
                      )}
                    </td>
                    <td className="py-2 pr-3 text-right print:py-1.5 print:text-[9.5px]">
                      {item.quantity}
                    </td>
                    <td className="py-2 pr-3 text-right print:py-1.5 print:text-[9.5px]">
                      {currencyFormatter.format(item.unit_price)}
                    </td>
                    <td className="py-2 text-right font-medium print:py-1.5 print:text-[9.5px]">
                      {currencyFormatter.format(item.line_total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totais */}
            <div className="mt-3 flex justify-end print:mt-2">
              <div className="w-52 space-y-1 text-xs print:text-[9.5px]">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{currencyFormatter.format(estimate.subtotal_amount)}</span>
                </div>
                {estimate.discount_amount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Desconto</span>
                    <span>− {currencyFormatter.format(estimate.discount_amount)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-border pt-1.5 text-sm font-semibold text-foreground print:text-[11px]">
                  <span>Total</span>
                  <span>{currencyFormatter.format(estimate.total_amount)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Observações */}
          {estimate.notes && (
            <div className="border-b border-border px-6 py-4 print:px-4 print:py-2.5">
              <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground print:text-[8.5px]">
                Observações
              </h2>
              <p className="mt-1.5 whitespace-pre-wrap text-xs leading-relaxed text-foreground print:mt-1 print:text-[9.5px] print:leading-snug">
                {estimate.notes}
              </p>
            </div>
          )}

          {/* Assinatura */}
          <div className="px-6 py-6 print:px-4 print:py-5">
            <p className="text-[10px] text-muted-foreground print:text-[8.5px]">
              Declaro que li e aceito o orçamento acima, autorizo a execução dos serviços e/ou
              fornecimento das peças descritas.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-10 print:mt-8 print:gap-16">
              <div>
                <div className="border-b border-foreground/30" />
                <p className="mt-1.5 text-[10px] text-muted-foreground print:text-[8.5px]">
                  Assinatura do cliente
                </p>
              </div>
              <div>
                <div className="border-b border-foreground/30" />
                <p className="mt-1.5 text-[10px] text-muted-foreground print:text-[8.5px]">
                  Data / Local
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
