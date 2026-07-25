/**
 * bot-engine.ts
 * Máquina de estados do bot do WhatsApp.
 *
 * Cada mensagem recebida passa por aqui quando bot_enabled = true.
 * O engine lê o estado atual da conversa, executa o handler correto,
 * envia a resposta via Evolution API e persiste o novo estado.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { EvolutionApiClient } from '@/lib/whatsapp/evolution-client'
import {
  createHandoffNotification,
  findClientByPhone,
  formatOsDate,
  formatOsStatus,
  getBranchName,
  getBranches,
  getClientServiceOrders,
  getMenuItems,
  getServiceOrderByNumber,
  isSessionExpired,
  saveMessage,
  updateConversation,
  type MenuItemRecord,
  type ServiceOrderSummary,
  type WhatsAppConversation,
} from '@/lib/whatsapp/conversation-service'
import { applyEstimateClientResponse } from '@/lib/service-orders/apply-estimate-response'
import { type BotMessages, BOT_MESSAGES_DEFAULTS } from '@/lib/whatsapp/bot-messages'

// ── Tipos internos ───────────────────────────────────────────

export type BotEngineParams = {
  supabase: SupabaseClient
  conversation: WhatsAppConversation
  messageText: string
  phoneNumber: string
  companyName: string
  authorizedBrands: string | null
  botMessages: BotMessages
  evolutionClient: EvolutionApiClient
}

// ── Resolução de variáveis ───────────────────────────────────

type VarContext = {
  clientName: string | null
  companyName: string
  branchName: string | null
  osNumber?: string | number | null
}

const resolveVars = (text: string, ctx: VarContext): string =>
  text
    .replace(/\{\{cliente\.nome\}\}/g, ctx.clientName ?? 'Cliente')
    .replace(/\{\{empresa\.nome\}\}/g, ctx.companyName)
    .replace(/\{\{filial\.nome\}\}/g, ctx.branchName ?? ctx.companyName)
    .replace(/\{\{os_numero\}\}/g, ctx.osNumber != null ? String(ctx.osNumber) : '')

// ── Helpers de formatação ────────────────────────────────────

const buildMenuText = (
  menuItems: MenuItemRecord[],
  companyName: string,
  clientName: string | null,
  authorizedBrands: string | null,
  msgs: BotMessages,
  isSubmenu = false,
): string => {
  const options = menuItems
    .map((item) => `${item.emoji ?? `${item.position}.`} ${item.label}`)
    .join('\n')

  if (isSubmenu) {
    return `${msgs.submenu_header}\n\n${options}\n0️⃣ Menu principal\n\n${msgs.submenu_footer}`
  }

  const greeting = resolveVars(msgs.menu_greeting, { clientName, companyName, branchName: null })
  const brandsLine = authorizedBrands
    ? `\nSomos assistência autorizada das marcas: *${authorizedBrands}*.\n`
    : ''

  return `${greeting}${brandsLine}\n${msgs.menu_question}\n\n${options}\n\n${msgs.menu_footer}`
}

const buildOsListText = (
  orders: ServiceOrderSummary[],
  hasMore: boolean,
  msgs: BotMessages,
): string => {
  const lines = orders.map((os) => {
    const device = [os.device_brand, os.device_model, os.device_type].filter(Boolean).join(' ')
    const completedValue = os.completed_at ? formatOsDate(os.completed_at) : null
    return msgs.os_list_item
      .replace(/\{\{os_numero\}\}/g, String(os.number))
      .replace(/\{\{os_dispositivo\}\}/g, device)
      .replace(/\{\{os_status\}\}/g, formatOsStatus(os.status))
      .replace(/\{\{os_data\}\}/g, formatOsDate(os.created_at))
      // Quando não há data de finalização, remove a linha inteira para não deixar "Finalização: " vazio
      .replace(
        completedValue
          ? /\{\{os_data_finalizacao\}\}/g
          : /[^\n]*\{\{os_data_finalizacao\}\}[^\n]*(\r?\n|$)/g,
        completedValue ?? '',
      )
  })

  const list = lines.join('\n\n')
  const footer = hasMore
    ? `\n\n${msgs.os_list_more_footer}`
    : `\n\n${msgs.os_list_footer}`

  return `${msgs.os_list_header}\n\n${list}${footer}`
}

const NUMBER_EMOJIS = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣']

const buildBranchListText = (
  branches: Array<{ id: string; name: string }>,
  msgs: BotMessages,
): string => {
  const options = branches
    .slice(0, NUMBER_EMOJIS.length)
    .map((b, i) => `${NUMBER_EMOJIS[i]} ${b.name}`)
    .join('\n')

  return `${msgs.ask_branch}\n\n${options}\n0️⃣ Voltar ao menu\n\n${msgs.ask_branch_footer}`
}

// ── Envio + persistência ─────────────────────────────────────

/** 500 ms base + 20 ms por caractere, limitado a 2 000 ms. */
const typingDelay = (text: string) => Math.min(500 + text.length * 20, 2000)

