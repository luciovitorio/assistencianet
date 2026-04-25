ALTER TABLE public.service_orders
  ADD COLUMN IF NOT EXISTS parent_service_order_id uuid REFERENCES public.service_orders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_warranty_rework boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS service_orders_parent_idx
  ON public.service_orders (parent_service_order_id)
  WHERE parent_service_order_id IS NOT NULL;

COMMENT ON COLUMN public.service_orders.parent_service_order_id IS
  'Referência à OS original quando esta é um retrabalho em garantia.';
COMMENT ON COLUMN public.service_orders.is_warranty_rework IS
  'Quando true, indica retrabalho em garantia (não gera cobrança do cliente).';
