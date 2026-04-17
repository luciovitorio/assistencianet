-- Baseline generated from the current remote Supabase public schema.
-- Development reconciliation point: previous local migration files were archived
-- under apps/web/supabase/migrations_archive/20260416_pre_baseline.




SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."cleanup_expired_whatsapp_messages"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  deleted_count integer;
begin
  with deleted_messages as (
    delete from public.whatsapp_messages message
    where message.created_at < (
      now() - make_interval(
        days => coalesce(
          (
            select settings.message_retention_days
            from public.whatsapp_automation_settings settings
            where settings.company_id = message.company_id
          ),
          30
        )
      )
    )
    returning message.id
  )
  select count(*) into deleted_count
  from deleted_messages;

  update public.whatsapp_conversations conversation
  set
    last_message_preview = null,
    unread_count = 0
  where not exists (
    select 1
    from public.whatsapp_messages message
    where message.conversation_id = conversation.id
  )
  and (
    conversation.last_message_at is null
    or conversation.last_message_at < (
      now() - make_interval(
        days => coalesce(
          (
            select settings.message_retention_days
            from public.whatsapp_automation_settings settings
            where settings.company_id = conversation.company_id
          ),
          30
        )
      )
    )
  );

  return deleted_count;
end;
$$;


ALTER FUNCTION "public"."cleanup_expired_whatsapp_messages"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_stock_transfer"("p_company_id" "uuid", "p_from_branch_id" "uuid", "p_to_branch_id" "uuid", "p_part_id" "uuid", "p_quantity" integer, "p_notes" "text", "p_entry_date" "date", "p_created_by" "uuid") RETURNS TABLE("saida_id" "uuid", "entrada_id" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_auth_uid        UUID := (SELECT auth.uid());
  v_is_owner        BOOLEAN := false;
  v_employee_role   TEXT;
  v_branch_count    INTEGER := 0;
  v_available_stock INTEGER := 0;
  v_ref_id          UUID := gen_random_uuid();
  v_saida_id        UUID;
  v_entrada_id      UUID;
BEGIN
  IF v_auth_uid IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado.' USING ERRCODE = '28000';
  END IF;

  IF p_created_by IS DISTINCT FROM v_auth_uid THEN
    RAISE EXCEPTION 'Usuário criador inválido para a transferência.' USING ERRCODE = '42501';
  END IF;

  IF p_company_id IS NULL
    OR p_from_branch_id IS NULL
    OR p_to_branch_id IS NULL
    OR p_part_id IS NULL
    OR p_quantity IS NULL THEN
    RAISE EXCEPTION 'Parâmetros obrigatórios ausentes.' USING ERRCODE = '22023';
  END IF;

  IF p_quantity <= 0 THEN
    RAISE EXCEPTION 'Quantidade de transferência deve ser maior que zero.' USING ERRCODE = '22023';
  END IF;

  IF p_from_branch_id = p_to_branch_id THEN
    RAISE EXCEPTION 'Filiais de origem e destino devem ser diferentes.' USING ERRCODE = '22023';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.companies
    WHERE companies.id = p_company_id
      AND companies.owner_id = v_auth_uid
  )
  INTO v_is_owner;

  IF NOT v_is_owner THEN
    SELECT employees.role
    INTO v_employee_role
    FROM public.employees
    WHERE employees.company_id = p_company_id
      AND employees.user_id = v_auth_uid
      AND employees.active = true
      AND employees.deleted_at IS NULL
    LIMIT 1;

    IF v_employee_role IS DISTINCT FROM 'admin' THEN
      RAISE EXCEPTION 'Usuário sem permissão para transferir estoque.' USING ERRCODE = '42501';
    END IF;
  END IF;

  SELECT COUNT(*)
  INTO v_branch_count
  FROM public.branches
  WHERE branches.company_id = p_company_id
    AND branches.id IN (p_from_branch_id, p_to_branch_id)
    AND branches.deleted_at IS NULL
    AND COALESCE(branches.active, true) = true;

  IF v_branch_count <> 2 THEN
    RAISE EXCEPTION 'Filiais da transferência inválidas para a empresa.' USING ERRCODE = '23503';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.parts
    WHERE parts.id = p_part_id
      AND parts.company_id = p_company_id
      AND parts.active = true
      AND parts.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Peça inválida para a empresa.' USING ERRCODE = '23503';
  END IF;

  LOCK TABLE public.stock_movements IN SHARE ROW EXCLUSIVE MODE;
  LOCK TABLE public.stock_reservations IN SHARE ROW EXCLUSIVE MODE;

  SELECT
    COALESCE((
      SELECT SUM(stock_movements.quantity)
      FROM public.stock_movements
      WHERE stock_movements.company_id = p_company_id
        AND stock_movements.branch_id = p_from_branch_id
        AND stock_movements.part_id = p_part_id
    ), 0)
    - COALESCE((
      SELECT SUM(stock_reservations.quantity)
      FROM public.stock_reservations
      WHERE stock_reservations.company_id = p_company_id
        AND stock_reservations.branch_id = p_from_branch_id
        AND stock_reservations.part_id = p_part_id
        AND stock_reservations.status = 'ativa'
    ), 0)
  INTO v_available_stock;

  IF p_quantity > v_available_stock THEN
    RAISE EXCEPTION 'Saldo disponível insuficiente na filial de origem.' USING ERRCODE = '23514';
  END IF;

  INSERT INTO public.stock_movements (
    company_id, branch_id, part_id,
    movement_type, quantity,
    notes, reference_type, reference_id,
    entry_date, created_by
  ) VALUES (
    p_company_id, p_from_branch_id, p_part_id,
    'transferencia_saida', -p_quantity,
    NULLIF(BTRIM(p_notes), ''), 'transferencia', v_ref_id,
    COALESCE(p_entry_date, CURRENT_DATE), p_created_by
  ) RETURNING id INTO v_saida_id;

  INSERT INTO public.stock_movements (
    company_id, branch_id, part_id,
    movement_type, quantity,
    notes, reference_type, reference_id,
    entry_date, created_by
  ) VALUES (
    p_company_id, p_to_branch_id, p_part_id,
    'transferencia_entrada', p_quantity,
    NULLIF(BTRIM(p_notes), ''), 'transferencia', v_ref_id,
    COALESCE(p_entry_date, CURRENT_DATE), p_created_by
  ) RETURNING id INTO v_entrada_id;

  RETURN QUERY SELECT v_saida_id, v_entrada_id;
END;
$$;


ALTER FUNCTION "public"."create_stock_transfer"("p_company_id" "uuid", "p_from_branch_id" "uuid", "p_to_branch_id" "uuid", "p_part_id" "uuid", "p_quantity" integer, "p_notes" "text", "p_entry_date" "date", "p_created_by" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_is_company_admin"("p_company_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM companies WHERE id = p_company_id AND owner_id = auth.uid()
    UNION ALL
    SELECT 1 FROM employees
    WHERE company_id = p_company_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
      AND active = TRUE
      AND deleted_at IS NULL
  )
$$;


