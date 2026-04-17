-- ============================================================
-- Hardening de RLS, RPC SECURITY DEFINER e views de estoque.
-- Remove confiança em app_metadata para autorização sensível e
-- força checagens no banco para chamadas diretas via API/RPC.
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_active_company_admin(p_company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    EXISTS (
      SELECT 1
      FROM public.companies
      WHERE companies.id = p_company_id
        AND companies.owner_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1
      FROM public.employees
      WHERE employees.company_id = p_company_id
        AND employees.user_id = (SELECT auth.uid())
        AND employees.role = 'admin'
        AND employees.active = true
        AND employees.deleted_at IS NULL
    );
$$;

REVOKE ALL ON FUNCTION public.is_active_company_admin(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_active_company_admin(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_active_company_admin(UUID) TO authenticated;

-- ── Empresa e funcionários ──────────────────────────────────
DROP POLICY IF EXISTS companies_employee_select ON public.companies;
CREATE POLICY companies_employee_select
  ON public.companies FOR SELECT TO authenticated
  USING (
    owner_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.employees
      WHERE employees.company_id = companies.id
        AND employees.user_id = (SELECT auth.uid())
        AND employees.active = true
        AND employees.deleted_at IS NULL
    )
  );

DROP POLICY IF EXISTS employees_select ON public.employees;
CREATE POLICY employees_select
  ON public.employees FOR SELECT TO authenticated
  USING (public.is_active_company_admin(company_id));

DROP POLICY IF EXISTS employees_self_select ON public.employees;
CREATE POLICY employees_self_select
  ON public.employees FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS employees_insert ON public.employees;
CREATE POLICY employees_insert
  ON public.employees FOR INSERT TO authenticated
  WITH CHECK (public.is_active_company_admin(company_id));

DROP POLICY IF EXISTS employees_update ON public.employees;
CREATE POLICY employees_update
  ON public.employees FOR UPDATE TO authenticated
  USING (public.is_active_company_admin(company_id))
  WITH CHECK (public.is_active_company_admin(company_id));

DROP POLICY IF EXISTS employees_delete ON public.employees;
CREATE POLICY employees_delete
  ON public.employees FOR DELETE TO authenticated
  USING (public.is_active_company_admin(company_id));

-- ── Clientes ────────────────────────────────────────────────
DROP POLICY IF EXISTS clients_select ON public.clients;
CREATE POLICY clients_select
  ON public.clients FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      EXISTS (
        SELECT 1 FROM public.companies
        WHERE companies.id = clients.company_id
          AND companies.owner_id = (SELECT auth.uid())
      )
      OR EXISTS (
        SELECT 1 FROM public.employees
        WHERE employees.company_id = clients.company_id
          AND employees.user_id = (SELECT auth.uid())
          AND employees.active = true
          AND employees.deleted_at IS NULL
      )
    )
  );

DROP POLICY IF EXISTS clients_insert ON public.clients;
CREATE POLICY clients_insert
  ON public.clients FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.companies
      WHERE companies.id = clients.company_id
        AND companies.owner_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.employees
      WHERE employees.company_id = clients.company_id
        AND employees.user_id = (SELECT auth.uid())
        AND employees.role IN ('admin', 'atendente', 'tecnico')
        AND employees.active = true
        AND employees.deleted_at IS NULL
    )
  );

DROP POLICY IF EXISTS clients_update ON public.clients;
CREATE POLICY clients_update
  ON public.clients FOR UPDATE TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      EXISTS (
        SELECT 1 FROM public.companies
        WHERE companies.id = clients.company_id
          AND companies.owner_id = (SELECT auth.uid())
      )
      OR EXISTS (
        SELECT 1 FROM public.employees
        WHERE employees.company_id = clients.company_id
          AND employees.user_id = (SELECT auth.uid())
          AND employees.role = 'admin'
          AND employees.active = true
          AND employees.deleted_at IS NULL
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.companies
      WHERE companies.id = clients.company_id
        AND companies.owner_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.employees
      WHERE employees.company_id = clients.company_id
        AND employees.user_id = (SELECT auth.uid())
        AND employees.role = 'admin'
        AND employees.active = true
        AND employees.deleted_at IS NULL
    )
  );

DROP POLICY IF EXISTS clients_delete ON public.clients;
CREATE POLICY clients_delete
  ON public.clients FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.companies
      WHERE companies.id = clients.company_id
        AND companies.owner_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.employees
      WHERE employees.company_id = clients.company_id
        AND employees.user_id = (SELECT auth.uid())
        AND employees.role = 'admin'
        AND employees.active = true
        AND employees.deleted_at IS NULL
    )
  );

