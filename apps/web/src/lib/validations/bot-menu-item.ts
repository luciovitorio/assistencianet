import * as z from 'zod'

export const HANDLER_TYPES = ['check_os', 'human_handoff', 'info', 'submenu', 'url'] as const
export type HandlerType = (typeof HANDLER_TYPES)[number]

export const HANDLER_TYPE_LABELS: Record<HandlerType, string> = {
  check_os: 'Consultar OS',
  human_handoff: 'Falar com atendente',
  info: 'Mensagem informativa',
  submenu: 'Sub-menu',
  url: 'Link / URL',
}

export const botMenuItemSchema = z
  .object({
    parent_id: z.string().uuid().nullable(),
    position: z.number().int().min(1).max(99),
    label: z.string().min(1, 'Informe o nome do item').max(60, 'Máximo 60 caracteres'),
    emoji: z.string().max(8).nullable(),
    handler_type: z.enum(HANDLER_TYPES),
    handler_config: z.record(z.string(), z.unknown()),
    enabled: z.boolean(),
  })
  .superRefine((val, ctx) => {
    if (val.handler_type === 'info') {
      const msg = val.handler_config?.message
      if (!msg || String(msg).trim() === '') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['handler_config', 'message'],
          message: 'Informe a mensagem para este item',
        })
      }
    }
    if (val.handler_type === 'url') {
      const url = val.handler_config?.url
      if (!url || String(url).trim() === '') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['handler_config', 'url'],
          message: 'Informe a URL para este item',
        })
      }
    }
  })

export type BotMenuItemSchema = z.infer<typeof botMenuItemSchema>
