-- Fechamento de produção de técnicos (recibos semanais)
--
-- - technician_payouts: cabeçalho do fechamento (período, total, status)
-- - technician_payout_items: snapshot das OS incluídas
--   (active=false quando o payout é cancelado, liberando a OS para outro fechamento)
-- - Trigger mantém status sincronizado com o bill vinculado em Contas a Pagar.

CREATE TABLE IF NOT EXISTS public.technician_payouts (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  company_id uuid NOT NULL,
  technician_id uuid NOT NULL,
  receipt_number text NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  os_count integer NOT NULL DEFAULT 0,
  labor_rate_snapshot numeric(10,2),
  total_amount numeric(12,2) NOT NULL,
  status text NOT NULL DEFAULT 'aberto',
  bill_id uuid,
  notes text,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  paid_at timestamp with time zone,
  cancelled_at timestamp with time zone,
  cancelled_by uuid,
  deleted_at timestamp with time zone,
  CONSTRAINT technician_payouts_pkey PRIMARY KEY (id),
  CONSTRAINT technician_payouts_company_fkey
    FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE,
  CONSTRAINT technician_payouts_technician_fkey
    FOREIGN KEY (technician_id) REFERENCES public.employees(id) ON DELETE RESTRICT,
  CONSTRAINT technician_payouts_bill_fkey
    FOREIGN KEY (bill_id) REFERENCES public.bills(id) ON DELETE SET NULL,
  CONSTRAINT technician_payouts_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT technician_payouts_cancelled_by_fkey
    FOREIGN KEY (cancelled_by) REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT technician_payouts_total_non_negative CHECK (total_amount >= 0),
  CONSTRAINT technician_payouts_period_valid CHECK (period_end >= period_start),
  CONSTRAINT technician_payouts_status_check
    CHECK (status = ANY (ARRAY['aberto'::text, 'pago'::text, 'cancelado'::text]))
);

CREATE UNIQUE INDEX IF NOT EXISTS technician_payouts_company_receipt_unique_idx
  ON public.technician_payouts (company_id, receipt_number)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS technician_payouts_company_id_idx
  ON public.technician_payouts USING btree (company_id);

CREATE INDEX IF NOT EXISTS technician_payouts_technician_id_idx
  ON public.technician_payouts USING btree (technician_id);

