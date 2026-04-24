ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS owner_operates boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.companies.owner_operates IS
  'Se true, o dono é também um operador (atendente/técnico) e aparece nas listas de atribuição. Em empresas pequenas, o dono atende e conserta.';
