-- ============================================================
-- Adiciona campos de terceirização à service_orders e inclui
-- o status 'enviado_terceiro' no fluxo da OS.
-- ============================================================

-- 1. Campos de rastreamento na OS
ALTER TABLE public.service_orders
  ADD COLUMN IF NOT EXISTS third_party_id            UUID        REFERENCES public.third_parties(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS third_party_dispatched_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS third_party_expected_return_at DATE,
  ADD COLUMN IF NOT EXISTS third_party_returned_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS third_party_notes         TEXT;

-- 2. Adiciona 'enviado_terceiro' à constraint de status
--    (a constraint original pode ter nome diferente; removemos e recriamos)
ALTER TABLE public.service_orders
  DROP CONSTRAINT IF EXISTS service_orders_status_check;

ALTER TABLE public.service_orders
  ADD CONSTRAINT service_orders_status_check
  CHECK (status IN (
    'aguardando',
    'em_analise',
    'aguardando_aprovacao',
    'aprovado',
    'reprovado',
    'aguardando_peca',
    'enviado_terceiro',
    'pronto',
    'finalizado',
    'cancelado'
  ));

-- 3. Índice para buscas de OS com terceiro pendente de retorno
CREATE INDEX IF NOT EXISTS idx_service_orders_third_party_pending
  ON public.service_orders (company_id, third_party_expected_return_at)
  WHERE status = 'enviado_terceiro'
    AND deleted_at IS NULL;

-- 4. Adiciona tipo 'retorno_terceiro_vencido' às notificações
ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'estoque_baixo',
    'estoque_zerado',
    'nova_os',
    'retorno_terceiro_vencido'
  ));

-- 5. Adiciona coluna service_order_id em notifications (nullable — já usado por nova_os)
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS service_order_id UUID REFERENCES public.service_orders(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_notifications_service_order
  ON public.notifications (service_order_id)
  WHERE service_order_id IS NOT NULL;
