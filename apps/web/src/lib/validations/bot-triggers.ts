import * as z from 'zod'

export const botTriggersSchema = z.object({
  notify_inbound_message: z.boolean(),
  notify_os_created: z.boolean(),
  message_os_created: z.string().nullable(),
  template_os_created: z.string().nullable(),
  notify_estimate_ready: z.boolean(),
  message_estimate_ready: z.string().nullable(),
  template_estimate_ready: z.string().nullable(),
  notify_service_completed: z.boolean(),
  message_service_completed: z.string().nullable(),
  template_service_completed: z.string().nullable(),
  notify_satisfaction_survey: z.boolean(),
  message_satisfaction_survey: z.string().nullable(),
  template_satisfaction_survey: z.string().nullable(),
})

export type BotTriggersSchema = z.infer<typeof botTriggersSchema>
