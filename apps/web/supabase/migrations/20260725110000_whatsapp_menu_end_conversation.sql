-- Novo tipo de item de menu do bot: encerra o atendimento a pedido do cliente.
alter table public.whatsapp_menu_items
  drop constraint whatsapp_menu_items_handler_type_check;

alter table public.whatsapp_menu_items
  add constraint whatsapp_menu_items_handler_type_check
  check (handler_type = any (array['check_os'::text, 'human_handoff'::text, 'info'::text, 'submenu'::text, 'url'::text, 'end_conversation'::text]));
