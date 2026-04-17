'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createAuditLog } from '@/lib/audit/audit-log'
import { getCompanyContext } from '@/lib/auth/company-context'
import {
  getPartAvailabilitySnapshots,
} from '@/lib/stock/low-stock-notifications'
import {
  findOrCreateConversation,
  saveMessage,
  updateConversation,
} from '@/lib/whatsapp/conversation-service'
import { createEvolutionApiClient } from '@/lib/whatsapp/evolution-client'
import {
  DEFAULT_WHATSAPP_MESSAGES,
  renderWhatsAppMessageTemplate,
  resolveWhatsAppMessageTemplate,
} from '@/lib/whatsapp/message-templates'
import {
  serviceOrderEstimateSchema,
  type ServiceOrderEstimateSchema,
} from '@/lib/validations/service-order-estimate'

const normalizeOptional = (value: string | null | undefined) => {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

const roundCurrency = (value: number) => Number(value.toFixed(2))
const EDITABLE_ESTIMATE_SERVICE_ORDER_STATUSES = ['aguardando', 'em_analise', 'reprovado', 'enviado_terceiro'] as const
const FALLBACK_ESTIMATE_SESSION_TIMEOUT_MINUTES = 60

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

const revalidatePaths = (serviceOrderId: string) => {
  revalidatePath('/dashboard/ordens-de-servico')
  revalidatePath(`/dashboard/ordens-de-servico/${serviceOrderId}`)
}

const formatEstimateDate = (value: string | null) => {
  if (!value) return null
  return new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR')
}

const buildEquipmentLabel = (serviceOrder: {
  device_type: string | null
  device_brand: string | null
  device_model: string | null
}) =>
  [serviceOrder.device_type, serviceOrder.device_brand, serviceOrder.device_model]
    .filter(Boolean)
    .join(' ')
    .trim() || 'equipamento'

const normalizeRecipientPhone = (phone: string | null, defaultCountryCode: string | null) => {
  const digits = phone?.replace(/\D/g, '') ?? ''
  if (!digits) return null

  const countryCode = defaultCountryCode?.replace(/\D/g, '') || '55'
  return digits.startsWith(countryCode) ? digits : `${countryCode}${digits}`
}

const truncatePreview = (text: string, max = 80) =>
  text.length > max ? `${text.slice(0, max - 1)}…` : text

const buildEstimateWhatsAppMessage = ({
  template,
  companyName,
  clientName,
  clientPhone,
  osNumber,
  equipment,
  totalAmount,
  validUntil,
}: {
  template: string | null
  companyName: string
  clientName: string | null
  clientPhone: string | null
  osNumber: number
  equipment: string
  totalAmount: number
  validUntil: string | null
}) => {
  const fallback = [
    'Olá, {{cliente_nome}}! Segue o orçamento referente à OS #{{os_numero}}.',
    '',
    'Equipamento: {{equipamento}}',
    'Total: {{valor_orcamento}}',
    validUntil ? `Válido até: ${formatEstimateDate(validUntil)}` : null,
    '',
    'Para aprovar ou recusar, responda esta mensagem ou entre em contato conosco.',
  ]
    .filter((line): line is string => line !== null)
    .join('\n')

  return renderWhatsAppMessageTemplate(
    resolveWhatsAppMessageTemplate(template, fallback || DEFAULT_WHATSAPP_MESSAGES.estimateReady),
    {
      empresa_nome: companyName,
      cliente_nome: clientName ?? 'cliente',
      telefone_cliente: clientPhone,
      os_numero: String(osNumber),
      equipamento: equipment,
      valor_orcamento: currencyFormatter.format(totalAmount),
      marcas_autorizadas: '',
      instancia_nome: '',
    },
  )
}

const sendEstimateViaEvolution = async ({
  companyId,
  serviceOrderId,
  estimateId,
}: {
  companyId: string
  serviceOrderId: string
  estimateId: string
}) => {
  const adminSupabase = createAdminClient()

  const { data: settings, error: settingsError } = await adminSupabase
    .from('whatsapp_automation_settings')
    .select(
      `provider, enabled, evolution_base_url, evolution_api_key,
       evolution_instance_name, default_country_code, message_estimate_ready,
       session_timeout_minutes`,
    )
    .eq('company_id', companyId)
    .maybeSingle<{
      provider: string
      enabled: boolean
      evolution_base_url: string
      evolution_api_key: string | null
      evolution_instance_name: string | null
      default_country_code: string
      message_estimate_ready: string | null
      session_timeout_minutes: number | null
    }>()

  if (settingsError) throw settingsError

  if (
    !settings?.enabled ||
    settings.provider !== 'evolution_api' ||
    !settings.evolution_api_key ||
    !settings.evolution_instance_name
  ) {
    throw new Error('WhatsApp via Evolution API não está configurado para esta empresa.')
  }

  const { data: serviceOrder, error: serviceOrderError } = await adminSupabase
    .from('service_orders')
    .select('id, number, device_type, device_brand, device_model, branch_id, client_id')
    .eq('id', serviceOrderId)
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .single<{
      id: string
      number: number
      device_type: string | null
      device_brand: string | null
      device_model: string | null
      branch_id: string | null
      client_id: string
    }>()

  if (serviceOrderError || !serviceOrder) {
    throw new Error('OS não encontrada para envio pelo WhatsApp.')
  }

  const [{ data: estimate, error: estimateError }, { data: client, error: clientError }, { data: company }] =
    await Promise.all([
      adminSupabase
        .from('service_order_estimates')
        .select('id, version, total_amount, valid_until')
        .eq('id', estimateId)
        .eq('company_id', companyId)
        .is('deleted_at', null)
        .single<{
          id: string
          version: number
          total_amount: number
          valid_until: string | null
        }>(),
      adminSupabase
        .from('clients')
        .select('id, name, phone')
        .eq('id', serviceOrder.client_id)
        .eq('company_id', companyId)
        .is('deleted_at', null)
        .single<{ id: string; name: string; phone: string | null }>(),
      adminSupabase
        .from('companies')
        .select('name')
        .eq('id', companyId)
        .single<{ name: string }>(),
    ])

  if (estimateError || !estimate) {
    throw new Error('Orçamento não encontrado para envio pelo WhatsApp.')
  }

  if (clientError || !client) {
    throw new Error('Cliente não encontrado para envio pelo WhatsApp.')
  }

  const recipient = normalizeRecipientPhone(client.phone, settings.default_country_code)
  if (!recipient) {
    throw new Error('Cliente sem WhatsApp/telefone cadastrado.')
  }

  const message = buildEstimateWhatsAppMessage({
    template: settings.message_estimate_ready,
    companyName: company?.name ?? 'Assistência',
    clientName: client.name,
    clientPhone: client.phone,
    osNumber: serviceOrder.number,
    equipment: buildEquipmentLabel(serviceOrder),
    totalAmount: estimate.total_amount,
    validUntil: estimate.valid_until,
  })

  const evolutionClient = createEvolutionApiClient({
    baseUrl: settings.evolution_base_url,
    apiKey: settings.evolution_api_key,
    instanceName: settings.evolution_instance_name,
  })

  await evolutionClient.sendText({ number: recipient, text: message })

  const timeoutMinutes =
    typeof settings.session_timeout_minutes === 'number' && settings.session_timeout_minutes > 0
      ? settings.session_timeout_minutes
      : FALLBACK_ESTIMATE_SESSION_TIMEOUT_MINUTES

  const conversation = await findOrCreateConversation(
    adminSupabase,
    companyId,
    recipient,
    client.name,
    timeoutMinutes,
  )

  await updateConversation(adminSupabase, conversation.id, {
    status: 'bot',
    branch_id: serviceOrder.branch_id,
    client_id: client.id,
    bot_enabled: true,
    bot_state: 'awaiting_estimate_response',
    attempts: 0,
    context: {
      service_order_id: serviceOrder.id,
      estimate_id: estimate.id,
    },
    last_message_at: new Date().toISOString(),
    last_message_preview: truncatePreview(message),
  })

  await saveMessage(adminSupabase, {
    conversationId: conversation.id,
    companyId,
    direction: 'outbound',
    content: message,
    sentByBot: false,
    senderName: 'Sistema',
  })
}

const normalizeEstimateDraftPayload = (data: ServiceOrderEstimateSchema) => {
  const parsed = serviceOrderEstimateSchema.safeParse(data)

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message as string }
  }

  const normalizedItems = parsed.data.items.map((item) => {
    const parsedQuantity = Number(item.quantity)

    if (item.item_type === 'peca' && !Number.isInteger(parsedQuantity)) {
      throw new Error('Quantidade de peca deve ser um numero inteiro.')
    }

    const quantity = item.item_type === 'servico' ? 1 : parsedQuantity
    const unitPrice = Number(item.unit_price)
    return {
      item_type: item.item_type,
      description: item.description.trim(),
      quantity,
      unit_price: unitPrice,
      line_total: roundCurrency(quantity * unitPrice),
      notes: normalizeOptional(item.notes),
      part_id: normalizeOptional(item.part_id ?? ''),
    }
  })

  const subtotalAmount = roundCurrency(normalizedItems.reduce((acc, item) => acc + item.line_total, 0))
  const discountAmount = roundCurrency(Number(parsed.data.discount_amount))
  const totalAmount = roundCurrency(Math.max(subtotalAmount - discountAmount, 0))

  return {
    parsedData: parsed.data,
    normalizedItems,
    subtotalAmount,
    discountAmount,
    totalAmount,
  }
}

