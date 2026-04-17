create table if not exists public.service_order_estimates (
  id uuid primary key default gen_random_uuid(),
  service_order_id uuid not null references public.service_orders (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  version integer not null,
  status text not null default 'rascunho'
    check (status in ('rascunho', 'enviado', 'aprovado', 'recusado', 'substituido')),
  approval_channel text
    check (approval_channel in ('whatsapp', 'verbal', 'balcao', 'telefone', 'outro')),
  subtotal_amount numeric(12, 2) not null default 0,
  discount_amount numeric(12, 2) not null default 0,
  total_amount numeric(12, 2) not null default 0,
  valid_until date,
  sent_at timestamptz,
  approved_at timestamptz,
  rejected_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  deleted_at timestamptz,
  deleted_by uuid references public.profiles (id)
);

create table if not exists public.service_order_estimate_items (
  id uuid primary key default gen_random_uuid(),
  estimate_id uuid not null references public.service_order_estimates (id) on delete cascade,
  service_order_id uuid not null references public.service_orders (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  item_type text not null check (item_type in ('servico', 'peca', 'avulso')),
  service_id uuid references public.services (id) on delete set null,
  part_id uuid references public.parts (id) on delete set null,
  description text not null,
  quantity numeric(10, 2) not null check (quantity > 0),
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  line_total numeric(12, 2) not null check (line_total >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists service_order_estimates_company_deleted_at_idx
  on public.service_order_estimates (company_id, deleted_at);

create index if not exists service_order_estimates_service_order_idx
  on public.service_order_estimates (service_order_id, created_at desc)
  where deleted_at is null;

create unique index if not exists service_order_estimates_active_version_unique_idx
  on public.service_order_estimates (service_order_id, version)
  where deleted_at is null;

create index if not exists service_order_estimates_deleted_by_idx
  on public.service_order_estimates (deleted_by);

create index if not exists service_order_estimates_status_idx
  on public.service_order_estimates (company_id, status)
  where deleted_at is null;

create index if not exists service_order_estimate_items_estimate_idx
  on public.service_order_estimate_items (estimate_id);

create index if not exists service_order_estimate_items_service_order_idx
  on public.service_order_estimate_items (service_order_id);

create index if not exists service_order_estimate_items_company_idx
  on public.service_order_estimate_items (company_id);

alter table public.service_order_estimates enable row level security;
alter table public.service_order_estimate_items enable row level security;

drop policy if exists service_order_estimates_select on public.service_order_estimates;
create policy service_order_estimates_select
on public.service_order_estimates
for select
to authenticated
using (
  exists (
    select 1
    from public.companies
    where companies.id = service_order_estimates.company_id
      and companies.owner_id = (select auth.uid())
  )
  or nullif((select auth.jwt()) -> 'app_metadata' ->> 'company_id', '')::uuid = service_order_estimates.company_id
  or exists (
    select 1
    from public.employees
    where employees.user_id = (select auth.uid())
      and employees.company_id = service_order_estimates.company_id
      and employees.deleted_at is null
  )
);

drop policy if exists service_order_estimates_insert on public.service_order_estimates;
create policy service_order_estimates_insert
on public.service_order_estimates
for insert
to authenticated
with check (
  exists (
    select 1
    from public.companies
    where companies.id = service_order_estimates.company_id
      and companies.owner_id = (select auth.uid())
  )
  or nullif((select auth.jwt()) -> 'app_metadata' ->> 'company_id', '')::uuid = service_order_estimates.company_id
  or exists (
    select 1
    from public.employees
    where employees.user_id = (select auth.uid())
      and employees.company_id = service_order_estimates.company_id
      and employees.deleted_at is null
  )
);

drop policy if exists service_order_estimates_update on public.service_order_estimates;
create policy service_order_estimates_update
on public.service_order_estimates
for update
to authenticated
using (
  exists (
    select 1
    from public.companies
    where companies.id = service_order_estimates.company_id
      and companies.owner_id = (select auth.uid())
  )
  or nullif((select auth.jwt()) -> 'app_metadata' ->> 'company_id', '')::uuid = service_order_estimates.company_id
  or exists (
    select 1
    from public.employees
    where employees.user_id = (select auth.uid())
      and employees.company_id = service_order_estimates.company_id
      and employees.deleted_at is null
  )
);

drop policy if exists service_order_estimates_delete on public.service_order_estimates;
create policy service_order_estimates_delete
on public.service_order_estimates
for delete
to authenticated
using (
  exists (
    select 1
    from public.companies
    where companies.id = service_order_estimates.company_id
      and companies.owner_id = (select auth.uid())
  )
  or (
    (select auth.jwt()) -> 'app_metadata' ->> 'role' = 'admin'
    and nullif((select auth.jwt()) -> 'app_metadata' ->> 'company_id', '')::uuid = service_order_estimates.company_id
  )
);

drop policy if exists service_order_estimate_items_select on public.service_order_estimate_items;
create policy service_order_estimate_items_select
on public.service_order_estimate_items
for select
to authenticated
using (
  exists (
    select 1
    from public.companies
    where companies.id = service_order_estimate_items.company_id
      and companies.owner_id = (select auth.uid())
  )
  or nullif((select auth.jwt()) -> 'app_metadata' ->> 'company_id', '')::uuid = service_order_estimate_items.company_id
  or exists (
    select 1
    from public.employees
    where employees.user_id = (select auth.uid())
      and employees.company_id = service_order_estimate_items.company_id
      and employees.deleted_at is null
  )
);

drop policy if exists service_order_estimate_items_insert on public.service_order_estimate_items;
create policy service_order_estimate_items_insert
on public.service_order_estimate_items
for insert
to authenticated
with check (
  exists (
    select 1
    from public.companies
    where companies.id = service_order_estimate_items.company_id
      and companies.owner_id = (select auth.uid())
  )
  or nullif((select auth.jwt()) -> 'app_metadata' ->> 'company_id', '')::uuid = service_order_estimate_items.company_id
  or exists (
    select 1
    from public.employees
    where employees.user_id = (select auth.uid())
      and employees.company_id = service_order_estimate_items.company_id
      and employees.deleted_at is null
  )
);

drop policy if exists service_order_estimate_items_update on public.service_order_estimate_items;
create policy service_order_estimate_items_update
on public.service_order_estimate_items
for update
to authenticated
using (
  exists (
    select 1
    from public.companies
    where companies.id = service_order_estimate_items.company_id
      and companies.owner_id = (select auth.uid())
  )
  or nullif((select auth.jwt()) -> 'app_metadata' ->> 'company_id', '')::uuid = service_order_estimate_items.company_id
  or exists (
    select 1
    from public.employees
    where employees.user_id = (select auth.uid())
      and employees.company_id = service_order_estimate_items.company_id
      and employees.deleted_at is null
  )
);

drop policy if exists service_order_estimate_items_delete on public.service_order_estimate_items;
create policy service_order_estimate_items_delete
on public.service_order_estimate_items
for delete
to authenticated
using (
  exists (
    select 1
    from public.companies
    where companies.id = service_order_estimate_items.company_id
      and companies.owner_id = (select auth.uid())
  )
  or (
    (select auth.jwt()) -> 'app_metadata' ->> 'role' = 'admin'
    and nullif((select auth.jwt()) -> 'app_metadata' ->> 'company_id', '')::uuid = service_order_estimate_items.company_id
  )
);

drop trigger if exists service_order_estimates_set_updated_at on public.service_order_estimates;
create trigger service_order_estimates_set_updated_at
before update on public.service_order_estimates
for each row
execute function public.set_updated_at();

drop trigger if exists service_order_estimate_items_set_updated_at on public.service_order_estimate_items;
create trigger service_order_estimate_items_set_updated_at
before update on public.service_order_estimate_items
for each row
execute function public.set_updated_at();
