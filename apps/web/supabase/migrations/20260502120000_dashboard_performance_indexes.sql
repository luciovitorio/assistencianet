CREATE INDEX IF NOT EXISTS service_orders_company_active_number_idx
  ON public.service_orders (company_id, number DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS service_orders_company_branch_active_number_idx
  ON public.service_orders (company_id, branch_id, number DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS branches_company_active_name_idx
  ON public.branches (company_id, active, name)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS employees_company_active_name_idx
  ON public.employees (company_id, active, name)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS parts_company_active_name_idx
  ON public.parts (company_id, active, name)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS suppliers_company_active_name_idx
  ON public.suppliers (company_id, active, name)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS third_parties_company_active_name_idx
  ON public.third_parties (company_id, active, name)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS equipment_models_company_catalog_order_idx
  ON public.equipment_models (company_id, type, manufacturer, model)
  WHERE deleted_at IS NULL;