ALTER FUNCTION "public"."fn_is_company_admin"("p_company_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_is_company_member"("p_company_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM companies WHERE id = p_company_id AND owner_id = auth.uid()
    UNION ALL
    SELECT 1 FROM employees
    WHERE company_id = p_company_id
      AND user_id = auth.uid()
      AND active = TRUE
      AND deleted_at IS NULL
  )
$$;


ALTER FUNCTION "public"."fn_is_company_member"("p_company_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_notify_inactive_clients"("p_months" integer DEFAULT 3) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO notifications (company_id, type, title, body, client_id)
  SELECT
    base.company_id,
    'cliente_inativo',
    'Cliente sem retorno: ' || base.client_name,
    CASE
      WHEN base.last_os_at IS NULL THEN
        'Nunca gerou uma OS. Cadastrado há mais de ' || p_months || ' meses.'
      ELSE
        'Sem nova OS há mais de ' || p_months || ' meses. Último atendimento: ' ||
        to_char(base.last_os_at AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY')
    END,
    base.client_id
  FROM (
    SELECT
      c.id           AS client_id,
      c.company_id,
      c.name         AS client_name,
      c.created_at   AS client_created_at,
      MAX(so.created_at) AS last_os_at,
      -- Conta OS atualmente em andamento (não finalizadas e não canceladas)
      COUNT(so.id) FILTER (
        WHERE so.status NOT IN ('finalizado', 'cancelado')
      ) AS open_os_count
    FROM clients c
    LEFT JOIN service_orders so
      ON so.client_id = c.id
      AND so.deleted_at IS NULL
    WHERE c.deleted_at IS NULL
      AND c.active = true
    GROUP BY c.id, c.company_id, c.name, c.created_at
  ) base
  WHERE
    -- Sem OS em aberto no momento
    base.open_os_count = 0
    -- Última OS (ou cadastro, se nunca teve OS) foi há mais de p_months meses
    AND COALESCE(base.last_os_at, base.client_created_at) < NOW() - (p_months || ' months')::interval
    -- Dedup: não cria se já existe notificação não lida para este cliente
    AND NOT EXISTS (
      SELECT 1
      FROM notifications n
      WHERE n.client_id = base.client_id
        AND n.type = 'cliente_inativo'
        AND n.read_at IS NULL
    );
END;
$$;


ALTER FUNCTION "public"."fn_notify_inactive_clients"("p_months" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_notify_low_stock"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_current_stock BIGINT;
  v_min_stock     INTEGER;
  v_part_name     TEXT;
  v_branch_name   TEXT;
  v_type          TEXT;
BEGIN
  SELECT COALESCE(SUM(quantity), 0)
  INTO v_current_stock
  FROM stock_movements
  WHERE part_id   = NEW.part_id
    AND branch_id = NEW.branch_id
    AND company_id = NEW.company_id;

  SELECT min_stock, name
  INTO v_min_stock, v_part_name
  FROM parts
  WHERE id = NEW.part_id;

  IF v_current_stock <= 0 THEN
    v_type := 'estoque_zerado';
  ELSIF v_min_stock > 0 AND v_current_stock < v_min_stock THEN
    v_type := 'estoque_baixo';
  ELSE
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1 FROM notifications
    WHERE company_id = NEW.company_id
      AND part_id    = NEW.part_id
      AND branch_id  = NEW.branch_id
      AND type       = v_type
      AND read_at IS NULL
  ) THEN
    RETURN NEW;
  END IF;

  SELECT name INTO v_branch_name FROM branches WHERE id = NEW.branch_id;

  INSERT INTO notifications (company_id, type, title, body, part_id, branch_id)
  VALUES (
    NEW.company_id,
    v_type,
    CASE v_type
      WHEN 'estoque_zerado' THEN 'Estoque zerado: ' || v_part_name
      ELSE                       'Estoque baixo: '  || v_part_name
    END,
    CASE v_type
      WHEN 'estoque_zerado'
        THEN 'A peca "' || v_part_name || '" esta sem estoque na filial ' || v_branch_name || '.'
      ELSE
        'A peca "' || v_part_name || '" esta com estoque abaixo do minimo (' ||
        v_current_stock || '/' || v_min_stock || ') na filial ' || v_branch_name || '.'
    END,
    NEW.part_id,
    NEW.branch_id
  );

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."fn_notify_low_stock"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_notify_third_party_overdue"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_auth_uid   UUID := (SELECT auth.uid());
  v_company_id UUID;
  rec RECORD;
BEGIN
  IF v_auth_uid IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado.' USING ERRCODE = '28000';
  END IF;

  SELECT companies.id
  INTO v_company_id
  FROM public.companies
  WHERE companies.owner_id = v_auth_uid
  LIMIT 1;

  IF v_company_id IS NULL THEN
    SELECT employees.company_id
    INTO v_company_id
    FROM public.employees
    WHERE employees.user_id = v_auth_uid
      AND employees.active = true
      AND employees.deleted_at IS NULL
    LIMIT 1;
  END IF;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Usuário sem empresa ativa vinculada.' USING ERRCODE = '42501';
  END IF;

  FOR rec IN
    SELECT
      so.id            AS service_order_id,
      so.company_id,
      so.number        AS os_number,
      tp.name          AS third_party_name
    FROM public.service_orders so
    JOIN public.third_parties tp ON tp.id = so.third_party_id
    WHERE so.company_id = v_company_id
      AND so.status = 'enviado_terceiro'
      AND so.deleted_at IS NULL
      AND so.third_party_expected_return_at IS NOT NULL
      AND so.third_party_expected_return_at < CURRENT_DATE
      AND NOT EXISTS (
        SELECT 1 FROM public.notifications n
        WHERE n.company_id = so.company_id
          AND n.service_order_id = so.id
          AND n.type = 'retorno_terceiro_vencido'
          AND n.read_at IS NULL
      )
  LOOP
    INSERT INTO public.notifications (
      company_id,
      type,
      title,
      body,
      service_order_id
    ) VALUES (
      rec.company_id,
      'retorno_terceiro_vencido',
      'Retorno vencido: OS #' || rec.os_number,
      'O prazo de retorno da OS #' || rec.os_number || ' de "' || rec.third_party_name || '" já passou. Confirme o retorno do equipamento.',
      rec.service_order_id
    );
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."fn_notify_third_party_overdue"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."fn_set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (id, name, whatsapp)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    NEW.raw_user_meta_data->>'whatsapp'
  );
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_active_company_admin"("p_company_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT
    EXISTS (
      SELECT 1
      FROM public.companies
      WHERE companies.id = p_company_id
        AND companies.owner_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1
      FROM public.employees
      WHERE employees.company_id = p_company_id
        AND employees.user_id = (SELECT auth.uid())
        AND employees.role = 'admin'
        AND employees.active = true
        AND employees.deleted_at IS NULL
    );
$$;


ALTER FUNCTION "public"."is_active_company_admin"("p_company_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."recalculate_client_classification"("p_client_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_total_pago_isento  integer;
  v_total_inadimplente integer;
  v_new_classification text;
  v_is_manual          boolean;
BEGIN
  -- Verifica se a classificação é manual (override do usuário)
  SELECT classification_manual
  INTO v_is_manual
  FROM clients
  WHERE id = p_client_id;

  -- Se for manual, não atualiza automaticamente
  IF v_is_manual IS TRUE THEN
    RETURN;
  END IF;

  -- Contagem de OS finalizadas (não deletadas):
  --   pago_isento: pagamento ok (base para recorrente/vip)
  --   inadimplente: finalizado mas não pago
  SELECT
    COUNT(*) FILTER (WHERE payment_status IN ('pago', 'isento')),
    COUNT(*) FILTER (WHERE payment_status = 'pendente')
  INTO v_total_pago_isento, v_total_inadimplente
  FROM service_orders
  WHERE client_id = p_client_id
    AND status = 'finalizado'
    AND deleted_at IS NULL;

  -- Prioridade: inadimplente > vip > recorrente > novo
  IF v_total_inadimplente > 0 THEN
    v_new_classification := 'inadimplente';
  ELSIF v_total_pago_isento >= 5 THEN
    v_new_classification := 'vip';
  ELSIF v_total_pago_isento >= 2 THEN
    v_new_classification := 'recorrente';
  ELSE
    v_new_classification := 'novo';
  END IF;

  UPDATE clients
  SET classification = v_new_classification
  WHERE id = p_client_id;
END;
$$;


ALTER FUNCTION "public"."recalculate_client_classification"("p_client_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_service_order_number"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  current_year integer;
  next_seq     integer;
BEGIN
  current_year := EXTRACT(YEAR FROM now())::integer;

  -- Pega o maior número de sequência já usado no ano atual para essa empresa
  SELECT COALESCE(MAX(number % 10000), 0) + 1
    INTO next_seq
    FROM public.service_orders
   WHERE company_id = NEW.company_id
     AND number / 10000 = current_year;

  NEW.number := current_year * 10000 + next_seq;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_service_order_number"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_service_order_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_service_order_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_recalculate_client_classification"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM recalculate_client_classification(OLD.client_id);
  ELSE
    PERFORM recalculate_client_classification(NEW.client_id);
    -- Se o client_id mudou (update), recalcula o anterior também
    IF TG_OP = 'UPDATE' AND OLD.client_id IS DISTINCT FROM NEW.client_id THEN
      PERFORM recalculate_client_classification(OLD.client_id);
    END IF;
  END IF;
  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."trigger_recalculate_client_classification"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_parts_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_parts_updated_at"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "actor_user_id" "uuid",
    "actor_name" "text",
    "actor_email" "text",
    "entity_type" "text" NOT NULL,
    "entity_id" "uuid",
    "action" "text" NOT NULL,
    "summary" "text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."audit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."bills" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "branch_id" "uuid" NOT NULL,
    "category" "text" NOT NULL,
    "description" "text" NOT NULL,
    "supplier_id" "uuid",
    "amount" numeric(10,2) NOT NULL,
    "due_date" "date" NOT NULL,
    "status" "text" DEFAULT 'pendente'::"text" NOT NULL,
    "paid_at" timestamp with time zone,
    "payment_method" "text",
    "payment_notes" "text",
    "notes" "text",
    "recurrence" "text",
    "recurrence_group_id" "uuid",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    CONSTRAINT "bills_amount_positive" CHECK (("amount" > (0)::numeric)),
    CONSTRAINT "bills_category_check" CHECK (("category" = ANY (ARRAY['fornecedor'::"text", 'aluguel'::"text", 'energia'::"text", 'agua'::"text", 'internet'::"text", 'folha'::"text", 'imposto'::"text", 'outro'::"text"]))),
    CONSTRAINT "bills_paid_consistency" CHECK (((("status" = 'pago'::"text") AND ("paid_at" IS NOT NULL) AND ("payment_method" IS NOT NULL)) OR (("status" = 'pendente'::"text") AND ("paid_at" IS NULL) AND ("payment_method" IS NULL)))),
    CONSTRAINT "bills_payment_method_check" CHECK ((("payment_method" IS NULL) OR ("payment_method" = ANY (ARRAY['dinheiro'::"text", 'pix'::"text", 'cartao_credito'::"text", 'cartao_debito'::"text", 'transferencia'::"text"])))),
    CONSTRAINT "bills_recurrence_check" CHECK ((("recurrence" IS NULL) OR ("recurrence" = ANY (ARRAY['semanal'::"text", 'quinzenal'::"text", 'mensal'::"text", 'anual'::"text"])))),
    CONSTRAINT "bills_status_check" CHECK (("status" = ANY (ARRAY['pendente'::"text", 'pago'::"text"])))
);


ALTER TABLE "public"."bills" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."branches" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "address" "text",
    "city" "text",
    "state" "text",
    "zip_code" "text",
    "phone" "text",
    "is_main" boolean DEFAULT false,
    "active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "deleted_at" timestamp with time zone,
    "deleted_by" "uuid"
);


ALTER TABLE "public"."branches" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."business_hours" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "branch_id" "uuid" NOT NULL,
    "day_of_week" smallint NOT NULL,
    "open_time" time without time zone,
    "close_time" time without time zone,
    "is_closed" boolean DEFAULT false,
    CONSTRAINT "business_hours_day_of_week_check" CHECK ((("day_of_week" >= 0) AND ("day_of_week" <= 6)))
);


ALTER TABLE "public"."business_hours" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cash_entries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "branch_id" "uuid",
    "service_order_id" "uuid" NOT NULL,
    "estimate_id" "uuid",
    "entry_type" "text" DEFAULT 'recebimento_os'::"text" NOT NULL,
    "payment_method" "text" NOT NULL,
    "amount_due" numeric(10,2) NOT NULL,
    "amount_received" numeric(10,2) NOT NULL,
    "change_amount" numeric(10,2) DEFAULT 0 NOT NULL,
    "net_amount" numeric(10,2) NOT NULL,
    "notes" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "cash_entries_amount_due_nonnegative_check" CHECK (("amount_due" >= (0)::numeric)),
    CONSTRAINT "cash_entries_amount_received_nonnegative_check" CHECK (("amount_received" >= (0)::numeric)),
    CONSTRAINT "cash_entries_change_amount_nonnegative_check" CHECK (("change_amount" >= (0)::numeric)),
    CONSTRAINT "cash_entries_entry_type_check" CHECK (("entry_type" = 'recebimento_os'::"text")),
    CONSTRAINT "cash_entries_net_amount_consistency_check" CHECK (("net_amount" = ("amount_received" - "change_amount"))),
    CONSTRAINT "cash_entries_net_amount_nonnegative_check" CHECK (("net_amount" >= (0)::numeric)),
    CONSTRAINT "cash_entries_payment_method_check" CHECK (("payment_method" = ANY (ARRAY['dinheiro'::"text", 'pix'::"text", 'cartao_credito'::"text", 'cartao_debito'::"text", 'transferencia'::"text", 'isento'::"text"])))
);


ALTER TABLE "public"."cash_entries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."clients" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "origin_branch_id" "uuid",
    "name" "text" NOT NULL,
    "document" "text",
    "phone" "text",
    "email" "text",
    "address" "text",
    "notes" "text",
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    "deleted_by" "uuid",
    "zip_code" "text",
    "street" "text",
    "number" "text",
    "complement" "text",
    "city" "text",
    "state" "text",
    "classification" "text" DEFAULT 'novo'::"text" NOT NULL,
    "classification_manual" boolean DEFAULT false NOT NULL,
    CONSTRAINT "clients_classification_check" CHECK (("classification" = ANY (ARRAY['novo'::"text", 'recorrente'::"text", 'vip'::"text", 'inadimplente'::"text"])))
);


ALTER TABLE "public"."clients" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."companies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "owner_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "cnpj" "text",
    "logo_url" "text",
    "segment" "text",
    "phone" "text",
    "email" "text",
    "onboarding_step" smallint DEFAULT 0,
    "onboarding_completed" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."companies" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."company_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "device_types" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "default_warranty_days" integer DEFAULT 90 NOT NULL,
    "default_estimate_validity_days" integer DEFAULT 30 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."company_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."employees" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "branch_id" "uuid",
    "name" "text" NOT NULL,
    "role" "text" NOT NULL,
    "email" "text",
    "phone" "text",
    "cpf" "text",
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "user_id" "uuid",
    "deleted_at" timestamp with time zone,
    "deleted_by" "uuid",
    "labor_rate" numeric(10,2),
    CONSTRAINT "employees_labor_rate_positive" CHECK ((("labor_rate" IS NULL) OR ("labor_rate" >= (0)::numeric))),
    CONSTRAINT "employees_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'atendente'::"text", 'tecnico'::"text"])))
);


ALTER TABLE "public"."employees" OWNER TO "postgres";


COMMENT ON COLUMN "public"."employees"."labor_rate" IS 'Valor fixo de mão de obra pago ao técnico por OS concluída (VALOR FIXO DE MÃO DE OBRA). Nulo = não definido.';



CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "body" "text" NOT NULL,
    "part_id" "uuid",
    "branch_id" "uuid",
    "read_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "service_order_id" "uuid",
    "client_id" "uuid",
    CONSTRAINT "notifications_type_check" CHECK (("type" = ANY (ARRAY['estoque_baixo'::"text", 'estoque_zerado'::"text", 'nova_os'::"text", 'retorno_terceiro_vencido'::"text", 'whatsapp_atendimento'::"text"])))
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."parts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "supplier_id" "uuid",
    "name" character varying(150) NOT NULL,
    "sku" character varying(50),
    "category" character varying(30) DEFAULT 'peca_reposicao'::character varying NOT NULL,
    "unit" character varying(20) DEFAULT 'unidade'::character varying NOT NULL,
    "cost_price" numeric(10,2),
    "sale_price" numeric(10,2),
    "min_stock" integer DEFAULT 0 NOT NULL,
    "notes" "text",
    "active" boolean DEFAULT true NOT NULL,
    "deleted_at" timestamp with time zone,
    "deleted_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."parts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "whatsapp" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."service_order_estimate_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "estimate_id" "uuid" NOT NULL,
    "service_order_id" "uuid" NOT NULL,
    "company_id" "uuid" NOT NULL,
    "item_type" "text" NOT NULL,
    "service_id" "uuid",
    "part_id" "uuid",
    "description" "text" NOT NULL,
    "quantity" numeric(10,2) NOT NULL,
    "unit_price" numeric(12,2) NOT NULL,
    "line_total" numeric(12,2) NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "service_order_estimate_items_item_type_check" CHECK (("item_type" = ANY (ARRAY['servico'::"text", 'peca'::"text", 'avulso'::"text"]))),
    CONSTRAINT "service_order_estimate_items_line_total_check" CHECK (("line_total" >= (0)::numeric)),
    CONSTRAINT "service_order_estimate_items_quantity_check" CHECK (("quantity" > (0)::numeric)),
    CONSTRAINT "service_order_estimate_items_unit_price_check" CHECK (("unit_price" >= (0)::numeric))
);


ALTER TABLE "public"."service_order_estimate_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."service_order_estimates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "service_order_id" "uuid" NOT NULL,
    "company_id" "uuid" NOT NULL,
    "version" integer NOT NULL,
    "status" "text" DEFAULT 'rascunho'::"text" NOT NULL,
    "approval_channel" "text",
    "subtotal_amount" numeric(12,2) DEFAULT 0 NOT NULL,
    "discount_amount" numeric(12,2) DEFAULT 0 NOT NULL,
    "total_amount" numeric(12,2) DEFAULT 0 NOT NULL,
    "valid_until" "date",
    "sent_at" timestamp with time zone,
    "approved_at" timestamp with time zone,
    "rejected_at" timestamp with time zone,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    "deleted_at" timestamp with time zone,
    "deleted_by" "uuid",
    "warranty_days" integer,
    CONSTRAINT "service_order_estimates_approval_channel_check" CHECK (("approval_channel" = ANY (ARRAY['whatsapp'::"text", 'verbal'::"text", 'balcao'::"text", 'telefone'::"text", 'outro'::"text"]))),
    CONSTRAINT "service_order_estimates_status_check" CHECK (("status" = ANY (ARRAY['rascunho'::"text", 'enviado'::"text", 'aprovado'::"text", 'recusado'::"text", 'substituido'::"text"])))
);


