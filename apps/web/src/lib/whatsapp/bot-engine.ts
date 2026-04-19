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

// ── Tipos internos ───────────────────────────────────────────

export type BotEngineParams = {
  supabase: SupabaseClient
  conversation: WhatsAppConversation
  messageText: string
  phoneNumber: string
  companyName: string
  authorizedBrands: string | null
  evolutionClient: EvolutionApiClient
}

// ── Helpers de formatação ────────────────────────────────────

const buildMenuText = (
  menuItems: MenuItemRecord[],
  companyName: string,
  clientName: string | null,
  authorizedBrands: string | null
): string => {
  const greeting = clientName ? `Olá, *${clientName}*! 👋` : 'Olá! 👋'
  const brandsLine = authorizedBrands
    ? `\nSomos assistência autorizada das marcas: *${authorizedBrands}*.\n`
    : ''

  const options = menuItems
    .map((item) => `${item.emoji ?? `${item.position}.`} ${item.label}`)
    .join('\n')

  return (
    `${greeting} Bem-vindo(a) à *${companyName}*!${brandsLine}\n` +
    `Como posso te ajudar hoje?\n\n${options}\n\n` +
    `Responda com o *número* da opção desejada.`
  )
}

const buildOsListText = (orders: ServiceOrderSummary[], hasMore: boolean): string => {
  const lines = orders.map((os) => {
    const device = [os.device_brand, os.device_model, os.device_type].filter(Boolean).join(' ')
    return (
      `*OS #${os.number}* — ${device}\n` +
      `Status: ${formatOsStatus(os.status)}\n` +
      `Abertura: ${formatOsDate(os.created_at)}`
    )
  })

  const list = lines.join('\n\n')
  const footer = hasMore
    ? '\n\nSua OS não está na lista? Informe o *número da OS* e consulto para você.'
    : '\n\nDeseja consultar outra OS? Informe o *número da OS*.'

  return `Aqui estão suas ordens de serviço:\n\n${list}${footer}`
}

const buildOsStatusText = (os: ServiceOrderSummary): string => {
  const device = [os.device_brand, os.device_model, os.device_type].filter(Boolean).join(' ')

  return (
    `*OS #${os.number}* — ${device}\n` +
    `Status atual: *${formatOsStatus(os.status)}*\n` +
    `Abertura: ${formatOsDate(os.created_at)}`
  )
}

const NUMBER_EMOJIS = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣']

const buildBranchListText = (branches: Array<{ id: string; name: string }>): string => {
  const options = branches
    .slice(0, NUMBER_EMOJIS.length)
    .map((b, i) => `${NUMBER_EMOJIS[i]} ${b.name}`)
    .join('\n')

  return (
    `Em qual filial você deseja atendimento?\n\n${options}\n\n` +
    `Responda com o *número* da filial.`
  )
}

// ── Envio + persistência ─────────────────────────────────────

/** 800 ms base + 30 ms por caractere, limitado a 3 500 ms. */
const typingDelay = (text: string) => Math.min(800 + text.length * 30, 3500)

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

// ── Handlers de estado ───────────────────────────────────────

/** Início de sessão: identifica o cliente e exibe o menu. */
const handleNewSession = async (params: BotEngineParams) => {
  const { supabase, conversation, phoneNumber, companyName, authorizedBrands, evolutionClient } =
    params

  // Tenta identificar o cliente pelo telefone
  const client = await findClientByPhone(supabase, conversation.company_id, phoneNumber)

  const updates: Parameters<typeof updateConversation>[2] = {
    bot_state: 'awaiting_menu',
    attempts: 0,
    client_id: client?.id ?? conversation.client_id ?? null,
  }

  // Se identificou e ainda não tem branch, busca pela última OS do cliente
  if (client && !conversation.branch_id) {
    const orders = await getClientServiceOrders(supabase, conversation.company_id, client.id, 1)
    if (orders[0]?.branch_id) {
      updates.branch_id = orders[0].branch_id
    }
  }

  await updateConversation(supabase, conversation.id, updates)

  const menuItems = await getMenuItems(supabase, conversation.company_id)
  const menuText = buildMenuText(menuItems, companyName, client?.name ?? null, authorizedBrands)
  await sendAndSave(supabase, evolutionClient, conversation, menuText)
}

