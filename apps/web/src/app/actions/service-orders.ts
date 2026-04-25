'use server'

import { revalidatePath } from 'next/cache'
import { createClient as createSupabaseClient } from '@/lib/supabase/server'
import { createAuditLog } from '@/lib/audit/audit-log'
import { getAdminContext } from '@/lib/auth/admin-context'
import { getCompanyContext } from '@/lib/auth/company-context'
import { calculatePickupPayment } from '@/lib/service-orders/pickup-payment'
import { reserveEstimatePartsIfAvailable } from '@/lib/service-orders/reserve-estimate-parts'
import { applyEstimateClientResponse } from '@/lib/service-orders/apply-estimate-response'
import {
  serviceOrderSchema,
  type ServiceOrderSchema,
  editServiceOrderSchema,
  type EditServiceOrderSchema,
  cancelServiceOrderSchema,
  type CancelServiceOrderSchema,
  SERVICE_ORDER_CANCEL_REASON_LABELS,
  serviceOrderPickupSchema,
  type ServiceOrderPickupSchema,
  type PaymentMethod,
  type ServiceOrderStatus,
  type PaymentStatus,
} from '@/lib/validations/service-order'
import {
  dispatchToThirdPartySchema,
  type DispatchToThirdPartySchema,
  returnFromThirdPartySchema,
  type ReturnFromThirdPartySchema,
} from '@/lib/validations/third-party'

// Transições manuais permitidas via botões de ação (excluindo as gerenciadas por actions específicas)
const ALLOWED_MANUAL_TRANSITIONS: Partial<Record<ServiceOrderStatus, ServiceOrderStatus[]>> = {
  aguardando:        ['cancelado'],
  em_analise:        ['cancelado'],
  aguardando_aprovacao: ['cancelado'],
  aprovado:          ['pronto', 'cancelado'],
  aguardando_peca:   ['aprovado', 'cancelado'],
  enviado_terceiro:  ['cancelado'],
  reprovado:         ['cancelado'],
  pronto:            ['cancelado'],
}

// Statuses que permitem envio para terceiro
const DISPATCHABLE_STATUSES: ServiceOrderStatus[] = ['aguardando', 'em_analise', 'aprovado', 'aguardando_peca']

const EDITABLE_SERVICE_ORDER_STATUSES: ServiceOrderStatus[] = [
  'aguardando',
  'em_analise',
  'reprovado',
]

export async function updateServiceOrderStatus(
  id: string,
  nextStatus: ServiceOrderStatus,
) {
  try {
    if (nextStatus === 'cancelado') {
      return { error: 'Use o fluxo de cancelamento para informar o motivo da OS.' }
    }

    const { companyId, user } = await getCompanyContext()
    const supabase = await createSupabaseClient()

    const { data: os, error: osError } = await supabase
      .from('service_orders')
      .select('id, number, status, branch_id')
      .eq('id', id)
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .single()

    if (osError || !os) {
      return { error: 'Ordem de serviço não encontrada.' }
    }

    const currentStatus = os.status as ServiceOrderStatus
    const allowed = ALLOWED_MANUAL_TRANSITIONS[currentStatus] ?? []

    if (!allowed.includes(nextStatus)) {
      return { error: `Transição de "${currentStatus}" para "${nextStatus}" não é permitida.` }
    }

    const now = new Date().toISOString()
    const movementEntryDate = now.slice(0, 10)

    if (currentStatus === 'aguardando_peca' && nextStatus === 'aprovado') {
      const { data: approvedEstimate } = await supabase
        .from('service_order_estimates')
        .select('id')
        .eq('service_order_id', id)
        .eq('company_id', companyId)
        .eq('status', 'aprovado')
        .is('deleted_at', null)
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (!approvedEstimate) {
        return { error: 'Nenhum orçamento aprovado foi encontrado para retomar a OS.' }
      }

      const reservationResult = await reserveEstimatePartsIfAvailable(
        supabase,
        companyId,
        id,
        os.number,
        os.branch_id,
        approvedEstimate.id,
      )

      if (reservationResult.nextStatus === 'aguardando_peca') {
        return {
          error:
            reservationResult.message ??
            'Ainda não há estoque suficiente para retomar o serviço.',
        }
      }
    }

    // ── Pronto: consome reservas → cria saídas reais ───────────────
    if (nextStatus === 'pronto' && os.branch_id) {
      const { data: approvedEstimate } = await supabase
        .from('service_order_estimates')
        .select('id')
        .eq('service_order_id', id)
        .eq('company_id', companyId)
        .eq('status', 'aprovado')
        .is('deleted_at', null)
        .maybeSingle()

      if (approvedEstimate) {
        const { data: reservations } = await supabase
          .from('stock_reservations')
          .select('id, part_id, branch_id, quantity')
          .eq('estimate_id', approvedEstimate.id)
          .eq('company_id', companyId)
          .eq('status', 'ativa')

        if (reservations && reservations.length > 0) {
          const { error: movementsError } = await supabase
            .from('stock_movements')
            .insert(
              reservations.map((r) => ({
                company_id: companyId,
                branch_id: r.branch_id,
                part_id: r.part_id,
                movement_type: 'saida',
                quantity: -r.quantity,
                entry_date: movementEntryDate,
                reference_type: 'service_order',
                reference_id: id,
                notes: `Baixa automatica - OS #${os.number}`,
                created_by: user.id,
              })),
            )

          if (movementsError) throw movementsError

          await supabase
            .from('stock_reservations')
            .update({ status: 'consumida', resolved_at: now })
            .in('id', reservations.map((r) => r.id))
        }
      }
    }

    const { error } = await supabase
      .from('service_orders')
      .update({
        status: nextStatus,
        ...(nextStatus === 'pronto' && { completed_at: now }),
      })
      .eq('id', id)
      .eq('company_id', companyId)

    if (error) throw error

    await createAuditLog({
      action: 'update',
      entityType: 'service_order',
      entityId: os.id,
      companyId,
      summary: `OS #${os.number}: status alterado de "${currentStatus}" para "${nextStatus}".`,
      metadata: { previous_status: currentStatus, new_status: nextStatus },
    })

    revalidateServiceOrdersPage()
    revalidateServiceOrderDetailPage(id)
    return { success: true }
  } catch (error: unknown) {
    if (error instanceof Error) return { error: error.message }
    return { error: 'Erro ao atualizar status da OS.' }
  }
}

