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

  const deviceParts = [serviceOrder.device_type, serviceOrder.device_brand, serviceOrder.device_model]
    .filter(Boolean)
    .join(' · ')

  return (
    <main className="min-h-screen bg-neutral-100 px-4 py-6 print:block print:min-h-0 print:bg-white print:px-0 print:py-0">
      <style>{`
        @media print {
          @page { size: A5 landscape; margin: 6mm; }
          html, body { margin: 0 !important; padding: 0 !important; height: 100%; }
          .print-sheet { height: calc(148mm - 12mm); display: flex; flex-direction: column; page-break-after: avoid; page-break-inside: avoid; break-inside: avoid; }
          .print-notes { flex: 1 1 auto; min-height: 0; }
        }
      `}</style>

      <div className="mx-auto w-full max-w-205 space-y-3 print:max-w-none print:space-y-0">
        <ServiceOrderPrintActions />

        <section className="print-sheet overflow-hidden rounded-3xl border border-border bg-white text-[13px] shadow-sm print:rounded-none print:border-0 print:text-[12px] print:shadow-none print:leading-snug">
          {/* Header */}
          <div className="border-b border-border px-5 py-4 print:px-3 print:py-2">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground print:text-[10px]">
                  Ordem de serviço
                </p>
                <h1 className="mt-1 text-xl font-bold tracking-tight text-foreground print:mt-0 print:text-[18px]">
                  OS #{serviceOrder.number}
                </h1>
                <p className="mt-0.5 text-xs text-muted-foreground print:text-[10.5px]">
                  Aberta em {dateTimeFormatter.format(new Date(serviceOrder.created_at))}
                  {' · '}
                  Status: <span className="font-medium text-foreground">{statusLabel}</span>
                </p>
              </div>

              <div className="max-w-[55%] text-right">
                <p className="text-sm font-semibold text-foreground print:text-[13px]">{company.name}</p>
                {company.cnpj && (
                  <p className="text-xs text-muted-foreground print:text-[10.5px]">CNPJ {company.cnpj}</p>
                )}
                {company.phone && (
                  <p className="text-xs text-muted-foreground print:text-[10.5px]">{company.phone}</p>
                )}
                {branch?.name && (
                  <p className="mt-0.5 text-xs text-muted-foreground print:text-[10.5px]">
                    {branch.name}
                    {branch.city || branch.state
                      ? ` · ${[branch.city, branch.state].filter(Boolean).join('/')}`
                      : ''}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="grid gap-3 px-5 py-4 md:grid-cols-2 print:gap-2 print:px-3 print:py-2">
            {/* Cliente */}
            <div>
              <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground print:text-[10px]">
                Cliente
              </h2>
              <div className="mt-1 space-y-0.5 text-xs print:mt-0.5 print:text-[11.5px]">
                <p className="text-sm font-semibold text-foreground print:text-[13px]">
                  {client?.name ?? 'Não informado'}
                </p>
                {client?.document && <p className="text-muted-foreground">{client.document}</p>}
                {client?.phone && <p className="text-muted-foreground">{client.phone}</p>}
                {client?.email && (
                  <p className="truncate text-muted-foreground">{client.email}</p>
                )}
              </div>
            </div>

            {/* Atendimento */}
            <div>
              <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground print:text-[10px]">
                Atendimento
              </h2>
              <dl className="mt-1 space-y-1 text-xs print:mt-0.5 print:space-y-0.5 print:text-[11.5px]">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Previsão de entrega</dt>
                  <dd className="font-medium text-foreground">
                    {serviceOrder.estimated_delivery
                      ? dateFormatter.format(
                          new Date(serviceOrder.estimated_delivery + 'T12:00:00'),
                        )
                      : '—'}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Técnico responsável</dt>
                  <dd className="font-medium text-foreground">{technician?.name ?? '—'}</dd>
                </div>
              </dl>
            </div>

            {/* Equipamento */}
            <div className="md:col-span-2">
              <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground print:text-[10px]">
                Equipamento
              </h2>
              <p className="mt-1 text-sm font-semibold text-foreground print:mt-0.5 print:text-[13px]">
                {deviceParts || 'Não informado'}
              </p>
              <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-muted-foreground md:grid-cols-4 print:mt-0 print:text-[11px]">
                {serviceOrder.device_serial && (
                  <p>
                    <span className="font-medium text-foreground">Série:</span>{' '}
                    {serviceOrder.device_serial}
                  </p>
                )}
                {serviceOrder.device_color && (
                  <p>
                    <span className="font-medium text-foreground">Cor:</span>{' '}
                    {serviceOrder.device_color}
                  </p>
                )}
                {serviceOrder.device_internal_code && (
                  <p>
                    <span className="font-medium text-foreground">Código:</span>{' '}
                    {serviceOrder.device_internal_code}
                  </p>
                )}
              </div>
            </div>

            {/* Problema relatado */}
            <div className="md:col-span-2">
              <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground print:text-[10px]">
                Problema relatado
              </h2>
              <p className="mt-1 whitespace-pre-wrap text-xs leading-snug text-foreground print:mt-0.5 print:text-[11.5px]">
                {serviceOrder.reported_issue || '—'}
              </p>
            </div>

            {/* Condição de entrada */}
            {serviceOrder.device_condition && (
              <div className="md:col-span-2">
                <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground print:text-[10px]">
                  Condição de entrada
                </h2>
                <p className="mt-1 whitespace-pre-wrap text-xs leading-snug text-foreground print:mt-0.5 print:text-[11.5px]">
                  {serviceOrder.device_condition}
                </p>
              </div>
            )}

            {/* Observações internas */}
            {serviceOrder.notes && (
              <div className="md:col-span-2">
                <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground print:text-[10px]">
                  Observações internas
                </h2>
                <p className="mt-1 whitespace-pre-wrap text-xs leading-snug text-foreground print:mt-0.5 print:text-[11.5px]">
                  {serviceOrder.notes}
                </p>
              </div>
            )}
          </div>

          {/* Anotações — preenche o resto da página */}
          <div className="print-notes flex flex-col px-5 pb-5 pt-0 print:flex-1 print:px-3 print:pb-3">
            <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground print:text-[10px]">
              Anotações
            </h2>
            <div className="mt-1 h-48 flex-1 rounded-xl border border-muted-foreground/40 print:mt-1 print:h-auto" />
          </div>
        </section>
      </div>
    </main>
  )
}
