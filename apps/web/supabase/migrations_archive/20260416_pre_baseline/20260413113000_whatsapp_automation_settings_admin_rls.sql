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
  or exists (
    select 1
    from public.employees
    where employees.company_id = whatsapp_automation_settings.company_id
      and employees.user_id = auth.uid()
      and employees.role = 'admin'
      and employees.active = true
      and employees.deleted_at is null
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
  or exists (
    select 1
    from public.employees
    where employees.company_id = whatsapp_automation_settings.company_id
      and employees.user_id = auth.uid()
      and employees.role = 'admin'
      and employees.active = true
      and employees.deleted_at is null
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
  or exists (
    select 1
    from public.employees
    where employees.company_id = whatsapp_automation_settings.company_id
      and employees.user_id = auth.uid()
      and employees.role = 'admin'
      and employees.active = true
      and employees.deleted_at is null
  )
)
with check (
  exists (
    select 1
    from public.companies
    where companies.id = whatsapp_automation_settings.company_id
      and companies.owner_id = auth.uid()
  )
  or exists (
    select 1
    from public.employees
    where employees.company_id = whatsapp_automation_settings.company_id
      and employees.user_id = auth.uid()
      and employees.role = 'admin'
      and employees.active = true
      and employees.deleted_at is null
  )
);