const sendAndSave = async (
  supabase: SupabaseClient,
  evolutionClient: EvolutionApiClient,
  conversation: WhatsAppConversation,
  text: string
) => {
  await evolutionClient.sendText({ number: conversation.phone_number, text, delay: typingDelay(text) })
  await saveMessage(supabase, {
    conversationId: conversation.id,
    companyId: conversation.company_id,
    direction: 'outbound',
    content: text,
    sentByBot: true,
    senderName: 'Bot',
  })
}

// ── Re-exibição de menu após resposta informativa ────────────

const sendMenuAfterResponse = async (
  params: BotEngineParams,
  currentParentId: string | null,
) => {
  const { supabase, conversation, companyName, botMessages, evolutionClient } = params
  const items = await getMenuItems(supabase, conversation.company_id, currentParentId)
  if (items.length === 0) return

  const options = items.map((item) => `${item.emoji ?? `${item.position}.`} ${item.label}`).join('\n')

  // Mid-session: sem saudação. Sub-menu mantém o "0️⃣ Menu principal".
  const text = currentParentId !== null
    ? `${botMessages.submenu_header}\n\n${options}\n0️⃣ Menu principal\n\n${botMessages.submenu_footer}`
    : `${botMessages.more_help}\n\n${options}\n\n${botMessages.menu_footer}`

  await sendAndSave(supabase, evolutionClient, conversation, text)
}

// ── Handlers de estado ───────────────────────────────────────

/** Início de sessão: identifica o cliente e exibe o menu raiz. */
const handleNewSession = async (params: BotEngineParams) => {
  const { supabase, conversation, phoneNumber, companyName, authorizedBrands, botMessages, evolutionClient } =
    params

  const client = await findClientByPhone(supabase, conversation.company_id, phoneNumber)

  const { current_menu_parent_id: _dropped, ...restContext } = conversation.context as Record<string, unknown>
  void _dropped

  const updates: Parameters<typeof updateConversation>[2] = {
    status: 'bot',
    bot_state: 'awaiting_menu',
    attempts: 0,
    client_id: client?.id ?? conversation.client_id ?? null,
    context: restContext,
  }

  if (client && !conversation.branch_id) {
    const orders = await getClientServiceOrders(supabase, conversation.company_id, client.id, 1)
    if (orders[0]?.branch_id) {
      updates.branch_id = orders[0].branch_id
    }
  }

  await updateConversation(supabase, conversation.id, updates)

  const menuItems = await getMenuItems(supabase, conversation.company_id)
  const menuText = buildMenuText(menuItems, companyName, client?.name ?? null, authorizedBrands, botMessages)
  await sendAndSave(supabase, evolutionClient, conversation, menuText)
}

