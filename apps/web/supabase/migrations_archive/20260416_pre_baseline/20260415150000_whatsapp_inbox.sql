-- ============================================================
-- WhatsApp Inbox: conversas, mensagens e menu dinâmico
-- ============================================================

-- ── 1. Notificações: adiciona tipo whatsapp_atendimento ─────
ALTER TABLE notifications DROP CONSTRAINT notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (
  type IN (
    'estoque_baixo',
    'estoque_zerado',
    'nova_os',
    'retorno_terceiro_vencido',
    'whatsapp_atendimento'
  )
);

-- ── 2. whatsapp_conversations ────────────────────────────────
-- Uma linha por número de telefone por empresa.
-- Mantém o estado atual do fluxo do bot e dados do atendimento.
CREATE TABLE whatsapp_conversations (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id           UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  branch_id            UUID        REFERENCES branches(id) ON DELETE SET NULL,
  client_id            UUID        REFERENCES clients(id) ON DELETE SET NULL,
  phone_number         TEXT        NOT NULL,
  contact_name         TEXT,

  -- Estado do atendimento
  status               TEXT        NOT NULL DEFAULT 'bot',
  -- 'bot'        → bot está no controle
  -- 'waiting'    → aguardando atendente assumir
  -- 'in_progress'→ atendente em andamento
  -- 'resolved'   → encerrada

  -- Estado interno da máquina de estados do bot
  bot_state            TEXT,
  -- 'awaiting_menu'      → aguardando escolha do menu
  -- 'awaiting_os_number' → aguardando número da OS digitado pelo cliente
  -- 'awaiting_branch'    → aguardando escolha da filial

  bot_enabled          BOOLEAN     NOT NULL DEFAULT TRUE,
  context              JSONB       NOT NULL DEFAULT '{}',
  attempts             INT         NOT NULL DEFAULT 0,

  -- Atendente responsável (quando status = in_progress)
  assigned_to          UUID        REFERENCES employees(id) ON DELETE SET NULL,

  -- Controle de leitura e preview
  unread_count         INT         NOT NULL DEFAULT 0,
  last_message_at      TIMESTAMPTZ,
  last_message_preview TEXT,

  -- Expiração da sessão do bot (reinicia o fluxo após inatividade)
  expires_at           TIMESTAMPTZ,

  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT whatsapp_conversations_status_check CHECK (
    status IN ('bot', 'waiting', 'in_progress', 'resolved')
  ),
  CONSTRAINT whatsapp_conversations_bot_state_check CHECK (
    bot_state IN ('awaiting_menu', 'awaiting_os_number', 'awaiting_branch')
  ),
  UNIQUE (company_id, phone_number)
);

-- ── 3. whatsapp_messages ─────────────────────────────────────
-- Histórico completo de mensagens de cada conversa.
CREATE TABLE whatsapp_messages (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID        NOT NULL REFERENCES whatsapp_conversations(id) ON DELETE CASCADE,
  company_id      UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  direction       TEXT        NOT NULL,
  -- 'inbound'  → mensagem recebida do cliente
  -- 'outbound' → mensagem enviada pelo sistema (bot ou atendente)

  content         TEXT        NOT NULL,
  sent_by_bot     BOOLEAN     NOT NULL DEFAULT FALSE,
  sender_name     TEXT,
  external_id     TEXT,       -- ID da mensagem no WhatsApp
  status          TEXT        NOT NULL DEFAULT 'sent',
  -- 'sent' | 'delivered' | 'read' | 'failed'

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT whatsapp_messages_direction_check CHECK (
    direction IN ('inbound', 'outbound')
  ),
  CONSTRAINT whatsapp_messages_status_check CHECK (
    status IN ('sent', 'delivered', 'read', 'failed')
  )
);

