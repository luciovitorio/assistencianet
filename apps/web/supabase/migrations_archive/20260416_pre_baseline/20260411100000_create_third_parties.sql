-- ============================================================
-- Cadastro de terceirizadas (fabricantes / técnicos externos)
-- Usadas quando um equipamento precisa ser enviado para reparo
-- fora da assistência (ex: autorizada do fabricante).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.third_parties (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id          UUID        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name                TEXT        NOT NULL,
  type                TEXT        NOT NULL DEFAULT 'fabricante'
    CHECK (type IN ('fabricante', 'tecnico_especializado', 'outro')),
  document            TEXT,
  phone               TEXT,
  email               TEXT,
  default_return_days INTEGER     CHECK (default_return_days IS NULL OR default_return_days > 0),
  notes               TEXT,
  active              BOOLEAN     NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at          TIMESTAMPTZ,
  deleted_by          UUID        REFERENCES public.profiles(id)
);

-- ── Índices ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS third_parties_company_deleted_at_idx
  ON public.third_parties (company_id, deleted_at);

CREATE INDEX IF NOT EXISTS third_parties_deleted_by_idx
  ON public.third_parties (deleted_by);

CREATE UNIQUE INDEX IF NOT EXISTS third_parties_active_document_unique_idx
  ON public.third_parties (company_id, regexp_replace(document, '\D', '', 'g'))
  WHERE deleted_at IS NULL
    AND nullif(regexp_replace(document, '\D', '', 'g'), '') IS NOT NULL;

-- ── RLS ──────────────────────────────────────────────────────
ALTER TABLE public.third_parties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS third_parties_select ON public.third_parties;
CREATE POLICY third_parties_select
ON public.third_parties FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.companies
    WHERE companies.id = third_parties.company_id
      AND companies.owner_id = (SELECT auth.uid())
  )
  OR nullif((SELECT auth.jwt()) -> 'app_metadata' ->> 'company_id', '')::uuid = third_parties.company_id
  OR EXISTS (
    SELECT 1 FROM public.employees
    WHERE employees.user_id = (SELECT auth.uid())
      AND employees.company_id = third_parties.company_id
      AND employees.deleted_at IS NULL
  )
);

DROP POLICY IF EXISTS third_parties_insert ON public.third_parties;
CREATE POLICY third_parties_insert
ON public.third_parties FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.companies
    WHERE companies.id = third_parties.company_id
      AND companies.owner_id = (SELECT auth.uid())
  )
  OR nullif((SELECT auth.jwt()) -> 'app_metadata' ->> 'company_id', '')::uuid = third_parties.company_id
  OR EXISTS (
    SELECT 1 FROM public.employees
    WHERE employees.user_id = (SELECT auth.uid())
      AND employees.company_id = third_parties.company_id
      AND employees.deleted_at IS NULL
  )
);

DROP POLICY IF EXISTS third_parties_update ON public.third_parties;
CREATE POLICY third_parties_update
ON public.third_parties FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.companies
    WHERE companies.id = third_parties.company_id
      AND companies.owner_id = (SELECT auth.uid())
  )
  OR nullif((SELECT auth.jwt()) -> 'app_metadata' ->> 'company_id', '')::uuid = third_parties.company_id
  OR EXISTS (
    SELECT 1 FROM public.employees
    WHERE employees.user_id = (SELECT auth.uid())
      AND employees.company_id = third_parties.company_id
      AND employees.deleted_at IS NULL
  )
);

DROP POLICY IF EXISTS third_parties_delete ON public.third_parties;
CREATE POLICY third_parties_delete
ON public.third_parties FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.companies
    WHERE companies.id = third_parties.company_id
      AND companies.owner_id = (SELECT auth.uid())
  )
  OR (
    (SELECT auth.jwt()) -> 'app_metadata' ->> 'role' = 'admin'
    AND nullif((SELECT auth.jwt()) -> 'app_metadata' ->> 'company_id', '')::uuid = third_parties.company_id
  )
);

DROP TRIGGER IF EXISTS third_parties_set_updated_at ON public.third_parties;
CREATE TRIGGER third_parties_set_updated_at
BEFORE UPDATE ON public.third_parties
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();
