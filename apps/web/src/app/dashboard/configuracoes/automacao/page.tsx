import { redirect } from 'next/navigation'
import { WhatsAppAutomationForm } from '../_components/whatsapp-automation-form'
import { getAdminContext } from '@/lib/auth/admin-context'
import { createClient } from '@/lib/supabase/server'
import { resolveWhatsAppAutomationSettings } from '@/lib/whatsapp/automation-settings'

export default async function ConfiguracoesAutomacaoPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  let companyId: string

  try {
    companyId = (await getAdminContext('configuracoes')).companyId
  } catch {
    redirect('/dashboard')
  }

  const { data: whatsappSettings } = await supabase
    .from('whatsapp_automation_settings')
    .select(
      `
        enabled,
        provider,
        base_url,
        graph_api_version,
        app_id,
        app_secret,
        phone_number_id,
        business_account_id,
        access_token,
        webhook_verify_token,
        evolution_base_url,
        evolution_api_key,
        evolution_instance_name,
        evolution_webhook_url,
        default_country_code,
        templates_language,
        notify_inbound_message,
        notify_os_created,
        notify_estimate_ready,
        notify_service_completed,
        notify_satisfaction_survey,
        template_os_created,
        template_estimate_ready,
        template_service_completed,
        template_satisfaction_survey,
        message_inbound_auto_reply,
        message_os_created,
        message_estimate_ready,
        message_service_completed,
        message_satisfaction_survey,
        authorized_brands,
        session_timeout_minutes
      `,
    )
    .eq('company_id', companyId)
    .maybeSingle()

  return (
    <div className="space-y-6">
      <WhatsAppAutomationForm
        initialSettings={resolveWhatsAppAutomationSettings(whatsappSettings)}
      />
    </div>
  )
}
