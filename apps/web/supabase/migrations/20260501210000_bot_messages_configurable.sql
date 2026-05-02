-- Adiciona coluna bot_messages à tabela whatsapp_automation_settings.
-- Armazena os textos configuráveis do bot como JSONB.
-- Campos ausentes ou vazios fazem o engine cair nos defaults do código.

ALTER TABLE whatsapp_automation_settings
  ADD COLUMN IF NOT EXISTS bot_messages jsonb NOT NULL DEFAULT '{}';
