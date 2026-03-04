import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { serverError } from "@/lib/api-error";
import { requirePermission, isAuthError } from "@/lib/permissions";
import { getEffectivePlan } from "@/lib/entitlements";
import { requirePlan, requireCredits } from "@/lib/require-credits";

export async function POST(request: Request) {
  const supabase = await createClient();

  try {
    const body = await request.json().catch(() => ({}));
    const { scan_id_a, scan_id_b } = body;

    if (!scan_id_a || !scan_id_b) {
      return NextResponse.json(
        { error: "scan_id_a and scan_id_b are required" },
        { status: 400 }
      );
    }

    if (scan_id_a === scan_id_b) {
      return NextResponse.json(
        { error: "Cannot compare a scan with itself" },
        { status: 400 }
      );
    }

    // Fetch both scans with project context
    const { data: scanA } = await supabase
      .from("scans")
      .select("id, created_at, commit_hash, branch, stats, project_id, projects(org_id, name)")
      .eq("id", scan_id_a)
      .single();

    if (!scanA) {
      return NextResponse.json({ error: "Scan A not found" }, { status: 404 });
    }

    const { data: scanB } = await supabase
      .from("scans")
      .select("id, created_at, commit_hash, branch, stats, project_id, projects(org_id, name)")
      .eq("id", scan_id_b)
      .single();

    if (!scanB) {
      return NextResponse.json({ error: "Scan B not found" }, { status: 404 });
    }

    // Both scans must belong to the same project
    if (scanA.project_id !== scanB.project_id) {
      return NextResponse.json(
        { error: "Both scans must belong to the same project" },
        { status: 400 }
      );
    }

    const orgId = (scanA.projects as any)?.org_id;
    const auth = await requirePermission(supabase, "view:scans", orgId);
    if (isAuthError(auth)) return auth;

    // Plan gate: Scan Diff requires Pro
    const { data: org } = await supabase
      .from("organizations")
      .select("plan, pro_expires_at")
      .eq("id", orgId)
      .single();
    const effectivePlan = getEffectivePlan({ plan: org?.plan || "free", pro_expires_at: org?.pro_expires_at });
    const planCheck = requirePlan(effectivePlan, "pro", "Scan Comparison");
    if (!planCheck.ok) return planCheck.response;

    // Credit gate: 2 credits for diff computation
    const creditCheck = await requireCredits(supabase, orgId, effectivePlan, "scan_diff", {
      scan_id_a,
      scan_id_b,
    });
    if (!creditCheck.ok) return creditCheck.response;

    // Fetch findings for both scans
    const [findingsARes, findingsBRes] = await Promise.all([
      supabase
        .from("findings")
        .select("id, rule_id, category, severity, message, file_path, line_number, snippet")
        .eq("scan_id", scan_id_a),
      supabase
        .from("findings")
        .select("id, rule_id, category, severity, message, file_path, line_number, snippet")
        .eq("scan_id", scan_id_b),
    ]);

    const findingsA = findingsARes.data || [];
    const findingsB = findingsBRes.data || [];

    // Create fingerprints for matching (rule_id + file_path + line_number)
    function fingerprint(f: any): string {
      return `${f.rule_id}|${f.file_path}|${f.line_number}`;
    }

    const fpSetA = new Set(findingsA.map(fingerprint));
    const fpSetB = new Set(findingsB.map(fingerprint));

    // Determine newer scan (B) vs older scan (A) — order matters
    // "new" = in B but not in A, "resolved" = in A but not in B
    const newFindings = findingsB.filter((f) => !fpSetA.has(fingerprint(f)));
    const resolvedFindings = findingsA.filter((f) => !fpSetB.has(fingerprint(f)));
    const unchangedCount = findingsB.filter((f) => fpSetA.has(fingerprint(f))).length;

    // Summary by severity
    function countBySeverity(findings: any[]): Record<string, number> {
      const counts: Record<string, number> = {};
      for (const f of findings) {
        const sev = f.severity || "UNKNOWN";
        counts[sev] = (counts[sev] || 0) + 1;
      }
      return counts;
    }

    return NextResponse.json({
      scan_a: {
        id: scanA.id,
        created_at: scanA.created_at,
        commit_hash: scanA.commit_hash,
        branch: scanA.branch,
        total_findings: findingsA.length,
      },
      scan_b: {
        id: scanB.id,
        created_at: scanB.created_at,
        commit_hash: scanB.commit_hash,
        branch: scanB.branch,
        total_findings: findingsB.length,
      },
      new_findings: newFindings.slice(0, 100),
      resolved_findings: resolvedFindings.slice(0, 100),
      unchanged_count: unchangedCount,
      summary: {
        new_count: newFindings.length,
        resolved_count: resolvedFindings.length,
        unchanged_count: unchangedCount,
        new_by_severity: countBySeverity(newFindings),
        resolved_by_severity: countBySeverity(resolvedFindings),
        delta: findingsB.length - findingsA.length,
      },
    });
  } catch (err) {
    return serverError(err, "Scan Comparison");
  }
}
