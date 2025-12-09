


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






CREATE OR REPLACE FUNCTION "public"."get_current_user_tenant_id"() RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  user_tenant_id UUID;
BEGIN
  SELECT tenant_id INTO user_tenant_id
  FROM users
  WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid());
  
  RETURN user_tenant_id;
END;
$$;


ALTER FUNCTION "public"."get_current_user_tenant_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_created_by_name"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
  -- If created_by UUID is set, look up the name
  IF NEW.created_by IS NOT NULL THEN
    SELECT name INTO NEW.created_by_name
    FROM users
    WHERE id = NEW.created_by;
  END IF;
  
  -- If no creator found, default to 'System'
  IF NEW.created_by_name IS NULL THEN
    NEW.created_by_name := 'System';
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_created_by_name"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."azure_devops_config" (
    "id" integer DEFAULT 1 NOT NULL,
    "organization" "text" NOT NULL,
    "project" "text" NOT NULL,
    "access_token" "text",
    "refresh_token" "text",
    "token_expires_at" timestamp with time zone,
    "tenant_id" "text",
    "client_id" "text",
    "enabled" boolean DEFAULT false,
    "work_item_type" "text" DEFAULT 'Feature'::"text",
    "query" "text",
    "last_sync_time" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "states" "jsonb",
    "area_path" "text",
    "tags" "jsonb",
    "session_id" "uuid",
    CONSTRAINT "single_config" CHECK (("id" = 1))
);


ALTER TABLE "public"."azure_devops_config" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."features" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text" NOT NULL,
    "epic" "text",
    "azure_devops_id" "text",
    "azure_devops_url" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "state" "text",
    "area_path" "text",
    "tags" "jsonb",
    "session_id" "uuid",
    "epic_id" "text",
    "work_item_type" "text"
);


ALTER TABLE "public"."features" OWNER TO "postgres";


COMMENT ON COLUMN "public"."features"."azure_devops_id" IS 'Azure DevOps work item ID';



COMMENT ON COLUMN "public"."features"."azure_devops_url" IS 'Direct link to work item in Azure DevOps';



COMMENT ON COLUMN "public"."features"."state" IS 'Work item state (e.g., Active, New, Closed)';



COMMENT ON COLUMN "public"."features"."area_path" IS 'Area path from Azure DevOps';



COMMENT ON COLUMN "public"."features"."tags" IS 'Array of tags';



COMMENT ON COLUMN "public"."features"."epic_id" IS 'Azure DevOps Epic work item ID for creating links to Epic work items';



COMMENT ON COLUMN "public"."features"."work_item_type" IS 'Azure DevOps work item type (e.g., Feature, Bug, Epic, User Story, Task)';



CREATE TABLE IF NOT EXISTS "public"."info_requests" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "session_id" "uuid" NOT NULL,
    "feature_id" "uuid" NOT NULL,
    "feature_title" "text" NOT NULL,
    "requester_id" "text" NOT NULL,
    "requester_name" "text" NOT NULL,
    "requester_email" "text" NOT NULL,
    "created_at" timestamp with time zone NOT NULL,
    "created_at_db" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."info_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."products" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "tenant_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "color_hex" "text",
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."products" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."session_admins" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" "uuid",
    "user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."session_admins" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."session_stakeholders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" "uuid",
    "user_email" "text" NOT NULL,
    "user_name" "text" NOT NULL,
    "votes_allocated" integer DEFAULT 10 NOT NULL,
    "has_voted" boolean DEFAULT false,
    "voted_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."session_stakeholders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."session_status_notes" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "session_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "reason" "text" NOT NULL,
    "details" "text",
    "actor_id" "uuid",
    "actor_name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "session_status_notes_type_check" CHECK (("type" = ANY (ARRAY['reopen'::"text", 'ended-early'::"text"])))
);


ALTER TABLE "public"."session_status_notes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."system_admins" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."system_admins" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by_name" "text",
    "created_by" "uuid",
    "tenant_id" "uuid"
);