export async function cancelServiceOrder(
  id: string,
  data: CancelServiceOrderSchema,
) {
  try {
    const parsed = cancelServiceOrderSchema.safeParse(data)

    if (!parsed.success) {
      return { error: parsed.error.issues[0].message }
    }

    const { companyId, user } = await getCompanyContext()
    const supabase = await createSupabaseClient()

    const { data: os, error: osError } = await supabase
      .from('service_orders')
      .select('id, number, status, branch_id')
      .eq('id', id)
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .single()

    if (osError || !os) {
      return { error: 'Ordem de serviço não encontrada.' }
    }

    const currentStatus = os.status as ServiceOrderStatus
    const allowed = ALLOWED_MANUAL_TRANSITIONS[currentStatus] ?? []

    if (!allowed.includes('cancelado')) {
      return { error: `A OS #${os.number} não pode ser cancelada no status atual.` }
    }

    const now = new Date().toISOString()

    await supabase
      .from('stock_reservations')
      .update({ status: 'liberada', resolved_at: now })
      .eq('service_order_id', id)
      .eq('company_id', companyId)
      .eq('status', 'ativa')

    const { error: updateError } = await supabase
      .from('service_orders')
      .update({ status: 'cancelado' })
      .eq('id', id)
      .eq('company_id', companyId)

    if (updateError) throw updateError

    const reasonKey = parsed.data.reason as keyof typeof SERVICE_ORDER_CANCEL_REASON_LABELS
    const reasonLabel = SERVICE_ORDER_CANCEL_REASON_LABELS[reasonKey]
    const reasonDetails = parsed.data.details?.trim() || null
    const reasonSummary = reasonDetails ? `${reasonLabel}: ${reasonDetails}` : reasonLabel

    await createAuditLog({
      action: 'update',
      entityType: 'service_order',
      entityId: os.id,
      companyId,
      summary: `OS #${os.number}: cancelada. Motivo: ${reasonSummary}.`,
      metadata: {
        previous_status: currentStatus,
        new_status: 'cancelado',
        cancel_reason: parsed.data.reason,
        cancel_reason_label: reasonLabel,
        cancel_reason_details: reasonDetails,
        canceled_by: user.id,
      },
    })

    revalidateServiceOrdersPage()
    revalidateServiceOrderDetailPage(id)
    return { success: true }
  } catch (error: unknown) {
    if (error instanceof Error) return { error: error.message }
    return { error: 'Erro ao cancelar a OS.' }
  }
}

