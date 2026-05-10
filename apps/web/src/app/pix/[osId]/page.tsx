import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import { BrandMark } from '@/components/brand-mark'
import { PixCopyButton } from './_components/pix-copy-button'

export default async function PixPage({ params }: { params: Promise<{ osId: string }> }) {
  const { osId } = await params
  const supabase = createAdminClient()

  const { data: os } = await supabase
    .from('service_orders')
    .select('number, asaas_pix_copy_paste, asaas_pix_qr_encoded, asaas_pix_expires_at, company_id, branch_id')
    .eq('id', osId)
    .maybeSingle()

  if (!os?.asaas_pix_copy_paste) notFound()

  const isExpired = os.asaas_pix_expires_at
    ? new Date(os.asaas_pix_expires_at) < new Date()
    : false

  const [{ data: company }, { data: branch }, { data: estimate }] = await Promise.all([
    supabase.from('companies').select('name, cnpj, phone').eq('id', os.company_id).single(),
    os.branch_id
      ? supabase.from('branches').select('name, phone, city, state').eq('id', os.branch_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from('service_order_estimates')
      .select('total_amount')
      .eq('service_order_id', osId)
      .eq('status', 'aprovado')
      .is('deleted_at', null)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b px-6 py-4 flex items-center gap-2.5">
        <BrandMark className="h-8 w-8" aria-hidden="true" />
        <span className="text-[17px] font-extrabold tracking-tight text-foreground">
          Smart<span className="text-[#1055F0]">Conserto</span>
        </span>
      </header>

      <main className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-4">

          {/* Dados da empresa */}
          {company && (
            <div className="bg-white rounded-2xl border shadow-sm px-6 py-5 space-y-0.5">
              <p className="font-bold text-foreground">{company.name}</p>
              {branch && (
                <p className="text-sm text-muted-foreground">
                  Filial: {branch.name}
                  {branch.city && branch.state ? ` — ${branch.city}/${branch.state}` : ''}
                </p>
              )}
              {company.cnpj && (
                <p className="text-sm text-muted-foreground">CNPJ: {company.cnpj}</p>
              )}
              {(branch?.phone ?? company.phone) && (
                <p className="text-sm text-muted-foreground">
                  Tel: {branch?.phone ?? company.phone}
                </p>
              )}
            </div>
          )}

          {/* Card de pagamento */}
          <div className="bg-white rounded-2xl border shadow-sm p-8 space-y-8">
            <div className="text-center space-y-1">
              <p className="text-sm text-muted-foreground">Pagamento via PIX</p>
              <h1 className="text-2xl font-bold">OS #{os.number}</h1>
              {estimate?.total_amount != null && (
                <p className="text-3xl font-extrabold text-emerald-600">
                  {Number(estimate.total_amount).toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  })}
                </p>
              )}
            </div>

            {isExpired ? (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-5 py-4 text-center space-y-1">
                <p className="text-sm font-semibold text-destructive">Código PIX expirado</p>
                <p className="text-xs text-muted-foreground">
                  Entre em contato com a loja para gerar um novo código de pagamento.
                </p>
              </div>
            ) : (
              <>
                {os.asaas_pix_qr_encoded && (
                  <div className="flex justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`data:image/png;base64,${os.asaas_pix_qr_encoded}`}
                      alt="QR Code PIX"
                      className="w-52 h-52 rounded-xl border"
                    />
                  </div>
                )}

                <div className="space-y-3">
                  <PixCopyButton code={os.asaas_pix_copy_paste} />
                  <p className="text-xs text-center text-muted-foreground">
                    Toque em <strong>Copiar código PIX</strong>, abra seu banco e cole no campo PIX Copia e Cola.
                  </p>
                </div>

                {os.asaas_pix_expires_at && (
                  <p className="text-xs text-center text-muted-foreground">
                    Válido até{' '}
                    {new Date(os.asaas_pix_expires_at).toLocaleString('pt-BR', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      <footer className="py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} SmartConserto
      </footer>
    </div>
  )
}
