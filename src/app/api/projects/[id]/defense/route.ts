import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { serverError } from "@/lib/api-error";
import { requirePermission, isAuthError } from "@/lib/permissions";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readNumber(
  value: Record<string, unknown> | null,
  key: string,
  fallback = 0
): number {
  const candidate = value?.[key];
  if (typeof candidate === "number" && Number.isFinite(candidate)) return candidate;
  if (typeof candidate === "string" && candidate.trim()) {
    const parsed = Number(candidate);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function readString(
  value: Record<string, unknown> | null,
  key: string,
  fallback: string
): string {
  const candidate = value?.[key];
  return typeof candidate === "string" && candidate.trim() ? candidate : fallback;
}

function mapScanDefenseSummary(scan: {
  id: string;
  defense_score: unknown;
  ops_score: unknown;
  created_at: string;
}) {
  const defense = asRecord(scan.defense_score);
  if (!defense) return null;
  const ops = asRecord(scan.ops_score);
  return {
    id: `scan-${scan.id}`,
    scan_id: scan.id,
    score_pct: readNumber(defense, "score_pct", 100),
    risk_rating: readString(defense, "risk_rating", "SECURE"),
    weighted_score: readNumber(defense, "weighted_score"),
    weighted_max: readNumber(defense, "weighted_max"),
    passed: readNumber(defense, "passed"),
    total: readNumber(defense, "total", readNumber(defense, "total_checks")),
    ops_passed: readNumber(ops, "passed"),
    ops_total: readNumber(ops, "total"),
    ops_score_pct: readNumber(ops, "score_pct", 100),
    ops_rating: readString(ops, "rating", "EXCELLENT"),
    integrations_found: readNumber(defense, "integrations_found"),
    files_scanned: readNumber(defense, "files_scanned"),
    created_at: scan.created_at,
  };
}

function mapScanDefenseHistory(scan: {
  id: string;
  defense_score: unknown;
  ops_score: unknown;
  created_at: string;
}) {
  const defense = asRecord(scan.defense_score);
  if (!defense) return null;
  const ops = asRecord(scan.ops_score);
  return {
    scan_id: scan.id,
    score_pct: readNumber(defense, "score_pct", 100),
    risk_rating: readString(defense, "risk_rating", "SECURE"),
    ops_score_pct: readNumber(ops, "score_pct", 100),
    ops_rating: readString(ops, "rating", "EXCELLENT"),
    integrations_found: readNumber(defense, "integrations_found"),
    created_at: scan.created_at,
  };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: projectId } = await params;

    const { data: project } = await supabase
      .from("projects")
      .select("id, org_id")
      .eq("id", projectId)
      .single();

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const auth = await requirePermission(supabase, "view:projects", project.org_id);
    if (isAuthError(auth)) return auth;

    const { searchParams } = new URL(req.url);
    const range = searchParams.get("range") || "30";
    const days = Math.min(parseInt(range, 10) || 30, 365);
    const since = new Date();
    since.setDate(since.getDate() - days);

    // Get latest defense score
    const { data: normalizedLatest } = await supabase
      .from("defense_scores")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Get defense score history for trend chart
    const { data: normalizedHistory } = await supabase
      .from("defense_scores")
      .select("scan_id, score_pct, risk_rating, ops_score_pct, ops_rating, integrations_found, created_at")
      .eq("project_id", projectId)
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: true });

    let latest = normalizedLatest;
    let history = normalizedHistory || [];

    if (!latest) {
      const { data: fallbackLatestScan } = await supabase
        .from("scans")
        .select("id, defense_score, ops_score, created_at")
        .eq("project_id", projectId)
        .not("defense_score", "is", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      latest = fallbackLatestScan ? mapScanDefenseSummary(fallbackLatestScan) : null;
    }

    if (history.length === 0) {
      const { data: fallbackHistoryScans } = await supabase
        .from("scans")
        .select("id, defense_score, ops_score, created_at")
        .eq("project_id", projectId)
        .not("defense_score", "is", null)
        .gte("created_at", since.toISOString())
        .order("created_at", { ascending: true });

      history = (fallbackHistoryScans || [])
        .map(mapScanDefenseHistory)
        .filter((row): row is NonNullable<typeof row> => !!row);
    }

    // Get latest defense findings (individual check results)
    let findings: Record<string, unknown>[] = [];
    if (latest?.scan_id) {
      const { data: findingsData } = await supabase
        .from("defense_findings")
        .select("*")
        .eq("scan_id", latest.scan_id)
        .order("passed", { ascending: true });
      findings = findingsData || [];
    }

    // Get latest OWASP coverage from the scan's JSONB column
    let owaspCoverage = null;
    if (latest?.scan_id) {
      const { data: scan } = await supabase
        .from("scans")
        .select("owasp_coverage")
        .eq("id", latest.scan_id)
        .maybeSingle();
      owaspCoverage = scan?.owasp_coverage || null;
    }

    // Get latest integrations
    let integrations: Record<string, unknown>[] = [];
    if (latest?.scan_id) {
      const { data: intData } = await supabase
        .from("defense_integrations")
        .select("*")
        .eq("scan_id", latest.scan_id);
      integrations = intData || [];
    }

    return NextResponse.json({
      latest,
      history: history || [],
      findings,
      integrations,
      owaspCoverage,
    });
  } catch (e: unknown) {
    return serverError(e, "Defense data");
  }
}