/** Estado: awaiting_menu — interpreta a escolha do cliente. */
const handleAwaitingMenu = async (params: BotEngineParams) => {
  const { supabase, conversation, messageText, botMessages, evolutionClient } = params

  const choice = messageText.trim()
  const currentParentId =
    typeof conversation.context.current_menu_parent_id === 'string'
      ? conversation.context.current_menu_parent_id
      : null

  const menuItems = await getMenuItems(supabase, conversation.company_id, currentParentId)
  const selected = menuItems.find((item) => String(item.position) === choice)

  if (!selected) {
    await handleInvalidResponse(params, 'awaiting_menu')
    return
  }

  switch (selected.handler_type) {
    case 'check_os':
      await handleCheckOs(params, selected)
      break
    case 'human_handoff':
      await handleHumanHandoff(params)
      break
    case 'info': {
      const raw = String(selected.handler_config.message ?? '')
      const branchName = conversation.branch_id
        ? await getBranchName(supabase, conversation.company_id, conversation.branch_id)
        : null
      const msg = resolveVars(raw, {
        clientName: conversation.contact_name,
        companyName: params.companyName,
        branchName,
      })
      await sendAndSave(supabase, evolutionClient, conversation, msg)
      if (selected.handler_config.show_menu_after === true) {
        await sendMenuAfterResponse(params, currentParentId)
      }
      await updateConversation(supabase, conversation.id, {
        bot_state: 'awaiting_menu',
        attempts: 0,
      })
      break
    }
    case 'submenu':
      await handleSubmenu(params, selected)
      break
    case 'end_conversation': {
      const raw = String(selected.handler_config.message ?? '').trim() || botMessages.farewell
      const branchName = conversation.branch_id
        ? await getBranchName(supabase, conversation.company_id, conversation.branch_id)
        : null
      const msg = resolveVars(raw, {
        clientName: conversation.contact_name,
        companyName: params.companyName,
        branchName,
      })
      await sendAndSave(supabase, evolutionClient, conversation, msg)
      await updateConversation(supabase, conversation.id, {
        status: 'resolved',
        bot_state: null,
        attempts: 0,
      })
      break
    }
    case 'url': {
      const url = String(selected.handler_config.url ?? '')
      const label = String(selected.handler_config.label ?? selected.label)
      const msg = url ? `${label}:\n${url}` : label
      await sendAndSave(supabase, evolutionClient, conversation, msg)
      if (selected.handler_config.show_menu_after === true) {
        await sendMenuAfterResponse(params, currentParentId)
      }
      await updateConversation(supabase, conversation.id, {
        bot_state: 'awaiting_menu',
        attempts: 0,
      })
      break
    }
    default:
      await handleInvalidResponse(params, 'awaiting_menu')
  }
}

/** Handler submenu: mostra os filhos do item selecionado como novo menu. */
const handleSubmenu = async (params: BotEngineParams, menuItem: MenuItemRecord) => {
  const { supabase, conversation, botMessages, evolutionClient } = params

  const children = await getMenuItems(supabase, conversation.company_id, menuItem.id)

  if (children.length === 0) {
    await handleNewSession(params)
    return
  }

  const text = buildMenuText(children, params.companyName, conversation.contact_name, null, botMessages, true)
  await sendAndSave(supabase, evolutionClient, conversation, text)
  await updateConversation(supabase, conversation.id, {
    bot_state: 'awaiting_menu',
    attempts: 0,
    context: { ...conversation.context, current_menu_parent_id: menuItem.id },
  })
}

