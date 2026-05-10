-- Tabela de configurações da integração Asaas por empresa
CREATE TABLE IF NOT EXISTS asaas_payment_settings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL UNIQUE REFERENCES companies(id) ON DELETE CASCADE,
  enabled         BOOLEAN NOT NULL DEFAULT false,
  environment     TEXT NOT NULL DEFAULT 'sandbox' CHECK (environment IN ('sandbox', 'production')),
  api_key         TEXT NOT NULL DEFAULT '',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE asaas_payment_settings ENABLE ROW LEVEL SECURITY;

-- Somente owners/admins da empresa leem e escrevem suas próprias configurações
CREATE POLICY "asaas_settings_company_access" ON asaas_payment_settings
  USING (
    company_id IN (
      SELECT company_id FROM employees
      WHERE user_id = auth.uid()
        AND deleted_at IS NULL
        AND role IN ('owner', 'admin')
    )
  );

-- Colunas PIX na service_orders
ALTER TABLE service_orders
  ADD COLUMN IF NOT EXISTS asaas_payment_id      TEXT,
  ADD COLUMN IF NOT EXISTS asaas_pix_qr_encoded  TEXT,
  ADD COLUMN IF NOT EXISTS asaas_pix_copy_paste  TEXT,
  ADD COLUMN IF NOT EXISTS asaas_pix_expires_at  TIMESTAMPTZ;
