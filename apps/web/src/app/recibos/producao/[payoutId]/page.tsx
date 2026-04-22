import { notFound, redirect } from 'next/navigation'
import { getCompanyContext } from '@/lib/auth/company-context'
import { getPayoutDetail } from '@/app/actions/technician-payouts'
import { PAYOUT_STATUS_LABELS } from '@/lib/validations/technician-payout'
import { PayoutPrintActions } from './payout-print-actions'

type PayoutPrintPageProps = {
  params: Promise<{ payoutId: string }>
}

const dateFormatter = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' })
const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
})

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatIsoDate(iso: string) {
  if (!iso) return '—'
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

export default async function PayoutPrintPage({ params }: PayoutPrintPageProps) {
  const { payoutId } = await params

  try {
    await getCompanyContext()
  } catch {
    redirect('/dashboard')
  }

  const { data: payout, error } = await getPayoutDetail(payoutId)
  if (error || !payout) notFound()

  const activeItems = payout.items.filter((i) => i.active)

  return (
    <main className="min-h-screen bg-neutral-100 px-4 py-6 print:block print:min-h-0 print:bg-white print:px-0 print:py-0">
      <style>{`
        @media print {
          @page { size: A4; margin: 10mm; }
          html, body { margin: 0 !important; padding: 0 !important; }
          .print-sheet { page-break-after: avoid; page-break-inside: avoid; break-inside: avoid; }
        }
      `}</style>

      <div className="mx-auto w-full max-w-3xl space-y-3 print:max-w-none print:space-y-0">
        <PayoutPrintActions />

        <section className="print-sheet overflow-hidden rounded-3xl border border-border bg-white text-[13px] shadow-sm print:rounded-none print:border-0 print:text-[12px] print:shadow-none print:leading-snug">
          {/* Header */}
          <div className="border-b border-border px-5 py-4 print:px-3 print:py-2">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                  Recibo de pagamento — Produção
                </p>
                <h1 className="mt-1 text-xl font-bold tracking-tight text-foreground print:mt-0 print:text-[18px]">
                  {payout.receipt_number}
                </h1>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Emitido em {dateTimeFormatter.format(new Date(payout.created_at))}
                  {' · '}
                  Status:{' '}
                  <span className="font-medium text-foreground">
                    {PAYOUT_STATUS_LABELS[payout.status]}
                  </span>
                </p>
              </div>

              <div className="max-w-[55%] text-right">
                <p className="text-sm font-semibold text-foreground print:text-[13px]">
                  {payout.company_name}
                </p>
                {payout.company_cnpj && (
                  <p className="text-xs text-muted-foreground">CNPJ {payout.company_cnpj}</p>
                )}
                {payout.company_phone && (
                  <p className="text-xs text-muted-foreground">{payout.company_phone}</p>
                )}
                {payout.branch_name && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {payout.branch_name}
                    {payout.branch_city || payout.branch_state
                      ? ` · ${[payout.branch_city, payout.branch_state].filter(Boolean).join('/')}`
                      : ''}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Resumo */}
          <div className="grid gap-3 px-5 py-4 md:grid-cols-2 print:gap-2 print:px-3 print:py-2">
            <div>
              <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Técnico
              </h2>
              <p className="mt-1 text-sm font-semibold text-foreground print:text-[13px]">
                {payout.technician_name}
              </p>
              {payout.technician_cpf && (
                <p className="text-xs text-muted-foreground">CPF {payout.technician_cpf}</p>
              )}
              {payout.technician_phone && (
                <p className="text-xs text-muted-foreground">{payout.technician_phone}</p>
              )}
            </div>

            <div>
              <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Período
              </h2>
              <dl className="mt-1 space-y-1 text-xs print:space-y-0.5 print:text-[11.5px]">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">De</dt>
                  <dd className="font-medium text-foreground tabular-nums">
                    {formatIsoDate(payout.period_start)}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Até</dt>
                  <dd className="font-medium text-foreground tabular-nums">
                    {formatIsoDate(payout.period_end)}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">OS incluídas</dt>
                  <dd className="font-medium text-foreground tabular-nums">{payout.os_count}</dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Tabela de OS */}
          <div className="px-5 pb-3 print:px-3 print:pb-2">
            <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-1">
              Ordens de serviço incluídas
            </h2>
            {activeItems.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">Sem itens ativos.</p>
            ) : (
              <div className="overflow-hidden rounded-lg border border-border print:rounded-none">
                <table className="w-full text-xs print:text-[11px]">
                  <thead className="bg-muted/60 text-[10px] uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-3 py-1.5 text-left">OS</th>
                      <th className="px-3 py-1.5 text-left">Cliente</th>
                      <th className="px-3 py-1.5 text-left">Concluída</th>
                      <th className="px-3 py-1.5 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {activeItems.map((item) => (
                      <tr key={item.id}>
                        <td className="px-3 py-1.5 font-mono text-[11px] tabular-nums">
                          #{item.os_number}
                        </td>
                        <td className="px-3 py-1.5 text-foreground">{item.client_name}</td>
                        <td className="px-3 py-1.5 tabular-nums text-muted-foreground">
                          {dateFormatter.format(new Date(item.completed_at))}
                        </td>
                        <td className="px-3 py-1.5 text-right tabular-nums">
                          {formatCurrency(item.labor_rate)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Total + observações */}
          <div className="grid gap-3 px-5 pb-4 md:grid-cols-[1fr_auto] md:items-end print:px-3 print:pb-2">
            {payout.notes ? (
              <div>
                <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Observações
                </h2>
                <p className="mt-1 whitespace-pre-wrap text-xs leading-snug text-foreground print:text-[11.5px]">
                  {payout.notes}
                </p>
              </div>
            ) : (
              <div />
            )}

            <div className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-right print:rounded-none">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Total a receber
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-foreground print:text-[20px]">
                {formatCurrency(payout.total_amount)}
              </p>
              {payout.bill_paid_at && (
                <p className="mt-1 text-[10px] text-emerald-700">
                  Pago em {formatIsoDate(payout.bill_paid_at)}
                  {payout.bill_payment_method ? ` · ${payout.bill_payment_method}` : ''}
                </p>
              )}
            </div>
          </div>

          {/* Declaração + assinatura */}
          <div className="border-t border-border px-5 py-4 print:px-3 print:py-3">
            <p className="text-xs leading-relaxed text-foreground print:text-[11.5px]">
              Recebi de <span className="font-semibold">{payout.company_name}</span> a quantia de{' '}
              <span className="font-semibold">{formatCurrency(payout.total_amount)}</span>, referente à produção do
              período de{' '}
              <span className="font-semibold tabular-nums">{formatIsoDate(payout.period_start)}</span> a{' '}
              <span className="font-semibold tabular-nums">{formatIsoDate(payout.period_end)}</span>, dando plena e
              geral quitação pelos serviços técnicos prestados.
            </p>

            <div className="mt-10 grid grid-cols-2 gap-8 text-xs text-muted-foreground print:mt-12 print:text-[11px]">
              <div>
                <div className="border-t border-foreground/40 pt-1.5 text-center">
                  <p className="font-medium text-foreground">{payout.technician_name}</p>
                  {payout.technician_cpf && <p>CPF {payout.technician_cpf}</p>}
                </div>
              </div>
              <div>
                <div className="border-t border-foreground/40 pt-1.5 text-center">
                  <p className="font-medium text-foreground">Data</p>
                  <p>___/___/______</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
