export const DEFAULT_WHATSAPP_MESSAGES = {
  inboundAutoReply: `Olá! 👋 Bem-vindo(a) à *{{empresa_nome}}*!

Somos assistência autorizada das marcas: *{{marcas_autorizadas}}*.

Como posso te ajudar hoje?

1️⃣ Verificar o status da minha OS
2️⃣ Falar com um atendente

Responda com o *número* da opção desejada. 😊`,
  osCreated:
    'Olá, {{cliente_nome}}! Sua OS #{{os_numero}} foi aberta para o equipamento {{equipamento}}. Avisaremos por aqui sobre o andamento.',
  estimateReady: `Olá, {{cliente_nome}}! O orçamento da OS *#{{os_numero}}* está pronto.
Valor do orçamento: *{{valor_orcamento}}*.

Deseja:
1 - Aprovar orçamento
2 - Recusar orçamento
3 - Falar com um atendente

Responda com o *número* da opção desejada. (Envie *0* para voltar ao menu.)`,
  serviceCompleted:
    'Olá, {{cliente_nome}}! O serviço da OS #{{os_numero}} foi concluído. Seu equipamento já está pronto para retirada.',
  satisfactionSurvey:
    'Olá, {{cliente_nome}}! Obrigado por confiar na {{empresa_nome}}. Como foi seu atendimento da OS #{{os_numero}}?',
} as const

export const WHATSAPP_MESSAGE_VARIABLES = [
  '{{empresa_nome}}',
  '{{cliente_nome}}',
  '{{telefone_cliente}}',
  '{{os_numero}}',
  '{{equipamento}}',
  '{{valor_orcamento}}',
  '{{instancia_nome}}',
  '{{marcas_autorizadas}}',
] as const

type WhatsAppMessageVariables = Record<string, string | null | undefined>

export const resolveWhatsAppMessageTemplate = (
  template: string | null | undefined,
  fallback: string,
) => {
  const trimmed = template?.trim()
  return trimmed ? trimmed : fallback
}

export const renderWhatsAppMessageTemplate = (
  template: string,
  variables: WhatsAppMessageVariables,
) =>
  template.replace(/\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g, (_placeholder, key) => {
    const value = variables[key]
    return value?.trim() ?? ''
  })