/** Handler check_os: busca e exibe as últimas OS do cliente. */
const handleCheckOs = async (params: BotEngineParams, menuItem: MenuItemRecord) => {
  const { supabase, conversation, botMessages, evolutionClient } = params
  const limit = Number(menuItem.handler_config.limit ?? 5)

  if (!conversation.client_id) {
    await sendAndSave(supabase, evolutionClient, conversation, botMessages.client_not_found)
    await updateConversation(supabase, conversation.id, {
      bot_state: 'awaiting_os_number',
      attempts: 0,
    })
    return
  }

  const orders = await getClientServiceOrders(
    supabase,
    conversation.company_id,
    conversation.client_id,
    limit
  )

  if (orders.length === 0) {
    await sendAndSave(supabase, evolutionClient, conversation, botMessages.no_open_orders)
    await updateConversation(supabase, conversation.id, {
      bot_state: 'awaiting_os_number',
      attempts: 0,
    })
    return
  }

  const hasMore = orders.length > limit
  const listed = orders.slice(0, limit)
  const text = buildOsListText(listed, hasMore, botMessages)
  await sendAndSave(supabase, evolutionClient, conversation, text)
  await updateConversation(supabase, conversation.id, {
    bot_state: 'awaiting_os_number',
    attempts: 0,
  })
}

/** Estado: awaiting_os_number — cliente informa número de OS manualmente. */
const handleAwaitingOsNumber = async (params: BotEngineParams) => {
  const { supabase, conversation, messageText, phoneNumber, botMessages, evolutionClient } = params

  const raw = messageText.trim().replace(/\D/g, '')
  const osNumber = raw ? parseInt(raw, 10) : NaN

  if (!osNumber || isNaN(osNumber)) {
    await handleInvalidResponse(params, 'awaiting_os_number')
    return
  }

  const callerPhone = conversation.client_id ? undefined : phoneNumber
  const os = await getServiceOrderByNumber(supabase, conversation.company_id, osNumber, callerPhone)

  if (!os) {
    const text = resolveVars(botMessages.os_not_found, {
      clientName: conversation.contact_name,
      companyName: params.companyName,
      branchName: null,
      osNumber,
    })
    await sendAndSave(supabase, evolutionClient, conversation, text)
    return
  }

  const text = buildOsStatusText(os)
  await sendAndSave(supabase, evolutionClient, conversation, text)

  if (os.branch_id && !conversation.branch_id) {
    await updateConversation(supabase, conversation.id, { branch_id: os.branch_id })
  }

  await updateConversation(supabase, conversation.id, {
    bot_state: 'awaiting_menu',
    attempts: 0,
  })

  const menuItems = await getMenuItems(supabase, conversation.company_id)
  const backText =
    `${botMessages.more_help}\n\n` +
    menuItems.map((m) => `${m.emoji ?? m.position} ${m.label}`).join('\n') +
    `\n\n${botMessages.menu_footer}`
  await sendAndSave(supabase, evolutionClient, conversation, backText)
}

/** Handler human_handoff: encaminha para atendente humano. */
const handleHumanHandoff = async (params: BotEngineParams) => {
  const { supabase, conversation, botMessages, evolutionClient } = params

  if (conversation.branch_id) {
    await executeHandoff(params, conversation.branch_id)
    return
  }

  const branches = await getBranches(supabase, conversation.company_id)

  if (branches.length <= 1) {
    const branchId = branches[0]?.id ?? null
    await executeHandoff(params, branchId)
    return
  }

  const text = buildBranchListText(branches, botMessages)
  await sendAndSave(supabase, evolutionClient, conversation, text)
  await updateConversation(supabase, conversation.id, {
    bot_state: 'awaiting_branch',
    attempts: 0,
    context: { branches: branches.map((b) => ({ id: b.id, name: b.name })) },
  })
}

/** Estado: awaiting_branch — cliente escolhe a filial para atendimento. */
const handleAwaitingBranch = async (params: BotEngineParams) => {
  const { conversation, messageText } = params

  const branches =
    (conversation.context.branches as Array<{ id: string; name: string }> | undefined) ?? []

  if (branches.length === 0) {
    await executeHandoff(params, null)
    return
  }

  const index = parseInt(messageText.trim(), 10) - 1

  if (isNaN(index) || index < 0 || index >= branches.length) {
    await handleInvalidResponse(params, 'awaiting_branch')
    return
  }

  const selected = branches[index]
  await executeHandoff(params, selected.id)
}

