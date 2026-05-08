import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createEvolutionApiClient } from '@/lib/whatsapp/evolution-client'

export const runtime = 'nodejs'
export const maxDuration = 60

// ── Tipos ────────────────────────────────────────────────────

type WarningSettings = {
  company_id: string
  evolution_base_url: string
  evolution_api_key: string
  evolution_instance_name: string
  session_expiry_warning_minutes: number
  session_expiry_warning_message: string | null
}

type NearExpiryConversation = {
  id: string
  phone_number: string
}

// ── Mensagem padrão ──────────────────────────────────────────

const DEFAULT_WARNING =
  '⏳ Sua sessão está encerrando por inatividade. ' +
  'Responda esta mensagem para continuar ou, ao retornar, ' +
  'envie qualquer mensagem para começar novamente.'

// ── Handler ──────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new NextResponse('Não autorizado.', { status: 401 })
  }

  const supabase = createAdminClient()
  const now = new Date()

  // Busca todas as empresas com Evolution API habilitada e aviso configurado
  const { data: settingsList, error: settingsError } = await supabase
    .from('whatsapp_automation_settings')
    .select(
      `company_id, evolution_base_url, evolution_api_key, evolution_instance_name,
       session_expiry_warning_minutes, session_expiry_warning_message`,
    )
    .eq('enabled', true)
    .eq('provider', 'evolution_api')
    .not('session_expiry_warning_minutes', 'is', null)
    .not('evolution_api_key', 'is', null)
    .not('evolution_instance_name', 'is', null)

  if (settingsError) {
    console.error('[session-warning] Erro ao buscar settings:', settingsError.message)
    return NextResponse.json({ ok: false, error: settingsError.message }, { status: 500 })
  }

  if (!settingsList || settingsList.length === 0) {
    return NextResponse.json({ ok: true, warned: 0 })
  }

  // Estados persistentes nunca expiram — não enviar aviso para eles
  const PERSISTENT_STATES = ['awaiting_estimate_response', 'awaiting_rating_consent', 'awaiting_rating']

  let totalWarned = 0

  for (const settings of settingsList as WarningSettings[]) {
    const warningMinutes = settings.session_expiry_warning_minutes
    const windowEnd = new Date(now.getTime() + warningMinutes * 60_000).toISOString()

    // Conversas que expirarão dentro da janela de aviso e ainda não foram avisadas
    const { data: conversations, error: convError } = await supabase
      .from('whatsapp_conversations')
      .select('id, phone_number')
      .eq('company_id', settings.company_id)
      .eq('bot_enabled', true)
      .not('bot_state', 'is', null)
      .not('bot_state', 'in', `(${PERSISTENT_STATES.join(',')})`)
      .not('expires_at', 'is', null)
      .gt('expires_at', now.toISOString())      // ainda não expirou
      .lte('expires_at', windowEnd)             // expira dentro da janela
      .is('expiry_warning_sent_at', null)       // aviso ainda não enviado

    if (convError) {
      console.error(`[session-warning] company=${settings.company_id}:`, convError.message)
      continue
    }

    if (!conversations || conversations.length === 0) continue

    const evolutionClient = createEvolutionApiClient({
      baseUrl: settings.evolution_base_url,
      apiKey: settings.evolution_api_key,
      instanceName: settings.evolution_instance_name,
    })

    const warningMessage =
      settings.session_expiry_warning_message?.trim() || DEFAULT_WARNING

    for (const conv of conversations as NearExpiryConversation[]) {
      try {
        await evolutionClient.sendText({ number: conv.phone_number, text: warningMessage })

        await supabase
          .from('whatsapp_conversations')
          .update({ expiry_warning_sent_at: now.toISOString() })
          .eq('id', conv.id)

        totalWarned++
      } catch (err) {
        console.error(
          `[session-warning] Falha ao avisar conversa ${conv.id}:`,
          err instanceof Error ? err.message : err,
        )
      }
    }
  }

  return NextResponse.json({ ok: true, warned: totalWarned })
}
