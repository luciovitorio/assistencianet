'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCompanyContext } from '@/lib/auth/company-context'
import { createAsaasClient } from '@/lib/asaas'
import type { AsaasEnvironment } from '@/lib/asaas'
import { createEvolutionApiClient } from '@/lib/whatsapp/evolution-client'

const normalizePhone = (phone: string | null, countryCode: string | null): string | null => {
  const digits = phone?.replace(/\D/g, '') ?? ''
  if (!digits) return null
  const cc = countryCode?.replace(/\D/g, '') || '55'
  return digits.startsWith(cc) ? digits : `${cc}${digits}`
}

export async function generatePixChargeForOs(osId: string) {
  try {
    const { companyId } = await getCompanyContext()
    const supabase = createAdminClient()

    const [{ data: settings }, { data: os }, { data: approvedEstimate }] = await Promise.all([
      supabase
        .from('asaas_payment_settings')
        .select('enabled, environment, api_key')
        .eq('company_id', companyId)
        .maybeSingle<{ enabled: boolean; environment: AsaasEnvironment; api_key: string }>(),
      supabase
        .from('service_orders')
        .select('id, number, asaas_payment_id, clients(id, name, phone, document)')
        .eq('id', osId)
        .eq('company_id', companyId)
        .is('deleted_at', null)
        .maybeSingle<{
          id: string
          number: number
          asaas_payment_id: string | null
          clients: { id: string; name: string; phone: string | null; document: string | null } | null
        }>(),
      supabase
        .from('service_order_estimates')
        .select('total_amount')
        .eq('service_order_id', osId)
        .eq('status', 'aprovado')
        .is('deleted_at', null)
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle<{ total_amount: number | null }>(),
    ])

    if (!settings?.enabled || !settings.api_key) return { error: 'Integração Asaas não está habilitada.' }
    if (!os) return { error: 'OS não encontrada.' }
    if (os.asaas_payment_id) return { error: 'Cobrança PIX já existe para esta OS.' }

    const totalAmount = Number(approvedEstimate?.total_amount ?? 0)
    if (totalAmount <= 0) return { error: 'Nenhum orçamento aprovado com valor maior que zero encontrado.' }

    const client = createAsaasClient(settings.api_key, settings.environment)

    const clientName = os.clients?.name ?? 'Cliente'
    const clientPhone = os.clients?.phone?.replace(/\D/g, '') ?? undefined
    const rawDocument = os.clients?.document?.replace(/\D/g, '') ?? ''
    const cpfCnpj = rawDocument.length === 11 || rawDocument.length === 14 ? rawDocument : undefined

    if (!cpfCnpj) {
      return { error: 'O cliente não possui CPF ou CNPJ válido cadastrado. Cadastre o documento antes de gerar a cobrança PIX.' }
    }

    const externalRef = `client_${os.clients?.id ?? osId}`

    const asaasCustomer = await client.findOrCreateCustomer({
      name: clientName,
      cpfCnpj,
      ...(clientPhone && { mobilePhone: clientPhone }),
      externalReference: externalRef,
    })

    const dueDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

    const charge = await client.createCharge({
      customer: asaasCustomer.id,
      billingType: 'PIX',
      value: totalAmount,
      dueDate,
      description: `OS #${os.number}`,
      externalReference: `os_${osId}`,
    })

    const qrCode = await client.getPixQrCodeSafe(charge)

    await supabase
      .from('service_orders')
      .update({
        asaas_payment_id: charge.id,
        asaas_pix_qr_encoded: qrCode.encodedImage ?? null,
        asaas_pix_copy_paste: qrCode.payload ?? null,
        asaas_pix_expires_at: qrCode.expirationDate ?? null,
      })
      .eq('id', osId)

    // Envia via WhatsApp se Evolution estiver configurado
    void sendPixWhatsApp({
      supabase,
      companyId,
      osId,
      osNumber: os.number,
      clientPhone: os.clients?.phone ?? null,
      qrCode,
    })

    revalidatePath(`/dashboard/ordens-de-servico/${osId}`)
    return { success: true }
  } catch (error: unknown) {
    if (error instanceof Error) return { error: error.message }
    return { error: 'Erro desconhecido ao gerar PIX.' }
  }
}