/** Estado: awaiting_menu — interpreta a escolha do cliente. */
const handleAwaitingMenu = async (params: BotEngineParams) => {
  const { supabase, conversation, messageText, evolutionClient } = params

  const choice = messageText.trim()
  const menuItems = await getMenuItems(supabase, conversation.company_id)
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
      const msg = String(selected.handler_config.message ?? '')
      await sendAndSave(supabase, evolutionClient, conversation, msg)
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

/** Handler check_os: busca e exibe as últimas OS do cliente. */
const handleCheckOs = async (params: BotEngineParams, menuItem: MenuItemRecord) => {
  const { supabase, conversation, evolutionClient } = params
  const limit = Number(menuItem.handler_config.limit ?? 5)

  if (!conversation.client_id) {
    // Cliente não identificado: pede o número da OS diretamente
    const text =
      'Não encontrei um cadastro para o seu número. ' +
      'Informe o *número da OS* que deseja consultar:'
    await sendAndSave(supabase, evolutionClient, conversation, text)
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
    const text =
      'Não encontrei nenhuma OS em aberto para o seu número. ' +
      'Se tiver o número da OS, pode me informar que consulto para você:'
    await sendAndSave(supabase, evolutionClient, conversation, text)
    await updateConversation(supabase, conversation.id, {
      bot_state: 'awaiting_os_number',
      attempts: 0,
    })
    return
  }

  const hasMore = orders.length > limit
  const listed = orders.slice(0, limit)
  const text = buildOsListText(listed, hasMore)
  await sendAndSave(supabase, evolutionClient, conversation, text)
  await updateConversation(supabase, conversation.id, {
    bot_state: 'awaiting_os_number',
    attempts: 0,
  })
}

/** Estado: awaiting_os_number — cliente informa número de OS manualmente. */
const handleAwaitingOsNumber = async (params: BotEngineParams) => {
  const { supabase, conversation, messageText, phoneNumber, evolutionClient } = params

  const raw = messageText.trim().replace(/\D/g, '')
  const osNumber = raw ? parseInt(raw, 10) : NaN

  if (!osNumber || isNaN(osNumber)) {
    await handleInvalidResponse(params, 'awaiting_os_number')
    return
  }

  // Contatos não cadastrados: valida que o telefone bate com o cliente da OS
  const callerPhone = conversation.client_id ? undefined : phoneNumber
  const os = await getServiceOrderByNumber(supabase, conversation.company_id, osNumber, callerPhone)

  if (!os) {
    const text = `Não encontrei a OS *#${osNumber}* no sistema. Verifique o número e tente novamente, ou envie *0* para voltar ao menu.`
    await sendAndSave(supabase, evolutionClient, conversation, text)
    return
  }

  const text = buildOsStatusText(os)
  await sendAndSave(supabase, evolutionClient, conversation, text)

  // Registra a branch da OS caso ainda não tenhamos
  if (os.branch_id && !conversation.branch_id) {
    await updateConversation(supabase, conversation.id, {
      branch_id: os.branch_id,
    })
  }

  // Volta ao menu após consulta
  await updateConversation(supabase, conversation.id, {
    bot_state: 'awaiting_menu',
    attempts: 0,
  })

  const menuItems = await getMenuItems(supabase, conversation.company_id)
  const backText =
    'Posso ajudar com mais alguma coisa?\n\n' +
    menuItems.map((m) => `${m.emoji ?? m.position} ${m.label}`).join('\n') +
    '\n\nResponda com o *número* da opção.'
  await sendAndSave(supabase, evolutionClient, conversation, backText)
}

/** Handler human_handoff: encaminha para atendente humano. */
const handleHumanHandoff = async (params: BotEngineParams) => {
  const { supabase, conversation, evolutionClient } = params

  // Cliente identificado: já temos a branch
  if (conversation.branch_id) {
    await executeHandoff(params, conversation.branch_id)
    return
  }

  // Cliente sem branch: pergunta qual filial
  const branches = await getBranches(supabase, conversation.company_id)

  if (branches.length <= 1) {
    // Empresa com filial única (ou nenhuma configurada): handoff direto
    const branchId = branches[0]?.id ?? null
    await executeHandoff(params, branchId)
    return
  }

  const text = buildBranchListText(branches)
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
  const { supabase, conversation, evolutionClient } = params

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

  const text =
    'Perfeito! Em breve um de nossos atendentes vai te responder por aqui. ' +
    'Aguarde, por favor. 😊'
  await sendAndSave(supabase, evolutionClient, conversation, text)
}

/** Estado: awaiting_estimate_response — cliente responde ao orçamento enviado. */
const handleAwaitingEstimateResponse = async (params: BotEngineParams) => {
  const { supabase, conversation, messageText, evolutionClient } = params
  const choice = messageText.trim()

  const serviceOrderId =
    typeof conversation.context.service_order_id === 'string'
      ? conversation.context.service_order_id
      : null

  if (!serviceOrderId) {
    // Contexto perdido (expirou ou foi sobrescrito): trata como menu
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
      // Ex.: OS já não está mais em "aguardando aprovação" (atendente respondeu antes)
      const text =
        'Não consegui registrar sua resposta agora. Vou encaminhar para um atendente te ajudar.'
      await sendAndSave(supabase, evolutionClient, conversation, text)
      await handleHumanHandoff(params)
      return
    }

    const confirmation =
      response === 'aprovado'
        ? `Orçamento da OS *#${result.osNumber}* aprovado! ✅ Vamos iniciar o reparo e avisaremos por aqui quando estiver pronto.`
        : `Orçamento da OS *#${result.osNumber}* recusado. Obrigado pelo retorno! Se precisar, chame um atendente.`

    await sendAndSave(supabase, evolutionClient, conversation, confirmation)
    await updateConversation(supabase, conversation.id, {
      bot_state: 'awaiting_menu',
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
  const { supabase, conversation, messageText, evolutionClient } = params
  const choice = messageText.trim()

  if (choice === '1') {
    const text =
      'Que bom! 😊 Dê uma nota para o atendimento:\n\n' +
      '1️⃣ Muito ruim\n' +
      '2️⃣ Ruim\n' +
      '3️⃣ Regular\n' +
      '4️⃣ Bom\n' +
      '5️⃣ Excelente'
    await sendAndSave(supabase, evolutionClient, conversation, text)
    await updateConversation(supabase, conversation.id, {
      bot_state: 'awaiting_rating',
      attempts: 0,
    })
    return
  }

  if (choice === '2') {
    const text = 'Tudo bem! Obrigado pelo contato. Se precisar, é só chamar por aqui. 🙌'
    await sendAndSave(supabase, evolutionClient, conversation, text)
    await updateConversation(supabase, conversation.id, {
      bot_state: null,
      attempts: 0,
      context: {},
    })
    return
  }

  // Qualquer outra coisa: desiste da avaliação e volta ao fluxo normal
  await updateConversation(supabase, conversation.id, {
    bot_state: null,
    attempts: 0,
    context: {},
  })
  await handleNewSession(params)
}

/** Estado: awaiting_rating — cliente manda nota de 1 a 5. */
const handleAwaitingRating = async (params: BotEngineParams) => {
  const { supabase, conversation, messageText, evolutionClient } = params
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

  const text = 'Obrigado pela avaliação! 🙌 Sua opinião nos ajuda a melhorar sempre.'
  await sendAndSave(supabase, evolutionClient, conversation, text)
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
  const { supabase, conversation, evolutionClient } = params
  const MAX_ATTEMPTS = 3

  const newAttempts = conversation.attempts + 1

  if (newAttempts >= MAX_ATTEMPTS) {
    // Muitas tentativas: encaminha automaticamente para atendente
    await sendAndSave(
      supabase,
      evolutionClient,
      conversation,
      'Não consegui entender sua mensagem. Vou encaminhar para um atendente te ajudar!'
    )
    await handleHumanHandoff(params)
    return
  }

  await updateConversation(supabase, conversation.id, {
    attempts: newAttempts,
    bot_state: currentState,
  })

  const hint =
    currentState === 'awaiting_os_number'
      ? 'Informe apenas o *número da OS* (ex: 1234) ou envie *0* para voltar ao menu.'
      : currentState === 'awaiting_branch'
        ? 'Responda com o *número* da filial desejada.'
        : currentState === 'awaiting_estimate_response'
          ? 'Responda com *1* para aprovar, *2* para recusar, *3* para falar com atendente ou *0* para voltar ao menu.'
          : currentState === 'awaiting_rating'
            ? 'Envie apenas um número de *1 a 5* para avaliar o atendimento.'
            : 'Não entendi. Responda com o *número* da opção do menu (ex: 1 ou 2).'

  await sendAndSave(supabase, evolutionClient, conversation, hint)
}

// ── Ponto de entrada ─────────────────────────────────────────

/**
 * Processa uma mensagem de entrada e executa o handler correto
 * de acordo com o estado atual da conversa.
 */
export const runBotEngine = async (params: BotEngineParams): Promise<void> => {
  const { conversation, messageText } = params

  // Atalho: dígito 0 em qualquer estado reinicia o fluxo
  if (messageText.trim() === '0') {
    await handleNewSession(params)
    return
  }

  // Sessão nova ou expirada → reinicia
  const isNew = !conversation.bot_state
  const isExpired = isSessionExpired(conversation)

  if (isNew || isExpired) {
    await handleNewSession(params)
    return
  }

  // Roteia pelo estado atual
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
