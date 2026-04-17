import { createHmac, timingSafeEqual } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

type WhatsAppWebhookChange = {
  field?: unknown
  value?: {
    metadata?: {
      phone_number_id?: unknown
      display_phone_number?: unknown
    }
    messages?: Array<{
      id?: unknown
      from?: unknown
      type?: unknown
      timestamp?: unknown
    }>
    statuses?: Array<{
      id?: unknown
      recipient_id?: unknown
      status?: unknown
      timestamp?: unknown
      errors?: unknown
    }>
  }
}

type WhatsAppWebhookPayload = {
  object?: unknown
  entry?: Array<{
    id?: unknown
    changes?: WhatsAppWebhookChange[]
  }>
}

const verifySignature = (rawBody: string, signature: string | null, appSecret: string | null) => {
  if (!appSecret?.trim()) return true
  if (!signature?.startsWith('sha256=')) return false

  const expected = `sha256=${createHmac('sha256', appSecret)
    .update(rawBody, 'utf8')
    .digest('hex')}`

  const expectedBuffer = Buffer.from(expected)
  const receivedBuffer = Buffer.from(signature)

  return (
    expectedBuffer.length === receivedBuffer.length &&
    timingSafeEqual(expectedBuffer, receivedBuffer)
  )
}

const summarizePayload = (payload: WhatsAppWebhookPayload) => {
  const entry = payload.entry?.[0]
  const change = entry?.changes?.[0]
  const value = change?.value

  return {
    object: payload.object,
    businessAccountId: entry?.id,
    field: change?.field,
    phoneNumberId: value?.metadata?.phone_number_id,
    displayPhoneNumber: value?.metadata?.display_phone_number,
    messages: value?.messages?.map((message) => ({
      id: message.id,
      from: message.from,
      type: message.type,
      timestamp: message.timestamp,
    })),
    statuses: value?.statuses?.map((status) => ({
      id: status.id,
      recipientId: status.recipient_id,
      status: status.status,
      timestamp: status.timestamp,
      errors: status.errors,
    })),
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const mode = searchParams.get('hub.mode')
  const verifyToken = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode !== 'subscribe' || !verifyToken || !challenge) {
    return new NextResponse('Requisição inválida.', { status: 400 })
  }

  const supabase = createAdminClient()
  const { data: settings } = await supabase
    .from('whatsapp_automation_settings')
    .select('id')
    .eq('webhook_verify_token', verifyToken)
    .limit(1)
    .maybeSingle()

  if (!settings) {
    return new NextResponse('Token de verificação inválido.', { status: 403 })
  }

  return new NextResponse(challenge, { status: 200 })
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  let payload: unknown

  try {
    payload = JSON.parse(rawBody)
  } catch {
    console.warn('[whatsapp-webhook] Payload inválido recebido.')
    return new NextResponse('Payload inválido.', { status: 400 })
  }

  console.info(
    '[whatsapp-webhook] Evento recebido:',
    JSON.stringify(summarizePayload(payload as WhatsAppWebhookPayload), null, 2),
  )

  const businessAccountId =
    typeof payload === 'object' &&
    payload !== null &&
    'entry' in payload &&
    Array.isArray(payload.entry) &&
    typeof payload.entry[0]?.id === 'string'
      ? payload.entry[0].id
      : null

  if (!businessAccountId) {
    console.warn('[whatsapp-webhook] Conta WhatsApp Business não identificada.')
    return new NextResponse('Conta WhatsApp Business não identificada.', {
      status: 400,
    })
  }

  const supabase = createAdminClient()
  const { data: settings } = await supabase
    .from('whatsapp_automation_settings')
    .select('app_secret')
    .eq('enabled', true)
    .eq('provider', 'whatsapp_cloud_api')
    .eq('business_account_id', businessAccountId)
    .limit(1)
    .maybeSingle()

  if (!settings) {
    console.warn(
      '[whatsapp-webhook] Automação não configurada ou inativa para WABA:',
      businessAccountId,
    )
    return new NextResponse('Automação não configurada para esta conta.', {
      status: 403,
    })
  }

  const signature = request.headers.get('x-hub-signature-256')

  if (!verifySignature(rawBody, signature, settings.app_secret)) {
    console.warn('[whatsapp-webhook] Assinatura inválida.')
    return new NextResponse('Assinatura inválida.', { status: 403 })
  }

  return NextResponse.json({ received: true })
}
