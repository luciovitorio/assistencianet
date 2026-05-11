import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import {
  ArrowLeft,
  Building2,
  Check,
  Clock,
  Pencil,
  Printer,
  ShieldAlert,
  Smartphone,
  Wrench,
} from 'lucide-react'
import { buttonVariants } from '@/components/ui/button-variants'
import { getCompanyContext } from '@/lib/auth/company-context'
import { resolveCompanySettings } from '@/lib/company-settings'
import { type PaymentStatus, type ServiceOrderStatus } from '@/lib/validations/service-order'
import { createClient } from '@/lib/supabase/server'
import { cn } from '@/lib/utils'
import { ServiceOrderActions } from './_components/service-order-actions'
import { ServiceOrderHeaderSlot } from './_components/service-order-header-slot'
import { ServiceOrderTimeline } from './_components/service-order-timeline'
import { TimelineSheet } from './_components/timeline-sheet'
import { EstimatesModal } from './_components/estimates-modal'
import { type ServiceOrderEstimateRecord } from './_components/service-order-estimates-panel'
import { GeneratePixButton } from './_components/generate-pix-button'
import { PixCopyCode } from './_components/pix-copy-code'

type ServiceOrderPageProps = {
  params: Promise<{ id: string }>
}

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
})

const formatDateTime = (value: string | null) =>
  value ? dateFormatter.format(new Date(value)) : 'Não informado'

const formatOsNumber = (num: number) =>
  `${String(num).slice(0, 4)}-${String(num).slice(4).padStart(4, '0')}`

// ── Status stepper ────────────────────────────────────────────────────────────

const STATUS_FLOW = [
  { value: 'aguardando', label: 'Aguardando' },
  { value: 'em_analise', label: 'Análise' },
  { value: 'aguardando_aprovacao', label: 'Orçamento' },
  { value: 'aprovado', label: 'Aprovado' },
  { value: 'pronto', label: 'Pronto' },
  { value: 'finalizado', label: 'Entregue' },
] as const

function getStepIndex(status: ServiceOrderStatus): number {
  const map: Partial<Record<ServiceOrderStatus, number>> = {
    aberta: 0,
    em_analise: 1,
    aguardando_aprovacao: 2,
    reprovado: 2,
    aprovado: 3,
    aguardando_peca: 3,
    enviado_terceiro: 3,
    pronto: 4,
    finalizado: 5,
  }
  return map[status] ?? 0
}

