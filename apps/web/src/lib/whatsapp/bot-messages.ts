export type BotMessages = {
  // Menu principal
  menu_greeting: string
  menu_question: string
  menu_footer: string
  // Submenu
  submenu_header: string
  submenu_footer: string
  // Consulta de OS
  client_not_found: string
  no_open_orders: string
  os_not_found: string
  os_list_header: string
  os_list_item: string
  os_list_more_footer: string
  os_list_footer: string
  more_help: string
  // Handoff / atendimento humano
  ask_branch: string
  ask_branch_footer: string
  handoff_confirmation: string
  // Orçamento
  estimate_approved: string
  estimate_rejected: string
  estimate_error: string
  // Avaliação
  rating_request: string
  rating_skip: string
  rating_thanks: string
  // Respostas inválidas
  invalid_max_attempts: string
  invalid_os_number: string
  invalid_branch: string
  invalid_estimate: string
  invalid_rating_consent: string
  invalid_rating: string
  invalid_menu: string
}

export const BOT_MESSAGES_DEFAULTS: BotMessages = {
  menu_greeting: 'Olá, *{{cliente.nome}}*! Bem-vindo(a) à *{{empresa.nome}}*!',
  menu_question: 'Como posso te ajudar hoje?',
  menu_footer: 'Responda com o *número* da opção desejada.',
  submenu_header: 'Escolha uma opção:',
  submenu_footer: 'Responda com o *número* da opção.',
  client_not_found:
    'Não encontrei um cadastro para o seu número. Informe o *número da OS* que deseja consultar:',
  no_open_orders:
    'Não encontrei nenhuma OS em aberto para o seu número. Se tiver o número da OS, pode me informar que consulto para você:',
  os_not_found:
    'Não encontrei a OS *#{{os_numero}}* no sistema. Verifique o número e tente novamente, ou envie *0* para voltar ao menu.',
  os_list_header: 'Aqui estão suas ordens de serviço:',
  os_list_item:
    '*OS #{{os_numero}}* — {{os_dispositivo}}\nStatus: {{os_status}}\nAbertura: {{os_data}}\nFinalização: {{os_data_finalizacao}}',
  os_list_more_footer:
    'Sua OS não está na lista? Informe o *número da OS* e consulto para você.',
  os_list_footer: 'Deseja consultar outra OS? Informe o *número da OS*.',
  more_help: 'Posso ajudar com mais alguma coisa?',
  ask_branch: 'Em qual filial você deseja atendimento?',
  ask_branch_footer: 'Responda com o *número* da filial.',
  handoff_confirmation:
    'Perfeito! Em breve um de nossos atendentes vai te responder por aqui. Aguarde, por favor. 😊',
  estimate_approved:
    'Orçamento da OS *#{{os_numero}}* aprovado! ✅ Vamos iniciar o reparo e avisaremos por aqui quando estiver pronto.',
  estimate_rejected:
    'Orçamento da OS *#{{os_numero}}* recusado. Obrigado pelo retorno! Se precisar, chame um atendente.',
  estimate_error:
    'Não consegui registrar sua resposta agora. Vou encaminhar para um atendente te ajudar.',
  rating_request:
    'Que bom! 😊 Dê uma nota para o atendimento:\n\n1️⃣ Muito ruim\n2️⃣ Ruim\n3️⃣ Regular\n4️⃣ Bom\n5️⃣ Excelente',
  rating_skip: 'Tudo bem! Obrigado pelo contato. Se precisar, é só chamar por aqui. 🙌',
  rating_thanks: 'Obrigado pela avaliação! 🙌 Sua opinião nos ajuda a melhorar sempre.',
  invalid_max_attempts:
    'Não consegui entender sua mensagem. Vou encaminhar para um atendente te ajudar!',
  invalid_os_number:
    'Informe apenas o *número da OS* (ex: 1234) ou envie *0* para voltar ao menu.',
  invalid_branch:
    'Responda com o *número* da filial desejada ou envie *0* para voltar ao menu.',
  invalid_estimate:
    'Responda com *1* para aprovar, *2* para recusar, *3* para falar com atendente ou *0* para voltar ao menu.',
  invalid_rating_consent: 'Responda *1* para avaliar ou *2* para não avaliar.',
  invalid_rating: 'Envie apenas um número de *1 a 5* para avaliar ou *0* para encerrar.',
  invalid_menu: 'Não entendi. Responda com o *número* da opção ou *0* para voltar ao menu.',
}

/** Mescla valores salvos no banco com os defaults, ignorando strings vazias. */
export const mergeBotMessages = (raw: unknown): BotMessages => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ...BOT_MESSAGES_DEFAULTS }
  const stored = raw as Partial<Record<string, unknown>>
  const overrides = Object.fromEntries(
    Object.entries(stored).filter(([, v]) => typeof v === 'string' && (v as string).trim() !== '')
  )
  return { ...BOT_MESSAGES_DEFAULTS, ...overrides } as BotMessages
}
