CREATE TABLE IF NOT EXISTS public.equipment_models (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  company_id uuid NOT NULL,
  type text NOT NULL,
  manufacturer text NOT NULL,
  model text NOT NULL,
  voltage text,
  notes text,
  active boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  deleted_at timestamp with time zone,
  deleted_by uuid,
  CONSTRAINT equipment_models_pkey PRIMARY KEY (id),
  CONSTRAINT equipment_models_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE,
  CONSTRAINT equipment_models_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS equipment_models_company_id_idx
  ON public.equipment_models USING btree (company_id);

CREATE INDEX IF NOT EXISTS equipment_models_active_idx
  ON public.equipment_models USING btree (company_id, active)
  WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS equipment_models_active_identity_unique_idx
  ON public.equipment_models (
    company_id,
    lower(type),
    lower(manufacturer),
    lower(model),
    lower(coalesce(voltage, ''))
  )
  WHERE deleted_at IS NULL;

CREATE TRIGGER equipment_models_set_updated_at
  BEFORE UPDATE ON public.equipment_models
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.equipment_models ENABLE ROW LEVEL SECURITY;

CREATE POLICY equipment_models_admin_all
  ON public.equipment_models
  TO authenticated
  USING (
    company_id IN (
      SELECT companies.id
      FROM public.companies
      WHERE companies.owner_id = auth.uid()
    )
    OR (
      company_id = (((auth.jwt() -> 'app_metadata'::text) ->> 'company_id'::text))::uuid
      AND (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text)
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT companies.id
      FROM public.companies
      WHERE companies.owner_id = auth.uid()
    )
    OR (
      company_id = (((auth.jwt() -> 'app_metadata'::text) ->> 'company_id'::text))::uuid
      AND (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text)
    )
  );

CREATE POLICY equipment_models_employee_read
  ON public.equipment_models
  FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND active = true
    AND company_id = (((auth.jwt() -> 'app_metadata'::text) ->> 'company_id'::text))::uuid
    AND (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = ANY (ARRAY['atendente'::text, 'tecnico'::text]))
  );

ALTER TABLE public.service_orders
  ADD COLUMN IF NOT EXISTS equipment_model_id uuid,
  ADD COLUMN IF NOT EXISTS device_color text,
  ADD COLUMN IF NOT EXISTS device_internal_code text;

ALTER TABLE public.service_orders
  ADD CONSTRAINT service_orders_equipment_model_id_fkey
  FOREIGN KEY (equipment_model_id) REFERENCES public.equipment_models(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS service_orders_equipment_model_id_idx
  ON public.service_orders USING btree (equipment_model_id);

CREATE INDEX IF NOT EXISTS service_orders_device_internal_code_idx
  ON public.service_orders USING btree (company_id, device_internal_code)
  WHERE device_internal_code IS NOT NULL AND deleted_at IS NULL;
