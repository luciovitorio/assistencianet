-- Supporting indexes for the dashboard overview RPC
-- These allow Postgres to satisfy each CTE with an index-only scan instead of a full table scan.

CREATE INDEX IF NOT EXISTS service_orders_company_status_delivered_idx
  ON public.service_orders (company_id, status, delivered_at)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS cash_entries_company_created_at_idx
  ON public.cash_entries (company_id, created_at);

CREATE INDEX IF NOT EXISTS bills_company_status_paid_at_idx
  ON public.bills (company_id, status, paid_at)
  WHERE deleted_at IS NULL;

-- Dashboard overview RPC
--
-- Replaces 5 separate queries (3× service_orders, cash_entries, bills) with:
--   • 1 scan of service_orders  (open + delivered counts via FILTER)
--   • 1 scan of cash_entries    (revenue + paid order count per branch)
--   • 1 scan of bills           (expenses per branch)
--   • 1 scan of branches        (joined in-DB, no round-trip)
--   • 1 subquery for recent 6 orders
-- All returned as a single JSONB payload in one network round-trip.
--
-- SECURITY DEFINER is safe here because p_company_id is always sourced from
-- getAdminContext() on the server, which verifies user authorization before
-- passing the value to this function.
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
  WITH
  -- Single scan of service_orders: open count + delivered-this-period count, grouped by branch.
  -- FILTER avoids a second table scan for the delivered subset.
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

  -- Single scan of cash_entries: revenue and distinct paid-order count per branch.
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

  -- Single scan of bills: expenses per branch.
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

  -- Join aggregated stats to branch metadata inside Postgres.
  -- Entries with NULL branch_id are included in global KPI totals (via so_stats/ce_stats/bill_stats)
  -- but intentionally excluded from per-branch performance (no matching branches row).
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
