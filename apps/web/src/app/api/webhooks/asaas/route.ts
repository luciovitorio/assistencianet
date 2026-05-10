import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Eventos que confirmam pagamento PIX
const PAID_EVENTS = new Set(['PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED'])

interface AsaasWebhookPayload {
  event: string
  payment?: {
    id: string
    status: string
    externalReference?: string | null
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as AsaasWebhookPayload

    if (!PAID_EVENTS.has(body.event)) {
      return NextResponse.json({ received: true })
    }

    const paymentId = body.payment?.id
    if (!paymentId) return NextResponse.json({ received: true })

    const supabase = createAdminClient()

    // Busca a OS pelo asaas_payment_id
    const { data: os, error } = await supabase
      .from('service_orders')
      .select('id, company_id, number, payment_status')
      .eq('asaas_payment_id', paymentId)
      .is('deleted_at', null)
      .maybeSingle()

    if (error || !os) return NextResponse.json({ received: true })

    // Atualiza apenas se ainda não está pago
    if (os.payment_status !== 'pago') {
      await supabase
        .from('service_orders')
        .update({
          payment_status: 'pago',
          payment_method: 'pix',
        })
        .eq('id', os.id)
    }

    return NextResponse.json({ received: true })
  } catch {
    return NextResponse.json({ received: true })
  }
}
