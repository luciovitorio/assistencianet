-- ============================================================
-- Função para criar notificações de retorno vencido de terceiro.
-- Chamada periodicamente via Server Action ao carregar o dashboard.
-- Cria uma notificação por OS vencida, sem duplicar notificações
-- não lidas já existentes.
-- ============================================================

CREATE OR REPLACE FUNCTION public.fn_notify_third_party_overdue()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT
      so.id            AS service_order_id,
      so.company_id,
      so.number        AS os_number,
      tp.name          AS third_party_name
    FROM public.service_orders so
    JOIN public.third_parties tp ON tp.id = so.third_party_id
    WHERE so.status = 'enviado_terceiro'
      AND so.deleted_at IS NULL
      AND so.third_party_expected_return_at IS NOT NULL
      AND so.third_party_expected_return_at < CURRENT_DATE
      -- Não cria se já existe notificação não lida para esta OS
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
      'O prazo de retorno da OS #' || rec.os_number || ' de "' || rec.third_party_name || '" já passou. Confirme o retorno do equipamento.'
    ,
      rec.service_order_id
    );
  END LOOP;
END;
$$;

-- Política de INSERT para permitir que a função SECURITY DEFINER insira
-- (já existente via "company_members_can_insert_notifications", mas
-- a função usa SECURITY DEFINER então ignora RLS — isso é intencional)
