alter table public.stock_movements
  add column if not exists supplier_id uuid references public.suppliers(id) on delete restrict,
  add column if not exists invoice_date date,
  add column if not exists entry_date date;

update public.stock_movements
set entry_date = created_at::date
where entry_date is null;

alter table public.stock_movements
  alter column entry_date set not null;

create index if not exists idx_stock_movements_supplier_id
  on public.stock_movements (supplier_id);

create index if not exists idx_stock_movements_entry_date
  on public.stock_movements (entry_date desc);

create index if not exists idx_stock_movements_invoice_date
  on public.stock_movements (invoice_date desc);