-- ── 4. whatsapp_menu_items ───────────────────────────────────
-- Itens do menu interativo do bot. Escalável: novos itens = novo insert.
CREATE TABLE whatsapp_menu_items (
  id             UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id     UUID    NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  position       INT     NOT NULL,
  label          TEXT    NOT NULL,
  emoji          TEXT,
  handler_type   TEXT    NOT NULL,
  -- 'check_os'      → mostra OS do cliente
  -- 'human_handoff' → encaminha para atendente
  -- 'info'          → envia texto fixo (handler_config.message)
  -- 'submenu'       → abre sub-menu (handler_config.items)
  -- 'url'           → envia link (handler_config.url, handler_config.label)

  handler_config JSONB   NOT NULL DEFAULT '{}',
  enabled        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT whatsapp_menu_items_handler_type_check CHECK (
    handler_type IN ('check_os', 'human_handoff', 'info', 'submenu', 'url')
  ),
  UNIQUE (company_id, position)
);

-- ── 5. Índices ───────────────────────────────────────────────
CREATE INDEX idx_wapp_conv_company_status
  ON whatsapp_conversations (company_id, status, last_message_at DESC);

CREATE INDEX idx_wapp_conv_company_branch
  ON whatsapp_conversations (company_id, branch_id);

CREATE INDEX idx_wapp_conv_phone
  ON whatsapp_conversations (company_id, phone_number);

CREATE INDEX idx_wapp_msg_conversation
  ON whatsapp_messages (conversation_id, created_at ASC);

CREATE INDEX idx_wapp_msg_company
  ON whatsapp_messages (company_id, created_at DESC);

CREATE INDEX idx_wapp_menu_company
  ON whatsapp_menu_items (company_id, position);

-- ── 6. Trigger updated_at ────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Reutiliza a função se já existir em outras tabelas
CREATE TRIGGER trg_whatsapp_conversations_updated_at
  BEFORE UPDATE ON whatsapp_conversations
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ── 7. Row Level Security ────────────────────────────────────
ALTER TABLE whatsapp_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages      ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_menu_items    ENABLE ROW LEVEL SECURITY;

-- Helper: verifica se o usuário é membro ativo da empresa
CREATE OR REPLACE FUNCTION fn_is_company_member(p_company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM companies  WHERE id = p_company_id AND owner_id = auth.uid()
    UNION ALL
    SELECT 1 FROM employees
    WHERE company_id = p_company_id
      AND user_id = auth.uid()
      AND active = TRUE
      AND deleted_at IS NULL
  )
$$;

-- Helper: verifica se o usuário é admin ou owner da empresa
CREATE OR REPLACE FUNCTION fn_is_company_admin(p_company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM companies WHERE id = p_company_id AND owner_id = auth.uid()
    UNION ALL
    SELECT 1 FROM employees
    WHERE company_id = p_company_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
      AND active = TRUE
      AND deleted_at IS NULL
  )
$$;

-- whatsapp_conversations: todos os membros leem; admins gerenciam
CREATE POLICY "members_view_conversations"
  ON whatsapp_conversations FOR SELECT
  USING (fn_is_company_member(company_id));

CREATE POLICY "members_update_conversations"
  ON whatsapp_conversations FOR UPDATE
  USING (fn_is_company_member(company_id));

CREATE POLICY "admins_insert_conversations"
  ON whatsapp_conversations FOR INSERT
  WITH CHECK (fn_is_company_admin(company_id));

-- whatsapp_messages: todos os membros leem e inserem (atendente responde)
CREATE POLICY "members_view_messages"
  ON whatsapp_messages FOR SELECT
  USING (fn_is_company_member(company_id));

CREATE POLICY "members_insert_messages"
  ON whatsapp_messages FOR INSERT
  WITH CHECK (fn_is_company_member(company_id));

-- whatsapp_menu_items: todos leem; admins gerenciam
CREATE POLICY "members_view_menu_items"
  ON whatsapp_menu_items FOR SELECT
  USING (fn_is_company_member(company_id));

CREATE POLICY "admins_manage_menu_items"
  ON whatsapp_menu_items FOR ALL
  USING (fn_is_company_admin(company_id))
  WITH CHECK (fn_is_company_admin(company_id));

-- ── 8. Realtime ──────────────────────────────────────────────
-- Permite que o dashboard receba updates em tempo real via Supabase Realtime.
ALTER TABLE whatsapp_conversations REPLICA IDENTITY FULL;
ALTER TABLE whatsapp_messages      REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE whatsapp_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE whatsapp_messages;
