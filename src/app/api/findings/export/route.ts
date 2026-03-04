import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { serverError } from "@/lib/api-error";
import { requirePermission, isAuthError } from "@/lib/permissions";
import { getEffectivePlan } from "@/lib/entitlements";
import { requirePlan } from "@/lib/require-credits";

export async function POST(request: Request) {
  const supabase = await createClient();

  try {
    const body = await request.json().catch(() => ({}));
    const { project_id, scan_id, format = "json" } = body;

    if (!project_id) {
      return NextResponse.json({ error: "project_id is required" }, { status: 400 });
    }

    if (!["csv", "json"].includes(format)) {
      return NextResponse.json({ error: "format must be 'csv' or 'json'" }, { status: 400 });
    }

    // Verify project exists and get org
    const { data: project } = await supabase
      .from("projects")
      .select("id, name, org_id")
      .eq("id", project_id)
      .single();

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const auth = await requirePermission(supabase, "view:findings", project.org_id);
    if (isAuthError(auth)) return auth;

    // Plan gate: Export requires Pro (no credits)
    const { data: org } = await supabase
      .from("organizations")
      .select("plan, pro_expires_at")
      .eq("id", project.org_id)
      .single();
    const effectivePlan = getEffectivePlan({ plan: org?.plan || "free", pro_expires_at: org?.pro_expires_at });
    const planCheck = requirePlan(effectivePlan, "pro", "Findings Export");
    if (!planCheck.ok) return planCheck.response;

    // Build query — optionally scoped to a specific scan
    let query = supabase
      .from("findings")
      .select("rule_id, category, severity, message, file_path, line_number, is_new, is_suppressed, snippet, created_at, scan_id")
      .order("severity", { ascending: true })
      .limit(10000);

    if (scan_id) {
      // Verify the scan belongs to this project
      const { data: scan } = await supabase
        .from("scans")
        .select("id, project_id")
        .eq("id", scan_id)
        .eq("project_id", project_id)
        .single();

      if (!scan) {
        return NextResponse.json({ error: "Scan not found in this project" }, { status: 404 });
      }

      query = query.eq("scan_id", scan_id);
    } else {
      // Get all findings for the project via its scans
      const { data: scanIds } = await supabase
        .from("scans")
        .select("id")
        .eq("project_id", project_id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (scanIds && scanIds.length > 0) {
        query = query.in("scan_id", scanIds.map((s) => s.id));
      } else {
        // No scans → empty export
        if (format === "csv") {
          return new NextResponse("rule_id,category,severity,file_path,line_number,message,is_new,is_suppressed\n", {
            headers: {
              "Content-Type": "text/csv",
              "Content-Disposition": `attachment; filename="${project.name}-findings-${new Date().toISOString().split("T")[0]}.csv"`,
            },
          });
        }
        return NextResponse.json({ project: project.name, findings: [], exported_at: new Date().toISOString() });
      }
    }

    const { data: findings, error: findingsErr } = await query;
    if (findingsErr) {
      return serverError(findingsErr, "Fetch findings for export");
    }

    const rows = findings || [];

    if (format === "csv") {
      const headers = ["rule_id", "category", "severity", "file_path", "line_number", "message", "is_new", "is_suppressed"];
      const csvRows = rows.map((f) =>
        headers.map((h) => {
          const val = (f as any)[h];
          if (typeof val === "string" && (val.includes(",") || val.includes('"') || val.includes("\n"))) {
            return `"${val.replace(/"/g, '""')}"`;
          }
          return val ?? "";
        }).join(",")
      );
      const csv = [headers.join(","), ...csvRows].join("\n");

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="${project.name}-findings-${new Date().toISOString().split("T")[0]}.csv"`,
        },
      });
    }

    // JSON format
    const exportData = {
      project: project.name,
      findings: rows,
      summary: {
        total: rows.length,
        new: rows.filter((f) => f.is_new).length,
        suppressed: rows.filter((f) => f.is_suppressed).length,
        by_severity: {
          critical: rows.filter((f) => f.severity === "CRITICAL").length,
          high: rows.filter((f) => f.severity === "HIGH").length,
          medium: rows.filter((f) => f.severity === "MEDIUM").length,
          low: rows.filter((f) => f.severity === "LOW").length,
        },
        by_category: {
          security: rows.filter((f) => f.category === "SECURITY").length,
          secret: rows.filter((f) => f.category === "SECRET").length,
          quality: rows.filter((f) => f.category === "QUALITY").length,
          dead_code: rows.filter((f) => f.category === "DEAD_CODE").length,
        },
      },
      exported_at: new Date().toISOString(),
    };

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${project.name}-findings-${new Date().toISOString().split("T")[0]}.json"`,
      },
    });
  } catch (err) {
    return serverError(err, "Findings Export");
  }
}
