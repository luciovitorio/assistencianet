create index if not exists audit_logs_actor_user_id_idx
  on public.audit_logs (actor_user_id);

create index if not exists branches_deleted_by_idx
  on public.branches (deleted_by);

create index if not exists employees_deleted_by_idx
  on public.employees (deleted_by);

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
      and companies.owner_id = (select auth.uid())
  )
  or (
    ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
    and nullif(((select auth.jwt()) -> 'app_metadata' ->> 'company_id'), '')::uuid = audit_logs.company_id
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
    or actor_user_id = (select auth.uid())
  )
  and (
    exists (
      select 1
      from public.companies
      where companies.id = audit_logs.company_id
        and companies.owner_id = (select auth.uid())
    )
    or nullif(((select auth.jwt()) -> 'app_metadata' ->> 'company_id'), '')::uuid = audit_logs.company_id
  )
);