ALTER TABLE "public"."service_order_estimates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."service_orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "branch_id" "uuid",
    "client_id" "uuid" NOT NULL,
    "number" integer NOT NULL,
    "status" "text" DEFAULT 'aguardando'::"text" NOT NULL,
    "device_type" "text" NOT NULL,
    "device_brand" "text",
    "device_model" "text",
    "device_serial" "text",
    "device_condition" "text",
    "reported_issue" "text" NOT NULL,
    "technician_id" "uuid",
    "estimated_delivery" "date",
    "notes" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    "deleted_by" "uuid",
    "payment_status" "text" DEFAULT 'pendente'::"text" NOT NULL,
    "client_notified_at" timestamp with time zone,
    "client_notified_via" "text",
    "delivered_at" timestamp with time zone,
    "delivered_by" "uuid",
    "payment_method" "text",
    "amount_paid" numeric(10,2),
    "change_amount" numeric(10,2),
    "pickup_notes" "text",
    "third_party_id" "uuid",
    "third_party_dispatched_at" timestamp with time zone,
    "third_party_expected_return_at" "date",
    "third_party_returned_at" timestamp with time zone,
    "third_party_notes" "text",
    "completed_at" timestamp with time zone,
    "warranty_expires_at" "date",
    CONSTRAINT "service_orders_amount_paid_nonnegative_check" CHECK ((("amount_paid" IS NULL) OR ("amount_paid" >= (0)::numeric))),
    CONSTRAINT "service_orders_change_amount_nonnegative_check" CHECK ((("change_amount" IS NULL) OR ("change_amount" >= (0)::numeric))),
    CONSTRAINT "service_orders_client_notified_via_check" CHECK ((("client_notified_via" IS NULL) OR ("client_notified_via" = ANY (ARRAY['whatsapp'::"text", 'email'::"text"])))),
    CONSTRAINT "service_orders_payment_method_check" CHECK ((("payment_method" IS NULL) OR ("payment_method" = ANY (ARRAY['dinheiro'::"text", 'pix'::"text", 'cartao_credito'::"text", 'cartao_debito'::"text", 'transferencia'::"text", 'isento'::"text"])))),
    CONSTRAINT "service_orders_payment_status_check" CHECK (("payment_status" = ANY (ARRAY['pendente'::"text", 'pago'::"text", 'isento'::"text"]))),
    CONSTRAINT "service_orders_status_check" CHECK (("status" = ANY (ARRAY['aguardando'::"text", 'em_analise'::"text", 'aguardando_aprovacao'::"text", 'aprovado'::"text", 'reprovado'::"text", 'aguardando_peca'::"text", 'enviado_terceiro'::"text", 'pronto'::"text", 'finalizado'::"text", 'cancelado'::"text"])))
);


ALTER TABLE "public"."service_orders" OWNER TO "postgres";


COMMENT ON COLUMN "public"."service_orders"."completed_at" IS 'Timestamp de quando a OS foi marcada como pronta (serviço concluído). Usado para produção de técnicos.';



CREATE TABLE IF NOT EXISTS "public"."services" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "code" "text",
    "category" "text" DEFAULT 'reparo'::"text" NOT NULL,
    "price" numeric(10,2),
    "estimated_duration_minutes" integer,
    "warranty_days" integer DEFAULT 0 NOT NULL,
    "notes" "text",
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    "deleted_by" "uuid"
);


ALTER TABLE "public"."services" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stock_movements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "branch_id" "uuid" NOT NULL,
    "part_id" "uuid" NOT NULL,
    "movement_type" "text" NOT NULL,
    "quantity" integer NOT NULL,
    "unit_cost" numeric(10,2),
    "reference_type" "text",
    "reference_id" "uuid",
    "notes" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "supplier_id" "uuid",
    "invoice_date" "date",
    "entry_date" "date" NOT NULL,
    CONSTRAINT "stock_movements_quantity_nonzero" CHECK (("quantity" <> 0)),
    CONSTRAINT "stock_movements_type_check" CHECK (("movement_type" = ANY (ARRAY['entrada'::"text", 'saida'::"text", 'ajuste'::"text", 'transferencia_entrada'::"text", 'transferencia_saida'::"text"])))
);


ALTER TABLE "public"."stock_movements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stock_reservations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "branch_id" "uuid" NOT NULL,
    "part_id" "uuid" NOT NULL,
    "estimate_id" "uuid" NOT NULL,
    "service_order_id" "uuid" NOT NULL,
    "quantity" integer NOT NULL,
    "status" "text" DEFAULT 'ativa'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "resolved_at" timestamp with time zone,
    CONSTRAINT "stock_reservations_quantity_check" CHECK (("quantity" > 0)),
    CONSTRAINT "stock_reservations_status_check" CHECK (("status" = ANY (ARRAY['ativa'::"text", 'consumida'::"text", 'liberada'::"text"])))
);


ALTER TABLE "public"."stock_reservations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."suppliers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "origin_branch_id" "uuid",
    "name" "text" NOT NULL,
    "document" "text",
    "phone" "text",
    "email" "text",
    "zip_code" "text",
    "street" "text",
    "number" "text",
    "complement" "text",
    "city" "text",
    "state" "text",
    "address" "text",
    "notes" "text",
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    "deleted_by" "uuid"
);


ALTER TABLE "public"."suppliers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."third_parties" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "type" "text" DEFAULT 'fabricante'::"text" NOT NULL,
    "document" "text",
    "phone" "text",
    "email" "text",
    "default_return_days" integer,
    "notes" "text",
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    "deleted_by" "uuid",
    CONSTRAINT "third_parties_default_return_days_check" CHECK ((("default_return_days" IS NULL) OR ("default_return_days" > 0))),
    CONSTRAINT "third_parties_type_check" CHECK (("type" = ANY (ARRAY['fabricante'::"text", 'tecnico_especializado'::"text", 'outro'::"text"])))
);


ALTER TABLE "public"."third_parties" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_stock_positions" WITH ("security_invoker"='true') AS
 SELECT "company_id",
    "branch_id",
    "part_id",
    "sum"("quantity") AS "current_stock"
   FROM "public"."stock_movements" "sm"
  GROUP BY "company_id", "branch_id", "part_id";


ALTER VIEW "public"."v_stock_positions" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_stock_positions" IS 'Saldo atual de estoque por peça por filial. Calculado a partir da soma de todas as movimentações.';



CREATE OR REPLACE VIEW "public"."v_stock_available" WITH ("security_invoker"='true') AS
 SELECT "pos"."company_id",
    "pos"."branch_id",
    "pos"."part_id",
    "pos"."current_stock" AS "estoque_fisico",
    COALESCE("res"."reservado", (0)::bigint) AS "estoque_reservado",
    ("pos"."current_stock" - COALESCE("res"."reservado", (0)::bigint)) AS "estoque_disponivel"
   FROM ("public"."v_stock_positions" "pos"
     LEFT JOIN ( SELECT "stock_reservations"."company_id",
            "stock_reservations"."branch_id",
            "stock_reservations"."part_id",
            "sum"("stock_reservations"."quantity") AS "reservado"
           FROM "public"."stock_reservations"
          WHERE ("stock_reservations"."status" = 'ativa'::"text")
          GROUP BY "stock_reservations"."company_id", "stock_reservations"."branch_id", "stock_reservations"."part_id") "res" ON ((("res"."company_id" = "pos"."company_id") AND ("res"."branch_id" = "pos"."branch_id") AND ("res"."part_id" = "pos"."part_id"))));


ALTER VIEW "public"."v_stock_available" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_stock_available" IS 'Disponível = físico (soma de movimentações) menos reservas ativas de orçamentos.';



CREATE TABLE IF NOT EXISTS "public"."whatsapp_automation_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "enabled" boolean DEFAULT false NOT NULL,
    "provider" "text" DEFAULT 'whatsapp_cloud_api'::"text" NOT NULL,
    "base_url" "text" DEFAULT 'graph.facebook.com'::"text" NOT NULL,
    "graph_api_version" "text" DEFAULT 'v16.0'::"text" NOT NULL,
    "app_id" "text",
    "app_secret" "text",
    "phone_number_id" "text",
    "business_account_id" "text",
    "access_token" "text",
    "webhook_verify_token" "text",
    "default_country_code" "text" DEFAULT '55'::"text" NOT NULL,
    "templates_language" "text" DEFAULT 'pt_BR'::"text" NOT NULL,
    "notify_os_created" boolean DEFAULT false NOT NULL,
    "notify_estimate_ready" boolean DEFAULT false NOT NULL,
    "notify_service_completed" boolean DEFAULT false NOT NULL,
    "notify_satisfaction_survey" boolean DEFAULT false NOT NULL,
    "template_os_created" "text",
    "template_estimate_ready" "text",
    "template_service_completed" "text",
    "template_satisfaction_survey" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "evolution_base_url" "text" DEFAULT 'http://127.0.0.1:8080'::"text" NOT NULL,
    "evolution_api_key" "text",
    "evolution_instance_name" "text",
    "evolution_webhook_url" "text",
    "notify_inbound_message" boolean DEFAULT false NOT NULL,
    "message_inbound_auto_reply" "text",
    "message_os_created" "text",
    "message_estimate_ready" "text",
    "message_service_completed" "text",
    "message_satisfaction_survey" "text",
    "authorized_brands" "text",
    "session_timeout_minutes" integer DEFAULT 240 NOT NULL,
    "message_retention_days" integer DEFAULT 30 NOT NULL,
    CONSTRAINT "wha_message_retention_days_check" CHECK ((("message_retention_days" >= 1) AND ("message_retention_days" <= 365))),
    CONSTRAINT "wha_session_timeout_check" CHECK ((("session_timeout_minutes" >= 5) AND ("session_timeout_minutes" <= 1440))),
    CONSTRAINT "whatsapp_automation_settings_base_url_check" CHECK (("base_url" <> ''::"text")),
    CONSTRAINT "whatsapp_automation_settings_country_code_check" CHECK (("default_country_code" ~ '^[0-9]{1,4}$'::"text")),
    CONSTRAINT "whatsapp_automation_settings_evolution_base_url_check" CHECK (("evolution_base_url" ~ '^https?://.+'::"text")),
    CONSTRAINT "whatsapp_automation_settings_evolution_instance_name_check" CHECK ((("evolution_instance_name" IS NULL) OR ("evolution_instance_name" ~ '^[A-Za-z0-9_-]{1,80}$'::"text"))),
    CONSTRAINT "whatsapp_automation_settings_graph_version_check" CHECK (("graph_api_version" ~ '^v[0-9]+[.][0-9]+$'::"text")),
    CONSTRAINT "whatsapp_automation_settings_language_check" CHECK (("templates_language" ~ '^[a-z]{2}(_[A-Z]{2})?$'::"text")),
    CONSTRAINT "whatsapp_automation_settings_message_lengths_check" CHECK (((("message_inbound_auto_reply" IS NULL) OR ("char_length"("message_inbound_auto_reply") <= 2000)) AND (("message_os_created" IS NULL) OR ("char_length"("message_os_created") <= 2000)) AND (("message_estimate_ready" IS NULL) OR ("char_length"("message_estimate_ready") <= 2000)) AND (("message_service_completed" IS NULL) OR ("char_length"("message_service_completed") <= 2000)) AND (("message_satisfaction_survey" IS NULL) OR ("char_length"("message_satisfaction_survey") <= 2000)))),
    CONSTRAINT "whatsapp_automation_settings_provider_check" CHECK (("provider" = ANY (ARRAY['whatsapp_cloud_api'::"text", 'evolution_api'::"text"])))
);


ALTER TABLE "public"."whatsapp_automation_settings" OWNER TO "postgres";


COMMENT ON COLUMN "public"."whatsapp_automation_settings"."authorized_brands" IS 'Lista de marcas autorizadas exibida no menu de resposta automática ({{marcas_autorizadas}}).';



