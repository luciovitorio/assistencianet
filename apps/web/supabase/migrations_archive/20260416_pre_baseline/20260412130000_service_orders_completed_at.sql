-- Adiciona completed_at em service_orders
-- Registra o momento exato em que a OS foi marcada como "pronto",
-- independente de quando o cliente retirou o equipamento.
-- Usado para contabilização de produção de técnicos.

ALTER TABLE service_orders
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ DEFAULT NULL;

-- Backfill: OS já em 'pronto' ou 'finalizado' recebem updated_at como proxy
UPDATE service_orders
SET completed_at = updated_at
WHERE status IN ('pronto', 'finalizado')
  AND completed_at IS NULL
  AND deleted_at IS NULL;

COMMENT ON COLUMN service_orders.completed_at IS
  'Timestamp de quando a OS foi marcada como pronta (serviço concluído). Usado para produção de técnicos.';
