import { notFound, redirect } from 'next/navigation'
import { getCompanyContext } from '@/lib/auth/company-context'
import { createClient } from '@/lib/supabase/server'
import { STATUS_LABELS, type ServiceOrderStatus } from '@/lib/validations/service-order'
import { ServiceOrderPrintActions } from './service-order-print-actions'

type ServiceOrderPrintPageProps = {
  params: Promise<{ id: string }>
}

const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
})

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
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

export default async function ServiceOrderPrintPage({ params }: ServiceOrderPrintPageProps) {
  const { id } = await params
  const supabase = await createClient()

  let companyId: string
  try {
    const context = await getCompanyContext()
    companyId = context.companyId
  } catch {
    redirect('/dashboard')
  }

  const { data: serviceOrder, error: serviceOrderError } = await supabase
    .from('service_orders')
    .select(
      'id, number, status, client_id, branch_id, technician_id, device_type, device_brand, device_model, device_serial, device_color, device_internal_code, device_condition, reported_issue, estimated_delivery, notes, created_at',
    )
    .eq('id', id)
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .maybeSingle()

  if (serviceOrderError || !serviceOrder) {
    notFound()
  }

  const [{ data: company }, { data: client }, { data: branch }, { data: technician }] =
    await Promise.all([
      supabase
        .from('companies')
        .select('name, cnpj, phone, email')
        .eq('id', companyId)
        .single(),
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
      serviceOrder.technician_id
        ? supabase
            .from('employees')
            .select('name')
            .eq('id', serviceOrder.technician_id)
            .eq('company_id', companyId)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ])

  if (!company) notFound()

  const statusLabel =
    STATUS_LABELS[serviceOrder.status as ServiceOrderStatus] ?? serviceOrder.status

  return (
    <main className="min-h-screen bg-neutral-100 px-4 py-6 print:block print:min-h-0 print:bg-white print:px-0 print:py-0">
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 8mm; }
          html, body { margin: 0 !important; padding: 0 !important; }
          /* Conteúdo ocupa apenas a metade superior da folha A4 (148.5mm - margem) */
          .print-sheet { height: 140mm; display: flex; flex-direction: column; overflow: hidden; }
          .print-notes { flex: 1 1 auto; min-height: 22mm; }
        }
      `}</style>

      <div className="mx-auto w-full max-w-205 space-y-3 print:max-w-none print:space-y-0">
        <ServiceOrderPrintActions />

        <section className="print-sheet overflow-hidden rounded-3xl border border-border bg-white shadow-sm print:overflow-visible print:rounded-none print:border-0 print:shadow-none">
          {/* Header */}
          <div className="flex items-start justify-between gap-6 border-b border-border px-6 py-5 print:px-4 print:py-2.5">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground print:text-[8.5px]">
                Ordem de Serviço
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground print:mt-0 print:text-[17px]">
                OS #{serviceOrder.number}
              </h1>
              <div className="mt-1.5 flex items-center gap-2 print:mt-0.5">
                <span className="text-xs text-muted-foreground print:text-[9px]">
                  {dateTimeFormatter.format(new Date(serviceOrder.created_at))}
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
              {branch?.name && (
                <p className="mt-0.5 text-xs text-muted-foreground print:text-[9px]">
                  {branch.name}
                  {branch.city || branch.state
                    ? ` · ${[branch.city, branch.state].filter(Boolean).join('/')}`
                    : ''}
                </p>
              )}
            </div>
          </div>

          {/* Body */}
          <div className="flex flex-col gap-0 px-6 print:px-4">
            {/* Row 1: Cliente + Equipamento */}
            <div className="grid grid-cols-3 gap-0 border-b border-border py-4 print:py-2">
              {/* Cliente */}
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

              {/* Equipamento */}
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

            {/* Row 2: Atendimento horizontal */}
            <div className="border-b border-border py-4 print:py-2">
              <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground print:text-[8.5px]">
                Atendimento
              </h2>
              <dl className="mt-2 flex gap-10 print:mt-1">
                <Field
                  label="Previsão de entrega"
                  value={
                    serviceOrder.estimated_delivery
                      ? dateFormatter.format(
                          new Date(serviceOrder.estimated_delivery + 'T12:00:00'),
                        )
                      : null
                  }
                />
                <Field label="Técnico responsável" value={technician?.name} />
              </dl>
            </div>

            {/* Row 3: Problema relatado */}
            <div
              className={
                serviceOrder.device_condition || serviceOrder.notes
                  ? 'border-b border-border py-4 print:py-2'
                  : 'py-4 print:py-2'
              }
            >
              <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground print:text-[8.5px]">
                Problema relatado
              </h2>
              <p className="mt-1.5 whitespace-pre-wrap text-xs leading-relaxed text-foreground print:mt-1 print:text-[10px] print:leading-snug">
                {serviceOrder.reported_issue || '—'}
              </p>
            </div>

            {/* Row 4: Condição de entrada */}
            {serviceOrder.device_condition && (
              <div
                className={
                  serviceOrder.notes
                    ? 'border-b border-border py-4 print:py-2'
                    : 'py-4 print:py-2'
                }
              >
                <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground print:text-[8.5px]">
                  Condição de entrada
                </h2>
                <p className="mt-1.5 whitespace-pre-wrap text-xs leading-relaxed text-foreground print:mt-1 print:text-[10px] print:leading-snug">
                  {serviceOrder.device_condition}
                </p>
              </div>
            )}

            {/* Row 5: Observações internas */}
            {serviceOrder.notes && (
              <div className="py-4 print:py-2">
                <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground print:text-[8.5px]">
                  Observações internas
                </h2>
                <p className="mt-1.5 whitespace-pre-wrap text-xs leading-relaxed text-foreground print:mt-1 print:text-[10px] print:leading-snug">
                  {serviceOrder.notes}
                </p>
              </div>
            )}
          </div>

          {/* Anotações — preenche o restante da página */}
          <div className="print-notes flex flex-col px-6 pb-6 pt-0 print:flex-1 print:px-4 print:pb-3">
            <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground print:text-[8.5px]">
              Anotações
            </h2>
            <div className="mt-2 h-32 flex-1 rounded-xl border border-dashed border-muted-foreground/30 print:mt-1 print:h-auto" />
          </div>
        </section>
      </div>
    </main>
  )
}