CREATE TABLE IF NOT EXISTS "public"."whatsapp_conversations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "branch_id" "uuid",
    "client_id" "uuid",
    "phone_number" "text" NOT NULL,
    "contact_name" "text",
    "status" "text" DEFAULT 'bot'::"text" NOT NULL,
    "bot_state" "text",
    "bot_enabled" boolean DEFAULT true NOT NULL,
    "context" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "attempts" integer DEFAULT 0 NOT NULL,
    "assigned_to" "uuid",
    "unread_count" integer DEFAULT 0 NOT NULL,
    "last_message_at" timestamp with time zone,
    "last_message_preview" "text",
    "expires_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "whatsapp_conversations_bot_state_check" CHECK (("bot_state" = ANY (ARRAY['awaiting_menu'::"text", 'awaiting_os_number'::"text", 'awaiting_branch'::"text"]))),
    CONSTRAINT "whatsapp_conversations_status_check" CHECK (("status" = ANY (ARRAY['bot'::"text", 'waiting'::"text", 'in_progress'::"text", 'resolved'::"text"])))
);

ALTER TABLE ONLY "public"."whatsapp_conversations" REPLICA IDENTITY FULL;


ALTER TABLE "public"."whatsapp_conversations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."whatsapp_menu_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "position" integer NOT NULL,
    "label" "text" NOT NULL,
    "emoji" "text",
    "handler_type" "text" NOT NULL,
    "handler_config" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "enabled" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "whatsapp_menu_items_handler_type_check" CHECK (("handler_type" = ANY (ARRAY['check_os'::"text", 'human_handoff'::"text", 'info'::"text", 'submenu'::"text", 'url'::"text"])))
);


ALTER TABLE "public"."whatsapp_menu_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."whatsapp_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "conversation_id" "uuid" NOT NULL,
    "company_id" "uuid" NOT NULL,
    "direction" "text" NOT NULL,
    "content" "text" NOT NULL,
    "sent_by_bot" boolean DEFAULT false NOT NULL,
    "sender_name" "text",
    "external_id" "text",
    "status" "text" DEFAULT 'sent'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "whatsapp_messages_direction_check" CHECK (("direction" = ANY (ARRAY['inbound'::"text", 'outbound'::"text"]))),
    CONSTRAINT "whatsapp_messages_status_check" CHECK (("status" = ANY (ARRAY['sent'::"text", 'delivered'::"text", 'read'::"text", 'failed'::"text"])))
);

ALTER TABLE ONLY "public"."whatsapp_messages" REPLICA IDENTITY FULL;


ALTER TABLE "public"."whatsapp_messages" OWNER TO "postgres";


ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bills"
    ADD CONSTRAINT "bills_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."branches"
    ADD CONSTRAINT "branches_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."business_hours"
    ADD CONSTRAINT "business_hours_branch_id_day_of_week_key" UNIQUE ("branch_id", "day_of_week");



ALTER TABLE ONLY "public"."business_hours"
    ADD CONSTRAINT "business_hours_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cash_entries"
    ADD CONSTRAINT "cash_entries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."companies"
    ADD CONSTRAINT "companies_owner_id_unique" UNIQUE ("owner_id");



ALTER TABLE ONLY "public"."companies"
    ADD CONSTRAINT "companies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."company_settings"
    ADD CONSTRAINT "company_settings_company_id_unique" UNIQUE ("company_id");



ALTER TABLE ONLY "public"."company_settings"
    ADD CONSTRAINT "company_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "employees_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."parts"
    ADD CONSTRAINT "parts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."service_order_estimate_items"
    ADD CONSTRAINT "service_order_estimate_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."service_order_estimates"
    ADD CONSTRAINT "service_order_estimates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."service_orders"
    ADD CONSTRAINT "service_orders_company_id_number_key" UNIQUE ("company_id", "number");



ALTER TABLE ONLY "public"."service_orders"
    ADD CONSTRAINT "service_orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."services"
    ADD CONSTRAINT "services_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stock_movements"
    ADD CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stock_reservations"
    ADD CONSTRAINT "stock_reservations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."suppliers"
    ADD CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."third_parties"
    ADD CONSTRAINT "third_parties_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."whatsapp_automation_settings"
    ADD CONSTRAINT "whatsapp_automation_settings_company_unique" UNIQUE ("company_id");



ALTER TABLE ONLY "public"."whatsapp_automation_settings"
    ADD CONSTRAINT "whatsapp_automation_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."whatsapp_conversations"
    ADD CONSTRAINT "whatsapp_conversations_company_id_phone_number_key" UNIQUE ("company_id", "phone_number");



ALTER TABLE ONLY "public"."whatsapp_conversations"
    ADD CONSTRAINT "whatsapp_conversations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."whatsapp_menu_items"
    ADD CONSTRAINT "whatsapp_menu_items_company_id_position_key" UNIQUE ("company_id", "position");



ALTER TABLE ONLY "public"."whatsapp_menu_items"
    ADD CONSTRAINT "whatsapp_menu_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."whatsapp_messages"
    ADD CONSTRAINT "whatsapp_messages_pkey" PRIMARY KEY ("id");



CREATE INDEX "audit_logs_actor_user_id_idx" ON "public"."audit_logs" USING "btree" ("actor_user_id");



CREATE INDEX "audit_logs_company_created_at_idx" ON "public"."audit_logs" USING "btree" ("company_id", "created_at" DESC);



CREATE INDEX "audit_logs_entity_idx" ON "public"."audit_logs" USING "btree" ("entity_type", "entity_id");



CREATE INDEX "branches_company_deleted_at_idx" ON "public"."branches" USING "btree" ("company_id", "deleted_at");



CREATE INDEX "branches_deleted_by_idx" ON "public"."branches" USING "btree" ("deleted_by");



CREATE UNIQUE INDEX "clients_active_document_unique_idx" ON "public"."clients" USING "btree" ("company_id", "regexp_replace"("document", '\\D'::"text", ''::"text", 'g'::"text")) WHERE (("deleted_at" IS NULL) AND (NULLIF("regexp_replace"("document", '\\D'::"text", ''::"text", 'g'::"text"), ''::"text") IS NOT NULL));



CREATE INDEX "clients_company_deleted_at_idx" ON "public"."clients" USING "btree" ("company_id", "deleted_at");



