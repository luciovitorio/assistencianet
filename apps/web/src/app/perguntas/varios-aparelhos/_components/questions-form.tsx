'use client'

import * as React from 'react'
import { Check, Copy } from 'lucide-react'

const STORAGE_KEY = 'smartconserto:perguntas-varios-aparelhos'

type Question = {
  id: number
  title: string
  body: React.ReactNode
  /** Perguntas que definem a arquitetura da feature — destacadas em âmbar. */
  key?: boolean
}

const QUESTIONS: Question[] = [
  {
    id: 1,
    title: 'Número da OS',
    key: true,
    body: (
      <>
        Quando o cliente traz 10 aparelhos, ele precisa de{' '}
        <strong className="font-semibold text-slate-900">um número de OS único</strong>{' '}
        para tudo? Ou tudo bem cada aparelho ter o seu próprio número, desde que você
        atenda uma vez só, imprima um papel só e cobre uma vez só?
      </>
    ),
  },
  {
    id: 2,
    title: 'Retirada parcial',
    key: true,
    body: (
      <>
        O cliente pode levar os aparelhos que já ficaram prontos e voltar depois para
        buscar o resto? Ou ele só retira quando estiver tudo pronto?
      </>
    ),
  },
  {
    id: 3,
    title: 'Pagamento',
    body: (
      <>
        Ele paga tudo de uma vez no final, ou vai pagando conforme retira cada aparelho?
      </>
    ),
  },
  {
    id: 4,
    title: 'Aprovação do orçamento',
    body: (
      <>
        Depois de ver os preços, o cliente pode aprovar o conserto de alguns aparelhos e
        recusar o de outros? Ou ele aprova (ou recusa) o pacote inteiro de uma vez?
      </>
    ),
  },
  {
    id: 5,
    title: 'Comissão do técnico',
    key: true,
    body: (
      <>
        Hoje o técnico recebe um valor fixo por OS concluída. Se três técnicos diferentes
        mexerem nesses 10 aparelhos, cada um deve receber{' '}
        <strong className="font-semibold text-slate-900">
          por aparelho que consertou
        </strong>{' '}
        (somando 10 no total)? Ou a entrada inteira vale uma comissão só, para um técnico
        só?
      </>
    ),
  },
  {
    id: 6,
    title: 'Situação de cada aparelho',
    body: (
      <>
        Os aparelhos podem estar em situações diferentes ao mesmo tempo — um pronto,
        outro aguardando peça, outro em reparo? E quando o cliente perguntar pelo
        WhatsApp, o que ele deve receber: um resumo (“7 prontos, 3 em reparo”) ou a lista
        aparelho por aparelho?
      </>
    ),
  },
  {
    id: 7,
    title: 'Garantia',
    body: (
      <>
        A garantia começa a contar na retirada de cada aparelho separadamente, ou vale
        uma data só para a entrada inteira?
      </>
    ),
  },
  {
    id: 8,
    title: 'Com que frequência acontece',
    body: (
      <>
        Isso acontece só com esse cliente ou é comum? Numa entrada dessas, o normal são
        quantos aparelhos — uns 3, uns 10, mais de 30?
      </>
    ),
  },
  {
    id: 9,
    title: 'Aparelhos parecidos ou variados',
    body: (
      <>
        Costumam ser aparelhos iguais com o mesmo defeito (por exemplo, 10 secadores do
        mesmo salão), ou cada um é de um tipo com um problema diferente?
      </>
    ),
  },
]

