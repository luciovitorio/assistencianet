create table if not exists public.suppliers (
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

create index if not exists suppliers_company_deleted_at_idx
  on public.suppliers (company_id, deleted_at);

create index if not exists suppliers_company_origin_branch_idx
  on public.suppliers (company_id, origin_branch_id)
  where deleted_at is null;

create index if not exists suppliers_deleted_by_idx
  on public.suppliers (deleted_by);

create unique index if not exists suppliers_active_document_unique_idx
  on public.suppliers (company_id, regexp_replace(document, '\D', '', 'g'))
  where deleted_at is null
    and nullif(regexp_replace(document, '\D', '', 'g'), '') is not null;

alter table public.suppliers enable row level security;

drop policy if exists suppliers_select on public.suppliers;
create policy suppliers_select
on public.suppliers
for select
to authenticated
using (
  exists (
    select 1
    from public.companies
    where companies.id = suppliers.company_id
      and companies.owner_id = (select auth.uid())
  )
  or nullif((select auth.jwt()) -> 'app_metadata' ->> 'company_id', '')::uuid = suppliers.company_id
  or exists (
    select 1
    from public.employees
    where employees.user_id = (select auth.uid())
      and employees.company_id = suppliers.company_id
      and employees.deleted_at is null
  )
);

drop policy if exists suppliers_insert on public.suppliers;
create policy suppliers_insert
on public.suppliers
for insert
to authenticated
with check (
  exists (
    select 1
    from public.companies
    where companies.id = suppliers.company_id
      and companies.owner_id = (select auth.uid())
  )
  or nullif((select auth.jwt()) -> 'app_metadata' ->> 'company_id', '')::uuid = suppliers.company_id
  or exists (
    select 1
    from public.employees
    where employees.user_id = (select auth.uid())
      and employees.company_id = suppliers.company_id
      and employees.deleted_at is null
  )
);

drop policy if exists suppliers_update on public.suppliers;
create policy suppliers_update
on public.suppliers
for update
to authenticated
using (
  exists (
    select 1
    from public.companies
    where companies.id = suppliers.company_id
      and companies.owner_id = (select auth.uid())
  )
  or nullif((select auth.jwt()) -> 'app_metadata' ->> 'company_id', '')::uuid = suppliers.company_id
  or exists (
    select 1
    from public.employees
    where employees.user_id = (select auth.uid())
      and employees.company_id = suppliers.company_id
      and employees.deleted_at is null
  )
);

drop policy if exists suppliers_delete on public.suppliers;
create policy suppliers_delete
on public.suppliers
for delete
to authenticated
using (
  exists (
    select 1
    from public.companies
    where companies.id = suppliers.company_id
      and companies.owner_id = (select auth.uid())
  )
  or (
    (select auth.jwt()) -> 'app_metadata' ->> 'role' = 'admin'
    and nullif((select auth.jwt()) -> 'app_metadata' ->> 'company_id', '')::uuid = suppliers.company_id
  )
);

drop trigger if exists suppliers_set_updated_at on public.suppliers;
create trigger suppliers_set_updated_at
before update on public.suppliers
for each row
execute function public.set_updated_at();
