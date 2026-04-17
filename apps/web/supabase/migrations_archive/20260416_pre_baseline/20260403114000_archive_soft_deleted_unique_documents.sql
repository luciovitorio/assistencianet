-- Soft-deleted records must release natural unique keys such as CPF/CNPJ.
-- This backfill handles historical rows created before the application started
-- archiving unique fields during soft delete.

update public.clients
set document = concat(
  trim(document),
  ' [deleted:',
  to_char(coalesce(deleted_at, now()), 'YYYYMMDDHH24MISS'),
  ':',
  id::text,
  ']'
)
where deleted_at is not null
  and nullif(trim(document), '') is not null
  and document not like '% [deleted:%';

update public.suppliers
set document = concat(
  trim(document),
  ' [deleted:',
  to_char(coalesce(deleted_at, now()), 'YYYYMMDDHH24MISS'),
  ':',
  id::text,
  ']'
)
where deleted_at is not null
  and nullif(trim(document), '') is not null
  and document not like '% [deleted:%';