async function validateEstimateSendabilityInternal(
  supabase: Awaited<ReturnType<typeof createClient>>,
  companyId: string,
  serviceOrderId: string,
  estimateId: string,
) {
  const { data: serviceOrder, error: soError } = await supabase
    .from('service_orders')
    .select('id, number, status, branch_id')
    .eq('id', serviceOrderId)
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .single()

  if (soError || !serviceOrder) {
    throw new Error('OS nao encontrada.')
  }

  if (serviceOrder.status === 'cancelado') {
    return {
      error: 'Nao e possivel enviar orcamento de uma OS cancelada.',
      blockingPartId: null,
      blockingBranchId: serviceOrder.branch_id,
    }
  }

  if (serviceOrder.status === 'finalizado') {
    return {
      error: 'Nao e possivel enviar orcamento de uma OS finalizada.',
      blockingPartId: null,
      blockingBranchId: serviceOrder.branch_id,
    }
  }

  const { data: estimate, error: estError } = await supabase
    .from('service_order_estimates')
    .select('id, version, status')
    .eq('id', estimateId)
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .single()

  if (estError || !estimate) {
    throw new Error('Orcamento nao encontrado.')
  }

  if (estimate.status !== 'rascunho') {
    return {
      error: 'Este orcamento ja foi enviado.',
      blockingPartId: null,
      blockingBranchId: serviceOrder.branch_id,
    }
  }

  let reservedQuantityByPart = new Map<string, number>()
  let partSnapshots = new Map<string, Awaited<ReturnType<typeof getPartAvailabilitySnapshots>> extends Map<
    string,
    infer Snapshot
  >
    ? Snapshot
    : never>()
  let partItems: Array<{ part_id: string | null; quantity: number }> = []
  const stockIssues: Array<{
    partId: string
    partName: string
    availableStock: number
    requestedQuantity: number
  }> = []

  if (serviceOrder.branch_id) {
    const { data: fetchedPartItems } = await supabase
      .from('service_order_estimate_items')
      .select('part_id, quantity')
      .eq('estimate_id', estimateId)
      .eq('company_id', companyId)
      .eq('item_type', 'peca')

    partItems = fetchedPartItems ?? []

    const partIds = [...new Set(partItems.flatMap((item) => (item.part_id ? [item.part_id] : [])))]
    partSnapshots = await getPartAvailabilitySnapshots(
      supabase,
      companyId,
      serviceOrder.branch_id,
      partIds,
    )

    reservedQuantityByPart = new Map<string, number>()
    for (const item of partItems) {
      if (!item.part_id) continue

      const requestedQuantity = Math.ceil(item.quantity)
      reservedQuantityByPart.set(
        item.part_id,
        (reservedQuantityByPart.get(item.part_id) ?? 0) + requestedQuantity,
      )
    }

    for (const [partId, reservedQuantity] of reservedQuantityByPart.entries()) {
      const stockSnapshot = partSnapshots.get(partId)
      const availableStock = stockSnapshot?.availableStock ?? 0

      if (availableStock < reservedQuantity) {
        stockIssues.push({
          partId,
          partName: stockSnapshot?.partName ?? 'peca',
          availableStock,
          requestedQuantity: reservedQuantity,
        })
      }
    }
  }

  const primaryStockIssue = stockIssues[0] ?? null

  return {
    serviceOrder,
    estimate,
    partItems,
    partSnapshots,
    reservedQuantityByPart,
    stockIssues,
    stockWarning: primaryStockIssue
      ? `Estoque insuficiente para "${primaryStockIssue.partName}": disponível ${primaryStockIssue.availableStock}, solicitado ${primaryStockIssue.requestedQuantity}. Você ainda pode enviar o orçamento, mas a aprovação dependerá da reposição.`
      : null,
    warningPartId: primaryStockIssue?.partId ?? null,
    warningBranchId: serviceOrder.branch_id,
  }
}

