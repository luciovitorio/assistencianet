create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  origin_branch_id uuid references public.branches (id) on delete set null,
  name text not null,
  document text,
  phone text,
  email text,
  zip_code text,
  street text,
  number text,
  complement text,
  city text,
  state text,
  address text,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by uuid references public.profiles (id)
);

create index if not exists clients_company_deleted_at_idx
  on public.clients (company_id, deleted_at);

create index if not exists clients_company_origin_branch_idx
  on public.clients (company_id, origin_branch_id)
  where deleted_at is null;

create index if not exists clients_deleted_by_idx
  on public.clients (deleted_by);

create unique index if not exists clients_active_document_unique_idx
  on public.clients (company_id, regexp_replace(document, '\D', '', 'g'))
  where deleted_at is null
    and nullif(regexp_replace(document, '\D', '', 'g'), '') is not null;

alter table public.clients enable row level security;

drop policy if exists clients_select on public.clients;
create policy clients_select
on public.clients
for select
to authenticated
using (
  exists (
    select 1
    from public.companies
    where companies.id = clients.company_id
      and companies.owner_id = (select auth.uid())
  )
  or nullif((select auth.jwt()) -> 'app_metadata' ->> 'company_id', '')::uuid = clients.company_id
  or exists (
    select 1
    from public.employees
    where employees.user_id = (select auth.uid())
      and employees.company_id = clients.company_id
      and employees.deleted_at is null
  )
);

drop policy if exists clients_insert on public.clients;
create policy clients_insert
on public.clients
for insert
to authenticated
with check (
  exists (
    select 1
    from public.companies
    where companies.id = clients.company_id
      and companies.owner_id = (select auth.uid())
  )
  or nullif((select auth.jwt()) -> 'app_metadata' ->> 'company_id', '')::uuid = clients.company_id
  or exists (
    select 1
    from public.employees
    where employees.user_id = (select auth.uid())
      and employees.company_id = clients.company_id
      and employees.deleted_at is null
  )
);

drop policy if exists clients_update on public.clients;
create policy clients_update
on public.clients
for update
to authenticated
using (
  exists (
    select 1
    from public.companies
    where companies.id = clients.company_id
      and companies.owner_id = (select auth.uid())
  )
  or nullif((select auth.jwt()) -> 'app_metadata' ->> 'company_id', '')::uuid = clients.company_id
  or exists (
    select 1
    from public.employees
    where employees.user_id = (select auth.uid())
      and employees.company_id = clients.company_id
      and employees.deleted_at is null
  )
);

drop policy if exists clients_delete on public.clients;
create policy clients_delete
on public.clients
for delete
to authenticated
using (
  exists (
    select 1
    from public.companies
    where companies.id = clients.company_id
      and companies.owner_id = (select auth.uid())
  )
  or (
    (select auth.jwt()) -> 'app_metadata' ->> 'role' = 'admin'
    and nullif((select auth.jwt()) -> 'app_metadata' ->> 'company_id', '')::uuid = clients.company_id
  )
);

drop trigger if exists clients_set_updated_at on public.clients;
create trigger clients_set_updated_at
before update on public.clients
for each row
execute function public.set_updated_at();
