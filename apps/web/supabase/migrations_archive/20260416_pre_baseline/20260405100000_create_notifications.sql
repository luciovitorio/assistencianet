-- ============================================================
-- Sistema de Notificações: alertas de estoque baixo/zerado
-- Cada linha representa uma notificação não lida para a empresa.
-- Um trigger em stock_movements cria alertas automaticamente.
-- ============================================================

CREATE TABLE IF NOT EXISTS notifications (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  type        TEXT        NOT NULL,
  title       TEXT        NOT NULL,
  body        TEXT        NOT NULL,
  part_id     UUID        REFERENCES parts(id) ON DELETE CASCADE,
  branch_id   UUID        REFERENCES branches(id) ON DELETE SET NULL,
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT notifications_type_check CHECK (
    type IN ('estoque_baixo', 'estoque_zerado')
  )
);

-- ── Índices ─────────────────────────────────────────────────
-- Leitura de não lidas por empresa (caso de uso mais comum)
CREATE INDEX idx_notifications_company_unread
  ON notifications (company_id, created_at DESC)
  WHERE read_at IS NULL;

-- Dedup no trigger: busca por empresa+peça+filial+tipo
CREATE INDEX idx_notifications_dedup
  ON notifications (company_id, part_id, branch_id, type)
  WHERE read_at IS NULL;

-- ── Row Level Security ──────────────────────────────────────
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Todos os membros da empresa podem visualizar as notificações
CREATE POLICY "company_members_can_view_notifications"
  ON notifications FOR SELECT
  USING (
    company_id IN (
      SELECT id         FROM companies WHERE owner_id = auth.uid()
      UNION ALL
      SELECT company_id FROM employees
        WHERE user_id = auth.uid()
          AND active = true
          AND deleted_at IS NULL
    )
  );

-- Membros da empresa podem marcar como lido (atualizar read_at)
CREATE POLICY "company_members_can_mark_notifications_read"
  ON notifications FOR UPDATE
  USING (
    company_id IN (
      SELECT id         FROM companies WHERE owner_id = auth.uid()
      UNION ALL
      SELECT company_id FROM employees
        WHERE user_id = auth.uid()
          AND active = true
          AND deleted_at IS NULL
    )
  )
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

-- ── Função trigger: alerta de estoque baixo ─────────────────
-- Executada após cada INSERT em stock_movements.
-- SECURITY DEFINER para poder inserir em notifications
-- sem depender de RLS (o INSERT vem do trigger, não do usuário).
CREATE OR REPLACE FUNCTION fn_notify_low_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_stock BIGINT;
  v_min_stock     INTEGER;
  v_part_name     TEXT;
  v_branch_name   TEXT;
  v_type          TEXT;
BEGIN
  -- Calcula saldo atual da peça nesta filial após a movimentação
  SELECT COALESCE(SUM(quantity), 0)
  INTO v_current_stock
  FROM stock_movements
  WHERE part_id   = NEW.part_id
    AND branch_id = NEW.branch_id
    AND company_id = NEW.company_id;

  -- Busca dados da peça
  SELECT min_stock, name
  INTO v_min_stock, v_part_name
  FROM parts
  WHERE id = NEW.part_id;

  -- Determina o tipo de alerta
  IF v_current_stock <= 0 THEN
    v_type := 'estoque_zerado';
  ELSIF v_min_stock > 0 AND v_current_stock < v_min_stock THEN
    v_type := 'estoque_baixo';
  ELSE
    RETURN NEW; -- estoque OK, nada a fazer
  END IF;

  -- Dedup: não cria se já existe alerta não lido do mesmo tipo para peça+filial
  IF EXISTS (
    SELECT 1 FROM notifications
    WHERE company_id = NEW.company_id
      AND part_id    = NEW.part_id
      AND branch_id  = NEW.branch_id
      AND type       = v_type
      AND read_at IS NULL
  ) THEN
    RETURN NEW;
  END IF;

  -- Busca nome da filial
  SELECT name INTO v_branch_name FROM branches WHERE id = NEW.branch_id;

  -- Cria a notificação
  INSERT INTO notifications (company_id, type, title, body, part_id, branch_id)
  VALUES (
    NEW.company_id,
    v_type,
    CASE v_type
      WHEN 'estoque_zerado' THEN 'Estoque zerado: ' || v_part_name
      ELSE                       'Estoque baixo: '  || v_part_name
    END,
    CASE v_type
      WHEN 'estoque_zerado'
        THEN 'A peça "' || v_part_name || '" está sem estoque na filial ' || v_branch_name || '.'
      ELSE
        'A peça "' || v_part_name || '" está com estoque abaixo do mínimo (' ||
        v_current_stock || '/' || v_min_stock || ') na filial ' || v_branch_name || '.'
    END,
    NEW.part_id,
    NEW.branch_id
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_low_stock
  AFTER INSERT ON stock_movements
  FOR EACH ROW
  EXECUTE FUNCTION fn_notify_low_stock();
