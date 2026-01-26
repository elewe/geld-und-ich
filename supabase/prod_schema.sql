


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


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."pot_type" AS ENUM (
    'spend',
    'save',
    'invest',
    'donate'
);


ALTER TYPE "public"."pot_type" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."apply_payout"("p_child_id" "uuid", "p_occurred_on" "date", "p_spend_cents" integer, "p_save_cents" integer, "p_invest_cents" integer) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_user_id uuid;
  v_total integer;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Ownership check: child must belong to current user
  if not exists (
    select 1 from public.children c
    where c.id = p_child_id
      and c.user_id = v_user_id
  ) then
    raise exception 'Child not found or not owned by user';
  end if;

  -- Basic validation
  if p_spend_cents < 0 or p_save_cents < 0 or p_invest_cents < 0 then
    raise exception 'Amounts must be >= 0';
  end if;

  v_total := p_spend_cents + p_save_cents + p_invest_cents;

  if v_total <= 0 then
    raise exception 'Total must be > 0';
  end if;

  if (p_save_cents + p_invest_cents) <= 0 then
    raise exception 'At least save or invest must be > 0';
  end if;

  -- Ensure balances row exists (upsert style)
  insert into public.balances (child_id, user_id, spend_cents, save_cents, invest_cents)
  values (p_child_id, v_user_id, 0, 0, 0)
  on conflict (child_id) do nothing;

  -- Insert 3 allocation transactions (only if > 0 to avoid noise)
  if p_spend_cents > 0 then
    insert into public.transactions (child_id, user_id, type, pot, amount_cents, occurred_on, meta)
    values (p_child_id, v_user_id, 'allocation', 'spend', p_spend_cents, p_occurred_on, jsonb_build_object('source','payout'));
  end if;

  if p_save_cents > 0 then
    insert into public.transactions (child_id, user_id, type, pot, amount_cents, occurred_on, meta)
    values (p_child_id, v_user_id, 'allocation', 'save', p_save_cents, p_occurred_on, jsonb_build_object('source','payout'));
  end if;

  if p_invest_cents > 0 then
    insert into public.transactions (child_id, user_id, type, pot, amount_cents, occurred_on, meta)
    values (p_child_id, v_user_id, 'allocation', 'invest', p_invest_cents, p_occurred_on, jsonb_build_object('source','payout'));
  end if;

  -- Update balances
  update public.balances
  set spend_cents  = spend_cents  + p_spend_cents,
      save_cents   = save_cents   + p_save_cents,
      invest_cents = invest_cents + p_invest_cents
  where child_id = p_child_id
    and user_id = v_user_id;

end;
$$;


ALTER FUNCTION "public"."apply_payout"("p_child_id" "uuid", "p_occurred_on" "date", "p_spend_cents" integer, "p_save_cents" integer, "p_invest_cents" integer) OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."balances" (
    "child_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "spend_cents" integer DEFAULT 0,
    "save_cents" integer DEFAULT 0,
    "invest_cents" integer DEFAULT 0,
    "last_interest_on" "date",
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "donate_cents" integer DEFAULT 0
);


ALTER TABLE "public"."balances" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."transactions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "child_id" "uuid" NOT NULL,
    "date" "date",
    "type" "text",
    "status" "text",
    "spend" numeric,
    "save" numeric,
    "invest" numeric,
    "note" "text",
    "user_id" "uuid" NOT NULL,
    "pot" "text" DEFAULT 'spend'::"text" NOT NULL,
    "amount_cents" integer DEFAULT 0 NOT NULL,
    "occurred_on" "date" DEFAULT CURRENT_DATE,
    "meta" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "transactions_pot_check" CHECK (("pot" = ANY (ARRAY['spend'::"text", 'save'::"text", 'invest'::"text"]))),
    CONSTRAINT "transactions_type_check" CHECK (("type" = ANY (ARRAY['weekly_allowance'::"text", 'extra_payment'::"text", 'allocation'::"text", 'interest'::"text", 'invest_transfer'::"text"])))
);


