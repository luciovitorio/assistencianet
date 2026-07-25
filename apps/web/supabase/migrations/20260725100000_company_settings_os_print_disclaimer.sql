-- Mensagem de aviso configurável impressa no rodapé da OS (com espaço para assinatura do cliente).
alter table public.company_settings
  add column if not exists os_print_disclaimer text;