CREATE INDEX "clients_company_origin_branch_idx" ON "public"."clients" USING "btree" ("company_id", "origin_branch_id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "clients_deleted_by_idx" ON "public"."clients" USING "btree" ("deleted_by");



CREATE UNIQUE INDEX "employees_active_email_unique_idx" ON "public"."employees" USING "btree" ("lower"("email")) WHERE (("deleted_at" IS NULL) AND ("email" IS NOT NULL) AND ("btrim"("email") <> ''::"text"));



CREATE INDEX "employees_company_deleted_at_idx" ON "public"."employees" USING "btree" ("company_id", "deleted_at");



CREATE INDEX "employees_deleted_by_idx" ON "public"."employees" USING "btree" ("deleted_by");



CREATE INDEX "idx_bills_branch_id" ON "public"."bills" USING "btree" ("branch_id");



CREATE INDEX "idx_bills_company_due_date" ON "public"."bills" USING "btree" ("company_id", "due_date") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_bills_company_id" ON "public"."bills" USING "btree" ("company_id");



CREATE INDEX "idx_bills_company_status" ON "public"."bills" USING "btree" ("company_id", "status") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_bills_recurrence_group" ON "public"."bills" USING "btree" ("recurrence_group_id") WHERE (("recurrence_group_id" IS NOT NULL) AND ("deleted_at" IS NULL));



CREATE INDEX "idx_cash_entries_branch_created_at" ON "public"."cash_entries" USING "btree" ("branch_id", "created_at" DESC) WHERE ("branch_id" IS NOT NULL);



CREATE INDEX "idx_cash_entries_company_created_at" ON "public"."cash_entries" USING "btree" ("company_id", "created_at" DESC);



CREATE UNIQUE INDEX "idx_cash_entries_service_order_unique" ON "public"."cash_entries" USING "btree" ("service_order_id");



CREATE INDEX "idx_employees_branch_id" ON "public"."employees" USING "btree" ("branch_id");



CREATE INDEX "idx_employees_company_id" ON "public"."employees" USING "btree" ("company_id");



CREATE INDEX "idx_employees_user_id" ON "public"."employees" USING "btree" ("user_id");



CREATE INDEX "idx_notifications_company_unread" ON "public"."notifications" USING "btree" ("company_id", "created_at" DESC) WHERE ("read_at" IS NULL);



CREATE INDEX "idx_notifications_dedup" ON "public"."notifications" USING "btree" ("company_id", "part_id", "branch_id", "type") WHERE ("read_at" IS NULL);



CREATE INDEX "idx_notifications_service_order" ON "public"."notifications" USING "btree" ("service_order_id") WHERE ("service_order_id" IS NOT NULL);



CREATE INDEX "idx_service_orders_branch_id" ON "public"."service_orders" USING "btree" ("branch_id");



CREATE INDEX "idx_service_orders_client_id" ON "public"."service_orders" USING "btree" ("client_id");



CREATE INDEX "idx_service_orders_company_id" ON "public"."service_orders" USING "btree" ("company_id");



CREATE INDEX "idx_service_orders_deleted_at" ON "public"."service_orders" USING "btree" ("deleted_at");



CREATE INDEX "idx_service_orders_status" ON "public"."service_orders" USING "btree" ("status");



CREATE INDEX "idx_service_orders_third_party_pending" ON "public"."service_orders" USING "btree" ("company_id", "third_party_expected_return_at") WHERE (("status" = 'enviado_terceiro'::"text") AND ("deleted_at" IS NULL));



CREATE INDEX "idx_soei_part_id" ON "public"."service_order_estimate_items" USING "btree" ("part_id") WHERE ("part_id" IS NOT NULL);



CREATE INDEX "idx_stock_movements_branch_id" ON "public"."stock_movements" USING "btree" ("branch_id");



CREATE INDEX "idx_stock_movements_company_branch_part" ON "public"."stock_movements" USING "btree" ("company_id", "branch_id", "part_id");



CREATE INDEX "idx_stock_movements_company_id" ON "public"."stock_movements" USING "btree" ("company_id");



CREATE INDEX "idx_stock_movements_company_part" ON "public"."stock_movements" USING "btree" ("company_id", "part_id");



CREATE INDEX "idx_stock_movements_created_at" ON "public"."stock_movements" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_stock_movements_entry_date" ON "public"."stock_movements" USING "btree" ("entry_date" DESC);



CREATE INDEX "idx_stock_movements_invoice_date" ON "public"."stock_movements" USING "btree" ("invoice_date" DESC);



CREATE INDEX "idx_stock_movements_part_id" ON "public"."stock_movements" USING "btree" ("part_id");



CREATE INDEX "idx_stock_movements_supplier_id" ON "public"."stock_movements" USING "btree" ("supplier_id");



CREATE INDEX "idx_stock_reservations_active" ON "public"."stock_reservations" USING "btree" ("company_id", "branch_id", "part_id") WHERE ("status" = 'ativa'::"text");



CREATE INDEX "idx_stock_reservations_estimate" ON "public"."stock_reservations" USING "btree" ("estimate_id");



CREATE INDEX "idx_stock_reservations_service_order" ON "public"."stock_reservations" USING "btree" ("service_order_id");



CREATE INDEX "idx_wapp_conv_company_branch" ON "public"."whatsapp_conversations" USING "btree" ("company_id", "branch_id");



CREATE INDEX "idx_wapp_conv_company_status" ON "public"."whatsapp_conversations" USING "btree" ("company_id", "status", "last_message_at" DESC);



CREATE INDEX "idx_wapp_conv_phone" ON "public"."whatsapp_conversations" USING "btree" ("company_id", "phone_number");



CREATE INDEX "idx_wapp_menu_company" ON "public"."whatsapp_menu_items" USING "btree" ("company_id", "position");



CREATE INDEX "idx_wapp_msg_company" ON "public"."whatsapp_messages" USING "btree" ("company_id", "created_at" DESC);



CREATE INDEX "idx_wapp_msg_conversation" ON "public"."whatsapp_messages" USING "btree" ("conversation_id", "created_at");



CREATE UNIQUE INDEX "parts_active_sku_unique_idx" ON "public"."parts" USING "btree" ("company_id", "sku") WHERE (("sku" IS NOT NULL) AND ("deleted_at" IS NULL));



CREATE INDEX "parts_company_id_idx" ON "public"."parts" USING "btree" ("company_id");



CREATE INDEX "parts_supplier_id_idx" ON "public"."parts" USING "btree" ("supplier_id");



CREATE INDEX "service_order_estimate_items_company_idx" ON "public"."service_order_estimate_items" USING "btree" ("company_id");



CREATE INDEX "service_order_estimate_items_estimate_idx" ON "public"."service_order_estimate_items" USING "btree" ("estimate_id");



CREATE INDEX "service_order_estimate_items_service_order_idx" ON "public"."service_order_estimate_items" USING "btree" ("service_order_id");



CREATE UNIQUE INDEX "service_order_estimates_active_version_unique_idx" ON "public"."service_order_estimates" USING "btree" ("service_order_id", "version") WHERE ("deleted_at" IS NULL);



CREATE INDEX "service_order_estimates_company_deleted_at_idx" ON "public"."service_order_estimates" USING "btree" ("company_id", "deleted_at");



CREATE INDEX "service_order_estimates_deleted_by_idx" ON "public"."service_order_estimates" USING "btree" ("deleted_by");



CREATE INDEX "service_order_estimates_service_order_idx" ON "public"."service_order_estimates" USING "btree" ("service_order_id", "created_at" DESC) WHERE ("deleted_at" IS NULL);



CREATE INDEX "service_order_estimates_status_idx" ON "public"."service_order_estimates" USING "btree" ("company_id", "status") WHERE ("deleted_at" IS NULL);



CREATE UNIQUE INDEX "services_active_code_unique_idx" ON "public"."services" USING "btree" ("company_id", "code") WHERE (("deleted_at" IS NULL) AND ("code" IS NOT NULL) AND (TRIM(BOTH FROM "code") <> ''::"text"));



CREATE INDEX "services_active_idx" ON "public"."services" USING "btree" ("company_id", "active") WHERE ("deleted_at" IS NULL);



CREATE INDEX "services_category_idx" ON "public"."services" USING "btree" ("company_id", "category") WHERE ("deleted_at" IS NULL);



CREATE INDEX "services_company_id_idx" ON "public"."services" USING "btree" ("company_id");



CREATE UNIQUE INDEX "suppliers_active_document_unique_idx" ON "public"."suppliers" USING "btree" ("company_id", "regexp_replace"("document", '\D'::"text", ''::"text", 'g'::"text")) WHERE (("deleted_at" IS NULL) AND (NULLIF("regexp_replace"("document", '\D'::"text", ''::"text", 'g'::"text"), ''::"text") IS NOT NULL));



CREATE INDEX "suppliers_company_deleted_at_idx" ON "public"."suppliers" USING "btree" ("company_id", "deleted_at");



CREATE INDEX "suppliers_company_origin_branch_idx" ON "public"."suppliers" USING "btree" ("company_id", "origin_branch_id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "suppliers_deleted_by_idx" ON "public"."suppliers" USING "btree" ("deleted_by");



CREATE UNIQUE INDEX "third_parties_active_document_unique_idx" ON "public"."third_parties" USING "btree" ("company_id", "regexp_replace"("document", '\D'::"text", ''::"text", 'g'::"text")) WHERE (("deleted_at" IS NULL) AND (NULLIF("regexp_replace"("document", '\D'::"text", ''::"text", 'g'::"text"), ''::"text") IS NOT NULL));



CREATE INDEX "third_parties_company_deleted_at_idx" ON "public"."third_parties" USING "btree" ("company_id", "deleted_at");



CREATE INDEX "third_parties_deleted_by_idx" ON "public"."third_parties" USING "btree" ("deleted_by");



CREATE INDEX "whatsapp_automation_settings_company_idx" ON "public"."whatsapp_automation_settings" USING "btree" ("company_id");



CREATE INDEX "whatsapp_automation_settings_enabled_idx" ON "public"."whatsapp_automation_settings" USING "btree" ("enabled") WHERE ("enabled" = true);



CREATE INDEX "whatsapp_automation_settings_verify_token_idx" ON "public"."whatsapp_automation_settings" USING "btree" ("webhook_verify_token") WHERE ("webhook_verify_token" IS NOT NULL);



CREATE OR REPLACE TRIGGER "clients_set_updated_at" BEFORE UPDATE ON "public"."clients" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "employees_set_updated_at" BEFORE UPDATE ON "public"."employees" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "service_order_estimate_items_set_updated_at" BEFORE UPDATE ON "public"."service_order_estimate_items" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "service_order_estimates_set_updated_at" BEFORE UPDATE ON "public"."service_order_estimates" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "services_updated_at" BEFORE UPDATE ON "public"."services" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "suppliers_set_updated_at" BEFORE UPDATE ON "public"."suppliers" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "third_parties_set_updated_at" BEFORE UPDATE ON "public"."third_parties" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_branches_updated_at" BEFORE UPDATE ON "public"."branches" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_client_classification" AFTER INSERT OR DELETE OR UPDATE OF "status", "payment_status", "client_id", "deleted_at" ON "public"."service_orders" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_recalculate_client_classification"();



CREATE OR REPLACE TRIGGER "trg_companies_updated_at" BEFORE UPDATE ON "public"."companies" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_notify_low_stock" AFTER INSERT ON "public"."stock_movements" FOR EACH ROW EXECUTE FUNCTION "public"."fn_notify_low_stock"();



CREATE OR REPLACE TRIGGER "trg_parts_updated_at" BEFORE UPDATE ON "public"."parts" FOR EACH ROW EXECUTE FUNCTION "public"."update_parts_updated_at"();



CREATE OR REPLACE TRIGGER "trg_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_service_orders_updated_at" BEFORE UPDATE ON "public"."service_orders" FOR EACH ROW EXECUTE FUNCTION "public"."set_service_order_updated_at"();



CREATE OR REPLACE TRIGGER "trg_set_service_order_number" BEFORE INSERT ON "public"."service_orders" FOR EACH ROW EXECUTE FUNCTION "public"."set_service_order_number"();



CREATE OR REPLACE TRIGGER "trg_whatsapp_conversations_updated_at" BEFORE UPDATE ON "public"."whatsapp_conversations" FOR EACH ROW EXECUTE FUNCTION "public"."fn_set_updated_at"();



CREATE OR REPLACE TRIGGER "whatsapp_automation_settings_set_updated_at" BEFORE UPDATE ON "public"."whatsapp_automation_settings" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bills"
    ADD CONSTRAINT "bills_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."bills"
    ADD CONSTRAINT "bills_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."bills"
    ADD CONSTRAINT "bills_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."bills"
    ADD CONSTRAINT "bills_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."branches"
    ADD CONSTRAINT "branches_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."branches"
    ADD CONSTRAINT "branches_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."business_hours"
    ADD CONSTRAINT "business_hours_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cash_entries"
    ADD CONSTRAINT "cash_entries_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."cash_entries"
    ADD CONSTRAINT "cash_entries_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cash_entries"
    ADD CONSTRAINT "cash_entries_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."cash_entries"
    ADD CONSTRAINT "cash_entries_estimate_id_fkey" FOREIGN KEY ("estimate_id") REFERENCES "public"."service_order_estimates"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."cash_entries"
    ADD CONSTRAINT "cash_entries_service_order_id_fkey" FOREIGN KEY ("service_order_id") REFERENCES "public"."service_orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_origin_branch_id_fkey" FOREIGN KEY ("origin_branch_id") REFERENCES "public"."branches"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."companies"
    ADD CONSTRAINT "companies_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."company_settings"
    ADD CONSTRAINT "company_settings_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "employees_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "employees_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "employees_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "employees_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_part_id_fkey" FOREIGN KEY ("part_id") REFERENCES "public"."parts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_service_order_id_fkey" FOREIGN KEY ("service_order_id") REFERENCES "public"."service_orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."parts"
    ADD CONSTRAINT "parts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."parts"
    ADD CONSTRAINT "parts_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."parts"
    ADD CONSTRAINT "parts_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."service_order_estimate_items"
    ADD CONSTRAINT "service_order_estimate_items_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."service_order_estimate_items"
    ADD CONSTRAINT "service_order_estimate_items_estimate_id_fkey" FOREIGN KEY ("estimate_id") REFERENCES "public"."service_order_estimates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."service_order_estimate_items"
    ADD CONSTRAINT "service_order_estimate_items_part_id_fkey" FOREIGN KEY ("part_id") REFERENCES "public"."parts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."service_order_estimate_items"
    ADD CONSTRAINT "service_order_estimate_items_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."service_order_estimate_items"
    ADD CONSTRAINT "service_order_estimate_items_service_order_id_fkey" FOREIGN KEY ("service_order_id") REFERENCES "public"."service_orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."service_order_estimates"
    ADD CONSTRAINT "service_order_estimates_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."service_order_estimates"
    ADD CONSTRAINT "service_order_estimates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."service_order_estimates"
    ADD CONSTRAINT "service_order_estimates_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."service_order_estimates"
    ADD CONSTRAINT "service_order_estimates_service_order_id_fkey" FOREIGN KEY ("service_order_id") REFERENCES "public"."service_orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."service_orders"
    ADD CONSTRAINT "service_orders_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id");



ALTER TABLE ONLY "public"."service_orders"
    ADD CONSTRAINT "service_orders_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id");



ALTER TABLE ONLY "public"."service_orders"
    ADD CONSTRAINT "service_orders_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id");



ALTER TABLE ONLY "public"."service_orders"
    ADD CONSTRAINT "service_orders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."service_orders"
    ADD CONSTRAINT "service_orders_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."service_orders"
    ADD CONSTRAINT "service_orders_delivered_by_fkey" FOREIGN KEY ("delivered_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."service_orders"
    ADD CONSTRAINT "service_orders_technician_id_fkey" FOREIGN KEY ("technician_id") REFERENCES "public"."employees"("id");



ALTER TABLE ONLY "public"."service_orders"
    ADD CONSTRAINT "service_orders_third_party_id_fkey" FOREIGN KEY ("third_party_id") REFERENCES "public"."third_parties"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."services"
    ADD CONSTRAINT "services_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."services"
    ADD CONSTRAINT "services_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."stock_movements"
    ADD CONSTRAINT "stock_movements_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."stock_movements"
    ADD CONSTRAINT "stock_movements_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."stock_movements"
    ADD CONSTRAINT "stock_movements_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."stock_movements"
    ADD CONSTRAINT "stock_movements_part_id_fkey" FOREIGN KEY ("part_id") REFERENCES "public"."parts"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."stock_movements"
    ADD CONSTRAINT "stock_movements_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."stock_reservations"
    ADD CONSTRAINT "stock_reservations_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."stock_reservations"
    ADD CONSTRAINT "stock_reservations_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stock_reservations"
    ADD CONSTRAINT "stock_reservations_estimate_id_fkey" FOREIGN KEY ("estimate_id") REFERENCES "public"."service_order_estimates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stock_reservations"
    ADD CONSTRAINT "stock_reservations_part_id_fkey" FOREIGN KEY ("part_id") REFERENCES "public"."parts"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."stock_reservations"
    ADD CONSTRAINT "stock_reservations_service_order_id_fkey" FOREIGN KEY ("service_order_id") REFERENCES "public"."service_orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."suppliers"
    ADD CONSTRAINT "suppliers_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."suppliers"
    ADD CONSTRAINT "suppliers_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."suppliers"
    ADD CONSTRAINT "suppliers_origin_branch_id_fkey" FOREIGN KEY ("origin_branch_id") REFERENCES "public"."branches"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."third_parties"
    ADD CONSTRAINT "third_parties_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."third_parties"
    ADD CONSTRAINT "third_parties_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."whatsapp_automation_settings"
    ADD CONSTRAINT "whatsapp_automation_settings_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."whatsapp_conversations"
    ADD CONSTRAINT "whatsapp_conversations_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "public"."employees"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."whatsapp_conversations"
    ADD CONSTRAINT "whatsapp_conversations_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."whatsapp_conversations"
    ADD CONSTRAINT "whatsapp_conversations_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."whatsapp_conversations"
    ADD CONSTRAINT "whatsapp_conversations_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."whatsapp_menu_items"
    ADD CONSTRAINT "whatsapp_menu_items_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."whatsapp_messages"
    ADD CONSTRAINT "whatsapp_messages_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."whatsapp_messages"
    ADD CONSTRAINT "whatsapp_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."whatsapp_conversations"("id") ON DELETE CASCADE;



CREATE POLICY "Authenticated users can create audit logs for own company" ON "public"."audit_logs" FOR INSERT TO "authenticated" WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."companies"
  WHERE (("companies"."id" = "audit_logs"."company_id") AND ("companies"."owner_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR (EXISTS ( SELECT 1
   FROM "public"."employees"
  WHERE (("employees"."company_id" = "audit_logs"."company_id") AND ("employees"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("employees"."active" = true) AND ("employees"."deleted_at" IS NULL))))));



CREATE POLICY "Owners and admins can insert whatsapp automation settings" ON "public"."whatsapp_automation_settings" FOR INSERT TO "authenticated" WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."companies"
  WHERE (("companies"."id" = "whatsapp_automation_settings"."company_id") AND ("companies"."owner_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."employees"
  WHERE (("employees"."company_id" = "whatsapp_automation_settings"."company_id") AND ("employees"."user_id" = "auth"."uid"()) AND ("employees"."role" = 'admin'::"text") AND ("employees"."active" = true) AND ("employees"."deleted_at" IS NULL))))));



