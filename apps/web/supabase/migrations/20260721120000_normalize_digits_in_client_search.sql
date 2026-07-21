-- Busca de clientes por CPF/telefone falhava porque as colunas guardam valores
-- formatados ("016.880.777-74", "(21) 96445-3182") e a comparação era feita
-- contra o termo sem formatação. Normaliza os dois lados para dígitos.

DROP FUNCTION IF EXISTS search_clients_global(uuid, text, text, int);

CREATE FUNCTION search_clients_global(
  p_company_id  uuid,
  p_term        text,
  p_numeric     text,
  p_lim         int DEFAULT 20,
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

GRANT EXECUTE ON FUNCTION search_clients_global(uuid, text, text, int, boolean) TO authenticated;
