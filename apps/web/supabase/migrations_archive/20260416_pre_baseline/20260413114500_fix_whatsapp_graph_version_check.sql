alter table public.whatsapp_automation_settings
  drop constraint if exists whatsapp_automation_settings_graph_version_check;

alter table public.whatsapp_automation_settings
  add constraint whatsapp_automation_settings_graph_version_check
  check (graph_api_version ~ '^v[0-9]+[.][0-9]+$');