CREATE POLICY "Owners and admins can update whatsapp automation settings" ON "public"."whatsapp_automation_settings" FOR UPDATE TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."companies"
  WHERE (("companies"."id" = "whatsapp_automation_settings"."company_id") AND ("companies"."owner_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."employees"
  WHERE (("employees"."company_id" = "whatsapp_automation_settings"."company_id") AND ("employees"."user_id" = "auth"."uid"()) AND ("employees"."role" = 'admin'::"text") AND ("employees"."active" = true) AND ("employees"."deleted_at" IS NULL)))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."companies"
  WHERE (("companies"."id" = "whatsapp_automation_settings"."company_id") AND ("companies"."owner_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."employees"
  WHERE (("employees"."company_id" = "whatsapp_automation_settings"."company_id") AND ("employees"."user_id" = "auth"."uid"()) AND ("employees"."role" = 'admin'::"text") AND ("employees"."active" = true) AND ("employees"."deleted_at" IS NULL))))));



CREATE POLICY "Owners and admins can view audit logs" ON "public"."audit_logs" FOR SELECT TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."companies"
  WHERE (("companies"."id" = "audit_logs"."company_id") AND ("companies"."owner_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR (EXISTS ( SELECT 1
   FROM "public"."employees"
  WHERE (("employees"."company_id" = "audit_logs"."company_id") AND ("employees"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("employees"."role" = 'admin'::"text") AND ("employees"."active" = true) AND ("employees"."deleted_at" IS NULL))))));



CREATE POLICY "Owners and admins can view whatsapp automation settings" ON "public"."whatsapp_automation_settings" FOR SELECT TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."companies"
  WHERE (("companies"."id" = "whatsapp_automation_settings"."company_id") AND ("companies"."owner_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."employees"
  WHERE (("employees"."company_id" = "whatsapp_automation_settings"."company_id") AND ("employees"."user_id" = "auth"."uid"()) AND ("employees"."role" = 'admin'::"text") AND ("employees"."active" = true) AND ("employees"."deleted_at" IS NULL))))));



CREATE POLICY "admins_insert_conversations" ON "public"."whatsapp_conversations" FOR INSERT WITH CHECK ("public"."fn_is_company_admin"("company_id"));