ALTER TABLE "public"."transactions" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."balances_view" WITH ("security_invoker"='true') AS
 WITH "signed" AS (
         SELECT "transactions"."child_id",
            "transactions"."user_id",
            "transactions"."pot",
                CASE
                    WHEN (COALESCE("transactions"."type", ''::"text") = ANY (ARRAY['invest_transfer'::"text", 'spend'::"text", 'payout'::"text"])) THEN (- "abs"(COALESCE("transactions"."amount_cents", 0)))
                    ELSE "abs"(COALESCE("transactions"."amount_cents", 0))
                END AS "delta_cents"
           FROM "public"."transactions"
        )
 SELECT "child_id",
    ("max"(("user_id")::"text"))::"uuid" AS "user_id",
    COALESCE("sum"(
        CASE
            WHEN ("pot" = 'spend'::"text") THEN "delta_cents"
            ELSE NULL::integer
        END), (0)::bigint) AS "spend_cents",
    COALESCE("sum"(
        CASE
            WHEN ("pot" = 'save'::"text") THEN "delta_cents"
            ELSE NULL::integer
        END), (0)::bigint) AS "save_cents",
    COALESCE("sum"(
        CASE
            WHEN ("pot" = 'invest'::"text") THEN "delta_cents"
            ELSE NULL::integer
        END), (0)::bigint) AS "invest_cents",
    COALESCE("sum"(
        CASE
            WHEN ("pot" = 'donate'::"text") THEN "delta_cents"
            ELSE NULL::integer
        END), (0)::bigint) AS "donate_cents"
   FROM "signed"
  GROUP BY "child_id";


ALTER VIEW "public"."balances_view" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."children" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text",
    "age" integer,
    "weekly_amount" numeric,
    "user_id" "uuid",
    "spending" integer DEFAULT 0,
    "savings" integer DEFAULT 0,
    "investments" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "avatar_mode" "text" DEFAULT 'emoji'::"text" NOT NULL,
    "avatar_emoji" "text" DEFAULT '🧒'::"text" NOT NULL,
    "avatar_image_url" "text",
    "accent_color" "text" DEFAULT 'slate'::"text" NOT NULL,
    "donate_enabled" boolean DEFAULT false NOT NULL,
    CONSTRAINT "children_avatar_mode_check" CHECK (("avatar_mode" = ANY (ARRAY['emoji'::"text", 'image'::"text"])))
);


ALTER TABLE "public"."children" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."depot_transfers" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "child_id" "uuid",
    "date" "date",
    "amount" numeric,
    "user_id" "uuid"
);


ALTER TABLE "public"."depot_transfers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."settings" (
    "child_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "payout_weekday" integer DEFAULT 1 NOT NULL,
    "interest_apr_bp" integer DEFAULT 200 NOT NULL,
    "invest_threshold_cents" integer DEFAULT 5000 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."wishes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "child_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "target_cents" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "wishes_target_cents_check" CHECK (("target_cents" > 0))
);


ALTER TABLE "public"."wishes" OWNER TO "postgres";


ALTER TABLE ONLY "public"."balances"
    ADD CONSTRAINT "balances_pkey" PRIMARY KEY ("child_id");



ALTER TABLE ONLY "public"."children"
    ADD CONSTRAINT "children_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."depot_transfers"
    ADD CONSTRAINT "depot_transfers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."settings"
    ADD CONSTRAINT "settings_pkey" PRIMARY KEY ("child_id");



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."wishes"
    ADD CONSTRAINT "wishes_pkey" PRIMARY KEY ("id");



CREATE INDEX "transactions_child_id_idx" ON "public"."transactions" USING "btree" ("child_id");



CREATE INDEX "transactions_child_idx" ON "public"."transactions" USING "btree" ("child_id");



CREATE INDEX "transactions_pot_idx" ON "public"."transactions" USING "btree" ("pot");



CREATE INDEX "transactions_user_id_idx" ON "public"."transactions" USING "btree" ("user_id");