export async function checkEstimateSendability(serviceOrderId: string, estimateId: string) {
  try {
    const { companyId } = await getCompanyContext()
    const supabase = await createClient()
    const result = await validateEstimateSendabilityInternal(
      supabase,
      companyId,
      serviceOrderId,
      estimateId,
    )

    if ('error' in result) {
      return {
        canSend: false,
        error: result.error,
        warning: null,
        warningPartId: null,
        warningBranchId: null,
      }
    }

    return {
      canSend: true,
      error: null,
      warning: result.stockWarning,
      warningPartId: result.warningPartId,
      warningBranchId: result.warningBranchId,
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      return {
        canSend: false,
        error: error.message,
        warning: null,
        warningPartId: null,
        warningBranchId: null,
      }
    }

    return {
      canSend: false,
      error: 'Erro ao validar envio do orcamento.',
      warning: null,
      warningPartId: null,
      warningBranchId: null,
    }
  }
}

// ─── Criar orçamento (rascunho) ───────────────────────────────────────────────
// A OS permanece em "em_analise". O técnico envia depois via sendEstimate.

export async function createServiceOrderEstimate(
  serviceOrderId: string,
  data: ServiceOrderEstimateSchema,
) {
  try {
    const { companyId, user } = await getCompanyContext()
    const normalizedPayload = normalizeEstimateDraftPayload(data)

    if ('error' in normalizedPayload) {
      return { error: normalizedPayload.error }
    }

    const supabase = await createClient()

    const { data: serviceOrder, error: serviceOrderError } = await supabase
      .from('service_orders')
      .select('id, number, status, branch_id, technician_id')
      .eq('id', serviceOrderId)
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .single()

    if (serviceOrderError || !serviceOrder) {
      throw new Error('Ordem de servico nao encontrada.')
    }

    if (serviceOrder.status === 'cancelado') {
      return { error: 'Nao e possivel criar orcamento para uma OS cancelada.' }
    }

    if (serviceOrder.status === 'finalizado') {
      return { error: 'Nao e possivel criar orcamento para uma OS finalizada.' }
    }

    if (
      !EDITABLE_ESTIMATE_SERVICE_ORDER_STATUSES.includes(
        serviceOrder.status as (typeof EDITABLE_ESTIMATE_SERVICE_ORDER_STATUSES)[number],
      )
    ) {
      if (serviceOrder.status === 'aguardando_aprovacao') {
        return { error: 'Aguarde a resposta do cliente antes de criar um novo orcamento.' }
      }

      if (serviceOrder.status === 'aprovado') {
        return { error: 'O orçamento já foi aprovado. Continue o atendimento da OS.' }
      }

      return { error: 'Nao e possivel criar novo orcamento no status atual da OS.' }
    }

    const { data: previousEstimates, error: previousEstimatesError } = await supabase
      .from('service_order_estimates')
      .select('id, version, status')
      .eq('service_order_id', serviceOrderId)
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .order('version', { ascending: false })

    if (previousEstimatesError) throw previousEstimatesError

    const currentVersion = previousEstimates?.[0]?.version ?? 0
    const nextVersion = currentVersion + 1

    // Supersede rascunhos anteriores
    const rascunhoIds = previousEstimates?.filter((e) => e.status === 'rascunho').map((e) => e.id) ?? []
    if (rascunhoIds.length > 0) {
      await supabase
        .from('service_order_estimates')
        .update({ status: 'substituido' })
        .eq('company_id', companyId)
        .in('id', rascunhoIds)
        .is('deleted_at', null)
    }

    // Cria o orçamento como rascunho (sem reservas, sem transição de OS)
    const { data: createdEstimate, error: estimateError } = await supabase
      .from('service_order_estimates')
      .insert({
        service_order_id: serviceOrderId,
        company_id: companyId,
        version: nextVersion,
        status: 'rascunho',
        approval_channel: null,
        subtotal_amount: normalizedPayload.subtotalAmount,
        discount_amount: normalizedPayload.discountAmount,
        total_amount: normalizedPayload.totalAmount,
        valid_until: normalizeOptional(normalizedPayload.parsedData.valid_until) || null,
        warranty_days: normalizedPayload.parsedData.warranty_days,
        sent_at: null,
        approved_at: null,
        rejected_at: null,
        notes: normalizeOptional(normalizedPayload.parsedData.notes),
        created_by: user.id,
      })
      .select('id, version, total_amount')
      .single()

    if (estimateError) throw estimateError

    const { error: itemsError } = await supabase.from('service_order_estimate_items').insert(
      normalizedPayload.normalizedItems.map((item) => ({
        estimate_id: createdEstimate.id,
        service_order_id: serviceOrderId,
        company_id: companyId,
        item_type: item.item_type,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        line_total: item.line_total,
        notes: item.notes,
        part_id: item.part_id,
      })),
    )

    if (itemsError) throw itemsError

    // Atualiza OS: status → em_analise + atribui técnico responsável (quem criou o orçamento)
    const { data: creatorEmployee } = await supabase
      .from('employees')
      .select('id')
      .eq('company_id', companyId)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .maybeSingle()

    const TERMINAL_STATUSES = ['aguardando_aprovacao', 'aprovado', 'aguardando_peca', 'enviado_terceiro', 'pronto', 'finalizado', 'cancelado']
    const osUpdates: Record<string, unknown> = {}

    if (!TERMINAL_STATUSES.includes(serviceOrder.status)) {
      osUpdates.status = 'em_analise'
    }

    if (creatorEmployee && !serviceOrder.technician_id) {
      osUpdates.technician_id = creatorEmployee.id
    }

    if (Object.keys(osUpdates).length > 0) {
      const { error: osUpdateError } = await supabase
        .from('service_orders')
        .update(osUpdates)
        .eq('id', serviceOrderId)
        .eq('company_id', companyId)

      if (osUpdateError) throw osUpdateError
    }

    await createAuditLog({
      action: 'create',
      entityType: 'service_order_estimate',
      entityId: createdEstimate.id,
      companyId,
      summary: `Orcamento v${createdEstimate.version} (rascunho) criado para OS #${serviceOrder.number}.`,
      metadata: {
        service_order_id: serviceOrderId,
        version: createdEstimate.version,
        total_amount: createdEstimate.total_amount,
      },
    })

    revalidatePaths(serviceOrderId)
    return {
      success: true,
      estimateId: createdEstimate.id,
      version: createdEstimate.version,
      totalAmount: createdEstimate.total_amount,
    }
  } catch (error: unknown) {
    if (error instanceof Error) return { error: error.message }
    return { error: 'Erro ao criar orcamento' }
  }
}

