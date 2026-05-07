-- Fix RLS delete policy for service_order_estimate_items.
-- The delete policy was restricted to owner/admin only, while insert/update
-- allowed any active employee. This caused items to silently accumulate when
-- a technician or attendant saved an estimate draft (insert worked, delete was
-- silently blocked, so old items were never removed).

DROP POLICY IF EXISTS "service_order_estimate_items_delete" ON "public"."service_order_estimate_items";

CREATE POLICY "service_order_estimate_items_delete" ON "public"."service_order_estimate_items"
FOR DELETE TO "authenticated"
USING (
  (EXISTS (
    SELECT 1 FROM "public"."companies"
    WHERE "companies"."id" = "service_order_estimate_items"."company_id"
      AND "companies"."owner_id" = ( SELECT "auth"."uid"() AS "uid")
  ))
  OR
  ((NULLIF(((( SELECT "auth"."jwt"() AS "jwt") -> 'app_metadata'::"text") ->> 'company_id'::"text"), ''::"text"))::"uuid" = "company_id")
  OR
  (EXISTS (
    SELECT 1 FROM "public"."employees"
    WHERE "employees"."user_id" = ( SELECT "auth"."uid"() AS "uid")
      AND "employees"."company_id" = "service_order_estimate_items"."company_id"
      AND "employees"."deleted_at" IS NULL
  ))
);
