alter table public.whatsapp_automation_settings
  add column if not exists notify_inbound_message boolean not null default false,
  add column if not exists message_inbound_auto_reply text,
  add column if not exists message_os_created text,
  add column if not exists message_estimate_ready text,
  add column if not exists message_service_completed text,
  add column if not exists message_satisfaction_survey text;

alter table public.whatsapp_automation_settings
  drop constraint if exists whatsapp_automation_settings_message_lengths_check;

alter table public.whatsapp_automation_settings
  add constraint whatsapp_automation_settings_message_lengths_check
  check (
    (message_inbound_auto_reply is null or char_length(message_inbound_auto_reply) <= 2000)
    and (message_os_created is null or char_length(message_os_created) <= 2000)
    and (message_estimate_ready is null or char_length(message_estimate_ready) <= 2000)
    and (message_service_completed is null or char_length(message_service_completed) <= 2000)
    and (message_satisfaction_survey is null or char_length(message_satisfaction_survey) <= 2000)
  );

update public.whatsapp_automation_settings
set
  notify_inbound_message = true,
  message_inbound_auto_reply = coalesce(
    message_inbound_auto_reply,
    'Olá! Recebemos sua mensagem na {{empresa_nome}}. Em breve nossa equipe vai te responder por aqui. Se já tiver uma OS, envie o número do atendimento.'
  )
where provider = 'evolution_api'
  and enabled = true;
