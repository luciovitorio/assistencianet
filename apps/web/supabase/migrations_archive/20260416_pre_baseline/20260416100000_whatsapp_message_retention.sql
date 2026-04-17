-- Retencao de mensagens do WhatsApp.
-- Padrao: 30 dias. A conversa permanece para operacao, mas o conteudo
-- bruto antigo e o preview sao removidos do banco.

create extension if not exists pg_cron;

alter table public.whatsapp_automation_settings
  add column if not exists message_retention_days integer not null default 30;

alter table public.whatsapp_automation_settings
  drop constraint if exists wha_message_retention_days_check;

alter table public.whatsapp_automation_settings
  add constraint wha_message_retention_days_check
  check (message_retention_days between 1 and 365);

create or replace function public.cleanup_expired_whatsapp_messages()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer;
begin
  with deleted_messages as (
    delete from public.whatsapp_messages message
    where message.created_at < (
      now() - make_interval(
        days => coalesce(
          (
            select settings.message_retention_days
            from public.whatsapp_automation_settings settings
            where settings.company_id = message.company_id
          ),
          30
        )
      )
    )
    returning message.id
  )
  select count(*) into deleted_count
  from deleted_messages;

  update public.whatsapp_conversations conversation
  set
    last_message_preview = null,
    unread_count = 0
  where not exists (
    select 1
    from public.whatsapp_messages message
    where message.conversation_id = conversation.id
  )
  and (
    conversation.last_message_at is null
    or conversation.last_message_at < (
      now() - make_interval(
        days => coalesce(
          (
            select settings.message_retention_days
            from public.whatsapp_automation_settings settings
            where settings.company_id = conversation.company_id
          ),
          30
        )
      )
    )
  );

  return deleted_count;
end;
$$;

revoke all on function public.cleanup_expired_whatsapp_messages() from public;
grant execute on function public.cleanup_expired_whatsapp_messages() to service_role;

select cron.unschedule('cleanup-expired-whatsapp-messages')
where exists (
  select 1
  from cron.job
  where jobname = 'cleanup-expired-whatsapp-messages'
);

select cron.schedule(
  'cleanup-expired-whatsapp-messages',
  '15 3 * * *',
  $$select public.cleanup_expired_whatsapp_messages();$$
);