async function sendPixWhatsApp({
  supabase,
  companyId,
  osId,
  osNumber,
  clientPhone,
  qrCode,
}: {
  supabase: ReturnType<typeof createAdminClient>
  companyId: string
  osId: string
  osNumber: number
  clientPhone: string | null
  qrCode: { encodedImage: string | null; payload: string | null }
}) {
  try {
    if (!clientPhone) return

    const { data: waSettings } = await supabase
      .from('whatsapp_automation_settings')
      .select('enabled, provider, evolution_base_url, evolution_api_key, evolution_instance_name, default_country_code')
      .eq('company_id', companyId)
      .maybeSingle<{
        enabled: boolean
        provider: string
        evolution_base_url: string
        evolution_api_key: string | null
        evolution_instance_name: string | null
        default_country_code: string | null
      }>()

    if (
      !waSettings?.enabled ||
      waSettings.provider !== 'evolution_api' ||
      !waSettings.evolution_api_key ||
      !waSettings.evolution_instance_name
    ) return

    const recipient = normalizePhone(clientPhone, waSettings.default_country_code)
    if (!recipient) return

    const evolutionClient = createEvolutionApiClient({
      baseUrl: waSettings.evolution_base_url,
      apiKey: waSettings.evolution_api_key,
      instanceName: waSettings.evolution_instance_name,
    })

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ''
    const pixPageUrl = siteUrl ? `${siteUrl}/pix/${osId}` : null

    if (qrCode.encodedImage) {
      await evolutionClient.sendMedia({
        number: recipient,
        mediatype: 'image',
        mimetype: 'image/png',
        media: qrCode.encodedImage,
        caption: `O serviço da OS *#${osNumber}* está pronto. Pague via PIX para retirar seu equipamento. 👇`,
      })
    }
    if (pixPageUrl) {
      await evolutionClient.sendText({
        number: recipient,
        text: `📋 *PIX Copia e Cola* — toque no link, depois em "Copiar código PIX" e cole no seu banco:\n${pixPageUrl}`,
      })
    }
  } catch {
    // Silencioso — falha no WhatsApp não impacta a geração do PIX
  }
}

export async function sendPixChargeToWhatsApp(osId: string) {
  try {
    const { companyId } = await getCompanyContext()
    const supabase = createAdminClient()

    const { data: os } = await supabase
      .from('service_orders')
      .select('id, number, asaas_payment_id, asaas_pix_qr_encoded, asaas_pix_copy_paste, clients(phone)')
      .eq('id', osId)
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .maybeSingle<{
        id: string
        number: number
        asaas_payment_id: string | null
        asaas_pix_qr_encoded: string | null
        asaas_pix_copy_paste: string | null
        clients: { phone: string | null } | null
      }>()

    if (!os) return { error: 'OS não encontrada.' }
    if (!os.asaas_payment_id) return { error: 'Esta OS ainda não possui cobrança PIX gerada.' }

    await sendPixWhatsApp({
      supabase,
      companyId,
      osId,
      osNumber: os.number,
      clientPhone: os.clients?.phone ?? null,
      qrCode: {
        encodedImage: os.asaas_pix_qr_encoded,
        payload: os.asaas_pix_copy_paste,
      },
    })

    return { success: true }
  } catch (error: unknown) {
    if (error instanceof Error) return { error: error.message }
    return { error: 'Erro ao enviar PIX via WhatsApp.' }
  }
}

const asaasSettingsSchema = z.object({
  enabled: z.boolean(),
  environment: z.enum(['sandbox', 'production']),
  api_key: z.string().min(1, 'Informe a API Key do Asaas.'),
})

export type AsaasSettingsSchema = z.infer<typeof asaasSettingsSchema>

export async function getAsaasSettings() {
  try {
    const { companyId } = await getCompanyContext()
    const supabase = createAdminClient()

    const { data } = await supabase
      .from('asaas_payment_settings')
      .select('enabled, environment, api_key')
      .eq('company_id', companyId)
      .maybeSingle()

    return {
      enabled: data?.enabled ?? false,
      environment: (data?.environment ?? 'sandbox') as AsaasEnvironment,
      api_key: data?.api_key ?? '',
    }
  } catch {
    return { enabled: false, environment: 'sandbox' as AsaasEnvironment, api_key: '' }
  }
}

export async function saveAsaasSettings(input: AsaasSettingsSchema) {
  try {
    const parsed = asaasSettingsSchema.safeParse(input)
    if (!parsed.success) return { error: parsed.error.issues[0].message }

    const { companyId } = await getCompanyContext()
    const supabase = createAdminClient()

    const { error } = await supabase
      .from('asaas_payment_settings')
      .upsert(
        {
          company_id: companyId,
          enabled: parsed.data.enabled,
          environment: parsed.data.environment,
          api_key: parsed.data.api_key,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'company_id' },
      )

    if (error) throw error

    revalidatePath('/dashboard/configuracoes/pagamentos')
    return { success: true }
  } catch (error: unknown) {
    if (error instanceof Error) return { error: error.message }
    return { error: 'Erro ao salvar configurações do Asaas.' }
  }
}

export async function testAsaasConnection(apiKey: string, environment: AsaasEnvironment) {
  try {
    if (!apiKey?.trim()) return { error: 'Informe a API Key antes de testar.' }

    const client = createAsaasClient(apiKey.trim(), environment)
    // Tenta listar um cliente — se a key for inválida a API retorna 401
    await client.findCustomerByExternalReference('__ping__')

    return { success: true }
  } catch (error: unknown) {
    if (error instanceof Error) return { error: error.message }
    return { error: 'Falha ao conectar com o Asaas.' }
  }
}
