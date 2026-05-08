'use client'

import * as React from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { InputField } from '@/components/ui/input-field'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { botTriggersSchema, type BotTriggersSchema } from '@/lib/validations/bot-triggers'
import { saveBotTriggers, type BotTriggerSettings } from '@/app/actions/bot-triggers'
import { BotTriggersPreview } from './bot-chat-preview'

// ── BooleanField (toggle com checkbox) ──────────────────────

function TriggerToggle({
  checked,
  label,
  description,
  onCheckedChange,
}: {
  checked: boolean
  label: string
  description: string
  onCheckedChange: (v: boolean) => void
}) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm',
      )}
    >
      <Checkbox
        checked={checked}
        onCheckedChange={(v) => onCheckedChange(v === true)}
        className="mt-0.5"
      />
      <span className="space-y-1">
        <span className="block text-sm font-semibold text-slate-900">{label}</span>
        <span className="block text-xs leading-5 text-slate-500">{description}</span>
      </span>
    </label>
  )
}

// ── Campo de mensagem condicional por provider ───────────────

const VARS = 'Variáveis: {{cliente_nome}}, {{empresa_nome}}, {{os_numero}}, {{equipamento}}'

function MessageField({
  isEvolution,
  label,
  evolutionField,
  metaField,
  metaPlaceholder,
  extraVars,
}: {
  isEvolution: boolean
  label: string
  evolutionField: React.ReactNode
  metaField: React.ReactNode
  metaPlaceholder?: string
  extraVars?: string
}) {
  if (isEvolution) {
    return (
      <div className="space-y-1.5">
        <Label>{label}</Label>
        {evolutionField}
        <p className="text-xs text-muted-foreground">
          {VARS}{extraVars ? `, ${extraVars}` : ''}
        </p>
      </div>
    )
  }
  return <>{metaField}</>
}

// ── Componente principal ─────────────────────────────────────

type Props = {
  initialSettings: BotTriggerSettings
}

const CONTROL_CLASS =
  'h-11 rounded-xl border-foreground/10 bg-background shadow-sm shadow-slate-950/5 placeholder:text-muted-foreground/70'

