-- Corrige vazamento de dados entre empresas (broken tenant isolation).
--
-- As RPCs SECURITY DEFINER abaixo recebiam p_company_id como parâmetro do
-- cliente e não verificavam se o usuário autenticado pertence àquela empresa.
-- Como estavam liberadas para o papel `anon`, qualquer pessoa com a chave
-- pública conseguia ler dados (inclusive PII de clientes) de qualquer empresa
-- via /rest/v1/rpc/*.
--
-- Correção:
--   1. Guard fn_is_company_member(p_company_id) dentro de cada função.
--   2. REVOKE EXECUTE do papel anon (os chamadores legítimos são server
--      actions rodando como `authenticated`, então não perdem acesso).

-- ── list_service_orders_page ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION list_service_orders_page(
  p_company_id      UUID,
  p_offset          INTEGER,
  p_limit           INTEGER,
  p_search          TEXT    DEFAULT NULL,
  p_search_number   INTEGER DEFAULT NULL,
  p_statuses        TEXT[]  DEFAULT NULL,
  p_branches        UUID[]  DEFAULT NULL,
  p_technicians     UUID[]  DEFAULT NULL,
  p_restrict_branch UUID    DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  IF NOT fn_is_company_member(p_company_id) THEN
    RAISE EXCEPTION 'Acesso negado à empresa informada.' USING ERRCODE = '42501';
  END IF;

  WITH
  filtered AS (
    SELECT
      so.id,
      so.number,
      so.status,
      so.device_type,
      so.device_brand,
      so.device_model,
      so.device_serial,
      so.device_color,
      so.device_internal_code,
      so.device_condition,
      so.reported_issue,
      so.estimated_delivery,
      so.notes,
      so.branch_id,
      so.client_id,
      so.technician_id,
      so.third_party_id,
      so.created_at,
      so.client_notified_at,
      so.client_notified_via,
      jsonb_build_object(
        'id',       c.id,
        'name',     c.name,
        'phone',    c.phone,
        'document', c.document,
        'email',    c.email
      )                           AS client_data,
      COUNT(*) OVER ()            AS total_count
    FROM service_orders so
    JOIN clients c ON c.id = so.client_id
    WHERE so.company_id = p_company_id
      AND so.deleted_at IS NULL
      AND (p_restrict_branch IS NULL OR so.branch_id = p_restrict_branch)
      AND (p_statuses     IS NULL OR so.status          = ANY(p_statuses))
      AND (p_branches     IS NULL OR so.branch_id       = ANY(p_branches))
      AND (p_technicians  IS NULL OR so.technician_id   = ANY(p_technicians))
      AND (
        p_search IS NULL OR p_search = ''
        OR so.device_brand   ILIKE '%' || p_search || '%'
        OR so.device_model   ILIKE '%' || p_search || '%'
        OR so.device_serial  ILIKE '%' || p_search || '%'
        OR so.reported_issue ILIKE '%' || p_search || '%'
        OR so.number         =  p_search_number
        OR c.name            ILIKE '%' || p_search || '%'
        OR c.phone           ILIKE '%' || p_search || '%'
        OR c.document        ILIKE '%' || p_search || '%'
      )
    ORDER BY so.number DESC
    LIMIT p_limit OFFSET p_offset
  ),

  with_estimates AS (
    SELECT
      f.*,
      est.estimates
    FROM filtered f
    LEFT JOIN LATERAL (
      SELECT COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'id',           soe.id,
            'version',      soe.version,
            'total_amount', soe.total_amount::float8,
            'status',       soe.status,
            'valid_until',  soe.valid_until,
            'profiles',     CASE
                              WHEN p.name IS NOT NULL
                              THEN jsonb_build_object('name', p.name)
                              ELSE NULL
                            END
          )
          ORDER BY soe.version DESC
        ) FILTER (WHERE soe.id IS NOT NULL),
        '[]'::jsonb
      ) AS estimates
      FROM service_order_estimates soe
      LEFT JOIN profiles p ON p.id = soe.created_by
      WHERE soe.service_order_id = f.id
    ) est ON true
  )

  SELECT jsonb_build_object(
    'total_count', COALESCE(MAX(we.total_count), 0),
    'rows', COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id',                   we.id,
          'number',               we.number,
          'status',               we.status,
          'device_type',          we.device_type,
          'device_brand',         we.device_brand,
          'device_model',         we.device_model,
          'device_serial',        we.device_serial,
          'device_color',         we.device_color,
          'device_internal_code', we.device_internal_code,
          'device_condition',     we.device_condition,
          'reported_issue',       we.reported_issue,
          'estimated_delivery',   we.estimated_delivery,
          'notes',                we.notes,
          'branch_id',            we.branch_id,
          'client_id',            we.client_id,
          'technician_id',        we.technician_id,
          'third_party_id',       we.third_party_id,
          'created_at',           we.created_at,
          'client_notified_at',   we.client_notified_at,
          'client_notified_via',  we.client_notified_via,
          'client_data',          we.client_data,
          'service_order_estimates', we.estimates
        )
        ORDER BY we.number DESC
      ),
      '[]'::jsonb
    )
  )
  INTO v_result
  FROM with_estimates we;

  RETURN v_result;
END;
$$;

-- ── get_dashboard_overview ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_dashboard_overview(
  p_company_id    UUID,
  p_start_date    TEXT,
  p_end_date      TEXT,
  p_open_statuses TEXT[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  IF NOT fn_is_company_member(p_company_id) THEN
    RAISE EXCEPTION 'Acesso negado à empresa informada.' USING ERRCODE = '42501';
  END IF;

  WITH
  so_stats AS (
    SELECT
      branch_id,
      COUNT(*) FILTER (WHERE status = ANY(p_open_statuses))                        AS open_count,
      COUNT(*) FILTER (
        WHERE status      = 'finalizado'
          AND delivered_at IS NOT NULL
          AND delivered_at >= p_start_date::timestamptz
          AND delivered_at <= p_end_date::timestamptz
      )                                                                              AS delivered_count
    FROM service_orders
    WHERE company_id = p_company_id
      AND deleted_at IS NULL
      AND (
            status = ANY(p_open_statuses)
            OR (
              status       = 'finalizado'
              AND delivered_at IS NOT NULL
              AND delivered_at >= p_start_date::timestamptz
              AND delivered_at <= p_end_date::timestamptz
            )
          )
    GROUP BY branch_id
  ),

  ce_stats AS (
    SELECT
      branch_id,
      SUM(net_amount)::float8                  AS branch_revenue,
      COUNT(DISTINCT service_order_id)         AS paid_order_count
    FROM cash_entries
    WHERE company_id = p_company_id
      AND created_at >= p_start_date::timestamptz
      AND created_at <= p_end_date::timestamptz
    GROUP BY branch_id
  ),

  bill_stats AS (
    SELECT
      branch_id,
      SUM(amount)::float8 AS branch_expenses
    FROM bills
    WHERE company_id = p_company_id
      AND deleted_at IS NULL
      AND status   = 'pago'
      AND paid_at  IS NOT NULL
      AND paid_at  >= p_start_date::timestamptz
      AND paid_at  <= p_end_date::timestamptz
    GROUP BY branch_id
  ),

  branch_perf AS (
    SELECT
      b.id                                         AS branch_id,
      b.name                                       AS branch_name,
      COALESCE(sos.open_count, 0)                 AS open_orders,
      COALESCE(sos.delivered_count, 0)            AS delivered_orders,
      COALESCE(ces.branch_revenue,  0)::float8    AS revenue,
      COALESCE(bs.branch_expenses,  0)::float8    AS expenses
    FROM branches b
    LEFT JOIN so_stats   sos ON b.id = sos.branch_id
    LEFT JOIN ce_stats   ces ON b.id = ces.branch_id
    LEFT JOIN bill_stats bs  ON b.id = bs.branch_id
    WHERE b.company_id = p_company_id
      AND b.deleted_at IS NULL
      AND b.active     = true
  )

  SELECT jsonb_build_object(
    'kpis', jsonb_build_object(
      'open_service_orders',
        (SELECT COALESCE(SUM(open_count),       0)         FROM so_stats),
      'delivered_service_orders',
        (SELECT COALESCE(SUM(delivered_count),  0)         FROM so_stats),
      'revenue',
        (SELECT COALESCE(SUM(branch_revenue),   0)::float8 FROM ce_stats),
      'operational_expenses',
        (SELECT COALESCE(SUM(branch_expenses),  0)::float8 FROM bill_stats),
      'paid_order_count',
        (SELECT COALESCE(SUM(paid_order_count), 0)         FROM ce_stats)
    ),

    'branch_performance', (
      SELECT COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'branch_id',        bp.branch_id,
            'branch_name',      bp.branch_name,
            'open_orders',      bp.open_orders,
            'delivered_orders', bp.delivered_orders,
            'revenue',          bp.revenue,
            'expenses',         bp.expenses,
            'net_result',       (bp.revenue - bp.expenses)::float8
          )
          ORDER BY bp.revenue DESC, bp.open_orders DESC
        ),
        '[]'::jsonb
      )
      FROM branch_perf bp
    ),

    'recent_orders', (
      SELECT COALESCE(jsonb_agg(ro), '[]'::jsonb)
      FROM (
        SELECT
          so.id,
          so.number,
          so.status,
          so.device_type,
          so.device_brand,
          so.device_model,
          so.created_at,
          c.name  AS client_name,
          c.phone AS client_phone,
          br.name AS branch_name
        FROM service_orders so
        LEFT JOIN clients  c  ON c.id  = so.client_id
        LEFT JOIN branches br ON br.id = so.branch_id
        WHERE so.company_id = p_company_id
          AND so.deleted_at IS NULL
        ORDER BY so.number DESC
        LIMIT 6
      ) ro
    )
  )
  INTO v_result;

  RETURN v_result;
END;
$$;

-- ── search_clients_global ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION search_clients_global(
  p_company_id  uuid,
  p_term        text,
  p_numeric     text,
  p_lim         int     DEFAULT 20,
  p_only_active boolean DEFAULT false
)
RETURNS TABLE (
  id       uuid,
  name     text,
  phone    text,
  document text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT ON (c.name, c.id)
    c.id,
    c.name,
    c.phone,
    c.document
  FROM clients c
  WHERE c.company_id = p_company_id
    AND fn_is_company_member(p_company_id)
    AND c.deleted_at IS NULL
    AND (NOT p_only_active OR c.active)
    AND (
      c.name ILIKE '%' || p_term || '%'
      OR (length(p_numeric) >= 3 AND (
        regexp_replace(coalesce(c.phone, ''),    '\D', '', 'g') LIKE '%' || p_numeric || '%'
        OR regexp_replace(coalesce(c.document, ''), '\D', '', 'g') LIKE '%' || p_numeric || '%'
      ))
    )
  ORDER BY c.name, c.id
  LIMIT p_lim
$$;

-- ── get_client_stats ──────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_client_stats(
  p_client_id  uuid,
  p_company_id uuid
)
RETURNS TABLE (
  total_orders  bigint,
  open_orders   bigint,
  total_paid    numeric,
  last_order_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COUNT(*)                                                                       AS total_orders,
    COUNT(*) FILTER (WHERE status IN (
      'aberta','em_analise','aguardando_envio','aguardando_aprovacao',
      'aprovado','aguardando_peca','enviado_terceiro','em_reparo','pronto'
    ))                                                                             AS open_orders,
    COALESCE(SUM(amount_paid) FILTER (WHERE payment_status = 'pago'), 0)          AS total_paid,
    MAX(created_at)                                                                AS last_order_at
  FROM service_orders
  WHERE client_id  = p_client_id
    AND company_id = p_company_id
    AND fn_is_company_member(p_company_id)
    AND deleted_at IS NULL
$$;

-- ── Revoga execução pelo papel anônimo (público) ──────────────────────────────
REVOKE EXECUTE ON FUNCTION
  list_service_orders_page(uuid, integer, integer, text, integer, text[], uuid[], uuid[], uuid)
  FROM anon;
REVOKE EXECUTE ON FUNCTION
  get_dashboard_overview(uuid, text, text, text[])
  FROM anon;
REVOKE EXECUTE ON FUNCTION
  search_clients_global(uuid, text, text, integer, boolean)
  FROM anon;
REVOKE EXECUTE ON FUNCTION
  get_client_stats(uuid, uuid)
  FROM anon;

-- Funções de manutenção/trigger que mutam dados não devem ser chamáveis pelo
-- papel anônimo via API REST (os triggers seguem funcionando normalmente).
REVOKE EXECUTE ON FUNCTION cleanup_expired_whatsapp_messages()      FROM anon;
REVOKE EXECUTE ON FUNCTION fn_notify_low_stock()                    FROM anon;
REVOKE EXECUTE ON FUNCTION fn_notify_inactive_clients(integer)      FROM anon;
REVOKE EXECUTE ON FUNCTION recalculate_client_classification(uuid)  FROM anon;
REVOKE EXECUTE ON FUNCTION trigger_recalculate_client_classification() FROM anon;
REVOKE EXECUTE ON FUNCTION sync_technician_payout_from_bill()       FROM anon;
