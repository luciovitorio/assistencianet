-- Garantia deixa de ser por serviço. Passa a ser gerenciada globalmente
-- via companies.default_warranty_days (com sobrescrita por orçamento via
-- service_order_estimates.warranty_days).
ALTER TABLE public.services DROP COLUMN IF EXISTS warranty_days;
