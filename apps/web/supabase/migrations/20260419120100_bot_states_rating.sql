-- Adiciona estados do bot usados no fluxo de avaliação pós-atendimento.
ALTER TABLE public.whatsapp_conversations
  DROP CONSTRAINT IF EXISTS whatsapp_conversations_bot_state_check;

ALTER TABLE public.whatsapp_conversations
  ADD CONSTRAINT whatsapp_conversations_bot_state_check
  CHECK (bot_state = ANY (ARRAY[
    'awaiting_menu'::text,
    'awaiting_os_number'::text,
    'awaiting_branch'::text,
    'awaiting_estimate_response'::text,
    'awaiting_rating_consent'::text,
    'awaiting_rating'::text
  ]));
