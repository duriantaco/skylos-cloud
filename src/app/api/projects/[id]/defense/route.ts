import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { serverError } from "@/lib/api-error";
import { requirePermission, isAuthError } from "@/lib/permissions";

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
    const { data: latest } = await supabase
      .from("defense_scores")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Get defense score history for trend chart
    const { data: history } = await supabase
      .from("defense_scores")
      .select("scan_id, score_pct, risk_rating, ops_score_pct, ops_rating, integrations_found, created_at")
      .eq("project_id", projectId)
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: true });

    // Get latest defense findings (individual check results)
    let findings: any[] = [];
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
    let integrations: any[] = [];
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
  } catch (e: any) {
    return serverError(e, "Defense data");
  }
}
