-- Add result JSONB column to scans table for storing raw analysis output
-- Used by Code City visualization to render definitions, call graph, and dead code

ALTER TABLE "public"."scans" ADD COLUMN IF NOT EXISTS "result" "jsonb";

COMMENT ON COLUMN "public"."scans"."result" IS 'Raw analysis result JSON including definitions, unused_* lists. Used by Code City visualization.';