CREATE INDEX "wishes_child_id_idx" ON "public"."wishes" USING "btree" ("child_id");



CREATE INDEX "wishes_user_id_idx" ON "public"."wishes" USING "btree" ("user_id");



ALTER TABLE ONLY "public"."children"
    ADD CONSTRAINT "children_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."depot_transfers"
    ADD CONSTRAINT "depot_transfers_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id");



ALTER TABLE ONLY "public"."depot_transfers"
    ADD CONSTRAINT "depot_transfers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."settings"
    ADD CONSTRAINT "settings_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."settings"
    ADD CONSTRAINT "settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id");



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."wishes"
    ADD CONSTRAINT "wishes_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."wishes"
    ADD CONSTRAINT "wishes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE "public"."balances" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "balances_insert_own" ON "public"."balances" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "balances_select_own" ON "public"."balances" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "balances_update_own" ON "public"."balances" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."children" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "children_delete_own" ON "public"."children" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "children_insert_own" ON "public"."children" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "children_select_own" ON "public"."children" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "children_update_own" ON "public"."children" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "depot_delete_own" ON "public"."depot_transfers" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "depot_insert_own" ON "public"."depot_transfers" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "depot_select_own" ON "public"."depot_transfers" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."depot_transfers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "depot_update_own" ON "public"."depot_transfers" FOR UPDATE USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."settings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "settings_delete_own" ON "public"."settings" FOR DELETE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "settings_insert_own" ON "public"."settings" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "settings_select_own" ON "public"."settings" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "settings_update_own" ON "public"."settings" FOR UPDATE USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."transactions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "transactions_delete_own" ON "public"."transactions" FOR DELETE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "transactions_insert_own" ON "public"."transactions" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "transactions_select_own" ON "public"."transactions" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "transactions_update_own" ON "public"."transactions" FOR UPDATE USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."wishes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "wishes_delete_own" ON "public"."wishes" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "wishes_insert_own" ON "public"."wishes" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "wishes_select_own" ON "public"."wishes" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "wishes_update_own" ON "public"."wishes" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."apply_payout"("p_child_id" "uuid", "p_occurred_on" "date", "p_spend_cents" integer, "p_save_cents" integer, "p_invest_cents" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."apply_payout"("p_child_id" "uuid", "p_occurred_on" "date", "p_spend_cents" integer, "p_save_cents" integer, "p_invest_cents" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."apply_payout"("p_child_id" "uuid", "p_occurred_on" "date", "p_spend_cents" integer, "p_save_cents" integer, "p_invest_cents" integer) TO "service_role";


















GRANT ALL ON TABLE "public"."balances" TO "anon";
GRANT ALL ON TABLE "public"."balances" TO "authenticated";
GRANT ALL ON TABLE "public"."balances" TO "service_role";



GRANT ALL ON TABLE "public"."transactions" TO "anon";
GRANT ALL ON TABLE "public"."transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."transactions" TO "service_role";



GRANT ALL ON TABLE "public"."balances_view" TO "anon";
GRANT ALL ON TABLE "public"."balances_view" TO "authenticated";
GRANT ALL ON TABLE "public"."balances_view" TO "service_role";



GRANT ALL ON TABLE "public"."children" TO "anon";
GRANT ALL ON TABLE "public"."children" TO "authenticated";
GRANT ALL ON TABLE "public"."children" TO "service_role";



GRANT ALL ON TABLE "public"."depot_transfers" TO "anon";
GRANT ALL ON TABLE "public"."depot_transfers" TO "authenticated";
GRANT ALL ON TABLE "public"."depot_transfers" TO "service_role";



GRANT ALL ON TABLE "public"."settings" TO "anon";
GRANT ALL ON TABLE "public"."settings" TO "authenticated";
GRANT ALL ON TABLE "public"."settings" TO "service_role";



GRANT ALL ON TABLE "public"."wishes" TO "anon";
GRANT ALL ON TABLE "public"."wishes" TO "authenticated";
GRANT ALL ON TABLE "public"."wishes" TO "service_role";









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






