CREATE INDEX IF NOT EXISTS technician_payouts_company_period_idx
  ON public.technician_payouts USING btree (company_id, period_end DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS technician_payouts_bill_id_idx
  ON public.technician_payouts USING btree (bill_id)
  WHERE bill_id IS NOT NULL;

CREATE TRIGGER technician_payouts_set_updated_at
  BEFORE UPDATE ON public.technician_payouts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


CREATE TABLE IF NOT EXISTS public.technician_payout_items (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  payout_id uuid NOT NULL,
  service_order_id uuid NOT NULL,
  os_number text NOT NULL,
  client_name text NOT NULL,
  completed_at timestamp with time zone NOT NULL,
  labor_rate numeric(10,2) NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT technician_payout_items_pkey PRIMARY KEY (id),
  CONSTRAINT technician_payout_items_payout_fkey
    FOREIGN KEY (payout_id) REFERENCES public.technician_payouts(id) ON DELETE CASCADE,
  CONSTRAINT technician_payout_items_os_fkey
    FOREIGN KEY (service_order_id) REFERENCES public.service_orders(id) ON DELETE RESTRICT,
  CONSTRAINT technician_payout_items_labor_rate_non_negative CHECK (labor_rate >= 0)
);

CREATE INDEX IF NOT EXISTS technician_payout_items_payout_id_idx
  ON public.technician_payout_items USING btree (payout_id);

-- Garante que uma mesma OS não apareça em dois fechamentos ativos.
-- Quando um payout é cancelado, seus items são marcados active=false,
-- liberando as OS para serem incluídas em um novo fechamento.
CREATE UNIQUE INDEX IF NOT EXISTS technician_payout_items_active_os_unique_idx
  ON public.technician_payout_items (service_order_id)
  WHERE active = true;


-- ── Geração de número de recibo sequencial por empresa (REC-YYYY-NNNN) ─────

CREATE OR REPLACE FUNCTION public.generate_technician_payout_number(p_company_id uuid)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_year text := to_char(current_date, 'YYYY');
  v_prefix text := 'REC-' || v_year || '-';
  v_last text;
  v_next integer;
BEGIN
  SELECT receipt_number
    INTO v_last
    FROM public.technician_payouts
   WHERE company_id = p_company_id
     AND receipt_number LIKE v_prefix || '%'
   ORDER BY receipt_number DESC
   LIMIT 1;

  IF v_last IS NULL THEN
    v_next := 1;
  ELSE
    v_next := COALESCE(NULLIF(substring(v_last FROM length(v_prefix) + 1), '')::integer, 0) + 1;
  END IF;

  RETURN v_prefix || lpad(v_next::text, 4, '0');
END;
$$;


-- ── Sincroniza payout ↔ bill ──────────────────────────────────────────────
-- Quando o bill vinculado a um payout é pago (ou estornado) em Contas a Pagar,
-- o payout acompanha o status automaticamente.

CREATE OR REPLACE FUNCTION public.sync_technician_payout_from_bill()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status = 'pago' AND (OLD.status IS DISTINCT FROM 'pago') THEN
    UPDATE public.technician_payouts
       SET status = 'pago',
           paid_at = COALESCE(NEW.paid_at, now())
     WHERE bill_id = NEW.id
       AND status = 'aberto'
       AND deleted_at IS NULL;
  ELSIF NEW.status = 'pendente' AND OLD.status = 'pago' THEN
    UPDATE public.technician_payouts
       SET status = 'aberto',
           paid_at = NULL
     WHERE bill_id = NEW.id
       AND status = 'pago'
       AND deleted_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bills_sync_technician_payout ON public.bills;

CREATE TRIGGER bills_sync_technician_payout
  AFTER UPDATE OF status ON public.bills
  FOR EACH ROW
  WHEN (NEW.status IS DISTINCT FROM OLD.status)
  EXECUTE FUNCTION public.sync_technician_payout_from_bill();


-- ── RLS ───────────────────────────────────────────────────────────────────

ALTER TABLE public.technician_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.technician_payout_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY technician_payouts_admin_all
  ON public.technician_payouts
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

CREATE POLICY technician_payouts_technician_read
  ON public.technician_payouts
  FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND company_id = (((auth.jwt() -> 'app_metadata'::text) ->> 'company_id'::text))::uuid
    AND (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'tecnico'::text)
    AND technician_id IN (
      SELECT id FROM public.employees WHERE user_id = auth.uid()
    )
  );

CREATE POLICY technician_payout_items_admin_all
  ON public.technician_payout_items
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.technician_payouts p
      WHERE p.id = technician_payout_items.payout_id
        AND (
          p.company_id IN (
            SELECT companies.id FROM public.companies
            WHERE companies.owner_id = auth.uid()
          )
          OR (
            p.company_id = (((auth.jwt() -> 'app_metadata'::text) ->> 'company_id'::text))::uuid
            AND (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text)
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.technician_payouts p
      WHERE p.id = technician_payout_items.payout_id
        AND (
          p.company_id IN (
            SELECT companies.id FROM public.companies
            WHERE companies.owner_id = auth.uid()
          )
          OR (
            p.company_id = (((auth.jwt() -> 'app_metadata'::text) ->> 'company_id'::text))::uuid
            AND (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text)
          )
        )
    )
  );

CREATE POLICY technician_payout_items_technician_read
  ON public.technician_payout_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.technician_payouts p
      WHERE p.id = technician_payout_items.payout_id
        AND p.deleted_at IS NULL
        AND p.company_id = (((auth.jwt() -> 'app_metadata'::text) ->> 'company_id'::text))::uuid
        AND (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'tecnico'::text)
        AND p.technician_id IN (
          SELECT id FROM public.employees WHERE user_id = auth.uid()
        )
    )
  );
