import type { Metadata } from 'next'
import { BrandMark } from '@/components/brand-mark'
import { QuestionsForm } from './_components/questions-form'

export const metadata: Metadata = {
  title: 'Vários aparelhos numa OS só | SmartConserto',
  description:
    'Perguntas para entender como a assistência trabalha quando o cliente traz vários aparelhos de uma vez.',
  // Questionário enviado por link direto — não deve ser indexado.
  robots: { index: false, follow: false },
}

const FIELDS = [
  { label: 'Assunto', value: 'Receber mais de um aparelho no mesmo atendimento' },
  { label: 'Para', value: 'Dono da assistência' },
  {
    label: 'Como responder',
    value: 'Pelo número da pergunta — sem pressa, pode ser aos poucos',
  },
]

export default function PerguntasVariosAparelhosPage() {
  return (
    <main className="min-h-full bg-slate-50">
      <div className="mx-auto flex max-w-2xl flex-col gap-8 px-5 pt-8 pb-32">
        <header className="flex flex-col gap-5">
          <div className="flex items-center gap-2">
            <BrandMark className="size-7 rounded-md" aria-hidden="true" />
            <span className="text-sm font-semibold tracking-tight text-slate-900">
              SmartConserto
            </span>
          </div>

          <h1 className="text-3xl leading-tight font-bold tracking-tight text-balance text-slate-950">
            Vários aparelhos numa OS só — algumas dúvidas antes de programar
          </h1>

          <dl className="border-t border-slate-300">
            {FIELDS.map((field) => (
              <div
                key={field.label}
                className="grid grid-cols-1 items-baseline gap-x-3 border-b border-slate-200 py-2.5 sm:grid-cols-[7rem_1fr]"
              >
                <dt className="font-mono text-[11px] uppercase tracking-[0.09em] text-slate-400">
                  {field.label}
                </dt>
                <dd className="text-[15px] text-slate-600">{field.value}</dd>
              </div>
            ))}
          </dl>

          <p className="text-[17px] leading-relaxed text-slate-600">
            Hoje o sistema abre{' '}
            <strong className="font-semibold text-slate-900">
              uma OS para cada aparelho
            </strong>
            . Para atender quem chega com vários de uma vez, dá para mudar isso — mas o
            jeito certo de mudar depende de como você trabalha no dia a dia. São 9
            perguntas rápidas.
          </p>

          <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 border-l-[3px] border-l-blue-600 bg-white p-5 shadow-sm shadow-slate-950/5">
            <span className="font-mono text-[11px] uppercase tracking-[0.09em] text-blue-700">
              A situação
            </span>
            <p className="text-[15px] leading-relaxed text-slate-600">
              Um cliente chega com 10 aparelhos de uma vez. Hoje seria preciso abrir 10
              OS, digitando os dados dele 10 vezes. As perguntas abaixo são para entender
              o que deve acontecer com esses 10 aparelhos depois que eles entram na loja.
            </p>
          </div>
        </header>

        <QuestionsForm />
      </div>
    </main>
  )
}
