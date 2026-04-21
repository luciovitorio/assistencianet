CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

CREATE INDEX IF NOT EXISTS clients_active_name_trgm_idx
  ON public.clients USING gin (name extensions.gin_trgm_ops)
  WHERE active = true AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS clients_active_phone_trgm_idx
  ON public.clients USING gin (phone extensions.gin_trgm_ops)
  WHERE active = true AND deleted_at IS NULL AND phone IS NOT NULL;

CREATE INDEX IF NOT EXISTS clients_active_document_trgm_idx
  ON public.clients USING gin (document extensions.gin_trgm_ops)
  WHERE active = true AND deleted_at IS NULL AND document IS NOT NULL;

CREATE INDEX IF NOT EXISTS equipment_models_active_type_trgm_idx
  ON public.equipment_models USING gin (type extensions.gin_trgm_ops)
  WHERE active = true AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS equipment_models_active_manufacturer_trgm_idx
  ON public.equipment_models USING gin (manufacturer extensions.gin_trgm_ops)
  WHERE active = true AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS equipment_models_active_model_trgm_idx
  ON public.equipment_models USING gin (model extensions.gin_trgm_ops)
  WHERE active = true AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS equipment_models_active_voltage_trgm_idx
  ON public.equipment_models USING gin (voltage extensions.gin_trgm_ops)
  WHERE active = true AND deleted_at IS NULL AND voltage IS NOT NULL;