export async function updateServiceOrderEstimateDraft(
  serviceOrderId: string,
  estimateId: string,
  data: ServiceOrderEstimateSchema,
) {
  try {
    const { companyId } = await getCompanyContext()
    const normalizedPayload = normalizeEstimateDraftPayload(data)

    if ('error' in normalizedPayload) {
      return { error: normalizedPayload.error }
    }

    const supabase = await createClient()

    const { data: serviceOrder, error: serviceOrderError } = await supabase
      .from('service_orders')
      .select('id, number, status')
      .eq('id', serviceOrderId)
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .single()

    if (serviceOrderError || !serviceOrder) {
      throw new Error('Ordem de servico nao encontrada.')
    }

    if (serviceOrder.status === 'cancelado') {
      return { error: 'Nao e possivel editar orcamento de uma OS cancelada.' }
    }

    if (serviceOrder.status === 'finalizado') {
      return { error: 'Nao e possivel editar orcamento de uma OS finalizada.' }
    }

    if (
      !EDITABLE_ESTIMATE_SERVICE_ORDER_STATUSES.includes(
        serviceOrder.status as (typeof EDITABLE_ESTIMATE_SERVICE_ORDER_STATUSES)[number],
      )
    ) {
      if (serviceOrder.status === 'aguardando_aprovacao') {
        return { error: 'Aguarde a resposta do cliente antes de editar o orcamento.' }
      }

      if (serviceOrder.status === 'aprovado') {
        return { error: 'O orçamento já foi aprovado. Continue o atendimento da OS.' }
      }

      return { error: 'Nao e possivel editar orcamento no status atual da OS.' }
    }

    const { data: estimate, error: estimateError } = await supabase
      .from('service_order_estimates')
      .select('id, service_order_id, version, status')
      .eq('id', estimateId)
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .single()

    if (estimateError || !estimate || estimate.service_order_id !== serviceOrderId) {
      throw new Error('Orcamento nao encontrado.')
    }

    if (estimate.status !== 'rascunho') {
      return { error: 'Somente orcamentos em rascunho podem ser editados.' }
    }

    const { error: updateEstimateError } = await supabase
      .from('service_order_estimates')
      .update({
        subtotal_amount: normalizedPayload.subtotalAmount,
        discount_amount: normalizedPayload.discountAmount,
        total_amount: normalizedPayload.totalAmount,
        valid_until: normalizeOptional(normalizedPayload.parsedData.valid_until) || null,
        warranty_days: normalizedPayload.parsedData.warranty_days,
        notes: normalizeOptional(normalizedPayload.parsedData.notes),
      })
      .eq('id', estimateId)
      .eq('company_id', companyId)

    if (updateEstimateError) throw updateEstimateError

    const { error: deleteItemsError } = await supabase
      .from('service_order_estimate_items')
      .delete()
      .eq('estimate_id', estimateId)
      .eq('company_id', companyId)

    if (deleteItemsError) throw deleteItemsError

    const { error: insertItemsError } = await supabase
      .from('service_order_estimate_items')
      .insert(
        normalizedPayload.normalizedItems.map((item) => ({
          estimate_id: estimateId,
          service_order_id: serviceOrderId,
          company_id: companyId,
          item_type: item.item_type,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          line_total: item.line_total,
          notes: item.notes,
          part_id: item.part_id,
        })),
      )

    if (insertItemsError) throw insertItemsError

    await createAuditLog({
      action: 'update',
      entityType: 'service_order_estimate',
      entityId: estimateId,
      companyId,
      summary: `Orcamento v${estimate.version} (rascunho) atualizado para OS #${serviceOrder.number}.`,
      metadata: {
        service_order_id: serviceOrderId,
        version: estimate.version,
        total_amount: normalizedPayload.totalAmount,
      },
    })

    revalidatePaths(serviceOrderId)
    return {
      success: true,
      estimateId,
      version: estimate.version,
      totalAmount: normalizedPayload.totalAmount,
    }
  } catch (error: unknown) {
    if (error instanceof Error) return { error: error.message }
    return { error: 'Erro ao atualizar orcamento' }
  }
}

