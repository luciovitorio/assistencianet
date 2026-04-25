import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Smartphone, UserRound } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button-variants'
import { createClient } from '@/lib/supabase/server'
import { getCompanyContext } from '@/lib/auth/company-context'
import { resolveCompanySettings } from '@/lib/company-settings'
import { type ServiceOrderStatus, STATUS_COLORS, STATUS_LABELS } from '@/lib/validations/service-order'
import { cn } from '@/lib/utils'
import {
  ServiceOrderEstimatesPanel,
  type ServiceOrderEstimateRecord,
} from '../_components/service-order-estimates-panel'
import { ClientResponseButtons } from '../_components/client-response-buttons'

export default async function OrcamentosPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
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
    { data: serviceOrder },
    { data: estimates },
    { data: estimateItems },
    { data: companySettings },
  ] = await Promise.all([
    supabase
      .from('service_orders')
      .select('id, number, status, device_type, device_brand, device_model, branch_id, client_id')
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
      .select('id, estimate_id, part_id, item_type, description, quantity, unit_price, line_total, notes')
      .eq('company_id', companyId)
      .eq('service_order_id', id)
      .order('created_at', { ascending: true }),
    supabase
      .from('company_settings')
      .select('default_warranty_days, default_estimate_validity_days')
      .eq('company_id', companyId)
      .maybeSingle(),
  ])

  if (!serviceOrder) notFound()

  const [
    { data: client },
    { data: catalogServices },
    { data: catalogParts },
    { data: stockMovements },
    { data: activeReservations },
  ] = await Promise.all([
    supabase
      .from('clients')
      .select('id, name, phone, email')
      .eq('id', serviceOrder.client_id)
      .eq('company_id', companyId)
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
  for (const partId of new Set([...Object.keys(fisico), ...Object.keys(reservadoOutras)])) {
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

  const deviceLabel = [serviceOrder.device_type, serviceOrder.device_brand, serviceOrder.device_model]
    .filter(Boolean)
    .join(' · ')

  const status = serviceOrder.status as ServiceOrderStatus
  const hasSentEstimate = initialEstimates.some((e) => e.status === 'enviado')
  const showClientResponse =
    status === 'aguardando_aprovacao' ||
    (status === 'enviado_terceiro' && hasSentEstimate)

  return (
    <div className="space-y-6">
      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/ordens-de-servico"
            className={cn(buttonVariants({ variant: 'outline', size: 'icon' }), 'shrink-0')}
          >
            <ArrowLeft className="size-4" />
            <span className="sr-only">Voltar para listagem de OS</span>
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight">
              OS #{serviceOrder.number} · Orçamentos
            </h1>
            <div className="mt-0.5 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <UserRound className="size-3.5" />
                {client?.name ?? '—'}
              </span>
              <span className="flex items-center gap-1.5">
                <Smartphone className="size-3.5" />
                {deviceLabel || '—'}
              </span>
              <span
                className={cn(
                  'inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                  STATUS_COLORS[status] ?? 'bg-muted text-muted-foreground',
                )}
              >
                {STATUS_LABELS[status] ?? status}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── RESPOSTA DO CLIENTE (quando orçamento foi enviado) ──────────── */}
      {showClientResponse && (
        <ClientResponseButtons
          serviceOrderId={serviceOrder.id}
          serviceOrderNumber={serviceOrder.number}
        />
      )}

      {/* ── PAINEL DE ORÇAMENTOS ─────────────────────────────────────────── */}
      <ServiceOrderEstimatesPanel
        mode="create"
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
  )
}
