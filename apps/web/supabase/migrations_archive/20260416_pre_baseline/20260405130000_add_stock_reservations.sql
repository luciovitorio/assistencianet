-- ============================================================
-- Reservas de estoque + part_id nos itens de orçamento
--
-- Fluxo:
--  rascunho          → sem reserva
--  enviado/aprovado  → RESERVA as peças (bloqueia disponível)
--  substituído       → LIBERA reservas do orçamento anterior
--  recusado/cancelado→ LIBERA reservas
--  OS "pronto"       → CONSOME reservas (cria saída real)
-- ============================================================

-- 1. part_id nos itens de orçamento (nullable — só preenchido
--    quando o item é selecionado do catálogo de peças)
ALTER TABLE service_order_estimate_items
  ADD COLUMN IF NOT EXISTS part_id UUID REFERENCES parts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_soei_part_id
  ON service_order_estimate_items (part_id)
  WHERE part_id IS NOT NULL;

-- 2. Tabela de reservas de estoque
CREATE TABLE IF NOT EXISTS stock_reservations (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id       UUID        NOT NULL REFERENCES companies(id)            ON DELETE CASCADE,
  branch_id        UUID        NOT NULL REFERENCES branches(id)             ON DELETE RESTRICT,
  part_id          UUID        NOT NULL REFERENCES parts(id)                ON DELETE RESTRICT,
  estimate_id      UUID        NOT NULL REFERENCES service_order_estimates(id) ON DELETE CASCADE,
  service_order_id UUID        NOT NULL REFERENCES service_orders(id)       ON DELETE CASCADE,
  quantity         INTEGER     NOT NULL CHECK (quantity > 0),
  status           TEXT        NOT NULL DEFAULT 'ativa',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at      TIMESTAMPTZ,

  CONSTRAINT stock_reservations_status_check
    CHECK (status IN ('ativa', 'consumida', 'liberada'))
);

-- ── Índices ─────────────────────────────────────────────────
CREATE INDEX idx_stock_reservations_estimate
  ON stock_reservations (estimate_id);

CREATE INDEX idx_stock_reservations_service_order
  ON stock_reservations (service_order_id);

-- Índice parcial para cálculo de disponível (caso de uso mais frequente)
CREATE INDEX idx_stock_reservations_active
  ON stock_reservations (company_id, branch_id, part_id)
  WHERE status = 'ativa';

-- ── Row Level Security ──────────────────────────────────────
ALTER TABLE stock_reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_members_can_view_stock_reservations"
  ON stock_reservations FOR SELECT
  USING (
    company_id IN (
      SELECT id         FROM companies WHERE owner_id = auth.uid()
      UNION ALL
      SELECT company_id FROM employees
        WHERE user_id = auth.uid() AND active = true AND deleted_at IS NULL
    )
  );

CREATE POLICY "company_admins_can_insert_stock_reservations"
  ON stock_reservations FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT id         FROM companies WHERE owner_id = auth.uid()
      UNION ALL
      SELECT company_id FROM employees
        WHERE user_id = auth.uid()
          AND role IN ('admin', 'atendente')
          AND active = true AND deleted_at IS NULL
    )
  );

CREATE POLICY "company_admins_can_update_stock_reservations"
  ON stock_reservations FOR UPDATE
  USING (
    company_id IN (
      SELECT id         FROM companies WHERE owner_id = auth.uid()
      UNION ALL
      SELECT company_id FROM employees
        WHERE user_id = auth.uid()
          AND role IN ('admin', 'atendente')
          AND active = true AND deleted_at IS NULL
    )
  );

-- 3. View: saldo disponível = físico − reservado ativo
CREATE OR REPLACE VIEW v_stock_available AS
SELECT
  pos.company_id,
  pos.branch_id,
  pos.part_id,
  pos.current_stock                              AS estoque_fisico,
  COALESCE(res.reservado, 0)                     AS estoque_reservado,
  pos.current_stock - COALESCE(res.reservado, 0) AS estoque_disponivel
FROM v_stock_positions pos
LEFT JOIN (
  SELECT company_id, branch_id, part_id, SUM(quantity) AS reservado
  FROM   stock_reservations
  WHERE  status = 'ativa'
  GROUP  BY company_id, branch_id, part_id
) res ON  res.company_id = pos.company_id
      AND res.branch_id  = pos.branch_id
      AND res.part_id    = pos.part_id;

COMMENT ON VIEW v_stock_available IS
  'Disponível = físico (soma de movimentações) menos reservas ativas de orçamentos.';