function StatusStepper({ status }: { status: ServiceOrderStatus }) {
  if (status === 'cancelado') {
    return (
      <div className="flex items-center gap-3 py-1">
        <div className="h-px flex-1 rounded-full bg-rose-100" />
        <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-rose-500">
          OS Cancelada
        </span>
        <div className="h-px flex-1 rounded-full bg-rose-100" />
      </div>
    )
  }

  if (status === 'enviado_terceiro') {
    return (
      <div className="flex items-center gap-3 py-1">
        <div className="h-px flex-1 rounded-full bg-indigo-100" />
        <span className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-indigo-600">
          Aguardando Retorno do Terceiro
        </span>
        <div className="h-px flex-1 rounded-full bg-indigo-100" />
      </div>
    )
  }

  const currentIndex = getStepIndex(status)
  const isReprovado = status === 'reprovado'

  return (
    <div className="flex w-full items-end">
      {STATUS_FLOW.map((step, i) => {
        const isCompleted = i < currentIndex
        const isCurrent = i === currentIndex

        return (
          <div
            key={step.value}
            className={cn('flex items-center', i < STATUS_FLOW.length - 1 && 'flex-1')}
          >
            <div className="flex flex-none flex-col items-center gap-1.5">
              <div
                className={cn(
                  'flex size-7 items-center justify-center rounded-full text-xs font-bold transition-all',
                  isCompleted && 'bg-primary text-primary-foreground',
                  isCurrent &&
                    !isReprovado &&
                    'bg-primary/10 text-primary ring-2 ring-primary ring-offset-1',
                  isCurrent &&
                    isReprovado &&
                    'bg-amber-50 text-amber-600 ring-2 ring-amber-400 ring-offset-1',
                  !isCompleted && !isCurrent && 'bg-muted text-muted-foreground/40',
                )}
              >
                {isCompleted ? <Check className="size-3.5" /> : <span>{i + 1}</span>}
              </div>
              <span
                className={cn(
                  'whitespace-nowrap text-[10px] font-semibold uppercase tracking-wide',
                  isCompleted && 'text-primary/70',
                  isCurrent && !isReprovado && 'text-primary',
                  isCurrent && isReprovado && 'text-amber-600',
                  !isCompleted && !isCurrent && 'text-muted-foreground/40',
                )}
              >
                {step.label}
              </span>
            </div>
            {i < STATUS_FLOW.length - 1 && (
              <div
                className={cn(
                  'mx-2 mb-5 h-0.5 flex-1 rounded-full transition-colors',
                  i < currentIndex ? 'bg-primary/40' : 'bg-muted',
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Info field ────────────────────────────────────────────────────────────────

function InfoField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="px-3.5 py-2.5 min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-slate-400 mb-0.5 truncate">
        {label}
      </p>
      <p
        className={cn(
          'text-[13px] font-medium truncate',
          value ? 'text-slate-700' : 'text-slate-300 italic font-normal',
        )}
      >
        {value || '—'}
      </p>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function ServiceOrderDetailPage({ params }: ServiceOrderPageProps) {
  const { id } = await params
  const supabase = await createClient()

  let companyId: string
  try {
    const context = await getCompanyContext()
    companyId = context.companyId
  } catch {
    redirect('/dashboard')
  }

  const [
    { data: serviceOrder, error: serviceOrderError },
    { data: estimates },
    { data: estimateItems },
    { data: companySettings },
    { data: activeThirdParties },
  ] = await Promise.all([
    supabase
      .from('service_orders')
      .select(
        'id, number, status, payment_status, device_type, device_brand, device_model, device_serial, device_color, device_internal_code, device_condition, reported_issue, estimated_delivery, delivered_at, warranty_expires_at, notes, branch_id, client_id, technician_id, created_at, third_party_id, third_party_dispatched_at, third_party_expected_return_at, third_party_returned_at, third_party_notes, parent_service_order_id, is_warranty_rework, asaas_payment_id',
      )
      .eq('id', id)
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .maybeSingle(),
    supabase
      .from('service_order_estimates')
      .select(
        'id, version, status, approval_channel, subtotal_amount, discount_amount, total_amount, valid_until, sent_at, approved_at, rejected_at, notes, created_at, warranty_days',
      )
      .eq('company_id', companyId)
      .eq('service_order_id', id)
      .order('version', { ascending: false }),
    supabase
      .from('service_order_estimate_items')
      .select(
        'id, estimate_id, part_id, item_type, description, quantity, unit_price, line_total, notes',
      )
      .eq('company_id', companyId)
      .eq('service_order_id', id)
      .order('created_at', { ascending: true }),
    supabase
      .from('company_settings')
      .select('default_warranty_days, default_estimate_validity_days')
      .eq('company_id', companyId)
      .maybeSingle(),
    supabase
      .from('third_parties')
      .select('id, name, type, default_return_days')
      .eq('company_id', companyId)
      .eq('active', true)
      .is('deleted_at', null)
      .order('name'),
  ])

  if (serviceOrderError || !serviceOrder) notFound()

  const [
    { data: client },
    { data: branch },
    { data: technician },
    { data: latestCashEntry },
    { data: catalogServices },
    { data: catalogParts },
    { data: stockMovements },
    { data: activeReservations },
    { data: currentThirdParty },
    { data: parentServiceOrder },
    { data: childReworks },
    { data: pixData },
  ] = await Promise.all([
    supabase
      .from('clients')
      .select('id, name, phone, document, email')
      .eq('id', serviceOrder.client_id)
      .eq('company_id', companyId)
      .maybeSingle(),
    serviceOrder.branch_id
      ? supabase
          .from('branches')
          .select('id, name')
          .eq('id', serviceOrder.branch_id)
          .eq('company_id', companyId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    serviceOrder.technician_id
      ? supabase
          .from('employees')
          .select('id, name, role')
          .eq('id', serviceOrder.technician_id)
          .eq('company_id', companyId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from('cash_entries')
      .select('id, created_at')
      .eq('company_id', companyId)
      .eq('service_order_id', serviceOrder.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('services')
      .select('id, name, price')
      .eq('company_id', companyId)
      .eq('active', true)
      .is('deleted_at', null)
      .order('name'),
    supabase
      .from('parts')
      .select('id, name, sale_price')
      .eq('company_id', companyId)
      .eq('active', true)
      .is('deleted_at', null)
      .order('name'),
    serviceOrder.branch_id
      ? supabase
          .from('stock_movements')
          .select('part_id, quantity')
          .eq('company_id', companyId)
          .eq('branch_id', serviceOrder.branch_id)
      : Promise.resolve({ data: [] }),
    serviceOrder.branch_id
      ? supabase
          .from('stock_reservations')
          .select('part_id, quantity, service_order_id')
          .eq('company_id', companyId)
          .eq('branch_id', serviceOrder.branch_id)
          .eq('status', 'ativa')
      : Promise.resolve({ data: [] }),
    serviceOrder.third_party_id
      ? supabase
          .from('third_parties')
          .select('id, name, type, phone, email')
          .eq('id', serviceOrder.third_party_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    serviceOrder.parent_service_order_id
      ? supabase
          .from('service_orders')
          .select('id, number, warranty_expires_at')
          .eq('id', serviceOrder.parent_service_order_id)
          .eq('company_id', companyId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from('service_orders')
      .select('id, number, status, created_at')
      .eq('parent_service_order_id', serviceOrder.id)
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false }),
    // Campos pesados do PIX só buscados quando a OS está pronta e tem cobrança pendente
    serviceOrder.status === 'pronto' && serviceOrder.asaas_payment_id
      ? supabase
          .from('service_orders')
          .select('asaas_pix_qr_encoded, asaas_pix_copy_paste, asaas_pix_expires_at')
          .eq('id', serviceOrder.id)
          .eq('company_id', companyId)
          .maybeSingle<{
            asaas_pix_qr_encoded: string | null
            asaas_pix_copy_paste: string | null
            asaas_pix_expires_at: string | null
          }>()
      : Promise.resolve({ data: null }),
  ])

  const fisico: Record<string, number> = {}
  for (const m of stockMovements ?? []) {
    fisico[m.part_id] = (fisico[m.part_id] ?? 0) + m.quantity
  }
  const reservadoOutras: Record<string, number> = {}
  for (const r of activeReservations ?? []) {
    if (r.service_order_id !== serviceOrder.id) {
      reservadoOutras[r.part_id] = (reservadoOutras[r.part_id] ?? 0) + r.quantity
    }
  }
  const stockAvailability: Record<string, number> = {}
  for (const partId of new Set([
    ...Object.keys(fisico),
    ...Object.keys(reservadoOutras),
  ])) {
    stockAvailability[partId] = (fisico[partId] ?? 0) - (reservadoOutras[partId] ?? 0)
  }

  const itemsByEstimateId = new Map<string, ServiceOrderEstimateRecord['items']>()
  for (const item of estimateItems ?? []) {
    const existing = itemsByEstimateId.get(item.estimate_id) ?? []
    existing.push({
      id: item.id,
      part_id: item.part_id,
      item_type: item.item_type,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      line_total: item.line_total,
      notes: item.notes,
    })
    itemsByEstimateId.set(item.estimate_id, existing)
  }

  const initialEstimates: ServiceOrderEstimateRecord[] = (estimates ?? []).map((estimate) => ({
    id: estimate.id,
    version: estimate.version,
    status: estimate.status,
    approval_channel: estimate.approval_channel,
    subtotal_amount: estimate.subtotal_amount,
    discount_amount: estimate.discount_amount,
    total_amount: estimate.total_amount,
    valid_until: estimate.valid_until,
    sent_at: estimate.sent_at,
    approved_at: estimate.approved_at,
    rejected_at: estimate.rejected_at,
    notes: estimate.notes,
    created_at: estimate.created_at,
    warranty_days: estimate.warranty_days,
    items: itemsByEstimateId.get(estimate.id) ?? [],
  }))

  const resolvedSettings = resolveCompanySettings(companySettings)
  const latestApprovedEstimate =
    initialEstimates.find((estimate) => estimate.status === 'aprovado') ?? null

  const status = serviceOrder.status as ServiceOrderStatus
  const paymentStatus = serviceOrder.payment_status as PaymentStatus
  const hasDraftEstimate = initialEstimates.some((estimate) => estimate.status === 'rascunho')
  const canManageEstimate =
    status === 'aberta' ||
    status === 'aguardando_envio' ||
    status === 'em_analise' ||
    status === 'reprovado' ||
    status === 'enviado_terceiro'
  const canEditServiceOrder =
    status === 'aberta' ||
    status === 'em_analise' ||
    status === 'aguardando_envio' ||
    status === 'reprovado'

  return (
    <div className="flex min-h-0 flex-col overflow-hidden xl:-mx-8 xl:-mt-8 xl:-mb-12 xl:h-[calc(100vh-4rem)]">
      <ServiceOrderHeaderSlot number={serviceOrder.number} />

      {/* ── Page header ── */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-6 py-4">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/ordens-de-servico"
            className={cn(
              buttonVariants({ variant: 'outline', size: 'icon' }),
              'shrink-0 border-slate-200',
            )}
          >
            <ArrowLeft className="size-4" />
            <span className="sr-only">Voltar</span>
          </Link>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[22px] font-extrabold tracking-tight text-slate-900">
                OS #{serviceOrder.number}
              </span>
              {serviceOrder.is_warranty_rework && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
                  <ShieldAlert className="size-3.5" />
                  Retrabalho em garantia
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-slate-400">
              Aberta em {formatDateTime(serviceOrder.created_at)}
              {branch?.name ? ` · ${branch.name}` : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <TimelineSheet>
            <ServiceOrderTimeline serviceOrderId={serviceOrder.id} />
          </TimelineSheet>
          <a
            href={`/recibos/ordem-de-servico/${serviceOrder.id}?autoPrint=1`}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ variant: 'outline' }), 'gap-2 border-slate-200')}
          >
            <Printer className="size-4 text-slate-400" />
            Imprimir OS
          </a>
          {canEditServiceOrder && (
            <Link
              href={`/dashboard/ordens-de-servico/${serviceOrder.id}/editar`}
              className={cn(buttonVariants({ variant: 'outline' }), 'gap-2 border-slate-200')}
            >
              <Pencil className="size-4 text-slate-400" />
              Editar OS
            </Link>
          )}
          {canManageEstimate && (
            <Link
              href={`/dashboard/ordens-de-servico/${serviceOrder.id}/orcamento`}
              className={buttonVariants()}
            >
              {hasDraftEstimate ? 'Editar orçamento' : 'Criar orçamento'}
            </Link>
          )}
        </div>
      </div>

      {/* ── Body workspace ── */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-slate-50 xl:flex-row">

        {/* ── LEFT SIDEBAR ── */}
        <div className="shrink-0 overflow-y-auto border-b border-slate-200 bg-white xl:w-72 xl:border-b-0 xl:border-r">
          <div className="px-5 pt-5 pb-6 space-y-6">

            {/* Retrabalho (compacto) */}
            {serviceOrder.is_warranty_rework && parentServiceOrder && (
              <div className="flex items-start gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                <ShieldAlert className="mt-0.5 size-3.5 shrink-0 text-emerald-600" />
                <div className="min-w-0 text-xs">
                  <p className="font-semibold text-emerald-900">Retrabalho em garantia</p>
                  <p className="mt-0.5 text-emerald-700">
                    Vinculada à{' '}
                    <Link
                      href={`/dashboard/ordens-de-servico/${parentServiceOrder.id}`}
                      className="font-semibold underline underline-offset-2"
                    >
                      OS #{formatOsNumber(parentServiceOrder.number)}
                    </Link>
                    {parentServiceOrder.warranty_expires_at && (
                      <> · garantia até{' '}
                        {new Date(
                          parentServiceOrder.warranty_expires_at + 'T12:00:00',
                        ).toLocaleDateString('pt-BR')}
                      </>
                    )}
                  </p>
                </div>
              </div>
            )}

            {/* Cliente */}
            <div>
              <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">
                Cliente
              </p>
              <div className="space-y-1">
                <p className="text-[13px] font-semibold text-slate-800">
                  {client?.name ?? 'Não informado'}
                </p>
                {client?.phone && (
                  <p className="text-xs text-slate-500">{client.phone}</p>
                )}
                {client?.document && (
                  <p className="text-xs text-slate-500">{client.document}</p>
                )}
                {client?.email && (
                  <p className="truncate text-xs text-slate-500">{client.email}</p>
                )}
              </div>
            </div>

            {/* Operação */}
            <div>
              <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">
                Operação
              </p>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-slate-400">Filial</span>
                  <span className="text-xs font-medium text-slate-700">{branch?.name ?? '—'}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-slate-400">Técnico</span>
                  <span className="text-xs font-medium text-slate-700">
                    {technician?.name ?? 'Não atribuído'}
                  </span>
                </div>
                {serviceOrder.estimated_delivery && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-400">Prev. entrega</span>
                    <span className="text-xs font-medium text-slate-700">
                      {new Date(
                        serviceOrder.estimated_delivery + 'T12:00:00',
                      ).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                )}
                {serviceOrder.warranty_expires_at && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-400">Garantia</span>
                    {new Date(serviceOrder.warranty_expires_at + 'T12:00:00') >= new Date() ? (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-semibold text-green-700">
                        Até{' '}
                        {new Date(
                          serviceOrder.warranty_expires_at + 'T12:00:00',
                        ).toLocaleDateString('pt-BR')}
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                        Expirada{' '}
                        {new Date(
                          serviceOrder.warranty_expires_at + 'T12:00:00',
                        ).toLocaleDateString('pt-BR')}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Retrabalhos filhos */}
            {childReworks && childReworks.length > 0 && (
              <div>
                <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">
                  Retrabalhos
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {childReworks.map((rework) => (
                    <Link
                      key={rework.id}
                      href={`/dashboard/ordens-de-servico/${rework.id}`}
                      className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700 hover:bg-amber-200"
                    >
                      #{formatOsNumber(rework.number)}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Botão gerar PIX quando Asaas está configurado mas cobrança ainda não existe */}
            {status === 'pronto' && !serviceOrder.asaas_payment_id && paymentStatus !== 'pago' && (
              <div>
                <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">
                  Cobrança PIX
                </p>
                <GeneratePixButton osId={serviceOrder.id} />
              </div>
            )}

            {/* PIX pendente */}
            {status === 'pronto' && serviceOrder.asaas_payment_id && pixData && (pixData.asaas_pix_qr_encoded || pixData.asaas_pix_copy_paste) && paymentStatus !== 'pago' && (
              <div>
                <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">
                  Cobrança PIX
                </p>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 space-y-3">
                  {pixData.asaas_pix_qr_encoded && (
                    <div className="flex justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`data:image/png;base64,${pixData.asaas_pix_qr_encoded}`}
                        alt="QR Code PIX"
                        className="size-36 rounded-lg border border-emerald-200"
                      />
                    </div>
                  )}
                  {pixData.asaas_pix_copy_paste && (
                    <div className="space-y-1">
                      <p className="text-[10px] font-semibold text-emerald-700">Copia e cola</p>
                      <PixCopyCode code={pixData.asaas_pix_copy_paste} />
                    </div>
                  )}
                  {pixData.asaas_pix_expires_at && (
                    <p className="text-[10px] text-emerald-600">
                      Expira em{' '}
                      {new Date(pixData.asaas_pix_expires_at).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>

        {/* ── MAIN ── */}
        <div className="flex min-h-0 flex-1 overflow-hidden">

          {/* Main scrollable area */}
          <div className="flex-1 min-w-0 overflow-y-auto">
            <div className="space-y-5 p-6">

              {/* Ações de status */}
              <ServiceOrderActions
                serviceOrderId={serviceOrder.id}
                serviceOrderNumber={serviceOrder.number}
                status={status}
                paymentStatus={paymentStatus}
                estimatesTabHref={`/dashboard/ordens-de-servico/${serviceOrder.id}/orcamento`}
                clientName={client?.name ?? null}
                approvedEstimateTotal={latestApprovedEstimate?.total_amount ?? null}
                receiptCashEntryId={latestCashEntry?.id ?? null}
                thirdParties={activeThirdParties ?? []}
                currentThirdPartyName={currentThirdParty?.name ?? null}
                hasSentEstimate={initialEstimates.some((e) => e.status === 'enviado')}
                hasDraftEstimate={hasDraftEstimate}
                clientPhone={client?.phone ?? null}
                clientEmail={client?.email ?? null}
              />

              {/* Terceirização */}
              {status === 'enviado_terceiro' && currentThirdParty && (
                <div className="rounded-xl border border-indigo-200 bg-indigo-50/40">
                  <div className="flex items-center gap-2 border-b border-indigo-100 px-4 py-3">
                    <Building2 className="size-3.5 text-indigo-500" />
                    <h3 className="text-[13px] font-bold text-indigo-700">
                      Equipamento com Terceiro
                    </h3>
                  </div>
                  <div className="grid gap-4 p-4 sm:grid-cols-2">
                    <div>
                      <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.08em] text-indigo-400">
                        Terceirizada
                      </p>
                      <p className="text-[13px] font-semibold text-slate-800">
                        {currentThirdParty.name}
                      </p>
                      {currentThirdParty.phone && (
                        <p className="text-xs text-slate-500">{currentThirdParty.phone}</p>
                      )}
                    </div>
                    <div>
                      <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.08em] text-indigo-400">
                        Datas
                      </p>
                      {serviceOrder.third_party_dispatched_at && (
                        <p className="text-xs text-slate-500">
                          Enviado em:{' '}
                          <span className="font-medium text-slate-700">
                            {new Date(
                              serviceOrder.third_party_dispatched_at,
                            ).toLocaleDateString('pt-BR')}
                          </span>
                        </p>
                      )}
                      {serviceOrder.third_party_expected_return_at && (
                        <div className="mt-0.5 flex items-center gap-1.5 text-xs">
                          <Clock className="size-3 text-indigo-500" />
                          <span className="text-slate-500">Retorno previsto:</span>
                          <span
                            className={cn(
                              'font-medium',
                              new Date(
                                serviceOrder.third_party_expected_return_at + 'T23:59:59',
                              ) < new Date()
                                ? 'text-rose-600'
                                : 'text-indigo-700',
                            )}
                          >
                            {new Date(
                              serviceOrder.third_party_expected_return_at + 'T12:00:00',
                            ).toLocaleDateString('pt-BR')}
                            {new Date(
                              serviceOrder.third_party_expected_return_at + 'T23:59:59',
                            ) < new Date() && ' (vencido)'}
                          </span>
                        </div>
                      )}
                    </div>
                    {serviceOrder.third_party_notes && (
                      <div className="sm:col-span-2">
                        <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.08em] text-indigo-400">
                          Observações
                        </p>
                        <p className="text-sm text-slate-600">{serviceOrder.third_party_notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Equipamento */}
              <div className="rounded-xl border border-slate-200 bg-white">
                <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
                  <Smartphone className="size-3.5 text-slate-400" strokeWidth={2} />
                  <h3 className="text-[13px] font-bold text-slate-800">Equipamento</h3>
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-2 divide-x divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200 sm:grid-cols-4">
                    <InfoField label="Tipo" value={serviceOrder.device_type} />
                    <InfoField label="Marca" value={serviceOrder.device_brand} />
                    <InfoField label="Modelo" value={serviceOrder.device_model} />
                    <InfoField label="Cor" value={serviceOrder.device_color} />
                  </div>
                  {(serviceOrder.device_serial || serviceOrder.device_internal_code) && (
                    <div className="mt-3 grid grid-cols-2 divide-x divide-slate-200 overflow-hidden rounded-lg border border-slate-200">
                      <InfoField label="Nº de Série" value={serviceOrder.device_serial} />
                      <InfoField label="Código Interno" value={serviceOrder.device_internal_code} />
                    </div>
                  )}
                  {serviceOrder.device_condition && (
                    <div className="mt-3">
                      <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">
                        Condição de entrada
                      </p>
                      <p className="text-[13px] text-slate-600">{serviceOrder.device_condition}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Diagnóstico */}
              <div className="rounded-xl border border-slate-200 bg-white">
                <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
                  <Wrench className="size-3.5 text-slate-400" strokeWidth={2} />
                  <h3 className="text-[13px] font-bold text-slate-800">Diagnóstico inicial</h3>
                </div>
                <div className="grid gap-5 p-4 sm:grid-cols-2">
                  <div>
                    <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">
                      Problema relatado
                    </p>
                    <p className="text-sm leading-relaxed text-slate-700">
                      {serviceOrder.reported_issue || '—'}
                    </p>
                  </div>
                  <div>
                    <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">
                      Observações internas
                    </p>
                    <p className="text-sm leading-relaxed text-slate-500">
                      {serviceOrder.notes || 'Nenhuma observação registrada.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Orçamentos */}
              <EstimatesModal
                serviceOrderId={serviceOrder.id}
                serviceOrderNumber={serviceOrder.number}
                initialEstimates={initialEstimates}
                catalogServices={catalogServices ?? []}
                catalogParts={catalogParts ?? []}
                stockAvailability={stockAvailability}
                defaultWarrantyDays={resolvedSettings.defaultWarrantyDays}
                defaultEstimateValidityDays={resolvedSettings.defaultEstimateValidityDays}
                serviceOrderStatus={status}
                clientName={client?.name ?? null}
                clientPhone={client?.phone ?? null}
                clientEmail={client?.email ?? null}
              />

            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
