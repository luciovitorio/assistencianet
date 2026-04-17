-- ============================================================
-- Adiciona tipo 'nova_os' ao sistema de notificações
-- e política de INSERT para membros da empresa.
-- ============================================================

-- 1. Atualiza a constraint de tipo para incluir nova_os
ALTER TABLE notifications
  DROP CONSTRAINT notifications_type_check;

ALTER TABLE notifications
  ADD CONSTRAINT notifications_type_check CHECK (
    type IN ('estoque_baixo', 'estoque_zerado', 'nova_os')
  );

-- 2. Política de INSERT: membros da empresa podem criar notificações
--    (usado pelo server action ao abrir uma nova OS)
CREATE POLICY "company_members_can_insert_notifications"
  ON notifications FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT id         FROM companies WHERE owner_id = auth.uid()
      UNION ALL
      SELECT company_id FROM employees
        WHERE user_id = auth.uid()
          AND active = true
          AND deleted_at IS NULL
    )
  );
