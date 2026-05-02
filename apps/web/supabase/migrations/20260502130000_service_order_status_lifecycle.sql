-- Migração: novo ciclo de vida das OS
--
-- Novos statuses: aberta (renomeado de 'aguardando'), aguardando_envio, em_reparo
-- Nova tabela: os_technician_history (historio de quem pegou/liberou cada OS)

-- 1. Atualiza a constraint de status
ALTER TABLE service_orders DROP CONSTRAINT "service_orders_status_check";

UPDATE service_orders SET status = 'aberta' WHERE status = 'aguardando';

ALTER TABLE service_orders
  ADD CONSTRAINT "service_orders_status_check"
  CHECK (status = ANY (ARRAY[
    'aberta', 'em_analise', 'aguardando_envio', 'aguardando_aprovacao',
    'aprovado', 'reprovado', 'aguardando_peca', 'enviado_terceiro',
    'em_reparo', 'pronto', 'finalizado', 'cancelado'
  ]));

-- 2. Tabela de histórico de responsáveis
CREATE TABLE os_technician_history (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  service_order_id uuid     NOT NULL REFERENCES service_orders(id) ON DELETE CASCADE,
  company_id    uuid        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id   uuid        REFERENCES employees(id) ON DELETE SET NULL,
  action        text        NOT NULL CHECK (action IN ('pegou', 'liberou')),
  os_status_at_action text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX os_technician_history_so_idx  ON os_technician_history(service_order_id);
CREATE INDEX os_technician_history_co_idx  ON os_technician_history(company_id);
CREATE INDEX os_technician_history_emp_idx ON os_technician_history(employee_id);

-- 3. RLS
ALTER TABLE os_technician_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "os_history_select" ON os_technician_history
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM companies  WHERE id = company_id AND owner_id = auth.uid())
    OR
    EXISTS (SELECT 1 FROM employees  WHERE company_id = os_technician_history.company_id
                                       AND user_id = auth.uid()
                                       AND active = true
                                       AND deleted_at IS NULL)
  );

CREATE POLICY "os_history_insert" ON os_technician_history
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM companies WHERE id = company_id AND owner_id = auth.uid())
    OR
    EXISTS (SELECT 1 FROM employees WHERE company_id = os_technician_history.company_id
                                      AND user_id = auth.uid()
                                      AND active = true
                                      AND deleted_at IS NULL)
  );
