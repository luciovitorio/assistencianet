'use client'

import * as React from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { saveBotMessages } from '@/app/actions/bot-messages'
import { type BotMessages } from '@/lib/whatsapp/bot-messages'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

// ── Tipos e helpers ──────────────────────────────────────────

type FieldDef = {
  key: keyof BotMessages
  label: string
  hint?: string
}

type SectionDef = {
  title: string
  description: string
  fields: FieldDef[]
}

const VARS_HINT = 'Variáveis: {{cliente.nome}}, {{empresa.nome}}, {{filial.nome}}'
const OS_VARS_HINT = 'Variáveis: {{os_numero}}'

const SECTIONS: SectionDef[] = [
  {
    title: 'Menu principal',
    description: 'Mensagens exibidas quando o cliente inicia ou retorna ao menu.',
    fields: [
      {
        key: 'menu_greeting',
        label: 'Saudação',
        hint: VARS_HINT,
      },
      {
        key: 'menu_question',
        label: 'Pergunta do menu',
        hint: 'Exibida logo após a saudação, antes das opções.',
      },
      {
        key: 'menu_footer',
        label: 'Rodapé do menu',
        hint: 'Instrução de como responder, exibida após as opções.',
      },
      {
        key: 'more_help',
        label: 'Reexibição do menu (mid-sessão)',
        hint: 'Exibido antes das opções quando o bot reapresenta o menu no meio de uma conversa (ex: após resposta informativa ou consulta de OS).',
      },
    ],
  },
  {
    title: 'Submenus',
    description: 'Usados quando um item do menu abre um nível interno de opções.',
    fields: [
      { key: 'submenu_header', label: 'Cabeçalho do submenu' },
      { key: 'submenu_footer', label: 'Rodapé do submenu' },
    ],
  },
  {
    title: 'Consulta de OS',
    description: 'Mensagens do fluxo de consulta de ordens de serviço.',
    fields: [
      {
        key: 'client_not_found',
        label: 'Cliente não encontrado',
        hint: 'Quando o número do cliente não está cadastrado.',
      },
      {
        key: 'no_open_orders',
        label: 'Sem OS em aberto',
        hint: 'Quando o cliente está cadastrado mas não tem OSs em aberto.',
      },
      {
        key: 'os_not_found',
        label: 'OS não encontrada',
        hint: `Quando o número digitado não corresponde a nenhuma OS. ${OS_VARS_HINT}`,
      },
      {
        key: 'os_list_more_footer',
        label: 'Rodapé da lista (com mais OSs)',
        hint: 'Exibido quando há mais OSs do que o limite mostrado.',
      },
      {
        key: 'os_list_footer',
        label: 'Rodapé da lista',
        hint: 'Exibido quando todas as OSs do cliente foram listadas.',
      },
    ],
  },
  {
    title: 'Atendimento humano',
    description: 'Mensagens usadas quando o cliente solicita falar com um atendente.',
    fields: [
      {
        key: 'ask_branch',
        label: 'Escolha de filial',
        hint: 'Pergunta qual filial o cliente deseja, quando há mais de uma.',
      },
      { key: 'ask_branch_footer', label: 'Instrução de escolha da filial' },
      {
        key: 'handoff_confirmation',
        label: 'Confirmação de transferência',
        hint: 'Enviada ao cliente após o bot transferir para um atendente.',
      },
    ],
  },
  {
    title: 'Orçamento',
    description: 'Mensagens do fluxo de aprovação ou recusa de orçamento.',
    fields: [
      {
        key: 'estimate_approved',
        label: 'Orçamento aprovado',
        hint: OS_VARS_HINT,
      },
      {
        key: 'estimate_rejected',
        label: 'Orçamento recusado',
        hint: OS_VARS_HINT,
      },
      {
        key: 'estimate_error',
        label: 'Erro ao registrar resposta',
        hint: 'Exibido quando não foi possível registrar a aprovação/recusa.',
      },
    ],
  },
  {
    title: 'Avaliação',
    description: 'Mensagens da pesquisa de satisfação pós-atendimento.',
    fields: [
      {
        key: 'rating_request',
        label: 'Pedido de avaliação',
        hint: 'Deve conter as opções de nota (1 a 5). Use \\n para quebrar linha.',
      },
      { key: 'rating_skip', label: 'Cliente não quer avaliar' },
      { key: 'rating_thanks', label: 'Agradecimento pela avaliação' },
    ],
  },
  {
    title: 'Respostas inválidas',
    description:
      'Mensagens enviadas quando o cliente digita algo fora das opções esperadas. Após 3 tentativas, o bot transfere automaticamente para um atendente.',
    fields: [
      {
        key: 'invalid_max_attempts',
        label: 'Limite de tentativas atingido',
        hint: 'Enviada antes de transferir para atendente após 3 erros seguidos.',
      },
      { key: 'invalid_os_number', label: 'Número de OS inválido' },
      { key: 'invalid_branch', label: 'Escolha de filial inválida' },
      { key: 'invalid_estimate', label: 'Resposta de orçamento inválida' },
      { key: 'invalid_rating_consent', label: 'Resposta de avaliação inválida' },
      { key: 'invalid_rating', label: 'Nota inválida (fora de 1 a 5)' },
      { key: 'invalid_menu', label: 'Opção de menu inválida' },
    ],
  },
]

// ── Componente ───────────────────────────────────────────────

type Props = {
  initialMessages: BotMessages
}

export function BotMessagesForm({ initialMessages }: Props) {
  const { register, handleSubmit, formState: { isDirty, isSubmitting } } = useForm<BotMessages>({
    defaultValues: initialMessages,
  })

  const onSubmit = async (data: BotMessages) => {
    const result = await saveBotMessages(data)
    if ('error' in result) {
      toast.error(result.error)
    } else {
      toast.success('Mensagens do bot salvas.')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Mensagens do bot</h2>
          <p className="text-sm text-muted-foreground">
            Personalize todos os textos enviados automaticamente pelo bot.
          </p>
        </div>
        <Button type="submit" disabled={!isDirty || isSubmitting}>
          {isSubmitting ? 'Salvando…' : 'Salvar mensagens'}
        </Button>
      </div>

      {SECTIONS.map((section) => (
        <Card key={section.title}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{section.title}</CardTitle>
            <CardDescription>{section.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {section.fields.map((field) => (
              <div key={field.key} className="space-y-1.5">
                <Label htmlFor={field.key}>{field.label}</Label>
                <Textarea
                  id={field.key}
                  rows={3}
                  className="resize-y font-mono text-sm"
                  {...register(field.key)}
                />
                {field.hint && (
                  <p className="text-xs text-muted-foreground">{field.hint}</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      <div className="flex justify-end">
        <Button type="submit" disabled={!isDirty || isSubmitting}>
          {isSubmitting ? 'Salvando…' : 'Salvar mensagens'}
        </Button>
      </div>
    </form>
  )
}