/** Executa o handoff: silencia bot, notifica sistema e confirma ao cliente. */
const executeHandoff = async (params: BotEngineParams, branchId: string | null) => {
  const { supabase, conversation, botMessages, evolutionClient } = params

  await updateConversation(supabase, conversation.id, {
    status: 'waiting',
    bot_state: null,
    bot_enabled: false,
    branch_id: branchId ?? conversation.branch_id,
    attempts: 0,
    context: {},
  })

  await createHandoffNotification(
    supabase,
    conversation.company_id,
    branchId ?? conversation.branch_id,
    conversation.contact_name,
    conversation.phone_number
  )

  await sendAndSave(supabase, evolutionClient, conversation, botMessages.handoff_confirmation)
}

/** Estado: awaiting_estimate_response — cliente responde ao orçamento enviado. */
const handleAwaitingEstimateResponse = async (params: BotEngineParams) => {
  const { supabase, conversation, messageText, botMessages, evolutionClient } = params
  const choice = messageText.trim()

  const serviceOrderId =
    typeof conversation.context.service_order_id === 'string'
      ? conversation.context.service_order_id
      : null

  if (!serviceOrderId) {
    await handleNewSession(params)
    return
  }

  if (choice === '1' || choice === '2') {
    const response = choice === '1' ? 'aprovado' : 'reprovado'
    const result = await applyEstimateClientResponse({
      supabase,
      companyId: conversation.company_id,
      serviceOrderId,
      response,
    })

    if ('error' in result) {
      await sendAndSave(supabase, evolutionClient, conversation, botMessages.estimate_error)
      await handleHumanHandoff(params)
      return
    }

    const msgKey = response === 'aprovado' ? 'estimate_approved' : 'estimate_rejected'
    const confirmation = resolveVars(botMessages[msgKey], {
      clientName: conversation.contact_name,
      companyName: params.companyName,
      branchName: null,
      osNumber: result.osNumber,
    })

    await sendAndSave(supabase, evolutionClient, conversation, confirmation)
    await updateConversation(supabase, conversation.id, {
      bot_state: result.nextStatus === 'aguardando_peca' ? null : 'awaiting_menu',
      attempts: 0,
      context: {},
    })
    return
  }

  if (choice === '3') {
    await handleHumanHandoff(params)
    return
  }

  await handleInvalidResponse(params, 'awaiting_estimate_response')
}

/** Estado: awaiting_rating_consent — pergunta se o cliente quer avaliar. */
const handleAwaitingRatingConsent = async (params: BotEngineParams) => {
  const { supabase, conversation, messageText, botMessages, evolutionClient } = params
  const choice = messageText.trim()

  if (choice === '1') {
    await sendAndSave(supabase, evolutionClient, conversation, botMessages.rating_request)
    await updateConversation(supabase, conversation.id, {
      bot_state: 'awaiting_rating',
      attempts: 0,
    })
    return
  }

  if (choice === '2') {
    await sendAndSave(supabase, evolutionClient, conversation, botMessages.rating_skip)
    await updateConversation(supabase, conversation.id, {
      bot_state: null,
      attempts: 0,
      context: {},
    })
    return
  }

  await updateConversation(supabase, conversation.id, {
    bot_state: null,
    attempts: 0,
    context: {},
  })
  await handleNewSession(params)
}

/** Estado: awaiting_rating — cliente manda nota de 1 a 5. */
const handleAwaitingRating = async (params: BotEngineParams) => {
  const { supabase, conversation, messageText, botMessages, evolutionClient } = params
  const rating = parseInt(messageText.trim(), 10)

  if (isNaN(rating) || rating < 1 || rating > 5) {
    await handleInvalidResponse(params, 'awaiting_rating')
    return
  }

  const assignedTo =
    typeof conversation.context.rated_assigned_to === 'string'
      ? conversation.context.rated_assigned_to
      : null

  await supabase.from('whatsapp_ratings').insert({
    company_id: conversation.company_id,
    branch_id: conversation.branch_id,
    conversation_id: conversation.id,
    assigned_to: assignedTo,
    phone_number: conversation.phone_number,
    contact_name: conversation.contact_name,
    rating,
  })

  await sendAndSave(supabase, evolutionClient, conversation, botMessages.rating_thanks)
  await updateConversation(supabase, conversation.id, {
    bot_state: null,
    attempts: 0,
    context: {},
  })
}

