-- Index so the LATERAL join for estimates hits service_order_id directly
-- (existing partial indexes only match WHERE deleted_at IS NULL; this one covers all rows)
CREATE INDEX IF NOT EXISTS service_order_estimates_service_order_id_idx
  ON public.service_order_estimates (service_order_id);

-- Paginated service order listing with search, filters, and embedded client/estimate data.
--
-- Replaces the two-query waterfall pattern:
--   1. SELECT id FROM clients WHERE name/phone/document ILIKE ?   (sequential)
--   2. SELECT ... FROM service_orders WHERE client_id IN (...)    (blocked on #1)
--
-- With a single SQL query that JOINs clients inline, so the TypeScript caller
-- can fire this alongside all auxiliary queries (branches, employees, etc.)
-- in one Promise.all.
--
-- Parameters
--   p_offset / p_limit   : pagination (0-indexed offset, row count)
--   p_search             : freetext searched across SO fields + client name/phone/document; NULL = no search
--   p_search_number      : integer parsed from p_search when it is fully numeric; NULL otherwise
--   p_statuses           : status whitelist; NULL = all statuses
--   p_branches           : branch whitelist; NULL = all branches
--   p_technicians        : technician whitelist; NULL = all technicians
--   p_restrict_branch    : non-NULL enforces branch_id = this value (non-admin restricted to one branch)
--
-- Returns JSONB: { total_count: number, rows: ServiceOrderData[] }
-- Each row embeds: client_data (object) + service_order_estimates (array with profiles)
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
  WITH
  -- Filter + paginate service orders with an inline client JOIN.
  -- COUNT(*) OVER() computes total matching rows without a second query.
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
      -- non-admin branch restriction
      AND (p_restrict_branch IS NULL OR so.branch_id = p_restrict_branch)
      -- status filter
      AND (p_statuses     IS NULL OR so.status          = ANY(p_statuses))
      -- branch filter
      AND (p_branches     IS NULL OR so.branch_id       = ANY(p_branches))
      -- technician filter
      AND (p_technicians  IS NULL OR so.technician_id   = ANY(p_technicians))
      -- freetext search: SO fields OR client fields — all in one scan, no pre-fetch
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

  -- For each paginated row, fetch its estimates via LATERAL (max p_limit iterations).
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
