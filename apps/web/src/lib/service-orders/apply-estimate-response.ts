import { revalidatePath } from 'next/cache'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'
import { createAuditLog } from '@/lib/audit/audit-log'
import { reserveEstimatePartsIfAvailable } from './reserve-estimate-parts'

export type EstimateResponseOutcome =
  | { success: true; message: string; osNumber: number }
  | { error: string }

/**
 * Registra a resposta do cliente a um orçamento (aprovado ou reprovado),
 * atualizando a OS, o orçamento, reservas de estoque e auditoria.
 *
 * Extraído de `registerClientResponse` para ser reutilizável pelo bot do
 * WhatsApp (admin client) e pela server action (server client).
 */
export const applyEstimateClientResponse = async (params: {
  supabase: SupabaseClient<Database>
  companyId: string
  serviceOrderId: string
  response: 'aprovado' | 'reprovado'
}): Promise<EstimateResponseOutcome> => {
  const { supabase, companyId, serviceOrderId, response } = params

  const { data: os, error: osError } = await supabase
    .from('service_orders')
    .select('id, number, status, branch_id')
    .eq('id', serviceOrderId)
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .single()

  if (osError || !os) {
    return { error: 'Ordem de serviço não encontrada.' }
  }

  const isEnviadoTerceiro = os.status === 'enviado_terceiro'

  if (os.status !== 'aguardando_aprovacao' && !isEnviadoTerceiro) {
    return {
      error:
        'Apenas OS com status "Aguardando Aprovação" ou "Enviado p/ Terceiro" podem ter resposta registrada.',
    }
  }

  const now = new Date().toISOString()

  const { data: estimate } = await supabase
    .from('service_order_estimates')
    .select('id')
    .eq('service_order_id', serviceOrderId)
    .eq('company_id', companyId)
    .eq('status', 'enviado')
    .is('deleted_at', null)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle()

  let outcomeMessage: string

  if (response === 'aprovado') {
    let nextStatus: 'aprovado' | 'aguardando_peca' | 'enviado_terceiro'
    outcomeMessage = 'orçamento aprovado pelo cliente'

    if (isEnviadoTerceiro) {
      nextStatus = 'enviado_terceiro'
      outcomeMessage = 'orçamento aprovado pelo cliente — aguardando retorno do terceiro'
    } else {
      nextStatus = 'aprovado'

      if (estimate) {
        const reservationResult = await reserveEstimatePartsIfAvailable(
          supabase,
          companyId,
          serviceOrderId,
          os.number,
          os.branch_id,
          estimate.id,
        )

        nextStatus = reservationResult.nextStatus

        if (nextStatus === 'aguardando_peca') {
          outcomeMessage =
            reservationResult.message ??
            'cliente aprovou o orçamento, mas a OS ficou aguardando peça'
        }
      }

      const { error: osUpdateError } = await supabase
        .from('service_orders')
        .update({ status: nextStatus })
        .eq('id', serviceOrderId)
        .eq('company_id', companyId)

      if (osUpdateError) throw osUpdateError
    }

    if (estimate) {
      await supabase
        .from('service_order_estimates')
        .update({ status: 'aprovado', approved_at: now })
        .eq('id', estimate.id)
        .eq('company_id', companyId)
    }

    await createAuditLog({
      action: 'update',
      entityType: 'service_order',
      entityId: os.id,
      companyId,
      summary: isEnviadoTerceiro
        ? `OS #${os.number}: cliente aprovou o orçamento. Aguardando retorno do terceiro.`
        : nextStatus === 'aguardando_peca'
          ? `OS #${os.number}: cliente aprovou o orçamento, mas a OS ficou aguardando peça.`
          : `OS #${os.number}: cliente aprovou o orçamento.`,
      metadata: {
        previous_status: os.status,
        new_status: nextStatus,
        estimate_response: response,
      },
    })
  } else {
    outcomeMessage = 'orçamento recusado pelo cliente'

    if (isEnviadoTerceiro) {
      if (estimate) {
        await supabase
          .from('service_order_estimates')
          .update({ status: 'recusado', rejected_at: now })
          .eq('id', estimate.id)
          .eq('company_id', companyId)
      }

      await createAuditLog({
        action: 'update',
        entityType: 'service_order',
        entityId: os.id,
        companyId,
        summary: `OS #${os.number}: cliente recusou o orçamento. Equipamento aguarda retorno do terceiro.`,
        metadata: {
          previous_status: 'enviado_terceiro',
          new_status: 'enviado_terceiro',
          estimate_response: response,
        },
      })
    } else {
      const { error: osError2 } = await supabase
        .from('service_orders')
        .update({
          status: 'em_analise',
          client_notified_at: null,
          client_notified_via: null,
        })
        .eq('id', serviceOrderId)
        .eq('company_id', companyId)

      if (osError2) throw osError2

      if (estimate) {
        await supabase
          .from('service_order_estimates')
          .update({ status: 'recusado', rejected_at: now })
          .eq('id', estimate.id)
          .eq('company_id', companyId)

        await supabase
          .from('stock_reservations')
          .update({ status: 'liberada', resolved_at: now })
          .eq('estimate_id', estimate.id)
          .eq('company_id', companyId)
          .eq('status', 'ativa')
      }

      await createAuditLog({
        action: 'update',
        entityType: 'service_order',
        entityId: os.id,
        companyId,
        summary: `OS #${os.number}: cliente recusou o orçamento. OS retornou para em análise.`,
        metadata: {
          previous_status: 'aguardando_aprovacao',
          new_status: 'em_analise',
          estimate_response: response,
        },
      })
    }
  }

  revalidatePath('/dashboard/ordens-de-servico')
  revalidatePath(`/dashboard/ordens-de-servico/${serviceOrderId}`)

  return { success: true, message: outcomeMessage, osNumber: os.number }
}
