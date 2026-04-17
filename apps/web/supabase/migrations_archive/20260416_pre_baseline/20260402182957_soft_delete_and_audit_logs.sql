alter table public.branches
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references public.profiles (id);

alter table public.employees
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references public.profiles (id);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  actor_user_id uuid references public.profiles (id) on delete set null,
  actor_name text,
  actor_email text,
  entity_type text not null,
  entity_id uuid,
  action text not null,
  summary text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists audit_logs_company_created_at_idx
  on public.audit_logs (company_id, created_at desc);

create index if not exists audit_logs_entity_idx
  on public.audit_logs (entity_type, entity_id);

create index if not exists branches_company_deleted_at_idx
  on public.branches (company_id, deleted_at);

create index if not exists employees_company_deleted_at_idx
  on public.employees (company_id, deleted_at);

alter table public.audit_logs enable row level security;

drop policy if exists "Owners and admins can view audit logs" on public.audit_logs;
create policy "Owners and admins can view audit logs"
on public.audit_logs
for select
to authenticated
using (
  exists (
    select 1
    from public.companies
    where companies.id = audit_logs.company_id
      and companies.owner_id = auth.uid()
  )
  or (
    auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'
    and nullif(auth.jwt() -> 'app_metadata' ->> 'company_id', '')::uuid = audit_logs.company_id
  )
);

drop policy if exists "Authenticated users can create audit logs for own company" on public.audit_logs;
create policy "Authenticated users can create audit logs for own company"
on public.audit_logs
for insert
to authenticated
with check (
  (
    actor_user_id is null
    or actor_user_id = auth.uid()
  )
  and (
    exists (
      select 1
      from public.companies
      where companies.id = audit_logs.company_id
        and companies.owner_id = auth.uid()
    )
    or nullif(auth.jwt() -> 'app_metadata' ->> 'company_id', '')::uuid = audit_logs.company_id
  )
);