// ─── Enviar orçamento ao cliente ──────────────────────────────────────────────
// Marca como enviado e muda OS para aguardando_aprovacao.
// A reserva de peças ocorre somente quando o cliente aprova.

export async function sendEstimate(
  serviceOrderId: string,
  estimateId: string,
  via: 'whatsapp' | 'email',
) {
  try {
    const { companyId } = await getCompanyContext()
    const supabase = await createClient()
    const validation = await validateEstimateSendabilityInternal(
      supabase,
      companyId,
      serviceOrderId,
      estimateId,
    )

    if ('error' in validation) {
      return { error: validation.error }
    }

    const { serviceOrder, estimate } = validation

    if (via === 'whatsapp') {
      await sendEstimateViaEvolution({ companyId, serviceOrderId, estimateId })
    }

    const now = new Date().toISOString()

    // Atualiza o orçamento para enviado
    const { error: estimateUpdateError } = await supabase
      .from('service_order_estimates')
      .update({ status: 'enviado', sent_at: now })
      .eq('id', estimateId)
      .eq('company_id', companyId)

    if (estimateUpdateError) throw estimateUpdateError

    // Atualiza OS: notificação sempre; status apenas fora de estados terminais
    const TERMINAL_STATUSES = ['pronto', 'finalizado', 'cancelado']
    const osUpdate: Record<string, unknown> = {
      client_notified_at: now,
      client_notified_via: via,
    }
    if (!TERMINAL_STATUSES.includes(serviceOrder.status) && serviceOrder.status !== 'enviado_terceiro') {
      osUpdate.status = 'aguardando_aprovacao'
    }

    const { error: osError } = await supabase
      .from('service_orders')
      .update(osUpdate)
      .eq('id', serviceOrderId)
      .eq('company_id', companyId)

    if (osError) throw osError

    await createAuditLog({
      action: 'update',
      entityType: 'service_order_estimate',
      entityId: estimateId,
      companyId,
      summary: `Orcamento v${estimate.version} enviado ao cliente via ${via}. OS #${serviceOrder.number} aguardando aprovacao.`,
      metadata: { via, estimate_id: estimateId },
    })

    revalidatePaths(serviceOrderId)
    return { success: true }
  } catch (error: unknown) {
    if (error instanceof Error) return { error: error.message }
    return { error: 'Erro ao enviar orcamento.' }
  }
}
