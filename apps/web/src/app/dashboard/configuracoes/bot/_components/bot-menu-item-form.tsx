'use client'

import * as React from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Info } from 'lucide-react'
import { toast } from 'sonner'
import {
  createBotMenuItem,
  updateBotMenuItem,
  type BotMenuItemRow,
} from '@/app/actions/bot-menu'
import { Button } from '@/components/ui/button'
import { InputField } from '@/components/ui/input-field'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  botMenuItemSchema,
  HANDLER_TYPES,
  HANDLER_TYPE_LABELS,
  type BotMenuItemSchema,
  type HandlerType,
} from '@/lib/validations/bot-menu-item'

const CTRL =
  'h-11 rounded-xl border-foreground/10 bg-background shadow-sm shadow-slate-950/5 placeholder:text-muted-foreground/70'

const TEMPLATE_VARS = [
  { token: '{{cliente.nome}}', label: 'Nome do cliente' },
  { token: '{{empresa.nome}}', label: 'Nome da empresa' },
  { token: '{{filial.nome}}', label: 'Nome da filial' },
]

interface Props {
  parentId: string | null
  nextPosition: number
  editing?: BotMenuItemRow
  onSuccess: () => void
  onCancel: () => void
}

export function BotMenuItemForm({ parentId, nextPosition, editing, onSuccess, onCancel }: Props) {
  const [isPending, startTransition] = React.useTransition()

  const defaultValues = editing
    ? {
        parent_id: editing.parent_id,
        position: editing.position,
        label: editing.label,
        emoji: editing.emoji,
        handler_type: editing.handler_type as HandlerType,
        handler_config: editing.handler_config as Record<string, unknown>,
        enabled: editing.enabled,
      }
    : {
        parent_id: parentId,
        position: nextPosition,
        label: '',
        emoji: null as string | null,
        handler_type: 'info' as HandlerType,
        handler_config: {} as Record<string, unknown>,
        enabled: true,
      }

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors },
  } = useForm<BotMenuItemSchema>({
    resolver: zodResolver(botMenuItemSchema),
    defaultValues,
  })

  const handlerType = watch('handler_type')

  const onSubmit = (data: BotMenuItemSchema) => {
    startTransition(async () => {
      const result = editing
        ? await updateBotMenuItem(editing.id, data)
        : await createBotMenuItem(data)

      if ('error' in result) {
        toast.error(result.error)
        return
      }

      toast.success(editing ? 'Item atualizado.' : 'Item criado.')
      onSuccess()
    })
  }

  const insertVar = (token: string) => {
    const current = String(watch('handler_config.message') ?? '')
    setValue('handler_config', {
      ...(watch('handler_config') as Record<string, unknown>),
      message: current + token,
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Tipo */}
      <div className="space-y-1.5">
        <Label>Tipo</Label>
        <Controller
          control={control}
          name="handler_type"
          render={({ field }) => (
            <Select
              value={field.value}
              onValueChange={(v) => {
                field.onChange(v)
                setValue('handler_config', {})
              }}
            >
              <SelectTrigger className={CTRL}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="min-w-55">
                {HANDLER_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {HANDLER_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      {/* Label */}
      <InputField
        label="Nome do item"
        placeholder="ex: Verificar minha OS"
        className={CTRL}
        error={errors.label?.message}
        {...register('label')}
      />

      {/* Emoji */}
      <InputField
        label="Emoji (opcional)"
        placeholder="ex: 1️⃣"
        className={CTRL}
        {...register('emoji')}
      />

      {/* Campos condicionais */}
      {handlerType === 'info' && (
        <div className="space-y-1.5">
          <Label>Mensagem</Label>
          <Textarea
            placeholder="Digite a mensagem que o bot vai enviar..."
            rows={4}
            className="rounded-xl border-foreground/10 bg-background shadow-sm shadow-slate-950/5 placeholder:text-muted-foreground/70"
            {...register('handler_config.message')}
          />
          {errors.handler_config?.message && (
            <p className="text-xs text-destructive">
              {(errors.handler_config.message as { message?: string })?.message}
            </p>
          )}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {TEMPLATE_VARS.map(({ token, label }) => (
              <button
                key={token}
                type="button"
                onClick={() => insertVar(token)}
                className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-100"
              >
                <Info className="size-3" />
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {handlerType === 'url' && (
        <InputField
          label="URL"
          placeholder="https://..."
          type="url"
          className={CTRL}
          error={(errors.handler_config?.url as { message?: string })?.message}
          {...register('handler_config.url')}
        />
      )}

      {handlerType === 'submenu' && (
        <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
          Após salvar, adicione os itens filhos diretamente neste sub-menu.
        </p>
      )}

      {/* Posição */}
      <InputField
        label="Posição"
        type="number"
        min={1}
        max={99}
        className={CTRL}
        error={errors.position?.message}
        {...register('position', { valueAsNumber: true })}
      />

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Salvando...' : editing ? 'Salvar alterações' : 'Adicionar'}
        </Button>
      </div>
    </form>
  )
}
