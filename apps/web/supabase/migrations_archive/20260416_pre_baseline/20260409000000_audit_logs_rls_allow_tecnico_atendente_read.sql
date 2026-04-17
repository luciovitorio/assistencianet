drop policy if exists "Owners and admins can view audit logs" on public.audit_logs;

create policy "Company members can view audit logs"
on public.audit_logs
for select
to authenticated
using (
  -- owner
  exists (
    select 1
    from public.companies
    where companies.id = audit_logs.company_id
      and companies.owner_id = (select auth.uid())
  )
  or (
    -- admin, atendente ou técnico da mesma empresa
    ((select auth.jwt()) -> 'app_metadata' ->> 'role') in ('admin', 'atendente', 'tecnico')
    and nullif(((select auth.jwt()) -> 'app_metadata' ->> 'company_id'), '')::uuid = audit_logs.company_id
  )
);
