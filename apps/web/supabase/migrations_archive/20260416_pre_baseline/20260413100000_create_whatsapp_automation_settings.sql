create table if not exists public.whatsapp_automation_settings (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  enabled boolean not null default false,
  provider text not null default 'whatsapp_cloud_api',
  base_url text not null default 'graph.facebook.com',
  graph_api_version text not null default 'v16.0',
  app_id text,
  app_secret text,
  phone_number_id text,
  business_account_id text,
  access_token text,
  webhook_verify_token text,
  default_country_code text not null default '55',
  templates_language text not null default 'pt_BR',
  notify_os_created boolean not null default false,
  notify_estimate_ready boolean not null default false,
  notify_service_completed boolean not null default false,
  notify_satisfaction_survey boolean not null default false,
  template_os_created text,
  template_estimate_ready text,
  template_service_completed text,
  template_satisfaction_survey text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint whatsapp_automation_settings_company_unique unique (company_id),
  constraint whatsapp_automation_settings_provider_check check (provider = 'whatsapp_cloud_api'),
  constraint whatsapp_automation_settings_base_url_check check (base_url <> ''),
  constraint whatsapp_automation_settings_graph_version_check check (graph_api_version ~ '^v[0-9]+\\.[0-9]+$'),
  constraint whatsapp_automation_settings_country_code_check check (default_country_code ~ '^[0-9]{1,4}$'),
  constraint whatsapp_automation_settings_language_check check (templates_language ~ '^[a-z]{2}(_[A-Z]{2})?$')
);

create index if not exists whatsapp_automation_settings_company_idx
  on public.whatsapp_automation_settings (company_id);

create index if not exists whatsapp_automation_settings_enabled_idx
  on public.whatsapp_automation_settings (enabled)
  where enabled = true;

create index if not exists whatsapp_automation_settings_verify_token_idx
  on public.whatsapp_automation_settings (webhook_verify_token)
  where webhook_verify_token is not null;

drop trigger if exists whatsapp_automation_settings_set_updated_at on public.whatsapp_automation_settings;
create trigger whatsapp_automation_settings_set_updated_at
before update on public.whatsapp_automation_settings
for each row
execute function public.set_updated_at();

alter table public.whatsapp_automation_settings enable row level security;

drop policy if exists "Owners and admins can view whatsapp automation settings" on public.whatsapp_automation_settings;
create policy "Owners and admins can view whatsapp automation settings"
on public.whatsapp_automation_settings
for select
to authenticated
using (
  exists (
    select 1
    from public.companies
    where companies.id = whatsapp_automation_settings.company_id
      and companies.owner_id = auth.uid()
  )
  or (
    auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'
    and nullif(auth.jwt() -> 'app_metadata' ->> 'company_id', '')::uuid = whatsapp_automation_settings.company_id
  )
);

drop policy if exists "Owners and admins can insert whatsapp automation settings" on public.whatsapp_automation_settings;
create policy "Owners and admins can insert whatsapp automation settings"
on public.whatsapp_automation_settings
for insert
to authenticated
with check (
  exists (
    select 1
    from public.companies
    where companies.id = whatsapp_automation_settings.company_id
      and companies.owner_id = auth.uid()
  )
  or (
    auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'
    and nullif(auth.jwt() -> 'app_metadata' ->> 'company_id', '')::uuid = whatsapp_automation_settings.company_id
  )
);

drop policy if exists "Owners and admins can update whatsapp automation settings" on public.whatsapp_automation_settings;
create policy "Owners and admins can update whatsapp automation settings"
on public.whatsapp_automation_settings
for update
to authenticated
using (
  exists (
    select 1
    from public.companies
    where companies.id = whatsapp_automation_settings.company_id
      and companies.owner_id = auth.uid()
  )
  or (
    auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'
    and nullif(auth.jwt() -> 'app_metadata' ->> 'company_id', '')::uuid = whatsapp_automation_settings.company_id
  )
)
with check (
  exists (
    select 1
    from public.companies
    where companies.id = whatsapp_automation_settings.company_id
      and companies.owner_id = auth.uid()
  )
  or (
    auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'
    and nullif(auth.jwt() -> 'app_metadata' ->> 'company_id', '')::uuid = whatsapp_automation_settings.company_id
  )
);
