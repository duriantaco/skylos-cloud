import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { serverError } from "@/lib/api-error";
import { requirePermission, isAuthError } from "@/lib/permissions";


export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;
    const url = new URL(req.url);
    const format = url.searchParams.get("format") || "json";

    const { data: scan } = await supabase
      .from("scans")
      .select("*, projects(name, org_id)")
      .eq("id", id)
      .single();

    if (!scan) {
      return NextResponse.json({ error: "Scan not found" }, { status: 404 });
    }

    const orgId = (scan.projects as any)?.org_id;
    const auth = await requirePermission(supabase, "view:scans", orgId);
    if (isAuthError(auth)) return auth;

    const { data: findings } = await supabase
      .from("findings")
      .select("rule_id, category, severity, message, file_path, line_number, is_new, is_suppressed, snippet")
      .eq("scan_id", id)
      .order("severity", { ascending: true });

    const exportData = {
      scan: {
        id: scan.id,
        project: (scan.projects as any)?.name,
        branch: scan.branch,
        commit: scan.commit_hash,
        created_at: scan.created_at,
        quality_gate_passed: scan.quality_gate_passed,
        is_overridden: scan.is_overridden,
        stats: scan.stats,
      },
      findings: findings || [],
      summary: {
        total: findings?.length || 0,
        new: findings?.filter(f => f.is_new).length || 0,
        suppressed: findings?.filter(f => f.is_suppressed).length || 0,
        by_severity: {
          critical: findings?.filter(f => f.severity === "CRITICAL").length || 0,
          high: findings?.filter(f => f.severity === "HIGH").length || 0,
          medium: findings?.filter(f => f.severity === "MEDIUM").length || 0,
          low: findings?.filter(f => f.severity === "LOW").length || 0,
        },
        by_category: {
          security: findings?.filter(f => f.category === "SECURITY").length || 0,
          secret: findings?.filter(f => f.category === "SECRET").length || 0,
          quality: findings?.filter(f => f.category === "QUALITY").length || 0,
          dead_code: findings?.filter(f => f.category === "DEAD_CODE").length || 0,
        },
      },
      exported_at: new Date().toISOString(),
    };

    if (format === "csv") {
      const headers = ["rule_id", "category", "severity", "file_path", "line_number", "message", "is_new", "is_suppressed"];
      const rows = (findings || []).map(f =>
        headers.map(h => {
          const val = (f as any)[h];
          if (typeof val === "string" && (val.includes(",") || val.includes('"') || val.includes("\n"))) {
            return `"${val.replace(/"/g, '""')}"`;
          }
          return val ?? "";
        }).join(",")
      );
      const csv = [headers.join(","), ...rows].join("\n");

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="scan-${id.slice(0, 8)}-${new Date().toISOString().split("T")[0]}.csv"`,
        },
      });
    }

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="scan-${id.slice(0, 8)}-${new Date().toISOString().split("T")[0]}.json"`,
      },
    });
  } catch (e: any) {
    return serverError(e, "Export scan findings");
  }
}
