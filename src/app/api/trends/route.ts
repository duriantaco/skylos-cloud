import { NextResponse } from "next/server";
import { ensureWorkspace } from "@/lib/ensureWorkspace";
import { unauthorized, badRequest, serverError } from "@/lib/api-error";

export async function GET(req: Request) {
  try {
    const { user, orgId, supabase } = await ensureWorkspace();
    if (!user || !orgId) return unauthorized();

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    const range = searchParams.get("range") || "30"; // days
    const branch = searchParams.get("branch");

    if (!projectId) 
        return badRequest("projectId is required");

    const days = Math.min(parseInt(range, 10) || 30, 365);
    const since = new Date();
    since.setDate(since.getDate() - days);

    let query = supabase
      .from("scans")
      .select(
        "id, created_at, commit_hash, branch, quality_gate_passed, stats"
      )
      .eq("project_id", projectId)
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: true });

    if (branch) {
      query = query.eq("branch", branch);
    }

    const { data: scans, error } = await query;
    if (error) 
        throw error;

    const rows = scans || [];

    const branches = Array.from(
      new Set(rows.map((s) => s.branch).filter(Boolean))
    ).sort();

    const dataPoints = rows.map((scan) => {
      const stats = (scan.stats as Record<string, any>) || {};
      return {
        date: scan.created_at,
        commitHash: scan.commit_hash?.substring(0, 7) || null,
        branch: scan.branch,
        gatePassed: scan.quality_gate_passed,
        scanId: scan.id,
        security: stats.danger_count || 0,
        quality: stats.quality_count || 0,
        deadCode: stats.dead_code_count || 0,
        secrets: stats.secret_count || 0,
        total:
          (stats.danger_count || 0) +
          (stats.quality_count || 0) +
          (stats.dead_code_count || 0) +
          (stats.secret_count || 0),
        newIssues: stats.new_issues || 0,
        legacyIssues: stats.legacy_issues || 0,
      };
    });

    const midpoint = new Date();
    midpoint.setDate(midpoint.getDate() - Math.floor(days / 2));

    const current = dataPoints.filter(
      (d) => new Date(d.date) >= midpoint
    );
    const previous = dataPoints.filter(
      (d) => new Date(d.date) < midpoint
    );

    function avg(arr: typeof dataPoints, key: keyof (typeof dataPoints)[0]) {
      if (arr.length === 0) 
        return 0;
      return arr.reduce((sum, d) => sum + (Number(d[key]) || 0), 0) / arr.length;
    }

    function pctChange(curr: number, prev: number): number | null {
      if (prev === 0) 
        return curr > 0 ? 100 : null;
      return Math.round(((curr - prev) / prev) * 100);
    }

    const summary = {
      total: {
        current: avg(current, "total"),
        previous: avg(previous, "total"),
        change: pctChange(avg(current, "total"), avg(previous, "total")),
      },
      security: {
        current: avg(current, "security"),
        previous: avg(previous, "security"),
        change: pctChange(
          avg(current, "security"),
          avg(previous, "security")
        ),
      },
      quality: {
        current: avg(current, "quality"),
        previous: avg(previous, "quality"),
        change: pctChange(
          avg(current, "quality"),
          avg(previous, "quality")
        ),
      },
      deadCode: {
        current: avg(current, "deadCode"),
        previous: avg(previous, "deadCode"),
        change: pctChange(
          avg(current, "deadCode"),
          avg(previous, "deadCode")
        ),
      },
    };

    return NextResponse.json({
      dataPoints,
      branches,
      summary,
      totalScans: rows.length,
    });
  } catch (err) {
    return serverError(err, "trends");
  }
}
