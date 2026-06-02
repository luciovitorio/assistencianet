import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  Wifi,
  Bot,
  MessageSquare,
  QrCode,
  CheckCircle2,
  ArrowRight,
  Smartphone,
  Zap,
  AlertCircle,
  Info,
} from 'lucide-react'
import { getAdminContext } from '@/lib/auth/admin-context'
import { buttonVariants } from '@/components/ui/button-variants'
import { cn } from '@/lib/utils'

export default async function ConfiguracoesGuiaPage() {
  try {
    await getAdminContext('configuracoes')
  } catch {
    redirect('/dashboard')
  }

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-950/5">
        <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-600">
          <Zap className="size-3.5" />
          Guia de configuração
        </div>
        <h1 className="mb-2 text-xl font-bold text-slate-900">
          Configure o bot e o pagamento PIX do zero
        </h1>
        <p className="text-sm text-slate-500">
          Siga os passos abaixo para ativar as notificações automáticas via WhatsApp, o menu
          interativo do bot e as cobranças via PIX. Ao final, seus clientes receberão atualizações
          em tempo real e poderão pagar sem sair do WhatsApp.
        </p>
      </div>

      {/* ÍNDICE */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-950/5">
        <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Neste guia
        </p>
        <ol className="space-y-2 text-sm">
          {[
            'Conectar o WhatsApp via Evolution API',
            'Configurar mensagens automáticas por evento',
            'Montar o menu interativo do bot',
            'Ativar cobranças via PIX (Asaas)',
            'Testar o fluxo completo',
          ].map((item, i) => (
            <li key={i} className="flex items-center gap-3 text-slate-600">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">
                {i + 1}
              </span>
              {item}
            </li>
          ))}
        </ol>
      </div>

      {/* PASSO 1 */}
      <Step
        step={1}
        icon={Wifi}
        title="Conectar o WhatsApp via Evolution API"
        href="/dashboard/configuracoes/automacao"
        linkLabel="Abrir configurações de WhatsApp"
      >
        <p className="mb-4 text-sm text-slate-600">
          O sistema usa a <strong>Evolution API</strong> para enviar e receber mensagens. Você
          precisa de um servidor com a Evolution API instalada (pode ser uma VPS própria ou o
          servidor que você já usa).
        </p>

        <div className="mb-4 space-y-3">
          <SubStep n="1.1" title="Selecione o provedor e habilite a automação">
            <p className="text-sm text-slate-600">
              Em <em>Notificações WhatsApp</em>, selecione o provedor{' '}
              <strong>Evolution API</strong>, marque a opção{' '}
              <strong>Habilitar automação do WhatsApp</strong> e clique em{' '}
              <strong>Salvar automação</strong>. O sistema gera automaticamente o nome da
              instância — você não precisa preencher nenhum campo de URL ou chave.
            </p>
          </SubStep>

          <SubStep n="1.2" title="Conecte a instância e escaneie o QR Code">
            <p className="text-sm text-slate-600">
              Após salvar, o botão <strong>Conectar instância na Evolution</strong> fica
              disponível. Clique nele para registrar a instância no servidor. Em seguida, clique
              em <strong>Gerar QR Code</strong>, abra o WhatsApp no celular, vá em{' '}
              <strong>Dispositivos conectados → Conectar dispositivo</strong> e escaneie o QR
              Code exibido.
            </p>
          </SubStep>

          <SubStep n="1.3" title="Verifique a conexão">
            <p className="text-sm text-slate-600">
              O status deve mudar para <StatusBadge color="emerald" label="Conectado" />. A partir
              deste momento, qualquer mensagem enviada ao número será processada pelo bot.
            </p>
          </SubStep>
        </div>

        <InfoBox>
          O número conectado será o número oficial da sua assistência no WhatsApp. Use um número
          exclusivo para o sistema — não o seu pessoal.
        </InfoBox>
      </Step>

      {/* PASSO 2 */}
      <Step
        step={2}
        icon={MessageSquare}
        title="Configurar mensagens automáticas por evento"
        href="/dashboard/configuracoes/automacao"
        linkLabel="Abrir configurações de notificações"
      >
        <p className="mb-4 text-sm text-slate-600">
          O sistema envia mensagens automáticas ao cliente em 4 momentos. Você pode personalizar
          cada texto usando as variáveis disponíveis.
        </p>

        <div className="mb-4 space-y-4">
          <MessageExample
            event="OS criada"
            description="Enviada quando a OS é registrada no sistema"
            template={`Olá *{{nome_cliente}}*! 👋

Recebemos seu *{{equipamento}}* com sucesso.
Sua OS é a *#{{numero_os}}*.

Acompanhe o andamento pelo WhatsApp respondendo aqui. 😊`}
          />

          <MessageExample
            event="Orçamento pronto"
            description="Enviada quando o técnico finaliza o orçamento"
            template={`Olá *{{nome_cliente}}*! 🔧

O orçamento do seu *{{equipamento}}* está pronto.

💰 Valor: *R$ {{valor_orcamento}}*
📋 Descrição: {{descricao_servico}}

Responda *1* para APROVAR ou *2* para RECUSAR.`}
          />

          <MessageExample
            event="Serviço concluído"
            description="Enviada quando o técnico marca a OS como concluída"
            template={`✅ *{{nome_cliente}}*, seu *{{equipamento}}* está pronto!

🎉 OS *#{{numero_os}}* finalizada com sucesso.
💰 Valor: *R$ {{valor_total}}*

Passe para retirada no horário de funcionamento.
Qualquer dúvida é só responder aqui!`}
          />

          <MessageExample
            event="Pesquisa de satisfação"
            description="Enviada automaticamente após a retirada do equipamento"
            template={`Olá *{{nome_cliente}}*! 😊

Como foi sua experiência na *{{nome_empresa}}*?
Sua opinião nos ajuda a melhorar!

1️⃣ Muito ruim
2️⃣ Ruim
3️⃣ Regular
4️⃣ Bom
5️⃣ Excelente`}
          />
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="mb-2 text-xs font-semibold text-slate-500">Variáveis disponíveis</p>
          <div className="flex flex-wrap gap-1.5">
            {[
              '{{nome_cliente}}',
              '{{equipamento}}',
              '{{numero_os}}',
              '{{valor_orcamento}}',
              '{{valor_total}}',
              '{{descricao_servico}}',
              '{{nome_empresa}}',
              '{{data_entrada}}',
              '{{previsao_entrega}}',
            ].map((v) => (
              <code
                key={v}
                className="rounded bg-white px-2 py-0.5 text-xs text-slate-600 shadow-sm ring-1 ring-slate-200"
              >
                {v}
              </code>
            ))}
          </div>
        </div>
      </Step>

      {/* PASSO 3 */}
      <Step
        step={3}
        icon={Bot}
        title="Montar o menu interativo do bot"
        href="/dashboard/configuracoes/bot"
        linkLabel="Abrir configurações do bot"
      >
        <p className="mb-4 text-sm text-slate-600">
          O bot responde automaticamente quando um cliente envia uma mensagem fora de uma conversa
          ativa. Configure o menu de opções e as respostas para cada caminho.
        </p>

        <div className="mb-6 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Exemplo de fluxo de conversa
          </p>

          <ChatPreview
            title="Cliente consulta status da OS"
            messages={[
              { from: 'user', message: 'Oi', time: '14:02' },
              {
                from: 'bot',
                message:
                  'Olá! 👋 Bem-vindo à *Orquídia Assistência Técnica*!\n\nComo posso ajudá-lo?\n\n1️⃣ Consultar status da OS\n2️⃣ Enviar orçamento aprovado / recusado\n3️⃣ Falar com um atendente\n4️⃣ Horários e endereço\n\n_Digite o número da opção._',
                time: '14:02',
              },
              { from: 'user', message: '1', time: '14:03' },
              {
                from: 'bot',
                message: 'Por favor, informe o *número da sua OS* (ex: 1234) ou seu *CPF*:',
                time: '14:03',
              },
              { from: 'user', message: '4521', time: '14:04' },
              {
                from: 'bot',
                message:
                  '🔍 *OS #4521 — Samsung Galaxy S22*\n\n📌 Status: *Em reparo*\n📅 Entrada: 30/05/2026\n🔧 Técnico: João\n⏱ Previsão: 04/06/2026\n\nDeseja mais alguma coisa?\n\n1️⃣ Menu principal\n0️⃣ Falar com atendente',
                time: '14:04',
              },
            ]}
          />

          <ChatPreview
            title="Cliente aprova orçamento"
            messages={[
              {
                from: 'bot',
                message:
                  'Olá *Maria*! 🔧\n\nO orçamento do seu *iPhone 14* está pronto.\n\n💰 Valor: *R$ 280,00*\n📋 Troca da tela + bateria\n\nResponda *1* para APROVAR ou *2* para RECUSAR.',
                time: '10:15',
              },
              { from: 'user', message: '1', time: '10:18' },
              {
                from: 'bot',
                message:
                  '✅ Orçamento *aprovado* com sucesso!\n\nVamos iniciar o reparo e te avisamos assim que estiver pronto. 😊',
                time: '10:18',
              },
            ]}
          />

          <ChatPreview
            title="Cliente fora do horário"
            messages={[
              { from: 'user', message: 'Boa noite, quero saber do meu celular', time: '22:41' },
              {
                from: 'bot',
                message:
                  'Olá! 👋 Nosso horário de atendimento é de *seg a sex, das 8h às 18h*, e *sáb das 8h às 12h*.\n\nDeixe sua mensagem que respondemos assim que abrirmos! 😊\n\n_Ou consulte sua OS digitando o número:_',
                time: '22:41',
              },
            ]}
          />
        </div>

        <div className="mb-4 space-y-3">
          <SubStep n="3.1" title="Configure a mensagem de boas-vindas">
            <p className="text-sm text-slate-600">
              Em <em>Bot WhatsApp → Mensagens</em>, defina a saudação inicial que aparece quando o
              cliente envia qualquer mensagem pela primeira vez.
            </p>
          </SubStep>

          <SubStep n="3.2" title="Monte os itens do menu">
            <p className="text-sm text-slate-600">
              Em <em>Bot WhatsApp → Menu interativo</em>, adicione as opções numeradas. Sugestão de
              estrutura:
            </p>
            <ul className="mt-2 space-y-1 text-sm text-slate-600">
              <li>
                <strong>1</strong> — Consultar status da OS
              </li>
              <li>
                <strong>2</strong> — Responder orçamento (aprovar / recusar)
              </li>
              <li>
                <strong>3</strong> — Falar com um atendente
              </li>
              <li>
                <strong>4</strong> — Horários e endereço
              </li>
              <li>
                <strong>0</strong> — Voltar ao menu principal (em qualquer momento)
              </li>
            </ul>
          </SubStep>

          <SubStep n="3.3" title="Configure os gatilhos">
            <p className="text-sm text-slate-600">
              Em <em>Bot WhatsApp → Gatilhos</em>, defina em quais mudanças de status da OS o bot
              deve enviar mensagens automáticas. Recomendamos ativar todos os gatilhos.
            </p>
          </SubStep>
        </div>

        <InfoBox>
          O dígito <strong>0</strong> é o padrão para voltar ao menu principal — mantenha esse
          padrão em todos os submenus para que o cliente nunca fique preso.
        </InfoBox>
      </Step>

      {/* PASSO 4 */}
      <Step
        step={4}
        icon={QrCode}
        title="Ativar cobranças via PIX (Asaas)"
        href="/dashboard/configuracoes/pagamentos"
        linkLabel="Abrir configurações de pagamentos"
      >
        <p className="mb-4 text-sm text-slate-600">
          Com o PIX ativado, ao marcar uma OS como concluída o sistema envia automaticamente o
          código PIX para o cliente pelo WhatsApp — sem precisar gerar manualmente.
        </p>

        <div className="mb-6 space-y-3">
          <SubStep n="4.1" title="Crie uma conta no Asaas">
            <p className="text-sm text-slate-600">
              Acesse{' '}
              <span className="font-medium text-slate-800">asaas.com</span> e crie uma conta
              gratuita. O Asaas é uma fintech brasileira homologada pelo Banco Central que processa
              PIX, boleto e cartão.
            </p>
          </SubStep>

          <SubStep n="4.2" title="Gere sua API Key">
            <p className="text-sm text-slate-600">
              No painel do Asaas, acesse <em>Integrações → API Keys</em> e gere uma chave de
              produção. Cole essa chave no campo <strong>API Key</strong> em{' '}
              <em>Pagamentos PIX</em>.
            </p>
          </SubStep>

          <SubStep n="4.3" title="Configure a chave PIX">
            <p className="text-sm text-slate-600">
              Defina qual chave PIX receberá os pagamentos (CPF/CNPJ, celular ou e-mail). Esta
              chave deve estar cadastrada na sua conta Asaas.
            </p>
          </SubStep>
        </div>

        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Como o cliente recebe o PIX
        </p>

        <ChatPreview
          title="Notificação com PIX ao finalizar OS"
          messages={[
            {
              from: 'bot',
              message:
                '✅ *Carlos*, seu *Notebook Dell* está pronto para retirada!\n\n🎉 OS *#1847* finalizada com sucesso.\n💰 Valor total: *R$ 450,00*\n\n*Pague com PIX* e retire mais rápido:\n\n`00020126580014BR.GOV.BCB.PIX...`\n\n_Copie o código acima ou mostre este QR Code na loja._',
              time: '16:30',
            },
            { from: 'user', message: 'Paguei! Posso ir buscar?', time: '16:32' },
            {
              from: 'bot',
              message:
                'Pagamento confirmado! ✅ Pode vir buscar a qualquer momento no horário de funcionamento. Te esperamos! 😊',
              time: '16:32',
            },
          ]}
        />

        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-500" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Ambiente de testes</p>
              <p className="mt-0.5 text-sm text-amber-700">
                O Asaas oferece um ambiente de sandbox para testes. Use a URL{' '}
                <code className="rounded bg-amber-100 px-1 text-xs">
                  sandbox.asaas.com
                </code>{' '}
                e uma API Key de sandbox antes de ativar em produção.
              </p>
            </div>
          </div>
        </div>
      </Step>

      {/* PASSO 5 */}
      <Step step={5} icon={CheckCircle2} title="Testar o fluxo completo" last>
        <p className="mb-4 text-sm text-slate-600">
          Antes de usar com clientes reais, faça um teste completo do fluxo:
        </p>

        <div className="space-y-2">
          {[
            {
              label: 'WhatsApp conectado',
              desc: 'Status aparece como "Conectado" em Notificações WhatsApp',
            },
            {
              label: 'Mensagem de boas-vindas',
              desc: 'Envie "Oi" para o número e confira se o bot responde com o menu',
            },
            {
              label: 'Consulta de OS pelo bot',
              desc: 'Digite "1" e informe um número de OS real para testar a consulta',
            },
            {
              label: 'Notificação ao criar OS',
              desc: 'Crie uma OS com o celular do teste e confirme que a mensagem chegou',
            },
            {
              label: 'Notificação ao concluir OS',
              desc: 'Mude o status para "Concluído" e verifique se a mensagem com o PIX foi enviada',
            },
            {
              label: 'PIX gerado corretamente',
              desc: 'Copie o código PIX recebido e valide em qualquer app de banco',
            },
            {
              label: 'Pesquisa de satisfação',
              desc: 'Verifique se a pesquisa é enviada após o prazo configurado',
            },
          ].map((item, i) => (
            <label
              key={i}
              className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:bg-slate-50"
            >
              <input type="checkbox" className="mt-0.5 size-4 accent-emerald-600" />
              <span>
                <span className="block text-sm font-medium text-slate-800">{item.label}</span>
                <span className="block text-xs text-slate-500">{item.desc}</span>
              </span>
            </label>
          ))}
        </div>

        <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
            <p className="text-sm text-emerald-800">
              Com todos os itens verificados, seu sistema está pronto para receber clientes! Os
              avisos chegam automaticamente e os clientes podem consultar o status, aprovar
              orçamentos e pagar sem sair do WhatsApp.
            </p>
          </div>
        </div>
      </Step>
    </div>
  )
}

