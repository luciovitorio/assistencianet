-- Adiciona configuração de tempo de sessão do bot por empresa.
-- Padrão: 240 minutos (4 horas), mínimo 5 min, máximo 1440 min (24 h).

ALTER TABLE public.whatsapp_automation_settings
  ADD COLUMN IF NOT EXISTS session_timeout_minutes integer NOT NULL DEFAULT 240;

ALTER TABLE public.whatsapp_automation_settings
  ADD CONSTRAINT wha_session_timeout_check
  CHECK (session_timeout_minutes BETWEEN 5 AND 1440);
