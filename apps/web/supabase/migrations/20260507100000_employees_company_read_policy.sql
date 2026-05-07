-- Permite que qualquer funcionário ativo leia os demais funcionários da mesma empresa.
-- Necessário para exibir nomes de técnicos responsáveis por OS a usuários não-admin.
CREATE POLICY "employees_company_read" ON "public"."employees"
  FOR SELECT TO "authenticated"
  USING (
    "company_id" IN (
      SELECT "company_id"
      FROM "public"."employees"
      WHERE "user_id" = ( SELECT "auth"."uid"() )
        AND "active" = true
        AND "deleted_at" IS NULL
    )
  );