/** Resposta inválida: incrementa tentativas ou força handoff após limite. */
const handleInvalidResponse = async (
  params: BotEngineParams,
  currentState: WhatsAppConversation['bot_state']
) => {
  const { supabase, conversation, botMessages, evolutionClient } = params
  const MAX_ATTEMPTS = 3

  const newAttempts = conversation.attempts + 1

  if (newAttempts >= MAX_ATTEMPTS) {
    await sendAndSave(supabase, evolutionClient, conversation, botMessages.invalid_max_attempts)
    await handleHumanHandoff(params)
    return
  }

  await updateConversation(supabase, conversation.id, {
    attempts: newAttempts,
    bot_state: currentState,
  })

  const hint =
    currentState === 'awaiting_os_number'
      ? botMessages.invalid_os_number
      : currentState === 'awaiting_branch'
        ? botMessages.invalid_branch
        : currentState === 'awaiting_estimate_response'
          ? botMessages.invalid_estimate
          : currentState === 'awaiting_rating_consent'
            ? botMessages.invalid_rating_consent
            : currentState === 'awaiting_rating'
              ? botMessages.invalid_rating
              : botMessages.invalid_menu

  await sendAndSave(supabase, evolutionClient, conversation, hint)
}

// ── Helper de formatação de OS ───────────────────────────────

const buildOsStatusText = (os: ServiceOrderSummary): string => {
  const device = [os.device_brand, os.device_model, os.device_type].filter(Boolean).join(' ')

  return (
    `*OS #${os.number}* — ${device}\n` +
    `Status atual: *${formatOsStatus(os.status)}*\n` +
    `Abertura: ${formatOsDate(os.created_at)}`
  )
}

// ── Ponto de entrada ─────────────────────────────────────────

/**
 * Processa uma mensagem de entrada e executa o handler correto
 * de acordo com o estado atual da conversa.
 */
export const runBotEngine = async (params: BotEngineParams): Promise<void> => {
  const { conversation, messageText } = params

  if (messageText.trim() === '0') {
    await handleNewSession(params)
    return
  }

  // Esses estados representam ações de longa duração iniciadas pelo sistema
  // (aguardo de aprovação de orçamento, pesquisa de satisfação). O TTL de
  // sessão não se aplica — o cliente pode responder horas ou dias depois.
  const PERSISTENT_STATES = new Set<WhatsAppConversation['bot_state']>([
    'awaiting_estimate_response',
    'awaiting_rating_consent',
    'awaiting_rating',
  ])

  const isNew = !conversation.bot_state
  const isExpired =
    !PERSISTENT_STATES.has(conversation.bot_state) && isSessionExpired(conversation)

  if (isNew || isExpired) {
    await handleNewSession(params)
    return
  }

  switch (conversation.bot_state) {
    case 'awaiting_menu':
      await handleAwaitingMenu(params)
      break
    case 'awaiting_os_number':
      await handleAwaitingOsNumber(params)
      break
    case 'awaiting_branch':
      await handleAwaitingBranch(params)
      break
    case 'awaiting_estimate_response':
      await handleAwaitingEstimateResponse(params)
      break
    case 'awaiting_rating_consent':
      await handleAwaitingRatingConsent(params)
      break
    case 'awaiting_rating':
      await handleAwaitingRating(params)
      break
    default:
      await handleNewSession(params)
  }
}

// Re-exporta o tipo de mensagens para uso externo (actions, componentes)
export type { BotMessages }
export { BOT_MESSAGES_DEFAULTS }
