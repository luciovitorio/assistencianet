ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS is_owner boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS employees_company_owner_unique_idx
  ON public.employees (company_id)
  WHERE is_owner = true AND deleted_at IS NULL;

COMMENT ON COLUMN public.employees.is_owner IS
  'Marca este employee como o registro operacional do dono da empresa. Recebe tratamento especial: aparece em listas de técnicos e atendentes, e não pode ser excluído/desativado.';
