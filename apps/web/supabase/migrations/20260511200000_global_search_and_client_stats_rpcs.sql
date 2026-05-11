-- RPC: search_clients_global
-- Replaces 3 separate queries + JS-side merge in global search.
-- Handles name, digits-only, and formatted phone/document patterns in one query.
CREATE OR REPLACE FUNCTION search_clients_global(
  p_company_id  uuid,
  p_term        text,
  p_numeric     text,
  p_lim         int DEFAULT 20
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
    AND c.deleted_at IS NULL
    AND (
      c.name     ILIKE '%' || p_term    || '%'
      OR (length(p_numeric) >= 3 AND (
        c.phone    ILIKE '%' || p_numeric || '%'
        OR c.document ILIKE '%' || p_numeric || '%'
      ))
      OR (p_term <> p_numeric AND length(p_numeric) >= 4 AND (
        c.phone    ILIKE '%' || p_term   || '%'
        OR c.document ILIKE '%' || p_term   || '%'
      ))
    )
  ORDER BY c.name, c.id
  LIMIT p_lim
$$;

GRANT EXECUTE ON FUNCTION search_clients_global(uuid, text, text, int) TO authenticated;


-- RPC: get_client_stats
-- Replaces app-side .filter() + .reduce() over a full unbounded dataset.
-- Returns aggregated counts and financial total in a single DB scan.
CREATE OR REPLACE FUNCTION get_client_stats(
  p_client_id  uuid,
  p_company_id uuid
)
RETURNS TABLE (
  total_orders bigint,
  open_orders  bigint,
  total_paid   numeric,
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
    AND deleted_at IS NULL
$$;

GRANT EXECUTE ON FUNCTION get_client_stats(uuid, uuid) TO authenticated;
