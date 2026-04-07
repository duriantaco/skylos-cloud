import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/utils/supabase/admin";
import { getEffectivePlan } from "@/lib/entitlements";
import { resolveProjectFromToken } from "@/lib/project-api-keys";

// GET /api/agent/validate — lightweight API key validation for MCP/agent clients
// Accepts: Authorization: Bearer <project_api_key> or X-API-Key: <agent_key>
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const apiKeyHeader = request.headers.get("x-api-key");

  const token = apiKeyHeader || (authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null);

  if (!token) {
    return NextResponse.json(
      { valid: false, error: "Missing authentication. Provide Authorization: Bearer <key> or X-API-Key header." },
      { status: 401 }
    );
  }

  try {
    // Try project API key first
    const resolved = await resolveProjectFromToken<{
      id: string;
      org_id: string;
      organizations: { plan: string | null; credits: number | null; pro_expires_at: string | null } | { plan: string | null; credits: number | null; pro_expires_at: string | null }[] | null;
    }>(
      supabaseAdmin,
      token,
      "id, org_id, organizations(plan, credits, pro_expires_at)"
    );
    const project = resolved?.project;

    if (project) {
      const org = Array.isArray(project.organizations)
        ? project.organizations[0]
        : project.organizations;
      const rawPlan = org?.plan;
      const proExpiresAt = org?.pro_expires_at;
      const plan = getEffectivePlan({ plan: rawPlan || "free", pro_expires_at: proExpiresAt });
      const credits = org?.credits;

      const rateLimits: Record<string, number> = {
        free: 50,
        pro: 500,
        enterprise: 5000,
      };

      return NextResponse.json({
        valid: true,
        plan,
        credits: plan === "enterprise" ? -1 : (credits || 0),
        org_id: project.org_id,
        rate_limit: rateLimits[plan] || 50,
      });
    }

    // No match
    return NextResponse.json(
      { valid: false, error: "Invalid API key." },
      { status: 403 }
    );
  } catch (err) {
    console.error("[agent/validate] Error:", err);
    return NextResponse.json(
      { valid: false, error: "Validation failed." },
      { status: 500 }
    );
  }
}