CREATE POLICY "admins_manage_menu_items" ON "public"."whatsapp_menu_items" USING ("public"."fn_is_company_admin"("company_id")) WITH CHECK ("public"."fn_is_company_admin"("company_id"));



ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."bills" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."branches" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "branches: company owner delete" ON "public"."branches" FOR DELETE USING (("company_id" IN ( SELECT "companies"."id"
   FROM "public"."companies"
  WHERE ("companies"."owner_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "branches: company owner insert" ON "public"."branches" FOR INSERT WITH CHECK (("company_id" IN ( SELECT "companies"."id"
   FROM "public"."companies"
  WHERE ("companies"."owner_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "branches: company owner read" ON "public"."branches" FOR SELECT USING (("company_id" IN ( SELECT "companies"."id"
   FROM "public"."companies"
  WHERE ("companies"."owner_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "branches: company owner update" ON "public"."branches" FOR UPDATE USING (("company_id" IN ( SELECT "companies"."id"
   FROM "public"."companies"
  WHERE ("companies"."owner_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "branches: employees read" ON "public"."branches" FOR SELECT USING (("company_id" IN ( SELECT "employees"."company_id"
   FROM "public"."employees"
  WHERE (("employees"."user_id" = "auth"."uid"()) AND ("employees"."deleted_at" IS NULL)))));



ALTER TABLE "public"."business_hours" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "business_hours: company owner insert" ON "public"."business_hours" FOR INSERT WITH CHECK (("branch_id" IN ( SELECT "b"."id"
   FROM ("public"."branches" "b"
     JOIN "public"."companies" "c" ON (("c"."id" = "b"."company_id")))
  WHERE ("c"."owner_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "business_hours: company owner read" ON "public"."business_hours" FOR SELECT USING (("branch_id" IN ( SELECT "b"."id"
   FROM ("public"."branches" "b"
     JOIN "public"."companies" "c" ON (("c"."id" = "b"."company_id")))
  WHERE ("c"."owner_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "business_hours: company owner update" ON "public"."business_hours" FOR UPDATE USING (("branch_id" IN ( SELECT "b"."id"
   FROM ("public"."branches" "b"
     JOIN "public"."companies" "c" ON (("c"."id" = "b"."company_id")))
  WHERE ("c"."owner_id" = ( SELECT "auth"."uid"() AS "uid")))));



ALTER TABLE "public"."cash_entries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."clients" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "clients_delete" ON "public"."clients" FOR DELETE TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."companies"
  WHERE (("companies"."id" = "clients"."company_id") AND ("companies"."owner_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR (EXISTS ( SELECT 1
   FROM "public"."employees"
  WHERE (("employees"."company_id" = "clients"."company_id") AND ("employees"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("employees"."role" = 'admin'::"text") AND ("employees"."active" = true) AND ("employees"."deleted_at" IS NULL))))));



CREATE POLICY "clients_insert" ON "public"."clients" FOR INSERT TO "authenticated" WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."companies"
  WHERE (("companies"."id" = "clients"."company_id") AND ("companies"."owner_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR (EXISTS ( SELECT 1
   FROM "public"."employees"
  WHERE (("employees"."company_id" = "clients"."company_id") AND ("employees"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("employees"."role" = ANY (ARRAY['admin'::"text", 'atendente'::"text", 'tecnico'::"text"])) AND ("employees"."active" = true) AND ("employees"."deleted_at" IS NULL))))));



CREATE POLICY "clients_select" ON "public"."clients" FOR SELECT TO "authenticated" USING ((("deleted_at" IS NULL) AND ((EXISTS ( SELECT 1
   FROM "public"."companies"
  WHERE (("companies"."id" = "clients"."company_id") AND ("companies"."owner_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR (EXISTS ( SELECT 1
   FROM "public"."employees"
  WHERE (("employees"."company_id" = "clients"."company_id") AND ("employees"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("employees"."active" = true) AND ("employees"."deleted_at" IS NULL)))))));



CREATE POLICY "clients_update" ON "public"."clients" FOR UPDATE TO "authenticated" USING ((("deleted_at" IS NULL) AND ((EXISTS ( SELECT 1
   FROM "public"."companies"
  WHERE (("companies"."id" = "clients"."company_id") AND ("companies"."owner_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR (EXISTS ( SELECT 1
   FROM "public"."employees"
  WHERE (("employees"."company_id" = "clients"."company_id") AND ("employees"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("employees"."role" = 'admin'::"text") AND ("employees"."active" = true) AND ("employees"."deleted_at" IS NULL))))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."companies"
  WHERE (("companies"."id" = "clients"."company_id") AND ("companies"."owner_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR (EXISTS ( SELECT 1
   FROM "public"."employees"
  WHERE (("employees"."company_id" = "clients"."company_id") AND ("employees"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("employees"."role" = 'admin'::"text") AND ("employees"."active" = true) AND ("employees"."deleted_at" IS NULL))))));



ALTER TABLE "public"."companies" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "companies: owner insert" ON "public"."companies" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "owner_id"));



CREATE POLICY "companies: owner read" ON "public"."companies" FOR SELECT USING ((( SELECT "auth"."uid"() AS "uid") = "owner_id"));



CREATE POLICY "companies: owner update" ON "public"."companies" FOR UPDATE USING ((( SELECT "auth"."uid"() AS "uid") = "owner_id"));



CREATE POLICY "companies_employee_select" ON "public"."companies" FOR SELECT TO "authenticated" USING ((("owner_id" = ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
   FROM "public"."employees"
  WHERE (("employees"."company_id" = "companies"."id") AND ("employees"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("employees"."active" = true) AND ("employees"."deleted_at" IS NULL))))));



CREATE POLICY "company_admins_can_insert_bills" ON "public"."bills" FOR INSERT TO "authenticated" WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."companies"
  WHERE (("companies"."id" = "bills"."company_id") AND ("companies"."owner_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR (EXISTS ( SELECT 1
   FROM "public"."employees"
  WHERE (("employees"."company_id" = "bills"."company_id") AND ("employees"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("employees"."role" = 'admin'::"text") AND ("employees"."active" = true) AND ("employees"."deleted_at" IS NULL))))));



CREATE POLICY "company_admins_can_insert_cash_entries" ON "public"."cash_entries" FOR INSERT WITH CHECK (("company_id" IN ( SELECT "companies"."id"
   FROM "public"."companies"
  WHERE ("companies"."owner_id" = "auth"."uid"())
UNION ALL
 SELECT "employees"."company_id"
   FROM "public"."employees"
  WHERE (("employees"."user_id" = "auth"."uid"()) AND ("employees"."role" = ANY (ARRAY['admin'::"text", 'atendente'::"text", 'tecnico'::"text"])) AND ("employees"."active" = true) AND ("employees"."deleted_at" IS NULL)))));



CREATE POLICY "company_admins_can_insert_stock_movements" ON "public"."stock_movements" FOR INSERT WITH CHECK (("company_id" IN ( SELECT "companies"."id"
   FROM "public"."companies"
  WHERE ("companies"."owner_id" = "auth"."uid"())
UNION ALL
 SELECT "employees"."company_id"
   FROM "public"."employees"
  WHERE (("employees"."user_id" = "auth"."uid"()) AND ("employees"."role" = ANY (ARRAY['admin'::"text", 'atendente'::"text", 'tecnico'::"text"])) AND ("employees"."active" = true) AND ("employees"."deleted_at" IS NULL)))));



CREATE POLICY "company_admins_can_insert_stock_reservations" ON "public"."stock_reservations" FOR INSERT WITH CHECK (("company_id" IN ( SELECT "companies"."id"
   FROM "public"."companies"
  WHERE ("companies"."owner_id" = "auth"."uid"())
UNION ALL
 SELECT "employees"."company_id"
   FROM "public"."employees"
  WHERE (("employees"."user_id" = "auth"."uid"()) AND ("employees"."role" = ANY (ARRAY['admin'::"text", 'atendente'::"text", 'tecnico'::"text"])) AND ("employees"."active" = true) AND ("employees"."deleted_at" IS NULL)))));



CREATE POLICY "company_admins_can_update_bills" ON "public"."bills" FOR UPDATE TO "authenticated" USING ((("deleted_at" IS NULL) AND ((EXISTS ( SELECT 1
   FROM "public"."companies"
  WHERE (("companies"."id" = "bills"."company_id") AND ("companies"."owner_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR (EXISTS ( SELECT 1
   FROM "public"."employees"
  WHERE (("employees"."company_id" = "bills"."company_id") AND ("employees"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("employees"."role" = 'admin'::"text") AND ("employees"."active" = true) AND ("employees"."deleted_at" IS NULL))))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."companies"
  WHERE (("companies"."id" = "bills"."company_id") AND ("companies"."owner_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR (EXISTS ( SELECT 1
   FROM "public"."employees"
  WHERE (("employees"."company_id" = "bills"."company_id") AND ("employees"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("employees"."role" = 'admin'::"text") AND ("employees"."active" = true) AND ("employees"."deleted_at" IS NULL))))));



CREATE POLICY "company_admins_can_update_stock_reservations" ON "public"."stock_reservations" FOR UPDATE USING (("company_id" IN ( SELECT "companies"."id"
   FROM "public"."companies"
  WHERE ("companies"."owner_id" = "auth"."uid"())
UNION ALL
 SELECT "employees"."company_id"
   FROM "public"."employees"
  WHERE (("employees"."user_id" = "auth"."uid"()) AND ("employees"."role" = ANY (ARRAY['admin'::"text", 'atendente'::"text", 'tecnico'::"text"])) AND ("employees"."active" = true) AND ("employees"."deleted_at" IS NULL)))));



CREATE POLICY "company_admins_can_view_bills" ON "public"."bills" FOR SELECT TO "authenticated" USING ((("deleted_at" IS NULL) AND ((EXISTS ( SELECT 1
   FROM "public"."companies"
  WHERE (("companies"."id" = "bills"."company_id") AND ("companies"."owner_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR (EXISTS ( SELECT 1
   FROM "public"."employees"
  WHERE (("employees"."company_id" = "bills"."company_id") AND ("employees"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("employees"."role" = 'admin'::"text") AND ("employees"."active" = true) AND ("employees"."deleted_at" IS NULL)))))));



CREATE POLICY "company_members_can_insert_notifications" ON "public"."notifications" FOR INSERT WITH CHECK (("company_id" IN ( SELECT "companies"."id"
   FROM "public"."companies"
  WHERE ("companies"."owner_id" = "auth"."uid"())
UNION ALL
 SELECT "employees"."company_id"
   FROM "public"."employees"
  WHERE (("employees"."user_id" = "auth"."uid"()) AND ("employees"."active" = true) AND ("employees"."deleted_at" IS NULL)))));



CREATE POLICY "company_members_can_mark_notifications_read" ON "public"."notifications" FOR UPDATE USING (("company_id" IN ( SELECT "companies"."id"
   FROM "public"."companies"
  WHERE ("companies"."owner_id" = "auth"."uid"())
UNION ALL
 SELECT "employees"."company_id"
   FROM "public"."employees"
  WHERE (("employees"."user_id" = "auth"."uid"()) AND ("employees"."active" = true) AND ("employees"."deleted_at" IS NULL))))) WITH CHECK (("company_id" IN ( SELECT "companies"."id"
   FROM "public"."companies"
  WHERE ("companies"."owner_id" = "auth"."uid"())
UNION ALL
 SELECT "employees"."company_id"
   FROM "public"."employees"
  WHERE (("employees"."user_id" = "auth"."uid"()) AND ("employees"."active" = true) AND ("employees"."deleted_at" IS NULL)))));



CREATE POLICY "company_members_can_view_cash_entries" ON "public"."cash_entries" FOR SELECT USING (("company_id" IN ( SELECT "companies"."id"
   FROM "public"."companies"
  WHERE ("companies"."owner_id" = "auth"."uid"())
UNION ALL
 SELECT "employees"."company_id"
   FROM "public"."employees"
  WHERE (("employees"."user_id" = "auth"."uid"()) AND ("employees"."active" = true) AND ("employees"."deleted_at" IS NULL)))));



CREATE POLICY "company_members_can_view_notifications" ON "public"."notifications" FOR SELECT USING (("company_id" IN ( SELECT "companies"."id"
   FROM "public"."companies"
  WHERE ("companies"."owner_id" = "auth"."uid"())
UNION ALL
 SELECT "employees"."company_id"
   FROM "public"."employees"
  WHERE (("employees"."user_id" = "auth"."uid"()) AND ("employees"."active" = true) AND ("employees"."deleted_at" IS NULL)))));



CREATE POLICY "company_members_can_view_stock_movements" ON "public"."stock_movements" FOR SELECT USING (("company_id" IN ( SELECT "companies"."id"
   FROM "public"."companies"
  WHERE ("companies"."owner_id" = "auth"."uid"())
UNION ALL
 SELECT "employees"."company_id"
   FROM "public"."employees"
  WHERE (("employees"."user_id" = "auth"."uid"()) AND ("employees"."active" = true) AND ("employees"."deleted_at" IS NULL)))));



CREATE POLICY "company_members_can_view_stock_reservations" ON "public"."stock_reservations" FOR SELECT USING (("company_id" IN ( SELECT "companies"."id"
   FROM "public"."companies"
  WHERE ("companies"."owner_id" = "auth"."uid"())
UNION ALL
 SELECT "employees"."company_id"
   FROM "public"."employees"
  WHERE (("employees"."user_id" = "auth"."uid"()) AND ("employees"."active" = true) AND ("employees"."deleted_at" IS NULL)))));



ALTER TABLE "public"."company_settings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "company_settings_insert" ON "public"."company_settings" FOR INSERT WITH CHECK (("company_id" IN ( SELECT "companies"."id"
   FROM "public"."companies"
  WHERE ("companies"."owner_id" = "auth"."uid"()))));



CREATE POLICY "company_settings_select" ON "public"."company_settings" FOR SELECT USING (("company_id" IN ( SELECT "companies"."id"
   FROM "public"."companies"
  WHERE ("companies"."owner_id" = "auth"."uid"())
UNION
 SELECT "employees"."company_id"
   FROM "public"."employees"
  WHERE (("employees"."user_id" = "auth"."uid"()) AND ("employees"."deleted_at" IS NULL)))));



CREATE POLICY "company_settings_update" ON "public"."company_settings" FOR UPDATE USING (("company_id" IN ( SELECT "companies"."id"
   FROM "public"."companies"
  WHERE ("companies"."owner_id" = "auth"."uid"()))));



ALTER TABLE "public"."employees" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "employees_delete" ON "public"."employees" FOR DELETE TO "authenticated" USING ("public"."is_active_company_admin"("company_id"));



CREATE POLICY "employees_insert" ON "public"."employees" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_active_company_admin"("company_id"));



CREATE POLICY "employees_select" ON "public"."employees" FOR SELECT TO "authenticated" USING ("public"."is_active_company_admin"("company_id"));



CREATE POLICY "employees_self_select" ON "public"."employees" FOR SELECT TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "employees_update" ON "public"."employees" FOR UPDATE TO "authenticated" USING ("public"."is_active_company_admin"("company_id")) WITH CHECK ("public"."is_active_company_admin"("company_id"));



CREATE POLICY "members_insert_messages" ON "public"."whatsapp_messages" FOR INSERT WITH CHECK ("public"."fn_is_company_member"("company_id"));



CREATE POLICY "members_update_conversations" ON "public"."whatsapp_conversations" FOR UPDATE USING ("public"."fn_is_company_member"("company_id"));



CREATE POLICY "members_view_conversations" ON "public"."whatsapp_conversations" FOR SELECT USING ("public"."fn_is_company_member"("company_id"));



CREATE POLICY "members_view_menu_items" ON "public"."whatsapp_menu_items" FOR SELECT USING ("public"."fn_is_company_member"("company_id"));



CREATE POLICY "members_view_messages" ON "public"."whatsapp_messages" FOR SELECT USING ("public"."fn_is_company_member"("company_id"));



ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."parts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "parts_admin_all" ON "public"."parts" USING ((("company_id" IN ( SELECT "companies"."id"
   FROM "public"."companies"
  WHERE ("companies"."owner_id" = "auth"."uid"()))) OR (((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text") = 'admin'::"text") AND ("company_id" = ((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'company_id'::"text"))::"uuid"))));



CREATE POLICY "parts_employee_read" ON "public"."parts" FOR SELECT USING ((("deleted_at" IS NULL) AND ("active" = true) AND ("company_id" = ((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'company_id'::"text"))::"uuid") AND ((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text") = ANY (ARRAY['atendente'::"text", 'tecnico'::"text"]))));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles: own read" ON "public"."profiles" FOR SELECT USING ((( SELECT "auth"."uid"() AS "uid") = "id"));



CREATE POLICY "profiles: own update" ON "public"."profiles" FOR UPDATE USING ((( SELECT "auth"."uid"() AS "uid") = "id"));



ALTER TABLE "public"."service_order_estimate_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "service_order_estimate_items_delete" ON "public"."service_order_estimate_items" FOR DELETE TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."companies"
  WHERE (("companies"."id" = "service_order_estimate_items"."company_id") AND ("companies"."owner_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR ((((( SELECT "auth"."jwt"() AS "jwt") -> 'app_metadata'::"text") ->> 'role'::"text") = 'admin'::"text") AND ((NULLIF(((( SELECT "auth"."jwt"() AS "jwt") -> 'app_metadata'::"text") ->> 'company_id'::"text"), ''::"text"))::"uuid" = "company_id"))));



CREATE POLICY "service_order_estimate_items_insert" ON "public"."service_order_estimate_items" FOR INSERT TO "authenticated" WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."companies"
  WHERE (("companies"."id" = "service_order_estimate_items"."company_id") AND ("companies"."owner_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR ((NULLIF(((( SELECT "auth"."jwt"() AS "jwt") -> 'app_metadata'::"text") ->> 'company_id'::"text"), ''::"text"))::"uuid" = "company_id") OR (EXISTS ( SELECT 1
   FROM "public"."employees"
  WHERE (("employees"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("employees"."company_id" = "service_order_estimate_items"."company_id") AND ("employees"."deleted_at" IS NULL))))));



CREATE POLICY "service_order_estimate_items_select" ON "public"."service_order_estimate_items" FOR SELECT TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."companies"
  WHERE (("companies"."id" = "service_order_estimate_items"."company_id") AND ("companies"."owner_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR ((NULLIF(((( SELECT "auth"."jwt"() AS "jwt") -> 'app_metadata'::"text") ->> 'company_id'::"text"), ''::"text"))::"uuid" = "company_id") OR (EXISTS ( SELECT 1
   FROM "public"."employees"
  WHERE (("employees"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("employees"."company_id" = "service_order_estimate_items"."company_id") AND ("employees"."deleted_at" IS NULL))))));



CREATE POLICY "service_order_estimate_items_update" ON "public"."service_order_estimate_items" FOR UPDATE TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."companies"
  WHERE (("companies"."id" = "service_order_estimate_items"."company_id") AND ("companies"."owner_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR ((NULLIF(((( SELECT "auth"."jwt"() AS "jwt") -> 'app_metadata'::"text") ->> 'company_id'::"text"), ''::"text"))::"uuid" = "company_id") OR (EXISTS ( SELECT 1
   FROM "public"."employees"
  WHERE (("employees"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("employees"."company_id" = "service_order_estimate_items"."company_id") AND ("employees"."deleted_at" IS NULL))))));



ALTER TABLE "public"."service_order_estimates" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "service_order_estimates_delete" ON "public"."service_order_estimates" FOR DELETE TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."companies"
  WHERE (("companies"."id" = "service_order_estimates"."company_id") AND ("companies"."owner_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR ((((( SELECT "auth"."jwt"() AS "jwt") -> 'app_metadata'::"text") ->> 'role'::"text") = 'admin'::"text") AND ((NULLIF(((( SELECT "auth"."jwt"() AS "jwt") -> 'app_metadata'::"text") ->> 'company_id'::"text"), ''::"text"))::"uuid" = "company_id"))));



CREATE POLICY "service_order_estimates_insert" ON "public"."service_order_estimates" FOR INSERT TO "authenticated" WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."companies"
  WHERE (("companies"."id" = "service_order_estimates"."company_id") AND ("companies"."owner_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR ((NULLIF(((( SELECT "auth"."jwt"() AS "jwt") -> 'app_metadata'::"text") ->> 'company_id'::"text"), ''::"text"))::"uuid" = "company_id") OR (EXISTS ( SELECT 1
   FROM "public"."employees"
  WHERE (("employees"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("employees"."company_id" = "service_order_estimates"."company_id") AND ("employees"."deleted_at" IS NULL))))));



CREATE POLICY "service_order_estimates_select" ON "public"."service_order_estimates" FOR SELECT TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."companies"
  WHERE (("companies"."id" = "service_order_estimates"."company_id") AND ("companies"."owner_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR ((NULLIF(((( SELECT "auth"."jwt"() AS "jwt") -> 'app_metadata'::"text") ->> 'company_id'::"text"), ''::"text"))::"uuid" = "company_id") OR (EXISTS ( SELECT 1
   FROM "public"."employees"
  WHERE (("employees"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("employees"."company_id" = "service_order_estimates"."company_id") AND ("employees"."deleted_at" IS NULL))))));



CREATE POLICY "service_order_estimates_update" ON "public"."service_order_estimates" FOR UPDATE TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."companies"
  WHERE (("companies"."id" = "service_order_estimates"."company_id") AND ("companies"."owner_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR ((NULLIF(((( SELECT "auth"."jwt"() AS "jwt") -> 'app_metadata'::"text") ->> 'company_id'::"text"), ''::"text"))::"uuid" = "company_id") OR (EXISTS ( SELECT 1
   FROM "public"."employees"
  WHERE (("employees"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("employees"."company_id" = "service_order_estimates"."company_id") AND ("employees"."deleted_at" IS NULL))))));



ALTER TABLE "public"."service_orders" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "service_orders: empresa pode atualizar suas OSs" ON "public"."service_orders" FOR UPDATE TO "authenticated" USING (("company_id" IN ( SELECT "companies"."id"
   FROM "public"."companies"
  WHERE ("companies"."owner_id" = "auth"."uid"())
UNION
 SELECT "employees"."company_id"
   FROM "public"."employees"
  WHERE (("employees"."user_id" = "auth"."uid"()) AND ("employees"."deleted_at" IS NULL))))) WITH CHECK (("company_id" IN ( SELECT "companies"."id"
   FROM "public"."companies"
  WHERE ("companies"."owner_id" = "auth"."uid"())
UNION
 SELECT "employees"."company_id"
   FROM "public"."employees"
  WHERE (("employees"."user_id" = "auth"."uid"()) AND ("employees"."deleted_at" IS NULL)))));



CREATE POLICY "service_orders: empresa pode criar OSs" ON "public"."service_orders" FOR INSERT TO "authenticated" WITH CHECK (("company_id" IN ( SELECT "companies"."id"
   FROM "public"."companies"
  WHERE ("companies"."owner_id" = "auth"."uid"())
UNION
 SELECT "employees"."company_id"
   FROM "public"."employees"
  WHERE (("employees"."user_id" = "auth"."uid"()) AND ("employees"."deleted_at" IS NULL)))));



CREATE POLICY "service_orders: empresa pode ver suas OSs" ON "public"."service_orders" FOR SELECT TO "authenticated" USING (("company_id" IN ( SELECT "companies"."id"
   FROM "public"."companies"
  WHERE ("companies"."owner_id" = "auth"."uid"())
UNION
 SELECT "employees"."company_id"
   FROM "public"."employees"
  WHERE (("employees"."user_id" = "auth"."uid"()) AND ("employees"."deleted_at" IS NULL)))));



ALTER TABLE "public"."services" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "services_admin_all" ON "public"."services" TO "authenticated" USING ((("company_id" IN ( SELECT "companies"."id"
   FROM "public"."companies"
  WHERE ("companies"."owner_id" = "auth"."uid"()))) OR (((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text") = 'admin'::"text") AND ("company_id" = ((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'company_id'::"text"))::"uuid"))));



CREATE POLICY "services_employee_read" ON "public"."services" FOR SELECT TO "authenticated" USING ((("deleted_at" IS NULL) AND ("active" = true) AND ("company_id" = ((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'company_id'::"text"))::"uuid") AND ((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text") = ANY (ARRAY['atendente'::"text", 'tecnico'::"text"]))));



ALTER TABLE "public"."stock_movements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."stock_reservations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."suppliers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "suppliers_delete" ON "public"."suppliers" FOR DELETE TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."companies"
  WHERE (("companies"."id" = "suppliers"."company_id") AND ("companies"."owner_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR (EXISTS ( SELECT 1
   FROM "public"."employees"
  WHERE (("employees"."company_id" = "suppliers"."company_id") AND ("employees"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("employees"."role" = 'admin'::"text") AND ("employees"."active" = true) AND ("employees"."deleted_at" IS NULL))))));



CREATE POLICY "suppliers_insert" ON "public"."suppliers" FOR INSERT TO "authenticated" WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."companies"
  WHERE (("companies"."id" = "suppliers"."company_id") AND ("companies"."owner_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR (EXISTS ( SELECT 1
   FROM "public"."employees"
  WHERE (("employees"."company_id" = "suppliers"."company_id") AND ("employees"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("employees"."role" = 'admin'::"text") AND ("employees"."active" = true) AND ("employees"."deleted_at" IS NULL))))));



CREATE POLICY "suppliers_select" ON "public"."suppliers" FOR SELECT TO "authenticated" USING ((("deleted_at" IS NULL) AND ((EXISTS ( SELECT 1
   FROM "public"."companies"
  WHERE (("companies"."id" = "suppliers"."company_id") AND ("companies"."owner_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR (EXISTS ( SELECT 1
   FROM "public"."employees"
  WHERE (("employees"."company_id" = "suppliers"."company_id") AND ("employees"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("employees"."active" = true) AND ("employees"."deleted_at" IS NULL)))))));



CREATE POLICY "suppliers_update" ON "public"."suppliers" FOR UPDATE TO "authenticated" USING ((("deleted_at" IS NULL) AND ((EXISTS ( SELECT 1
   FROM "public"."companies"
  WHERE (("companies"."id" = "suppliers"."company_id") AND ("companies"."owner_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR (EXISTS ( SELECT 1
   FROM "public"."employees"
  WHERE (("employees"."company_id" = "suppliers"."company_id") AND ("employees"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("employees"."role" = 'admin'::"text") AND ("employees"."active" = true) AND ("employees"."deleted_at" IS NULL))))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."companies"
  WHERE (("companies"."id" = "suppliers"."company_id") AND ("companies"."owner_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR (EXISTS ( SELECT 1
   FROM "public"."employees"
  WHERE (("employees"."company_id" = "suppliers"."company_id") AND ("employees"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("employees"."role" = 'admin'::"text") AND ("employees"."active" = true) AND ("employees"."deleted_at" IS NULL))))));



ALTER TABLE "public"."third_parties" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "third_parties_delete" ON "public"."third_parties" FOR DELETE TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."companies"
  WHERE (("companies"."id" = "third_parties"."company_id") AND ("companies"."owner_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR (EXISTS ( SELECT 1
   FROM "public"."employees"
  WHERE (("employees"."company_id" = "third_parties"."company_id") AND ("employees"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("employees"."role" = 'admin'::"text") AND ("employees"."active" = true) AND ("employees"."deleted_at" IS NULL))))));



CREATE POLICY "third_parties_insert" ON "public"."third_parties" FOR INSERT TO "authenticated" WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."companies"
  WHERE (("companies"."id" = "third_parties"."company_id") AND ("companies"."owner_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR (EXISTS ( SELECT 1
   FROM "public"."employees"
  WHERE (("employees"."company_id" = "third_parties"."company_id") AND ("employees"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("employees"."role" = 'admin'::"text") AND ("employees"."active" = true) AND ("employees"."deleted_at" IS NULL))))));



CREATE POLICY "third_parties_select" ON "public"."third_parties" FOR SELECT TO "authenticated" USING ((("deleted_at" IS NULL) AND ((EXISTS ( SELECT 1
   FROM "public"."companies"
  WHERE (("companies"."id" = "third_parties"."company_id") AND ("companies"."owner_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR (EXISTS ( SELECT 1
   FROM "public"."employees"
  WHERE (("employees"."company_id" = "third_parties"."company_id") AND ("employees"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("employees"."active" = true) AND ("employees"."deleted_at" IS NULL)))))));



CREATE POLICY "third_parties_update" ON "public"."third_parties" FOR UPDATE TO "authenticated" USING ((("deleted_at" IS NULL) AND ((EXISTS ( SELECT 1
   FROM "public"."companies"
  WHERE (("companies"."id" = "third_parties"."company_id") AND ("companies"."owner_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR (EXISTS ( SELECT 1
   FROM "public"."employees"
  WHERE (("employees"."company_id" = "third_parties"."company_id") AND ("employees"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("employees"."role" = 'admin'::"text") AND ("employees"."active" = true) AND ("employees"."deleted_at" IS NULL))))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."companies"
  WHERE (("companies"."id" = "third_parties"."company_id") AND ("companies"."owner_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR (EXISTS ( SELECT 1
   FROM "public"."employees"
  WHERE (("employees"."company_id" = "third_parties"."company_id") AND ("employees"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("employees"."role" = 'admin'::"text") AND ("employees"."active" = true) AND ("employees"."deleted_at" IS NULL))))));



ALTER TABLE "public"."whatsapp_automation_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."whatsapp_conversations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."whatsapp_menu_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."whatsapp_messages" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



REVOKE ALL ON FUNCTION "public"."cleanup_expired_whatsapp_messages"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."cleanup_expired_whatsapp_messages"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_expired_whatsapp_messages"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_expired_whatsapp_messages"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_stock_transfer"("p_company_id" "uuid", "p_from_branch_id" "uuid", "p_to_branch_id" "uuid", "p_part_id" "uuid", "p_quantity" integer, "p_notes" "text", "p_entry_date" "date", "p_created_by" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_stock_transfer"("p_company_id" "uuid", "p_from_branch_id" "uuid", "p_to_branch_id" "uuid", "p_part_id" "uuid", "p_quantity" integer, "p_notes" "text", "p_entry_date" "date", "p_created_by" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_stock_transfer"("p_company_id" "uuid", "p_from_branch_id" "uuid", "p_to_branch_id" "uuid", "p_part_id" "uuid", "p_quantity" integer, "p_notes" "text", "p_entry_date" "date", "p_created_by" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_is_company_admin"("p_company_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_is_company_admin"("p_company_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_is_company_admin"("p_company_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_is_company_member"("p_company_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_is_company_member"("p_company_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_is_company_member"("p_company_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_notify_inactive_clients"("p_months" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_notify_inactive_clients"("p_months" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_notify_inactive_clients"("p_months" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_notify_low_stock"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_notify_low_stock"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_notify_low_stock"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_notify_third_party_overdue"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_notify_third_party_overdue"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_notify_third_party_overdue"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_active_company_admin"("p_company_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_active_company_admin"("p_company_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_active_company_admin"("p_company_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."recalculate_client_classification"("p_client_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."recalculate_client_classification"("p_client_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."recalculate_client_classification"("p_client_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_service_order_number"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_service_order_number"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_service_order_number"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_service_order_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_service_order_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_service_order_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_recalculate_client_classification"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_recalculate_client_classification"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_recalculate_client_classification"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_parts_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_parts_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_parts_updated_at"() TO "service_role";



GRANT ALL ON TABLE "public"."audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."bills" TO "anon";
GRANT ALL ON TABLE "public"."bills" TO "authenticated";
GRANT ALL ON TABLE "public"."bills" TO "service_role";



GRANT ALL ON TABLE "public"."branches" TO "anon";
GRANT ALL ON TABLE "public"."branches" TO "authenticated";
GRANT ALL ON TABLE "public"."branches" TO "service_role";



GRANT ALL ON TABLE "public"."business_hours" TO "anon";
GRANT ALL ON TABLE "public"."business_hours" TO "authenticated";
GRANT ALL ON TABLE "public"."business_hours" TO "service_role";



GRANT ALL ON TABLE "public"."cash_entries" TO "anon";
GRANT ALL ON TABLE "public"."cash_entries" TO "authenticated";
GRANT ALL ON TABLE "public"."cash_entries" TO "service_role";



GRANT ALL ON TABLE "public"."clients" TO "anon";
GRANT ALL ON TABLE "public"."clients" TO "authenticated";
GRANT ALL ON TABLE "public"."clients" TO "service_role";



GRANT ALL ON TABLE "public"."companies" TO "anon";
GRANT ALL ON TABLE "public"."companies" TO "authenticated";
GRANT ALL ON TABLE "public"."companies" TO "service_role";



GRANT ALL ON TABLE "public"."company_settings" TO "anon";
GRANT ALL ON TABLE "public"."company_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."company_settings" TO "service_role";



GRANT ALL ON TABLE "public"."employees" TO "anon";
GRANT ALL ON TABLE "public"."employees" TO "authenticated";
GRANT ALL ON TABLE "public"."employees" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."parts" TO "anon";
GRANT ALL ON TABLE "public"."parts" TO "authenticated";
GRANT ALL ON TABLE "public"."parts" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."service_order_estimate_items" TO "anon";
GRANT ALL ON TABLE "public"."service_order_estimate_items" TO "authenticated";
GRANT ALL ON TABLE "public"."service_order_estimate_items" TO "service_role";



GRANT ALL ON TABLE "public"."service_order_estimates" TO "anon";
GRANT ALL ON TABLE "public"."service_order_estimates" TO "authenticated";
GRANT ALL ON TABLE "public"."service_order_estimates" TO "service_role";



GRANT ALL ON TABLE "public"."service_orders" TO "anon";
GRANT ALL ON TABLE "public"."service_orders" TO "authenticated";
GRANT ALL ON TABLE "public"."service_orders" TO "service_role";



GRANT ALL ON TABLE "public"."services" TO "anon";
GRANT ALL ON TABLE "public"."services" TO "authenticated";
GRANT ALL ON TABLE "public"."services" TO "service_role";



GRANT ALL ON TABLE "public"."stock_movements" TO "anon";
GRANT ALL ON TABLE "public"."stock_movements" TO "authenticated";
GRANT ALL ON TABLE "public"."stock_movements" TO "service_role";



GRANT ALL ON TABLE "public"."stock_reservations" TO "anon";
GRANT ALL ON TABLE "public"."stock_reservations" TO "authenticated";
GRANT ALL ON TABLE "public"."stock_reservations" TO "service_role";



GRANT ALL ON TABLE "public"."suppliers" TO "anon";
GRANT ALL ON TABLE "public"."suppliers" TO "authenticated";
GRANT ALL ON TABLE "public"."suppliers" TO "service_role";



GRANT ALL ON TABLE "public"."third_parties" TO "anon";
GRANT ALL ON TABLE "public"."third_parties" TO "authenticated";
GRANT ALL ON TABLE "public"."third_parties" TO "service_role";



GRANT ALL ON TABLE "public"."v_stock_positions" TO "anon";
GRANT ALL ON TABLE "public"."v_stock_positions" TO "authenticated";
GRANT ALL ON TABLE "public"."v_stock_positions" TO "service_role";



GRANT ALL ON TABLE "public"."v_stock_available" TO "anon";
GRANT ALL ON TABLE "public"."v_stock_available" TO "authenticated";
GRANT ALL ON TABLE "public"."v_stock_available" TO "service_role";



GRANT ALL ON TABLE "public"."whatsapp_automation_settings" TO "anon";
GRANT ALL ON TABLE "public"."whatsapp_automation_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."whatsapp_automation_settings" TO "service_role";



GRANT ALL ON TABLE "public"."whatsapp_conversations" TO "anon";
GRANT ALL ON TABLE "public"."whatsapp_conversations" TO "authenticated";
GRANT ALL ON TABLE "public"."whatsapp_conversations" TO "service_role";



GRANT ALL ON TABLE "public"."whatsapp_menu_items" TO "anon";
GRANT ALL ON TABLE "public"."whatsapp_menu_items" TO "authenticated";
GRANT ALL ON TABLE "public"."whatsapp_menu_items" TO "service_role";



GRANT ALL ON TABLE "public"."whatsapp_messages" TO "anon";
GRANT ALL ON TABLE "public"."whatsapp_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."whatsapp_messages" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