export function QuestionsForm() {
  const [answers, setAnswers] = React.useState<Record<number, string>>({})
  const [note, setNote] = React.useState('Suas respostas ficam salvas neste aparelho')
  const [copied, setCopied] = React.useState(false)

  // Carrega o rascunho depois da montagem para não divergir do HTML do servidor.
  React.useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) setAnswers(JSON.parse(stored) as Record<number, string>)
    } catch {
      // modo privado ou storage indisponível — segue sem rascunho
    }
  }, [])

  const handleChange = (id: number, value: string) => {
    const next = { ...answers, [id]: value }
    setAnswers(next)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      setNote('Rascunho salvo')
    } catch {
      // sem storage: as respostas seguem válidas só nesta visita
    }
  }

  const buildText = () =>
    [
      'Respostas — vários aparelhos numa OS só',
      '',
      ...QUESTIONS.flatMap((q) => [
        `${q.id}) ${q.title}`,
        answers[q.id]?.trim() || '(ainda não respondi)',
        '',
      ]),
    ]
      .join('\n')
      .trim()

  const fallbackCopy = (text: string) => {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.setAttribute('readonly', '')
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    let ok = false
    try {
      ok = document.execCommand('copy')
    } catch {
      ok = false
    }
    document.body.removeChild(textarea)
    return ok
  }

  const handleCopy = async () => {
    const text = buildText()
    const succeed = () => {
      setCopied(true)
      setNote('Agora é só colar na conversa')
      setTimeout(() => setCopied(false), 2200)
    }

    try {
      await navigator.clipboard.writeText(text)
      succeed()
    } catch {
      if (fallbackCopy(text)) succeed()
      else setNote('Não consegui copiar — selecione o texto e copie manualmente')
    }
  }

  return (
    <>
      <ol className="flex flex-col gap-4">
        {QUESTIONS.map((question) => (
          <li
            key={question.id}
            className={[
              'flex flex-col gap-3 rounded-2xl border p-5 shadow-sm shadow-slate-950/5',
              question.key
                ? 'border-amber-200 border-l-[3px] border-l-amber-400 bg-gradient-to-r from-amber-50 to-white to-[12rem]'
                : 'border-slate-200 bg-white',
            ].join(' ')}
          >
            {question.key && (
              <span className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.07em] text-amber-700">
                <span aria-hidden="true" className="h-0.5 w-3.5 bg-amber-400" />
                Define o rumo do sistema
              </span>
            )}

            <div className="flex items-baseline gap-3">
              <span
                className={[
                  'shrink-0 px-1.5 py-0.5 font-mono text-[13px] font-semibold tabular-nums',
                  question.key
                    ? 'border border-amber-400 text-amber-700'
                    : 'bg-blue-50 text-blue-700',
                ].join(' ')}
              >
                {String(question.id).padStart(2, '0')}
              </span>
              <h2 className="text-base font-semibold tracking-tight text-balance text-slate-900">
                {question.title}
              </h2>
            </div>

            <p className="text-[15px] leading-relaxed text-slate-600">{question.body}</p>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor={`resposta-${question.id}`}
                className="font-mono text-[11px] uppercase tracking-[0.09em] text-slate-400"
              >
                Sua resposta
              </label>
              <textarea
                id={`resposta-${question.id}`}
                rows={3}
                value={answers[question.id] ?? ''}
                onChange={(event) => handleChange(question.id, event.target.value)}
                className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-[15px] leading-relaxed text-slate-900 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none"
              />
            </div>
          </li>
        ))}
      </ol>

      <p className="border-t border-slate-200 pt-5 text-sm text-slate-500">
        As três perguntas marcadas em amarelo são as que mais mudam o jeito de programar —
        se puder responder pelo menos essas, já dá para começar. O que você escrever fica
        guardado neste aparelho, então dá para fechar a página e voltar depois.
      </p>

      <div className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-4 px-5 py-3">
          <span className="hidden text-[13px] text-slate-500 sm:block">{note}</span>
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-[15px] font-semibold text-white transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 focus-visible:outline-none sm:w-auto"
          >
            {copied ? (
              <>
                <Check className="size-4" aria-hidden="true" />
                Copiado
              </>
            ) : (
              <>
                <Copy className="size-4" aria-hidden="true" />
                Copiar respostas
              </>
            )}
          </button>
        </div>
      </div>
    </>
  )
}
