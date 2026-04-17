alter table public.whatsapp_automation_settings
  drop constraint if exists whatsapp_automation_settings_provider_check;

alter table public.whatsapp_automation_settings
  add column if not exists evolution_base_url text not null default 'http://127.0.0.1:8080',
  add column if not exists evolution_api_key text,
  add column if not exists evolution_instance_name text,
  add column if not exists evolution_webhook_url text;

alter table public.whatsapp_automation_settings
  add constraint whatsapp_automation_settings_provider_check
  check (provider in ('whatsapp_cloud_api', 'evolution_api'));

alter table public.whatsapp_automation_settings
  add constraint whatsapp_automation_settings_evolution_base_url_check
  check (evolution_base_url ~ '^https?://.+');

alter table public.whatsapp_automation_settings
  add constraint whatsapp_automation_settings_evolution_instance_name_check
  check (
    evolution_instance_name is null
    or evolution_instance_name ~ '^[A-Za-z0-9_-]{1,80}$'
  );
