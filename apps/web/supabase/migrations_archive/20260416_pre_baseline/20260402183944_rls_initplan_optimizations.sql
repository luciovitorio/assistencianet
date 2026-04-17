drop policy if exists "profiles: own read" on public.profiles;
create policy "profiles: own read"
on public.profiles
for select
to public
using ((select auth.uid()) = id);

drop policy if exists "profiles: own update" on public.profiles;
create policy "profiles: own update"
on public.profiles
for update
to public
using ((select auth.uid()) = id);

drop policy if exists "companies: owner read" on public.companies;
create policy "companies: owner read"
on public.companies
for select
to public
using ((select auth.uid()) = owner_id);

drop policy if exists "companies: owner insert" on public.companies;
create policy "companies: owner insert"
on public.companies
for insert
to public
with check ((select auth.uid()) = owner_id);

drop policy if exists "companies: owner update" on public.companies;
create policy "companies: owner update"
on public.companies
for update
to public
using ((select auth.uid()) = owner_id);

drop policy if exists companies_employee_select on public.companies;
create policy companies_employee_select
on public.companies
for select
to public
using (id = (((select auth.jwt()) -> 'app_metadata' ->> 'company_id'))::uuid);

drop policy if exists "branches: company owner read" on public.branches;
create policy "branches: company owner read"
on public.branches
for select
to public
using (
  company_id in (
    select companies.id
    from public.companies
    where companies.owner_id = (select auth.uid())
  )
);

drop policy if exists "branches: company owner insert" on public.branches;
create policy "branches: company owner insert"
on public.branches
for insert
to public
with check (
  company_id in (
    select companies.id
    from public.companies
    where companies.owner_id = (select auth.uid())
  )
);

drop policy if exists "branches: company owner update" on public.branches;
create policy "branches: company owner update"
on public.branches
for update
to public
using (
  company_id in (
    select companies.id
    from public.companies
    where companies.owner_id = (select auth.uid())
  )
);

drop policy if exists "branches: company owner delete" on public.branches;
create policy "branches: company owner delete"
on public.branches
for delete
to public
using (
  company_id in (
    select companies.id
    from public.companies
    where companies.owner_id = (select auth.uid())
  )
);

drop policy if exists "business_hours: company owner read" on public.business_hours;
create policy "business_hours: company owner read"
on public.business_hours
for select
to public
using (
  branch_id in (
    select b.id
    from public.branches b
    join public.companies c on c.id = b.company_id
    where c.owner_id = (select auth.uid())
  )
);

drop policy if exists "business_hours: company owner insert" on public.business_hours;
create policy "business_hours: company owner insert"
on public.business_hours
for insert
to public
with check (
  branch_id in (
    select b.id
    from public.branches b
    join public.companies c on c.id = b.company_id
    where c.owner_id = (select auth.uid())
  )
);

drop policy if exists "business_hours: company owner update" on public.business_hours;
create policy "business_hours: company owner update"
on public.business_hours
for update
to public
using (
  branch_id in (
    select b.id
    from public.branches b
    join public.companies c on c.id = b.company_id
    where c.owner_id = (select auth.uid())
  )
);

drop policy if exists employees_select on public.employees;
create policy employees_select
on public.employees
for select
to public
using (
  (
    company_id in (
      select companies.id
      from public.companies
      where companies.owner_id = (select auth.uid())
    )
  )
  or (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin')
);

drop policy if exists employees_self_select on public.employees;
create policy employees_self_select
on public.employees
for select
to public
using (user_id = (select auth.uid()));

drop policy if exists employees_insert on public.employees;
create policy employees_insert
on public.employees
for insert
to public
with check (
  (
    company_id in (
      select companies.id
      from public.companies
      where companies.owner_id = (select auth.uid())
    )
  )
  or (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin')
);

drop policy if exists employees_update on public.employees;
create policy employees_update
on public.employees
for update
to public
using (
  (
    company_id in (
      select companies.id
      from public.companies
      where companies.owner_id = (select auth.uid())
    )
  )
  or (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin')
);

drop policy if exists employees_delete on public.employees;
create policy employees_delete
on public.employees
for delete
to public
using (
  (
    company_id in (
      select companies.id
      from public.companies
      where companies.owner_id = (select auth.uid())
    )
  )
  or (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin')
);