// Técnico ou atendente "pega" a OS → status vai para em_analise
export async function claimServiceOrder(id: string) {
  try {
    const { companyId, user } = await getCompanyContext()
    const supabase = await createSupabaseClient()

    const { data: os, error: osError } = await supabase
      .from('service_orders')
      .select('id, number, status')
      .eq('id', id)
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .single()

    if (osError || !os) {
      return { error: 'Ordem de serviço não encontrada.' }
    }

    if (os.status !== 'aguardando') {
      return { error: 'Apenas OS com status "Aguardando Orçamento" podem ser iniciadas.' }
    }

    const { error } = await supabase
      .from('service_orders')
      .update({ status: 'em_analise', technician_id: user.id })
      .eq('id', id)
      .eq('company_id', companyId)

    if (error) throw error

    await createAuditLog({
      action: 'update',
      entityType: 'service_order',
      entityId: os.id,
      companyId,
      summary: `OS #${os.number}: iniciada por ${user.id} (em análise).`,
      metadata: { previous_status: 'aguardando', new_status: 'em_analise', claimed_by: user.id },
    })

    revalidateServiceOrdersPage()
    revalidateServiceOrderDetailPage(id)
    return { success: true }
  } catch (error: unknown) {
    if (error instanceof Error) return { error: error.message }
    return { error: 'Erro ao iniciar OS.' }
  }
}

// Atendente registra resposta do cliente (aprovado ou reprovado)
export async function registerClientResponse(
  id: string,
  response: 'aprovado' | 'reprovado',
) {
  try {
    const { companyId } = await getCompanyContext()
    const supabase = await createSupabaseClient()

    const result = await applyEstimateClientResponse({
      supabase,
      companyId,
      serviceOrderId: id,
      response,
    })

    if ('error' in result) {
      return { error: result.error }
    }

    return { success: true as const, message: result.message }
  } catch (error: unknown) {
    if (error instanceof Error) return { error: error.message }
    return { error: 'Erro ao registrar resposta do cliente.' }
  }
}

export async function registerManualClientResponse(
  id: string,
  response: 'aprovado' | 'reprovado',
) {
  try {
    const { companyId } = await getCompanyContext()
    const supabase = await createSupabaseClient()

    const { data: os, error: osError } = await supabase
      .from('service_orders')
      .select('id, number, status')
      .eq('id', id)
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .single()

    if (osError || !os) {
      return { error: 'Ordem de serviço não encontrada.' }
    }

    const { data: estimate, error: estimateError } = await supabase
      .from('service_order_estimates')
      .select('id, version, status')
      .eq('service_order_id', id)
      .eq('company_id', companyId)
      .in('status', ['rascunho', 'enviado'])
      .is('deleted_at', null)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (estimateError) throw estimateError

    if (!estimate) {
      return { error: 'Nenhum orçamento disponível para registrar a resposta do cliente.' }
    }

    const now = new Date().toISOString()

    if (estimate.status === 'rascunho') {
      const { error: estimateUpdateError } = await supabase
        .from('service_order_estimates')
        .update({
          status: 'enviado',
          approval_channel: 'balcao',
          sent_at: now,
        })
        .eq('id', estimate.id)
        .eq('company_id', companyId)

      if (estimateUpdateError) throw estimateUpdateError

      if (os.status !== 'enviado_terceiro') {
        const { error: osUpdateError } = await supabase
          .from('service_orders')
          .update({
            status: 'aguardando_aprovacao',
            client_notified_at: now,
            client_notified_via: null,
          })
          .eq('id', id)
          .eq('company_id', companyId)

        if (osUpdateError) throw osUpdateError
      }

      await createAuditLog({
        action: 'update',
        entityType: 'service_order_estimate',
        entityId: estimate.id,
        companyId,
        summary: `OS #${os.number}: orçamento v${estimate.version} informado manualmente ao cliente.`,
        metadata: {
          service_order_id: id,
          previous_status: 'rascunho',
          new_status: 'enviado',
          approval_channel: 'balcao',
        },
      })
    }

    const result = await applyEstimateClientResponse({
      supabase,
      companyId,
      serviceOrderId: id,
      response,
    })

    if ('error' in result) {
      return { error: result.error }
    }

    return { success: true as const, message: result.message }
  } catch (error: unknown) {
    if (error instanceof Error) return { error: error.message }
    return { error: 'Erro ao registrar resposta manual do cliente.' }
  }
}