/* ---------- sub-components ---------- */

function Step({
  step,
  icon: Icon,
  title,
  href,
  linkLabel,
  last,
  children,
}: {
  step: number
  icon: React.ElementType
  title: string
  href?: string
  linkLabel?: string
  last?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="flex gap-5">
      <div className="flex flex-col items-center">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-slate-950 text-sm font-bold text-white shadow-sm">
          {step}
        </div>
        {!last && <div className="mt-2 w-px flex-1 bg-slate-200" />}
      </div>

      <div className="mb-2 flex-1 pb-4">
        <div className="mb-4 flex items-center gap-2">
          <Icon className="size-5 text-slate-400" />
          <h2 className="text-base font-bold text-slate-900">{title}</h2>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-950/5">
          {children}

          {href && (
            <div className="mt-5 border-t border-slate-100 pt-5">
              <Link
                href={href}
                className={cn(
                  buttonVariants({ variant: 'outline', size: 'sm' }),
                  'gap-1.5',
                )}
              >
                {linkLabel ?? 'Abrir configurações'}
                <ArrowRight className="size-3.5" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function SubStep({
  n,
  title,
  children,
}: {
  n: string
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
      <div className="mb-2 flex items-center gap-2">
        <span className="rounded-md bg-slate-200 px-1.5 py-0.5 text-xs font-bold text-slate-600">
          {n}
        </span>
        <span className="text-sm font-semibold text-slate-800">{title}</span>
      </div>
      {children}
    </div>
  )
}

function MessageExample({
  event,
  description,
  template,
}: {
  event: string
  description: string
  template: string
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200">
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2.5">
        <span className="text-sm font-semibold text-slate-800">{event}</span>
        <span className="text-xs text-slate-400">{description}</span>
      </div>
      <div className="bg-[#e5ddd5] p-4">
        <div className="max-w-sm rounded-lg bg-white px-3 py-2 shadow-sm">
          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-800">
            {template}
          </pre>
          <span className="mt-1 block text-right text-[10px] text-slate-400">✓✓</span>
        </div>
      </div>
    </div>
  )
}

function ChatPreview({
  title,
  messages,
}: {
  title: string
  messages: Array<{ from: 'bot' | 'user'; message: string; time?: string }>
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200">
      <div className="flex items-center gap-2 bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white">
        <Smartphone className="size-4 shrink-0" />
        {title}
      </div>
      <div className="space-y-3 bg-[#e5ddd5] p-4">
        {messages.map((msg, i) => (
          <ChatBubble key={i} {...msg} />
        ))}
      </div>
    </div>
  )
}

function ChatBubble({
  from,
  message,
  time,
}: {
  from: 'bot' | 'user'
  message: string
  time?: string
}) {
  return (
    <div className={cn('flex', from === 'user' ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[85%] rounded-lg px-3 py-2 shadow-sm',
          from === 'bot' ? 'bg-white text-slate-800' : 'bg-emerald-500 text-white',
        )}
      >
        <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{message}</pre>
        {time && (
          <span
            className={cn(
              'mt-0.5 block text-right text-[10px]',
              from === 'bot' ? 'text-slate-400' : 'text-emerald-100',
            )}
          >
            {time} {from === 'user' && '✓✓'}
          </span>
        )}
      </div>
    </div>
  )
}

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50 p-4">
      <Info className="mt-0.5 size-4 shrink-0 text-blue-500" />
      <p className="text-sm text-blue-800">{children}</p>
    </div>
  )
}

function StatusBadge({ color, label }: { color: 'emerald' | 'amber' | 'red'; label: string }) {
  const colors = {
    emerald: 'bg-emerald-100 text-emerald-700',
    amber: 'bg-amber-100 text-amber-700',
    red: 'bg-red-100 text-red-700',
  }
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', colors[color])}>
      {label}
    </span>
  )
}
