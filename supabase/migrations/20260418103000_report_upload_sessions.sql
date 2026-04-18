CREATE TABLE IF NOT EXISTS "public"."report_upload_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "idempotency_key" "text",
    "upload_protocol_version" integer NOT NULL,
    "status" "text" DEFAULT 'initialized'::text NOT NULL,
    "init_payload" "jsonb" DEFAULT '{}'::jsonb NOT NULL,
    "artifact_manifest" "jsonb" DEFAULT '{}'::jsonb NOT NULL,
    "complete_response" "jsonb",
    "scan_id" "uuid",
    "lease_id" "uuid",
    "lease_expires_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "completed_at" timestamp with time zone,
    "expires_at" timestamp with time zone DEFAULT ("timezone"('utc'::"text", "now"()) + '24:00:00'::interval) NOT NULL
);

ALTER TABLE ONLY "public"."report_upload_sessions"
    ADD CONSTRAINT "report_upload_sessions_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."report_upload_sessions"
    ADD CONSTRAINT "report_upload_sessions_project_id_fkey"
    FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."report_upload_sessions"
    ADD CONSTRAINT "report_upload_sessions_scan_id_fkey"
    FOREIGN KEY ("scan_id") REFERENCES "public"."scans"("id") ON DELETE SET NULL;

ALTER TABLE ONLY "public"."report_upload_sessions"
    ADD CONSTRAINT "report_upload_sessions_status_check"
    CHECK ("status" IN ('initialized', 'completing', 'completed', 'failed', 'expired'));

CREATE INDEX IF NOT EXISTS "report_upload_sessions_project_status_idx"
    ON "public"."report_upload_sessions" ("project_id", "status", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "report_upload_sessions_expires_at_idx"
    ON "public"."report_upload_sessions" ("expires_at");

CREATE INDEX IF NOT EXISTS "report_upload_sessions_lease_expires_at_idx"
    ON "public"."report_upload_sessions" ("lease_expires_at");

CREATE UNIQUE INDEX IF NOT EXISTS "report_upload_sessions_project_idempotency_key_idx"
    ON "public"."report_upload_sessions" ("project_id", "idempotency_key")
    WHERE "idempotency_key" IS NOT NULL;
