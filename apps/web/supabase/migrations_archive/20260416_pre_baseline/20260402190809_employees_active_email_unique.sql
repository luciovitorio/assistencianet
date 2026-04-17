create unique index if not exists employees_active_email_unique_idx
  on public.employees (lower(email))
  where deleted_at is null
    and email is not null
    and btrim(email) <> '';