-- ── Fornecedores ────────────────────────────────────────────
DROP POLICY IF EXISTS suppliers_select ON public.suppliers;
CREATE POLICY suppliers_select
  ON public.suppliers FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      EXISTS (
        SELECT 1 FROM public.companies
        WHERE companies.id = suppliers.company_id
          AND companies.owner_id = (SELECT auth.uid())
      )
      OR EXISTS (
        SELECT 1 FROM public.employees
        WHERE employees.company_id = suppliers.company_id
          AND employees.user_id = (SELECT auth.uid())
          AND employees.active = true
          AND employees.deleted_at IS NULL
      )
    )
  );

DROP POLICY IF EXISTS suppliers_insert ON public.suppliers;
CREATE POLICY suppliers_insert
  ON public.suppliers FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.companies
      WHERE companies.id = suppliers.company_id
        AND companies.owner_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.employees
      WHERE employees.company_id = suppliers.company_id
        AND employees.user_id = (SELECT auth.uid())
        AND employees.role = 'admin'
        AND employees.active = true
        AND employees.deleted_at IS NULL
    )
  );

DROP POLICY IF EXISTS suppliers_update ON public.suppliers;
CREATE POLICY suppliers_update
  ON public.suppliers FOR UPDATE TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      EXISTS (
        SELECT 1 FROM public.companies
        WHERE companies.id = suppliers.company_id
          AND companies.owner_id = (SELECT auth.uid())
      )
      OR EXISTS (
        SELECT 1 FROM public.employees
        WHERE employees.company_id = suppliers.company_id
          AND employees.user_id = (SELECT auth.uid())
          AND employees.role = 'admin'
          AND employees.active = true
          AND employees.deleted_at IS NULL
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.companies
      WHERE companies.id = suppliers.company_id
        AND companies.owner_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.employees
      WHERE employees.company_id = suppliers.company_id
        AND employees.user_id = (SELECT auth.uid())
        AND employees.role = 'admin'
        AND employees.active = true
        AND employees.deleted_at IS NULL
    )
  );

DROP POLICY IF EXISTS suppliers_delete ON public.suppliers;
CREATE POLICY suppliers_delete
  ON public.suppliers FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.companies
      WHERE companies.id = suppliers.company_id
        AND companies.owner_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.employees
      WHERE employees.company_id = suppliers.company_id
        AND employees.user_id = (SELECT auth.uid())
        AND employees.role = 'admin'
        AND employees.active = true
        AND employees.deleted_at IS NULL
    )
  );

-- ── Terceirizadas ───────────────────────────────────────────
DROP POLICY IF EXISTS third_parties_select ON public.third_parties;
CREATE POLICY third_parties_select
  ON public.third_parties FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      EXISTS (
        SELECT 1 FROM public.companies
        WHERE companies.id = third_parties.company_id
          AND companies.owner_id = (SELECT auth.uid())
      )
      OR EXISTS (
        SELECT 1 FROM public.employees
        WHERE employees.company_id = third_parties.company_id
          AND employees.user_id = (SELECT auth.uid())
          AND employees.active = true
          AND employees.deleted_at IS NULL
      )
    )
  );

DROP POLICY IF EXISTS third_parties_insert ON public.third_parties;
CREATE POLICY third_parties_insert
  ON public.third_parties FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.companies
      WHERE companies.id = third_parties.company_id
        AND companies.owner_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.employees
      WHERE employees.company_id = third_parties.company_id
        AND employees.user_id = (SELECT auth.uid())
        AND employees.role = 'admin'
        AND employees.active = true
        AND employees.deleted_at IS NULL
    )
  );

DROP POLICY IF EXISTS third_parties_update ON public.third_parties;
CREATE POLICY third_parties_update
  ON public.third_parties FOR UPDATE TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      EXISTS (
        SELECT 1 FROM public.companies
        WHERE companies.id = third_parties.company_id
          AND companies.owner_id = (SELECT auth.uid())
      )
      OR EXISTS (
        SELECT 1 FROM public.employees
        WHERE employees.company_id = third_parties.company_id
          AND employees.user_id = (SELECT auth.uid())
          AND employees.role = 'admin'
          AND employees.active = true
          AND employees.deleted_at IS NULL
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.companies
      WHERE companies.id = third_parties.company_id
        AND companies.owner_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.employees
      WHERE employees.company_id = third_parties.company_id
        AND employees.user_id = (SELECT auth.uid())
        AND employees.role = 'admin'
        AND employees.active = true
        AND employees.deleted_at IS NULL
    )
  );