ALTER TABLE "public"."users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."votes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "feature_id" "uuid",
    "user_id" "text" NOT NULL,
    "user_name" "text" NOT NULL,
    "user_email" "text" NOT NULL,
    "vote_count" integer DEFAULT 1 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "session_id" "uuid"
);


ALTER TABLE "public"."votes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."voting_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "goal" "text" NOT NULL,
    "votes_per_user" integer NOT NULL,
    "start_date" timestamp with time zone NOT NULL,
    "end_date" timestamp with time zone NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "created_by" "uuid",
    "access_type" "text" DEFAULT 'invite-only'::"text",
    "session_code" "text",
    "use_auto_votes" boolean DEFAULT true,
    "original_end_date" timestamp with time zone,
    "ended_early_by" "text",
    "ended_early_reason" "text",
    "ended_early_details" "text",
    "reopen_reason" "text",
    "reopen_details" "text",
    "reopened_by" "text",
    "reopened_at" timestamp with time zone,
    "product_id" "uuid",
    "product_name" "text",
    CONSTRAINT "voting_sessions_access_type_check" CHECK (("access_type" = ANY (ARRAY['public'::"text", 'invite-only'::"text"])))
);


ALTER TABLE "public"."voting_sessions" OWNER TO "postgres";


ALTER TABLE ONLY "public"."azure_devops_config"
    ADD CONSTRAINT "azure_devops_config_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."azure_devops_config"
    ADD CONSTRAINT "azure_devops_config_session_id_key" UNIQUE ("session_id");



ALTER TABLE ONLY "public"."features"
    ADD CONSTRAINT "features_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."info_requests"
    ADD CONSTRAINT "info_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_tenant_name_unique" UNIQUE ("tenant_id", "name");



ALTER TABLE ONLY "public"."session_admins"
    ADD CONSTRAINT "session_admins_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."session_admins"
    ADD CONSTRAINT "session_admins_session_id_user_id_key" UNIQUE ("session_id", "user_id");



ALTER TABLE ONLY "public"."session_stakeholders"
    ADD CONSTRAINT "session_stakeholders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."session_stakeholders"
    ADD CONSTRAINT "session_stakeholders_session_id_user_email_key" UNIQUE ("session_id", "user_email");



ALTER TABLE ONLY "public"."session_status_notes"
    ADD CONSTRAINT "session_status_notes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."system_admins"
    ADD CONSTRAINT "system_admins_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."system_admins"
    ADD CONSTRAINT "system_admins_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."votes"
    ADD CONSTRAINT "votes_feature_id_user_id_key" UNIQUE ("feature_id", "user_id");



ALTER TABLE ONLY "public"."votes"
    ADD CONSTRAINT "votes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."voting_sessions"
    ADD CONSTRAINT "voting_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."voting_sessions"
    ADD CONSTRAINT "voting_sessions_session_code_key" UNIQUE ("session_code");



CREATE INDEX "idx_features_azure_devops_id" ON "public"."features" USING "btree" ("azure_devops_id");



CREATE INDEX "idx_info_requests_feature" ON "public"."info_requests" USING "btree" ("feature_id");



CREATE INDEX "idx_info_requests_session" ON "public"."info_requests" USING "btree" ("session_id");



CREATE INDEX "idx_system_admins_user_id" ON "public"."system_admins" USING "btree" ("user_id");



CREATE INDEX "idx_votes_feature_id" ON "public"."votes" USING "btree" ("feature_id");



CREATE INDEX "idx_votes_user_id" ON "public"."votes" USING "btree" ("user_id");



CREATE INDEX "idx_voting_sessions_active" ON "public"."voting_sessions" USING "btree" ("is_active");



CREATE INDEX "idx_voting_sessions_product_id" ON "public"."voting_sessions" USING "btree" ("product_id");



CREATE OR REPLACE TRIGGER "trigger_set_created_by_name" BEFORE INSERT ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."set_created_by_name"();



