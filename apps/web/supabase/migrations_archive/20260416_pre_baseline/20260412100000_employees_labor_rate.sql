-- Valor fixo de mão de obra por OS concluída, usado para calcular
-- o custo de produção dos técnicos no relatório de produção.
-- Apenas relevante para employees com role = 'tecnico', mas sem constraint
-- para evitar restrições desnecessárias caso o role mude.
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS labor_rate NUMERIC(10, 2)
    CONSTRAINT employees_labor_rate_positive CHECK (labor_rate IS NULL OR labor_rate >= 0);

COMMENT ON COLUMN public.employees.labor_rate IS
  'Valor fixo de mão de obra pago ao técnico por OS concluída (VALOR FIXO DE MÃO DE OBRA). Nulo = não definido.';