export function BotTriggersForm({ initialSettings }: Props) {
  const isEvolution = initialSettings.provider === 'evolution_api'

  const {
    register,
    handleSubmit,
    control,
    formState: { isDirty, isSubmitting },
  } = useForm<BotTriggersSchema>({
    resolver: zodResolver(botTriggersSchema),
    defaultValues: {
      notify_inbound_message: initialSettings.notify_inbound_message,
      notify_os_created: initialSettings.notify_os_created,
      message_os_created: initialSettings.message_os_created ?? '',
      template_os_created: initialSettings.template_os_created ?? '',
      notify_estimate_ready: initialSettings.notify_estimate_ready,
      message_estimate_ready: initialSettings.message_estimate_ready ?? '',
      template_estimate_ready: initialSettings.template_estimate_ready ?? '',
      notify_service_completed: initialSettings.notify_service_completed,
      message_service_completed: initialSettings.message_service_completed ?? '',
      template_service_completed: initialSettings.template_service_completed ?? '',
      notify_satisfaction_survey: initialSettings.notify_satisfaction_survey,
      message_satisfaction_survey: initialSettings.message_satisfaction_survey ?? '',
      template_satisfaction_survey: initialSettings.template_satisfaction_survey ?? '',
    },
  })

  const watchedValues = useWatch({ control }) as BotTriggersSchema

  const onSubmit = async (data: BotTriggersSchema) => {
    const result = await saveBotTriggers(data)
    if ('error' in result) toast.error(result.error)
    else toast.success('Gatilhos salvos.')
  }

  if (!initialSettings.configured) {
    return (
      <p className="text-sm text-muted-foreground">
        Configure a automação do WhatsApp antes de definir os gatilhos.
      </p>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Gatilhos operacionais</h2>
          <p className="text-sm text-muted-foreground">
            Defina quais eventos disparam mensagens automáticas para o cliente via WhatsApp.
          </p>
        </div>
        <Button type="submit" disabled={!isDirty || isSubmitting}>
          {isSubmitting ? 'Salvando…' : 'Salvar gatilhos'}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Coluna esquerda: cards de configuração */}
        <div className="space-y-4">
          {/* Bot ativo */}
          <Card>
            <CardContent className="pt-6">
              <Controller
                control={control}
                name="notify_inbound_message"
                render={({ field }) => (
                  <TriggerToggle
                    checked={field.value}
                    label="Bot ativo"
                    description="Quando ativado, o bot responde automaticamente quem mandar mensagem no WhatsApp."
                    onCheckedChange={field.onChange}
                  />
                )}
              />
            </CardContent>
          </Card>

          {/* Gatilhos por evento */}
          {([
            {
              notify: 'notify_os_created' as const,
              label: 'OS aberta',
              description: 'Enviar confirmação quando a OS for registrada no sistema.',
              msgField: 'message_os_created' as const,
              tplField: 'template_os_created' as const,
              tplPlaceholder: 'os_aberta',
              msgLabel: 'Mensagem — OS aberta',
              tplLabel: 'Template Meta — OS aberta',
            },
            {
              notify: 'notify_estimate_ready' as const,
              label: 'Orçamento pronto',
              description: 'Avisar quando o orçamento estiver disponível para aprovação.',
              msgField: 'message_estimate_ready' as const,
              tplField: 'template_estimate_ready' as const,
              tplPlaceholder: 'orcamento_pronto',
              msgLabel: 'Mensagem — Orçamento pronto',
              tplLabel: 'Template Meta — Orçamento',
              extraVars: '{{valor_orcamento}}',
            },
            {
              notify: 'notify_service_completed' as const,
              label: 'Serviço concluído',
              description: 'Avisar quando o equipamento estiver pronto para retirada.',
              msgField: 'message_service_completed' as const,
              tplField: 'template_service_completed' as const,
              tplPlaceholder: 'servico_concluido',
              msgLabel: 'Mensagem — Serviço concluído',
              tplLabel: 'Template Meta — Conclusão',
            },
            {
              notify: 'notify_satisfaction_survey' as const,
              label: 'Pesquisa de satisfação',
              description: 'Enviar pesquisa de avaliação após a conclusão da OS.',
              msgField: 'message_satisfaction_survey' as const,
              tplField: 'template_satisfaction_survey' as const,
              tplPlaceholder: 'pesquisa_satisfacao',
              msgLabel: 'Mensagem — Pesquisa',
              tplLabel: 'Template Meta — Satisfação',
            },
          ] as const).map((trigger) => (
            <Card key={trigger.notify}>
              <CardContent className="grid gap-4 pt-6 md:grid-cols-2">
                <Controller
                  control={control}
                  name={trigger.notify}
                  render={({ field }) => (
                    <TriggerToggle
                      checked={field.value}
                      label={trigger.label}
                      description={trigger.description}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
                <MessageField
                  isEvolution={isEvolution}
                  label={trigger.msgLabel}
                  extraVars={'extraVars' in trigger ? trigger.extraVars : undefined}
                  evolutionField={
                    <Textarea
                      rows={3}
                      className="resize-y font-mono text-sm"
                      {...register(trigger.msgField)}
                    />
                  }
                  metaField={
                    <InputField
                      label={trigger.tplLabel}
                      placeholder={trigger.tplPlaceholder}
                      className={CONTROL_CLASS}
                      {...register(trigger.tplField)}
                    />
                  }
                />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Coluna direita: preview ao vivo */}
        <div className="hidden lg:block">
          <div className="sticky top-4" style={{ height: '560px' }}>
            <BotTriggersPreview triggers={watchedValues} />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={!isDirty || isSubmitting}>
          {isSubmitting ? 'Salvando…' : 'Salvar gatilhos'}
        </Button>
      </div>
    </form>
  )
}
