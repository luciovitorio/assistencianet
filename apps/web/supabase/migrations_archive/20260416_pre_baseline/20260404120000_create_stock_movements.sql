-- ============================================================
-- Módulo de Estoque: tabela de movimentações
-- Cada linha representa um evento imutável de entrada, saída,
-- ajuste ou transferência de peça em uma filial.
-- ============================================================

CREATE TABLE IF NOT EXISTS stock_movements (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID        NOT NULL REFERENCES companies(id)  ON DELETE RESTRICT,
  branch_id       UUID        NOT NULL REFERENCES branches(id)   ON DELETE RESTRICT,
  part_id         UUID        NOT NULL REFERENCES parts(id)      ON DELETE RESTRICT,
  -- Tipo de movimentação
  movement_type   TEXT        NOT NULL,
  -- Quantidade ASSINADA: positivo = entrada, negativo = saída/redução
  quantity        INTEGER     NOT NULL,
  -- Custo unitário no momento da entrada (opcional)
  unit_cost       NUMERIC(10, 2),
  -- Referência externa opcional (OS, transferência, etc.)
  reference_type  TEXT,
  reference_id    UUID,
  notes           TEXT,
  created_by      UUID        REFERENCES profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT stock_movements_type_check CHECK (
    movement_type IN (
      'entrada',
      'saida',
      'ajuste',
      'transferencia_entrada',
      'transferencia_saida'
    )
  ),
  CONSTRAINT stock_movements_quantity_nonzero CHECK (quantity != 0)
);

-- ── Índices ─────────────────────────────────────────────────
CREATE INDEX idx_stock_movements_company_id
  ON stock_movements (company_id);

CREATE INDEX idx_stock_movements_part_id
  ON stock_movements (part_id);

CREATE INDEX idx_stock_movements_branch_id
  ON stock_movements (branch_id);

CREATE INDEX idx_stock_movements_created_at
  ON stock_movements (created_at DESC);

-- Índice composto para consulta de saldo por empresa+peça
CREATE INDEX idx_stock_movements_company_part
  ON stock_movements (company_id, part_id);

-- Índice composto para saldo por empresa+filial+peça
CREATE INDEX idx_stock_movements_company_branch_part
  ON stock_movements (company_id, branch_id, part_id);

-- ── Row Level Security ──────────────────────────────────────
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

-- Todos os membros da empresa podem visualizar movimentações
CREATE POLICY "company_members_can_view_stock_movements"
  ON stock_movements FOR SELECT
  USING (
    company_id IN (
      SELECT id         FROM companies  WHERE owner_id = auth.uid()
      UNION ALL
      SELECT company_id FROM employees
        WHERE user_id = auth.uid()
          AND active = true
          AND deleted_at IS NULL
    )
  );

-- Owner, admin e atendente podem criar movimentações
CREATE POLICY "company_admins_can_insert_stock_movements"
  ON stock_movements FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT id         FROM companies  WHERE owner_id = auth.uid()
      UNION ALL
      SELECT company_id FROM employees
        WHERE user_id = auth.uid()
          AND role IN ('admin', 'atendente')
          AND active = true
          AND deleted_at IS NULL
    )
  );

-- ── View: saldo atual por peça × filial ─────────────────────
CREATE VIEW v_stock_positions AS
SELECT
  sm.company_id,
  sm.branch_id,
  sm.part_id,
  SUM(sm.quantity) AS current_stock
FROM stock_movements sm
GROUP BY sm.company_id, sm.branch_id, sm.part_id;

COMMENT ON VIEW v_stock_positions IS
  'Saldo atual de estoque por peça por filial. '
  'Calculado a partir da soma de todas as movimentações.';
