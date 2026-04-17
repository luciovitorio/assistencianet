-- ============================================================
-- Módulo Financeiro: Contas a Pagar
-- Cada linha representa um lançamento (único ou instância de
-- uma série recorrente) vinculado a uma filial.
-- ============================================================

CREATE TABLE IF NOT EXISTS bills (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id          UUID        NOT NULL REFERENCES companies(id)  ON DELETE RESTRICT,
  branch_id           UUID        NOT NULL REFERENCES branches(id)   ON DELETE RESTRICT,
  category            TEXT        NOT NULL,
  description         TEXT        NOT NULL,
  supplier_id         UUID        REFERENCES suppliers(id)           ON DELETE SET NULL,
  amount              NUMERIC(10, 2) NOT NULL,
  due_date            DATE        NOT NULL,
  -- status: 'pendente' | 'pago'  (vencido é derivado: due_date < today AND pendente)
  status              TEXT        NOT NULL DEFAULT 'pendente',
  paid_at             TIMESTAMPTZ,
  payment_method      TEXT,
  payment_notes       TEXT,
  notes               TEXT,
  -- Recorrência: NULL = avulso; caso contrário indica a periodicidade
  recurrence          TEXT,
  -- UUID compartilhado por todas as instâncias de uma mesma série
  recurrence_group_id UUID,
  created_by          UUID        REFERENCES profiles(id)            ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at          TIMESTAMPTZ,

  CONSTRAINT bills_category_check CHECK (
    category IN ('fornecedor','aluguel','energia','agua','internet','folha','imposto','outro')
  ),
  CONSTRAINT bills_status_check CHECK (
    status IN ('pendente','pago')
  ),
  CONSTRAINT bills_recurrence_check CHECK (
    recurrence IS NULL OR recurrence IN ('semanal','quinzenal','mensal','anual')
  ),
  CONSTRAINT bills_payment_method_check CHECK (
    payment_method IS NULL OR payment_method IN (
      'dinheiro','pix','cartao_credito','cartao_debito','transferencia'
    )
  ),
  CONSTRAINT bills_amount_positive CHECK (amount > 0),
  -- Consistência: pago implica paid_at e payment_method preenchidos
  CONSTRAINT bills_paid_consistency CHECK (
    (status = 'pago'     AND paid_at IS NOT NULL AND payment_method IS NOT NULL)
    OR
    (status = 'pendente' AND paid_at IS NULL     AND payment_method IS NULL)
  )
);

-- ── Índices ─────────────────────────────────────────────────
CREATE INDEX idx_bills_company_id
  ON bills (company_id);

CREATE INDEX idx_bills_branch_id
  ON bills (branch_id);

CREATE INDEX idx_bills_company_due_date
  ON bills (company_id, due_date)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_bills_company_status
  ON bills (company_id, status)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_bills_recurrence_group
  ON bills (recurrence_group_id)
  WHERE recurrence_group_id IS NOT NULL AND deleted_at IS NULL;

-- ── Row Level Security ──────────────────────────────────────
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_members_can_view_bills"
  ON bills FOR SELECT
  USING (
    deleted_at IS NULL
    AND company_id IN (
      SELECT id         FROM companies  WHERE owner_id = auth.uid()
      UNION ALL
      SELECT company_id FROM employees
        WHERE user_id = auth.uid()
          AND active = true
          AND deleted_at IS NULL
    )
  );

CREATE POLICY "company_admins_can_insert_bills"
  ON bills FOR INSERT
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

CREATE POLICY "company_admins_can_update_bills"
  ON bills FOR UPDATE
  USING (
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