CREATE OR REPLACE TRIGGER "update_products_updated_at" BEFORE UPDATE ON "public"."products" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."azure_devops_config"
    ADD CONSTRAINT "azure_devops_config_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."voting_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."features"
    ADD CONSTRAINT "features_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."voting_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."voting_sessions"
    ADD CONSTRAINT "fk_voting_sessions_product" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."info_requests"
    ADD CONSTRAINT "info_requests_feature_id_fkey" FOREIGN KEY ("feature_id") REFERENCES "public"."features"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."info_requests"
    ADD CONSTRAINT "info_requests_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."voting_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."session_admins"
    ADD CONSTRAINT "session_admins_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."voting_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."session_admins"
    ADD CONSTRAINT "session_admins_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."session_stakeholders"
    ADD CONSTRAINT "session_stakeholders_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."voting_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."session_status_notes"
    ADD CONSTRAINT "session_status_notes_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."session_status_notes"
    ADD CONSTRAINT "session_status_notes_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."voting_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."system_admins"
    ADD CONSTRAINT "system_admins_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."votes"
    ADD CONSTRAINT "votes_feature_id_fkey" FOREIGN KEY ("feature_id") REFERENCES "public"."features"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."votes"
    ADD CONSTRAINT "votes_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."voting_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."voting_sessions"
    ADD CONSTRAINT "voting_sessions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



CREATE POLICY "Allow all operations on azure_devops_config" ON "public"."azure_devops_config" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all operations on features" ON "public"."features" USING (true);



CREATE POLICY "Allow all operations on votes" ON "public"."votes" USING (true);



CREATE POLICY "Allow all operations on voting_sessions" ON "public"."voting_sessions" USING (true);



CREATE POLICY "Allow authenticated insert" ON "public"."products" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow authenticated read" ON "public"."products" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Anyone can access votes" ON "public"."votes" USING (true) WITH CHECK (true);



CREATE POLICY "Anyone can insert users" ON "public"."users" FOR INSERT TO "authenticated", "anon" WITH CHECK (true);



CREATE POLICY "Anyone can read features" ON "public"."features" FOR SELECT USING (true);



CREATE POLICY "Anyone can read products" ON "public"."products" FOR SELECT USING (true);



CREATE POLICY "Anyone can read session admins" ON "public"."session_admins" FOR SELECT USING (true);



CREATE POLICY "Anyone can read session stakeholders" ON "public"."session_stakeholders" FOR SELECT USING (true);



CREATE POLICY "Anyone can read system admins" ON "public"."system_admins" FOR SELECT USING (true);



CREATE POLICY "Anyone can read users" ON "public"."users" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Anyone can read voting sessions" ON "public"."voting_sessions" FOR SELECT USING (true);



CREATE POLICY "Anyone can update users" ON "public"."users" FOR UPDATE TO "authenticated", "anon" USING (true) WITH CHECK (true);



CREATE POLICY "Authenticated users can access azure devops config" ON "public"."azure_devops_config" USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can access features" ON "public"."features" USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can access info requests" ON "public"."info_requests" USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can access products" ON "public"."products" USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can access session admins" ON "public"."session_admins" USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can access session stakeholders" ON "public"."session_stakeholders" USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can access session status notes" ON "public"."session_status_notes" USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can access votes" ON "public"."votes" USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can access voting sessions" ON "public"."voting_sessions" USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can manage session admins" ON "public"."session_admins" USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can view system admins" ON "public"."system_admins" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can write features" ON "public"."features" USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can write products" ON "public"."products" USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can write session stakeholders" ON "public"."session_stakeholders" USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can write system admins" ON "public"."system_admins" USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can write voting sessions" ON "public"."voting_sessions" USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable all access for authenticated users" ON "public"."azure_devops_config" USING (true);



CREATE POLICY "Enable delete for all users" ON "public"."features" FOR DELETE USING (true);



CREATE POLICY "Enable delete for all users" ON "public"."votes" FOR DELETE USING (true);



CREATE POLICY "Enable delete for all users" ON "public"."voting_sessions" FOR DELETE USING (true);



CREATE POLICY "Enable insert for all users" ON "public"."features" FOR INSERT WITH CHECK (true);



CREATE POLICY "Enable insert for all users" ON "public"."votes" FOR INSERT WITH CHECK (true);



