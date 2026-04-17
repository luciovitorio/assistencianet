-- Adiciona campo de marcas autorizadas nas configurações de automação WhatsApp.
-- Usado na variável {{marcas_autorizadas}} do template de resposta automática.

alter table whatsapp_automation_settings
  add column if not exists authorized_brands text null;

comment on column whatsapp_automation_settings.authorized_brands is
  'Lista de marcas autorizadas exibida no menu de resposta automática ({{marcas_autorizadas}}).';
