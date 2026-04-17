-- Adiciona o estado 'awaiting_estimate_response' ao bot do WhatsApp.
-- Usado quando o cliente recebe o orçamento e pode responder com 1 (aprovar),
-- 2 (reprovar) ou 3 (falar com atendente). O dígito 0 volta ao menu em qualquer estado.

ALTER TABLE "public"."whatsapp_conversations"
  DROP CONSTRAINT IF EXISTS "whatsapp_conversations_bot_state_check";

ALTER TABLE "public"."whatsapp_conversations"
  ADD CONSTRAINT "whatsapp_conversations_bot_state_check"
  CHECK (
    "bot_state" = ANY (ARRAY[
      'awaiting_menu'::text,
      'awaiting_os_number'::text,
      'awaiting_branch'::text,
      'awaiting_estimate_response'::text
    ])
  );