DROP POLICY IF EXISTS third_parties_delete ON public.third_parties;
CREATE POLICY third_parties_delete
  ON public.third_parties FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.companies
      WHERE companies.id = third_parties.company_id
        AND companies.owner_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.employees
      WHERE employees.company_id = third_parties.company_id
        AND employees.user_id = (SELECT auth.uid())
        AND employees.role = 'admin'
        AND employees.active = true
        AND employees.deleted_at IS NULL
    )
  );

-- ── Auditoria ───────────────────────────────────────────────
DROP POLICY IF EXISTS "Company members can view audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Owners and admins can view audit logs" ON public.audit_logs;
CREATE POLICY "Owners and admins can view audit logs"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.companies
      WHERE companies.id = audit_logs.company_id
        AND companies.owner_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.employees
      WHERE employees.company_id = audit_logs.company_id
        AND employees.user_id = (SELECT auth.uid())
        AND employees.role = 'admin'
        AND employees.active = true
        AND employees.deleted_at IS NULL
    )
  );

DROP POLICY IF EXISTS "Authenticated users can create audit logs for own company" ON public.audit_logs;
CREATE POLICY "Authenticated users can create audit logs for own company"
  ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.companies
      WHERE companies.id = audit_logs.company_id
        AND companies.owner_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.employees
      WHERE employees.company_id = audit_logs.company_id
        AND employees.user_id = (SELECT auth.uid())
        AND employees.active = true
        AND employees.deleted_at IS NULL
    )
  );

-- ── Financeiro ──────────────────────────────────────────────
DROP POLICY IF EXISTS "company_members_can_view_bills" ON public.bills;
CREATE POLICY "company_admins_can_view_bills"
  ON public.bills FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      EXISTS (
        SELECT 1 FROM public.companies
        WHERE companies.id = bills.company_id
          AND companies.owner_id = (SELECT auth.uid())
      )
      OR EXISTS (
        SELECT 1 FROM public.employees
        WHERE employees.company_id = bills.company_id
          AND employees.user_id = (SELECT auth.uid())
          AND employees.role = 'admin'
          AND employees.active = true
          AND employees.deleted_at IS NULL
      )
    )
  );

DROP POLICY IF EXISTS "company_admins_can_insert_bills" ON public.bills;
CREATE POLICY "company_admins_can_insert_bills"
  ON public.bills FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.companies
      WHERE companies.id = bills.company_id
        AND companies.owner_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.employees
      WHERE employees.company_id = bills.company_id
        AND employees.user_id = (SELECT auth.uid())
        AND employees.role = 'admin'
        AND employees.active = true
        AND employees.deleted_at IS NULL
    )
  );

DROP POLICY IF EXISTS "company_admins_can_update_bills" ON public.bills;
CREATE POLICY "company_admins_can_update_bills"
  ON public.bills FOR UPDATE TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      EXISTS (
        SELECT 1 FROM public.companies
        WHERE companies.id = bills.company_id
          AND companies.owner_id = (SELECT auth.uid())
      )
      OR EXISTS (
        SELECT 1 FROM public.employees
        WHERE employees.company_id = bills.company_id
          AND employees.user_id = (SELECT auth.uid())
          AND employees.role = 'admin'
          AND employees.active = true
          AND employees.deleted_at IS NULL
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.companies
      WHERE companies.id = bills.company_id
        AND companies.owner_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.employees
      WHERE employees.company_id = bills.company_id
        AND employees.user_id = (SELECT auth.uid())
        AND employees.role = 'admin'
        AND employees.active = true
        AND employees.deleted_at IS NULL
    )
  );

-- ── Views de estoque com RLS do invocador ───────────────────
CREATE OR REPLACE VIEW public.v_stock_positions
WITH (security_invoker = true)
AS
SELECT
  sm.company_id,
  sm.branch_id,
  sm.part_id,
  SUM(sm.quantity) AS current_stock
FROM public.stock_movements sm
GROUP BY sm.company_id, sm.branch_id, sm.part_id;

COMMENT ON VIEW public.v_stock_positions IS
  'Saldo atual de estoque por peça por filial. Calculado a partir da soma de todas as movimentações.';