export async function markClientNotified(
  id: string,
  via: 'whatsapp' | 'email',
) {
  try {
    const { companyId } = await getCompanyContext()
    const supabase = await createSupabaseClient()

    const { error } = await supabase
      .from('service_orders')
      .update({
        client_notified_at: new Date().toISOString(),
        client_notified_via: via,
      })
      .eq('id', id)
      .eq('company_id', companyId)

    if (error) throw error

    revalidateServiceOrdersPage()
    revalidateServiceOrderDetailPage(id)
    return { success: true }
  } catch (error: unknown) {
    if (error instanceof Error) return { error: error.message }
    return { error: 'Erro ao registrar notificação.' }
  }
}

export async function updateServiceOrderPaymentStatus(
  id: string,
  paymentStatus: PaymentStatus,
) {
  try {
    const { companyId } = await getCompanyContext()
    const supabase = await createSupabaseClient()

    const { data: os, error: osError } = await supabase
      .from('service_orders')
      .select('id, number')
      .eq('id', id)
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .single()

    if (osError || !os) {
      return { error: 'Ordem de serviço não encontrada.' }
    }

    const { error } = await supabase
      .from('service_orders')
      .update({ payment_status: paymentStatus })
      .eq('id', id)
      .eq('company_id', companyId)

    if (error) throw error

    await createAuditLog({
      action: 'update',
      entityType: 'service_order',
      entityId: os.id,
      companyId,
      summary: `OS #${os.number}: pagamento registrado como "${paymentStatus}".`,
      metadata: { payment_status: paymentStatus },
    })

    revalidateServiceOrdersPage()
    revalidateServiceOrderDetailPage(id)
    return { success: true }
  } catch (error: unknown) {
    if (error instanceof Error) return { error: error.message }
    return { error: 'Erro ao atualizar pagamento da OS.' }
  }
}

