-- Adiciona hierarquia (sub-menus) à tabela whatsapp_menu_items.
--
-- parent_id NULL  = item raiz (comportamento atual preservado)
-- parent_id <uuid> = filho de um item com handler_type = 'submenu'
--
-- O constraint único anterior era (company_id, position) plano.
-- Substituímos por dois índices parciais:
--   - posição única dentro do menu raiz
--   - posição única dentro de cada sub-menu

-- 1. Adiciona a coluna (nullable → zero impacto em dados existentes)
ALTER TABLE public.whatsapp_menu_items
  ADD COLUMN IF NOT EXISTS parent_id uuid
    REFERENCES public.whatsapp_menu_items(id) ON DELETE CASCADE;

-- 2. Remove a constraint única plana
ALTER TABLE public.whatsapp_menu_items
  DROP CONSTRAINT IF EXISTS whatsapp_menu_items_company_id_position_key;

-- 3. Índices parciais para unicidade por nível
CREATE UNIQUE INDEX IF NOT EXISTS uq_menu_root_position
  ON public.whatsapp_menu_items (company_id, position)
  WHERE parent_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_menu_child_position
  ON public.whatsapp_menu_items (company_id, parent_id, position)
  WHERE parent_id IS NOT NULL;

-- 4. Índice de navegação (filhos de um nó)
CREATE INDEX IF NOT EXISTS idx_menu_parent
  ON public.whatsapp_menu_items (parent_id)
  WHERE parent_id IS NOT NULL;