CREATE OR REPLACE VIEW public.v_stock_available
WITH (security_invoker = true)
AS
SELECT
  pos.company_id,
  pos.branch_id,
  pos.part_id,
  pos.current_stock                              AS estoque_fisico,
  COALESCE(res.reservado, 0)                     AS estoque_reservado,
  pos.current_stock - COALESCE(res.reservado, 0) AS estoque_disponivel
FROM public.v_stock_positions pos
LEFT JOIN (
  SELECT company_id, branch_id, part_id, SUM(quantity) AS reservado
  FROM public.stock_reservations
  WHERE status = 'ativa'
  GROUP BY company_id, branch_id, part_id
) res ON  res.company_id = pos.company_id
      AND res.branch_id  = pos.branch_id
      AND res.part_id    = pos.part_id;

COMMENT ON VIEW public.v_stock_available IS
  'Disponível = físico (soma de movimentações) menos reservas ativas de orçamentos.';

-- ── RPC: transferência de estoque ───────────────────────────
CREATE OR REPLACE FUNCTION public.create_stock_transfer(
  p_company_id     UUID,
  p_from_branch_id UUID,
  p_to_branch_id   UUID,
  p_part_id        UUID,
  p_quantity       INTEGER,
  p_notes          TEXT,
  p_entry_date     DATE,
  p_created_by     UUID
)
RETURNS TABLE(saida_id UUID, entrada_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auth_uid        UUID := (SELECT auth.uid());
  v_is_owner        BOOLEAN := false;
  v_employee_role   TEXT;
  v_branch_count    INTEGER := 0;
  v_available_stock INTEGER := 0;
  v_ref_id          UUID := gen_random_uuid();
  v_saida_id        UUID;
  v_entrada_id      UUID;
BEGIN
  IF v_auth_uid IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado.' USING ERRCODE = '28000';
  END IF;

  IF p_created_by IS DISTINCT FROM v_auth_uid THEN
    RAISE EXCEPTION 'Usuário criador inválido para a transferência.' USING ERRCODE = '42501';
  END IF;

  IF p_company_id IS NULL
    OR p_from_branch_id IS NULL
    OR p_to_branch_id IS NULL
    OR p_part_id IS NULL
    OR p_quantity IS NULL THEN
    RAISE EXCEPTION 'Parâmetros obrigatórios ausentes.' USING ERRCODE = '22023';
  END IF;

  IF p_quantity <= 0 THEN
    RAISE EXCEPTION 'Quantidade de transferência deve ser maior que zero.' USING ERRCODE = '22023';
  END IF;

  IF p_from_branch_id = p_to_branch_id THEN
    RAISE EXCEPTION 'Filiais de origem e destino devem ser diferentes.' USING ERRCODE = '22023';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.companies
    WHERE companies.id = p_company_id
      AND companies.owner_id = v_auth_uid
  )
  INTO v_is_owner;

  IF NOT v_is_owner THEN
    SELECT employees.role
    INTO v_employee_role
    FROM public.employees
    WHERE employees.company_id = p_company_id
      AND employees.user_id = v_auth_uid
      AND employees.active = true
      AND employees.deleted_at IS NULL
    LIMIT 1;

    IF v_employee_role IS DISTINCT FROM 'admin' THEN
      RAISE EXCEPTION 'Usuário sem permissão para transferir estoque.' USING ERRCODE = '42501';
    END IF;
  END IF;

  SELECT COUNT(*)
  INTO v_branch_count
  FROM public.branches
  WHERE branches.company_id = p_company_id
    AND branches.id IN (p_from_branch_id, p_to_branch_id)
    AND branches.deleted_at IS NULL
    AND COALESCE(branches.active, true) = true;

  IF v_branch_count <> 2 THEN
    RAISE EXCEPTION 'Filiais da transferência inválidas para a empresa.' USING ERRCODE = '23503';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.parts
    WHERE parts.id = p_part_id
      AND parts.company_id = p_company_id
      AND parts.active = true
      AND parts.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Peça inválida para a empresa.' USING ERRCODE = '23503';
  END IF;

  LOCK TABLE public.stock_movements IN SHARE ROW EXCLUSIVE MODE;
  LOCK TABLE public.stock_reservations IN SHARE ROW EXCLUSIVE MODE;

  SELECT
    COALESCE((
      SELECT SUM(stock_movements.quantity)
      FROM public.stock_movements
      WHERE stock_movements.company_id = p_company_id
        AND stock_movements.branch_id = p_from_branch_id
        AND stock_movements.part_id = p_part_id
    ), 0)
    - COALESCE((
      SELECT SUM(stock_reservations.quantity)
      FROM public.stock_reservations
      WHERE stock_reservations.company_id = p_company_id
        AND stock_reservations.branch_id = p_from_branch_id
        AND stock_reservations.part_id = p_part_id
        AND stock_reservations.status = 'ativa'
    ), 0)
  INTO v_available_stock;

  IF p_quantity > v_available_stock THEN
    RAISE EXCEPTION 'Saldo disponível insuficiente na filial de origem.' USING ERRCODE = '23514';
  END IF;

  INSERT INTO public.stock_movements (
    company_id, branch_id, part_id,
    movement_type, quantity,
    notes, reference_type, reference_id,
    entry_date, created_by
  ) VALUES (
    p_company_id, p_from_branch_id, p_part_id,
    'transferencia_saida', -p_quantity,
    NULLIF(BTRIM(p_notes), ''), 'transferencia', v_ref_id,
    COALESCE(p_entry_date, CURRENT_DATE), p_created_by
  ) RETURNING id INTO v_saida_id;

  INSERT INTO public.stock_movements (
    company_id, branch_id, part_id,
    movement_type, quantity,
    notes, reference_type, reference_id,
    entry_date, created_by
  ) VALUES (
    p_company_id, p_to_branch_id, p_part_id,
    'transferencia_entrada', p_quantity,
    NULLIF(BTRIM(p_notes), ''), 'transferencia', v_ref_id,
    COALESCE(p_entry_date, CURRENT_DATE), p_created_by
  ) RETURNING id INTO v_entrada_id;

  RETURN QUERY SELECT v_saida_id, v_entrada_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_stock_transfer(UUID, UUID, UUID, UUID, INTEGER, TEXT, DATE, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_stock_transfer(UUID, UUID, UUID, UUID, INTEGER, TEXT, DATE, UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_stock_transfer(UUID, UUID, UUID, UUID, INTEGER, TEXT, DATE, UUID) TO authenticated;

-- ── RPC: notificações de retorno de terceirizada ────────────
CREATE OR REPLACE FUNCTION public.fn_notify_third_party_overdue()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auth_uid   UUID := (SELECT auth.uid());
  v_company_id UUID;
  rec RECORD;
BEGIN
  IF v_auth_uid IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado.' USING ERRCODE = '28000';
  END IF;

  SELECT companies.id
  INTO v_company_id
  FROM public.companies
  WHERE companies.owner_id = v_auth_uid
  LIMIT 1;

  IF v_company_id IS NULL THEN
    SELECT employees.company_id
    INTO v_company_id
    FROM public.employees
    WHERE employees.user_id = v_auth_uid
      AND employees.active = true
      AND employees.deleted_at IS NULL
    LIMIT 1;
  END IF;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Usuário sem empresa ativa vinculada.' USING ERRCODE = '42501';
  END IF;

  FOR rec IN
    SELECT
      so.id            AS service_order_id,
      so.company_id,
      so.number        AS os_number,
      tp.name          AS third_party_name
    FROM public.service_orders so
    JOIN public.third_parties tp ON tp.id = so.third_party_id
    WHERE so.company_id = v_company_id
      AND so.status = 'enviado_terceiro'
      AND so.deleted_at IS NULL
      AND so.third_party_expected_return_at IS NOT NULL
      AND so.third_party_expected_return_at < CURRENT_DATE
      AND NOT EXISTS (
        SELECT 1 FROM public.notifications n
        WHERE n.company_id = so.company_id
          AND n.service_order_id = so.id
          AND n.type = 'retorno_terceiro_vencido'
          AND n.read_at IS NULL
      )
  LOOP
    INSERT INTO public.notifications (
      company_id,
      type,
      title,
      body,
      service_order_id
    ) VALUES (
      rec.company_id,
      'retorno_terceiro_vencido',
      'Retorno vencido: OS #' || rec.os_number,
      'O prazo de retorno da OS #' || rec.os_number || ' de "' || rec.third_party_name || '" já passou. Confirme o retorno do equipamento.',
      rec.service_order_id
    );
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_notify_third_party_overdue() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_notify_third_party_overdue() FROM anon;
GRANT EXECUTE ON FUNCTION public.fn_notify_third_party_overdue() TO authenticated;
