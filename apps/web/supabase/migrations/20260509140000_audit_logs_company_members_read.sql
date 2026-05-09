-- Ampliar leitura de audit_logs para todos os membros ativos da empresa,
-- não apenas owners e admins. Técnicos e atendentes precisam ver o histórico das OSs.

DROP POLICY IF EXISTS "Owners and admins can view audit logs" ON "public"."audit_logs";

CREATE POLICY "Company members can view audit logs"
  ON "public"."audit_logs"
  FOR SELECT
  TO "authenticated"
  USING (
    -- owner da empresa
    (EXISTS (
      SELECT 1 FROM "public"."companies"
      WHERE "companies"."id" = "audit_logs"."company_id"
        AND "companies"."owner_id" = auth.uid()
    ))
    OR
    -- qualquer funcionário ativo da empresa (owner, admin, atendente, técnico)
    (EXISTS (
      SELECT 1 FROM "public"."employees"
      WHERE "employees"."company_id" = "audit_logs"."company_id"
        AND "employees"."user_id" = auth.uid()
        AND "employees"."active" = true
        AND "employees"."deleted_at" IS NULL
    ))
  );
