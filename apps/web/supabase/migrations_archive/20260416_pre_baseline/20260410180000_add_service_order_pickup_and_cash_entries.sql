-- ============================================================
-- Fluxo de retirada da OS + recebimento de caixa
-- Finaliza a OS somente quando a retirada/pagamento é registrado.
-- ============================================================

ALTER TABLE service_orders
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivered_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS amount_paid NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS change_amount NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS pickup_notes TEXT;

ALTER TABLE service_orders
  DROP CONSTRAINT IF EXISTS service_orders_payment_method_check;

ALTER TABLE service_orders
  ADD CONSTRAINT service_orders_payment_method_check
  CHECK (
    payment_method IS NULL
    OR payment_method IN (
      'dinheiro',
      'pix',
      'cartao_credito',
      'cartao_debito',
      'transferencia',
      'isento'
    )
  );

ALTER TABLE service_orders
  DROP CONSTRAINT IF EXISTS service_orders_amount_paid_nonnegative_check;

ALTER TABLE service_orders
  ADD CONSTRAINT service_orders_amount_paid_nonnegative_check
  CHECK (amount_paid IS NULL OR amount_paid >= 0);

ALTER TABLE service_orders
  DROP CONSTRAINT IF EXISTS service_orders_change_amount_nonnegative_check;

ALTER TABLE service_orders
  ADD CONSTRAINT service_orders_change_amount_nonnegative_check
  CHECK (change_amount IS NULL OR change_amount >= 0);

CREATE TABLE IF NOT EXISTS cash_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  service_order_id UUID NOT NULL REFERENCES service_orders(id) ON DELETE CASCADE,
  estimate_id UUID REFERENCES service_order_estimates(id) ON DELETE SET NULL,
  entry_type TEXT NOT NULL DEFAULT 'recebimento_os',
  payment_method TEXT NOT NULL,
  amount_due NUMERIC(10, 2) NOT NULL,
  amount_received NUMERIC(10, 2) NOT NULL,
  change_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  net_amount NUMERIC(10, 2) NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT cash_entries_entry_type_check
    CHECK (entry_type IN ('recebimento_os')),
  CONSTRAINT cash_entries_payment_method_check
    CHECK (
      payment_method IN (
        'dinheiro',
        'pix',
        'cartao_credito',
        'cartao_debito',
        'transferencia',
        'isento'
      )
    ),
  CONSTRAINT cash_entries_amount_due_nonnegative_check
    CHECK (amount_due >= 0),
  CONSTRAINT cash_entries_amount_received_nonnegative_check
    CHECK (amount_received >= 0),
  CONSTRAINT cash_entries_change_amount_nonnegative_check
    CHECK (change_amount >= 0),
  CONSTRAINT cash_entries_net_amount_nonnegative_check
    CHECK (net_amount >= 0),
  CONSTRAINT cash_entries_net_amount_consistency_check
    CHECK (net_amount = amount_received - change_amount)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_cash_entries_service_order_unique
  ON cash_entries (service_order_id);

CREATE INDEX IF NOT EXISTS idx_cash_entries_company_created_at
  ON cash_entries (company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cash_entries_branch_created_at
  ON cash_entries (branch_id, created_at DESC)
  WHERE branch_id IS NOT NULL;

ALTER TABLE cash_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_members_can_view_cash_entries"
  ON cash_entries FOR SELECT
  USING (
    company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
      UNION ALL
      SELECT company_id FROM employees
      WHERE user_id = auth.uid()
        AND active = true
        AND deleted_at IS NULL
    )
  );

CREATE POLICY "company_admins_can_insert_cash_entries"
  ON cash_entries FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
      UNION ALL
      SELECT company_id FROM employees
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'atendente')
        AND active = true
        AND deleted_at IS NULL
    )
  );
