-- Atualiza o check constraint de tipo para incluir os tipos novos
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'estoque_baixo',
    'estoque_zerado',
    'nova_os',
    'retorno_terceiro_vencido',
    'cliente_inativo',
    'whatsapp_atendimento',
    'whatsapp_desconectado'
  ));

-- Guarda quando foi a última verificação de saúde da Evolution (rate-limit do check automático)
ALTER TABLE whatsapp_automation_settings
  ADD COLUMN IF NOT EXISTS evolution_health_checked_at timestamptz;
