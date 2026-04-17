-- Técnicos precisam registrar entradas de caixa ao finalizar retirada de OS
DROP POLICY IF EXISTS company_admins_can_insert_cash_entries ON cash_entries;
CREATE POLICY company_admins_can_insert_cash_entries
  ON cash_entries FOR INSERT
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