CREATE POLICY "Enable insert for all users" ON "public"."voting_sessions" FOR INSERT WITH CHECK (true);



CREATE POLICY "Enable read access for all users" ON "public"."features" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."votes" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."voting_sessions" FOR SELECT USING (true);



CREATE POLICY "Enable update for all users" ON "public"."features" FOR UPDATE USING (true);



CREATE POLICY "Enable update for all users" ON "public"."votes" FOR UPDATE USING (true);



CREATE POLICY "Enable update for all users" ON "public"."voting_sessions" FOR UPDATE USING (true);



CREATE POLICY "Products are readable by authenticated users" ON "public"."products" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Products are writable by authenticated users" ON "public"."products" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Products insert tenant" ON "public"."products" FOR INSERT WITH CHECK (("tenant_id" = COALESCE((("auth"."jwt"() ->> 'tenant_id'::"text"))::"uuid", "auth"."uid"())));



CREATE POLICY "Products select tenant" ON "public"."products" FOR SELECT USING (("tenant_id" = COALESCE((("auth"."jwt"() ->> 'tenant_id'::"text"))::"uuid", "auth"."uid"())));



CREATE POLICY "Users can add themselves as session admins" ON "public"."session_admins" FOR INSERT WITH CHECK ((("auth"."role"() = 'authenticated'::"text") OR (EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE ("users"."id" = "session_admins"."user_id")))));



ALTER TABLE "public"."azure_devops_config" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."features" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."info_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."products" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."session_admins" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "session_notes_insert" ON "public"."session_status_notes" FOR INSERT WITH CHECK (true);



CREATE POLICY "session_notes_select" ON "public"."session_status_notes" FOR SELECT USING (true);



ALTER TABLE "public"."session_stakeholders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."session_status_notes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."system_admins" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."votes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."voting_sessions" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."get_current_user_tenant_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_current_user_tenant_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_current_user_tenant_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_created_by_name"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_created_by_name"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_created_by_name"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";


















GRANT ALL ON TABLE "public"."azure_devops_config" TO "anon";
GRANT ALL ON TABLE "public"."azure_devops_config" TO "authenticated";
GRANT ALL ON TABLE "public"."azure_devops_config" TO "service_role";



GRANT ALL ON TABLE "public"."features" TO "anon";
GRANT ALL ON TABLE "public"."features" TO "authenticated";
GRANT ALL ON TABLE "public"."features" TO "service_role";



GRANT ALL ON TABLE "public"."info_requests" TO "anon";
GRANT ALL ON TABLE "public"."info_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."info_requests" TO "service_role";



GRANT ALL ON TABLE "public"."products" TO "anon";
GRANT ALL ON TABLE "public"."products" TO "authenticated";
GRANT ALL ON TABLE "public"."products" TO "service_role";



GRANT ALL ON TABLE "public"."session_admins" TO "anon";
GRANT ALL ON TABLE "public"."session_admins" TO "authenticated";
GRANT ALL ON TABLE "public"."session_admins" TO "service_role";



GRANT ALL ON TABLE "public"."session_stakeholders" TO "anon";
GRANT ALL ON TABLE "public"."session_stakeholders" TO "authenticated";
GRANT ALL ON TABLE "public"."session_stakeholders" TO "service_role";



GRANT ALL ON TABLE "public"."session_status_notes" TO "anon";
GRANT ALL ON TABLE "public"."session_status_notes" TO "authenticated";
GRANT ALL ON TABLE "public"."session_status_notes" TO "service_role";



GRANT ALL ON TABLE "public"."system_admins" TO "anon";
GRANT ALL ON TABLE "public"."system_admins" TO "authenticated";
GRANT ALL ON TABLE "public"."system_admins" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



GRANT ALL ON TABLE "public"."votes" TO "anon";
GRANT ALL ON TABLE "public"."votes" TO "authenticated";
GRANT ALL ON TABLE "public"."votes" TO "service_role";



GRANT ALL ON TABLE "public"."voting_sessions" TO "anon";
GRANT ALL ON TABLE "public"."voting_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."voting_sessions" TO "service_role";









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































