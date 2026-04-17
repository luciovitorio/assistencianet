-- Técnicos precisam inserir movimentações de estoque ao marcar OS como pronto
DROP POLICY IF EXISTS company_admins_can_insert_stock_movements ON stock_movements;
CREATE POLICY company_admins_can_insert_stock_movements
  ON stock_movements FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
      UNION ALL
      SELECT company_id FROM employees
        WHERE user_id = auth.uid()
          AND role IN ('admin', 'atendente', 'tecnico')
          AND active = true
          AND deleted_at IS NULL
    )
  );

-- Técnicos precisam inserir reservas de estoque ao registrar aprovação do cliente
DROP POLICY IF EXISTS company_admins_can_insert_stock_reservations ON stock_reservations;
CREATE POLICY company_admins_can_insert_stock_reservations
  ON stock_reservations FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
      UNION ALL
      SELECT company_id FROM employees
        WHERE user_id = auth.uid()
          AND role IN ('admin', 'atendente', 'tecnico')
          AND active = true
          AND deleted_at IS NULL
    )
  );

-- Técnicos precisam atualizar reservas (consumida) ao marcar OS como pronto
DROP POLICY IF EXISTS company_admins_can_update_stock_reservations ON stock_reservations;
CREATE POLICY company_admins_can_update_stock_reservations
  ON stock_reservations FOR UPDATE
  USING (
    company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
      UNION ALL
      SELECT company_id FROM employees
        WHERE user_id = auth.uid()
          AND role IN ('admin', 'atendente', 'tecnico')
          AND active = true
          AND deleted_at IS NULL
    )
  );