export async function registerServiceOrderPickup(
  id: string,
  data: ServiceOrderPickupSchema,
) {
  try {
    const parsed = serviceOrderPickupSchema.safeParse(data)

    if (!parsed.success) {
      return { error: parsed.error.issues[0].message }
    }

    const { companyId, user } = await getCompanyContext()
    const supabase = await createSupabaseClient()

    const { data: os, error: osError } = await supabase
      .from('service_orders')
      .select('id, number, status, branch_id')
      .eq('id', id)
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .single()

    if (osError || !os) {
      return { error: 'Ordem de serviço não encontrada.' }
    }

    if (os.status !== 'pronto') {
      return {
        error: 'A retirada só pode ser registrada quando a OS estiver pronta para retirada.',
      }
    }

    const { data: approvedEstimate, error: approvedEstimateError } = await supabase
      .from('service_order_estimates')
      .select('id, total_amount, version, warranty_days')
      .eq('service_order_id', id)
      .eq('company_id', companyId)
      .eq('status', 'aprovado')
      .is('deleted_at', null)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (approvedEstimateError) throw approvedEstimateError

    if (!approvedEstimate) {
      return { error: 'Nenhum orçamento aprovado foi encontrado para concluir a retirada.' }
    }

    const paymentMethod = parsed.data.payment_method as PaymentMethod
    let pickupPayment

    try {
      pickupPayment = calculatePickupPayment({
        amountDue: Number(approvedEstimate.total_amount ?? 0),
        discountAmount: Number(parsed.data.discount_amount ?? 0),
        paymentMethod,
        amountReceived: parsed.data.amount_received,
      })
    } catch (error: unknown) {
      if (error instanceof Error) return { error: error.message }
      return { error: 'Erro ao calcular o pagamento da retirada.' }
    }

    const {
      amountDue,
      discountAmount,
      payableAmount,
      amountReceived,
      changeAmount,
      netAmount,
      paymentStatus,
    } = pickupPayment
    const notes = normalizeOptional(parsed.data.notes)
    const now = new Date().toISOString()
    const warrantyDays = approvedEstimate.warranty_days ?? 0
    const warrantyExpiresAt =
      warrantyDays > 0
        ? new Date(Date.now() + warrantyDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        : null

    const { data: cashEntry, error: cashEntryError } = await supabase
      .from('cash_entries')
      .insert({
        company_id: companyId,
        branch_id: os.branch_id,
        service_order_id: id,
        estimate_id: approvedEstimate.id,
        entry_type: 'recebimento_os',
        payment_method: paymentMethod,
        amount_due: amountDue,
        amount_received: amountReceived,
        change_amount: changeAmount,
        net_amount: netAmount,
        notes,
        created_by: user.id,
      })
      .select('id')
      .single()

    if (cashEntryError) throw cashEntryError

    const { error: updateError } = await supabase
      .from('service_orders')
      .update({
        status: 'finalizado',
        payment_status: paymentStatus,
        delivered_at: now,
        delivered_by: user.id,
        payment_method: paymentMethod,
        amount_paid: netAmount,
        change_amount: changeAmount,
        pickup_notes: notes,
        warranty_expires_at: warrantyExpiresAt,
      })
      .eq('id', id)
      .eq('company_id', companyId)

    if (updateError) throw updateError

    await createAuditLog({
      action: 'update',
      entityType: 'service_order',
      entityId: os.id,
      companyId,
      summary: `OS #${os.number}: retirada registrada e recebimento lançado no caixa.`,
      metadata: {
        previous_status: 'pronto',
        new_status: 'finalizado',
        payment_status: paymentStatus,
        payment_method: paymentMethod,
        amount_due: amountDue,
        discount_amount: discountAmount,
        payable_amount: payableAmount,
        amount_received: amountReceived,
        amount_paid: netAmount,
        change_amount: changeAmount,
        cash_entry_id: cashEntry.id,
        estimate_id: approvedEstimate.id,
      },
    })

    revalidateServiceOrdersPage()
    revalidateServiceOrderDetailPage(id)
    revalidatePath(`/recibos/os/${cashEntry.id}`)

    return {
      success: true,
      cashEntryId: cashEntry.id,
      amountDue,
      discountAmount,
      payableAmount,
      amountPaid: netAmount,
      changeAmount,
      paymentMethod,
      paymentStatus,
    }
  } catch (error: unknown) {
    if (error instanceof Error) return { error: error.message }
    return { error: 'Erro ao registrar retirada da OS.' }
  }
}

const normalizeOptional = (value: string | null | undefined) => {
  const v = value?.trim()
  return v ? v : null
}

const revalidateServiceOrdersPage = () => {
  revalidatePath('/dashboard/ordens-de-servico')
}

const revalidateServiceOrderDetailPage = (id: string) => {
  revalidatePath(`/dashboard/ordens-de-servico/${id}`)
}

const getActiveEquipmentModel = async (
  supabase: Awaited<ReturnType<typeof createSupabaseClient>>,
  companyId: string,
  equipmentModelId: string,
) => {
  const { data, error } = await supabase
    .from('equipment_models')
    .select('id, type, manufacturer, model, voltage')
    .eq('id', equipmentModelId)
    .eq('company_id', companyId)
    .eq('active', true)
    .is('deleted_at', null)
    .single()

  if (error || !data) {
    return null
  }

  return data
}

export type ActiveWarrantyOS = {
  id: string
  number: number
  device_type: string | null
  device_brand: string | null
  device_model: string | null
  device_serial: string | null
  device_internal_code: string | null
  warranty_expires_at: string
  equipment_model_id: string | null
}

export async function getClientActiveWarranties(
  clientId: string,
): Promise<ActiveWarrantyOS[]> {
  if (!clientId) return []
  try {
    const { companyId } = await getCompanyContext()
    const supabase = await createSupabaseClient()
    const today = new Date().toISOString().slice(0, 10)

    const { data } = await supabase
      .from('service_orders')
      .select(
        'id, number, device_type, device_brand, device_model, device_serial, device_internal_code, warranty_expires_at, equipment_model_id',
      )
      .eq('company_id', companyId)
      .eq('client_id', clientId)
      .is('deleted_at', null)
      .not('warranty_expires_at', 'is', null)
      .gte('warranty_expires_at', today)
      .order('warranty_expires_at', { ascending: true })

    return (data ?? []) as ActiveWarrantyOS[]
  } catch {
    return []
  }
}

export async function createServiceOrder(data: ServiceOrderSchema) {
  try {
    const { companyId, user } = await getCompanyContext()
    const parsed = serviceOrderSchema.safeParse(data)

    if (!parsed.success) {
      return { error: parsed.error.issues[0].message }
    }

    const supabase = await createSupabaseClient()
    const equipmentModel = await getActiveEquipmentModel(
      supabase,
      companyId,
      parsed.data.equipment_model_id,
    )

    if (!equipmentModel) {
      return { error: 'Equipamento cadastrado não encontrado ou inativo.' }
    }

    const currentYear = new Date().getFullYear()
    const { data: lastOrder, error: lastOrderError } = await supabase
      .from('service_orders')
      .select('number')
      .eq('company_id', companyId)
      .gte('number', currentYear * 10000)
      .lt('number', (currentYear + 1) * 10000)
      .order('number', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (lastOrderError) {
      throw lastOrderError
    }

    const nextNumber = lastOrder ? lastOrder.number + 1 : currentYear * 10000 + 1

    const { data: created, error } = await supabase
      .from('service_orders')
      .insert({
        company_id: companyId,
        number: nextNumber,
        branch_id: parsed.data.branch_id,
        client_id: parsed.data.client_id,
        equipment_model_id: equipmentModel.id,
        device_type: equipmentModel.type,
        device_brand: equipmentModel.manufacturer,
        device_model: equipmentModel.model,
        device_serial: normalizeOptional(parsed.data.device_serial),
        device_color: normalizeOptional(parsed.data.device_color),
        device_internal_code: normalizeOptional(parsed.data.device_internal_code),
        device_condition: normalizeOptional(parsed.data.device_condition),
        reported_issue: parsed.data.reported_issue.trim(),
        technician_id: normalizeOptional(parsed.data.technician_id) || null,
        estimated_delivery: normalizeOptional(parsed.data.estimated_delivery) || null,
        notes: normalizeOptional(parsed.data.notes),
        parent_service_order_id: normalizeOptional(parsed.data.parent_service_order_id) || null,
        is_warranty_rework: parsed.data.is_warranty_rework ?? false,
        created_by: user.id,
        status: 'aguardando',
      })
      .select('id, number, branch_id, client_id')
      .single()

    if (error) {
      throw error
    }

    // Busca nome do cliente para notificação
    const { data: client } = await supabase
      .from('clients')
      .select('name')
      .eq('id', parsed.data.client_id)
      .eq('company_id', companyId)
      .maybeSingle()

    // Notifica o sino com a nova OS
    await supabase.from('notifications').insert({
      company_id: companyId,
      type: 'nova_os',
      title: `Nova OS #${created.number}`,
      body: `${client?.name ?? 'Cliente'} · ${equipmentModel.type} ${equipmentModel.manufacturer}`.trim(),
    })

    await createAuditLog({
      action: 'create',
      entityType: 'service_order',
      entityId: created.id,
      companyId,
      summary: `OS #${created.number} aberta.`,
      metadata: {
        number: created.number,
        branch_id: created.branch_id,
        client_id: created.client_id,
      },
    })

    revalidateServiceOrdersPage()
    revalidateServiceOrderDetailPage(created.id)
    return { success: true, id: created.id, number: created.number }
  } catch (error: unknown) {
    if (error instanceof Error) {
      return { error: error.message }
    }
    return { error: 'Erro ao abrir ordem de serviço' }
  }
}

export async function deleteServiceOrder(id: string) {
  try {
    const { companyId, user } = await getAdminContext('ordens-de-servico')
    const supabase = await createSupabaseClient()

    const { data: os, error: osError } = await supabase
      .from('service_orders')
      .select('id, number, status')
      .eq('id', id)
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .single()

    if (osError || !os) {
      throw new Error('Ordem de serviço não encontrada.')
    }

    if (os.status !== 'aguardando') {
      return {
        error:
          'Esta OS já possui andamento operacional. Use o cancelamento para preservar o histórico.',
      }
    }

    const { data: linkedEstimate } = await supabase
      .from('service_order_estimates')
      .select('id')
      .eq('service_order_id', id)
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .limit(1)
      .maybeSingle()

    if (linkedEstimate) {
      return {
        error:
          'Esta OS já possui orçamento vinculado. Use o cancelamento em vez de excluir.',
      }
    }

    const { data: activeReservation } = await supabase
      .from('stock_reservations')
      .select('id')
      .eq('service_order_id', id)
      .eq('company_id', companyId)
      .eq('status', 'ativa')
      .limit(1)
      .maybeSingle()

    if (activeReservation) {
      return {
        error:
          'Esta OS possui reservas de estoque ativas. Use o cancelamento para liberar os vínculos corretamente.',
      }
    }

    const deletedAt = new Date().toISOString()
    const { error } = await supabase
      .from('service_orders')
      .update({
        deleted_at: deletedAt,
        deleted_by: user.id,
      })
      .eq('id', id)
      .eq('company_id', companyId)
      .is('deleted_at', null)

    if (error) {
      throw error
    }

    await createAuditLog({
      action: 'soft_delete',
      entityType: 'service_order',
      entityId: os.id,
      companyId,
      summary: `OS #${os.number} removida.`,
      metadata: { deleted_at: deletedAt },
    })

    revalidateServiceOrdersPage()
    revalidateServiceOrderDetailPage(os.id)
    return { success: true }
  } catch (error: unknown) {
    if (error instanceof Error) {
      return { error: error.message }
    }
    return { error: 'Erro ao excluir ordem de serviço' }
  }
}

export async function dispatchToThirdParty(
  id: string,
  data: DispatchToThirdPartySchema,
) {
  try {
    const parsed = dispatchToThirdPartySchema.safeParse(data)
    if (!parsed.success) return { error: parsed.error.issues[0].message }

    const { companyId } = await getCompanyContext()
    const supabase = await createSupabaseClient()

    const { data: os, error: osError } = await supabase
      .from('service_orders')
      .select('id, number, status, branch_id')
      .eq('id', id)
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .single()

    if (osError || !os) return { error: 'Ordem de serviço não encontrada.' }

    if (!DISPATCHABLE_STATUSES.includes(os.status as ServiceOrderStatus)) {
      return {
        error: 'O envio para terceiro só é permitido em OS nas etapas de análise, aprovadas ou aguardando peça.',
      }
    }

    const { data: thirdParty, error: tpError } = await supabase
      .from('third_parties')
      .select('id, name')
      .eq('id', parsed.data.third_party_id)
      .eq('company_id', companyId)
      .eq('active', true)
      .is('deleted_at', null)
      .single()

    if (tpError || !thirdParty) return { error: 'Terceirizada não encontrada ou inativa.' }

    const now = new Date().toISOString()

    // Libera reservas de estoque ativas (serviço não será feito internamente agora)
    await supabase
      .from('stock_reservations')
      .update({ status: 'liberada', resolved_at: now })
      .eq('service_order_id', id)
      .eq('company_id', companyId)
      .eq('status', 'ativa')

    const { error: updateError } = await supabase
      .from('service_orders')
      .update({
        status: 'enviado_terceiro',
        third_party_id: parsed.data.third_party_id,
        third_party_dispatched_at: now,
        third_party_expected_return_at: parsed.data.third_party_expected_return_at,
        third_party_notes: normalizeOptional(parsed.data.third_party_notes),
        third_party_returned_at: null,
      })
      .eq('id', id)
      .eq('company_id', companyId)

    if (updateError) throw updateError

    await createAuditLog({
      action: 'update',
      entityType: 'service_order',
      entityId: os.id,
      companyId,
      summary: `OS #${os.number}: equipamento enviado para "${thirdParty.name}". Retorno previsto: ${parsed.data.third_party_expected_return_at}.`,
      metadata: {
        previous_status: os.status,
        new_status: 'enviado_terceiro',
        third_party_id: parsed.data.third_party_id,
        third_party_name: thirdParty.name,
        third_party_expected_return_at: parsed.data.third_party_expected_return_at,
      },
    })

    revalidateServiceOrdersPage()
    revalidateServiceOrderDetailPage(id)
    return { success: true }
  } catch (error: unknown) {
    if (error instanceof Error) return { error: error.message }
    return { error: 'Erro ao enviar OS para terceiro.' }
  }
}

export async function returnFromThirdParty(
  id: string,
  data: ReturnFromThirdPartySchema,
) {
  try {
    const parsed = returnFromThirdPartySchema.safeParse(data)
    if (!parsed.success) return { error: parsed.error.issues[0].message }

    const { companyId } = await getCompanyContext()
    const supabase = await createSupabaseClient()

    const { data: os, error: osError } = await supabase
      .from('service_orders')
      .select('id, number, status, third_party_id, branch_id, third_party_notes')
      .eq('id', id)
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .single()

    if (osError || !os) return { error: 'Ordem de serviço não encontrada.' }

    if (os.status !== 'enviado_terceiro') {
      return { error: 'Apenas OS com status "Enviado p/ Terceiro" podem registrar retorno.' }
    }

    const now = new Date().toISOString()

    // Se consertado: vai para pronto se já há orçamento aprovado, senão volta para análise
    // Se sem reparo: cancela a OS com motivo sem_reparo_viavel
    let nextStatus: ServiceOrderStatus
    if (parsed.data.outcome === 'pronto') {
      const { data: approvedEstimate } = await supabase
        .from('service_order_estimates')
        .select('id')
        .eq('service_order_id', id)
        .eq('company_id', companyId)
        .eq('status', 'aprovado')
        .is('deleted_at', null)
        .maybeSingle()

      nextStatus = approvedEstimate ? 'pronto' : 'em_analise'
    } else {
      nextStatus = 'cancelado'

      // Libera reservas de estoque ativas, se houver
      await supabase
        .from('stock_reservations')
        .update({ status: 'liberada', resolved_at: now })
        .eq('service_order_id', id)
        .eq('company_id', companyId)
        .eq('status', 'ativa')
    }

    const { error: updateError } = await supabase
      .from('service_orders')
      .update({
        status: nextStatus,
        third_party_returned_at: now,
        third_party_notes: normalizeOptional(parsed.data.third_party_notes) ?? os.third_party_notes ?? null,
        ...(nextStatus === 'pronto' && { completed_at: now }),
      })
      .eq('id', id)
      .eq('company_id', companyId)

    if (updateError) throw updateError

    // Lê nome da terceirizada para o log
    let thirdPartyName = 'terceirizada'
    if (os.third_party_id) {
      const { data: tp } = await supabase
        .from('third_parties')
        .select('name')
        .eq('id', os.third_party_id)
        .maybeSingle()
      if (tp) thirdPartyName = tp.name
    }

    await createAuditLog({
      action: 'update',
      entityType: 'service_order',
      entityId: os.id,
      companyId,
      summary: parsed.data.outcome === 'pronto'
        ? `OS #${os.number}: equipamento retornou consertado de "${thirdPartyName}". Status: ${nextStatus}.`
        : `OS #${os.number}: equipamento retornou sem conserto de "${thirdPartyName}". OS encerrada (sem reparo viável).`,
      metadata: {
        previous_status: 'enviado_terceiro',
        new_status: nextStatus,
        third_party_returned_at: now,
        outcome: parsed.data.outcome,
        ...(parsed.data.outcome === 'reprovado' && { cancel_reason: 'sem_reparo_viavel' }),
      },
    })

    // Marca notificação de retorno vencido como lida, se houver
    await supabase
      .from('notifications')
      .update({ read_at: now })
      .eq('company_id', companyId)
      .eq('service_order_id', id)
      .eq('type', 'retorno_terceiro_vencido')
      .is('read_at', null)

    revalidateServiceOrdersPage()
    revalidateServiceOrderDetailPage(id)
    return { success: true }
  } catch (error: unknown) {
    if (error instanceof Error) return { error: error.message }
    return { error: 'Erro ao registrar retorno do terceiro.' }
  }
}

export async function editServiceOrder(id: string, data: EditServiceOrderSchema) {
  try {
    const { companyId, user } = await getCompanyContext()
    const parsed = editServiceOrderSchema.safeParse(data)

    if (!parsed.success) {
      return { error: parsed.error.issues[0].message }
    }

    const supabase = await createSupabaseClient()
    const { data: os, error: osError } = await supabase
      .from('service_orders')
      .select('id, number, status')
      .eq('id', id)
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .single()

    if (osError || !os) {
      return { error: 'Ordem de serviço não encontrada.' }
    }

    if (!EDITABLE_SERVICE_ORDER_STATUSES.includes(os.status as ServiceOrderStatus)) {
      return { error: 'Esta OS não pode mais ser editada após o envio do orçamento ao cliente.' }
    }

    const equipmentModel = await getActiveEquipmentModel(
      supabase,
      companyId,
      parsed.data.equipment_model_id,
    )

    if (!equipmentModel) {
      return { error: 'Equipamento cadastrado não encontrado ou inativo.' }
    }

    const { error } = await supabase
      .from('service_orders')
      .update({
        branch_id: parsed.data.branch_id,
        equipment_model_id: equipmentModel.id,
        device_type: equipmentModel.type,
        device_brand: equipmentModel.manufacturer,
        device_model: equipmentModel.model,
        device_serial: normalizeOptional(parsed.data.device_serial),
        device_color: normalizeOptional(parsed.data.device_color),
        device_internal_code: normalizeOptional(parsed.data.device_internal_code),
        device_condition: normalizeOptional(parsed.data.device_condition),
        reported_issue: parsed.data.reported_issue.trim(),
        technician_id: normalizeOptional(parsed.data.technician_id) || null,
        estimated_delivery: normalizeOptional(parsed.data.estimated_delivery) || null,
        notes: normalizeOptional(parsed.data.notes),
      })
      .eq('id', id)
      .eq('company_id', companyId)

    if (error) {
      throw error
    }

    await createAuditLog({
      action: 'update',
      entityType: 'service_order',
      entityId: os.id,
      companyId,
      summary: `OS #${os.number} atualizada.`,
      metadata: { edited_by: user.id },
    })

    revalidateServiceOrdersPage()
    revalidateServiceOrderDetailPage(os.id)
    return { success: true }
  } catch (error: unknown) {
    if (error instanceof Error) {
      return { error: error.message }
    }
    return { error: 'Erro ao editar ordem de serviço.' }
  }
}
