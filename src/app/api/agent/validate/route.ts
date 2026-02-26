import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/utils/supabase/admin";
import { hashApiKey } from "@/lib/api-key";

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
    const { data: project } = await supabaseAdmin
      .from("projects")
      .select("id, org_id, organizations(plan, credits)")
      .eq("api_key_hash", hashApiKey(token))
      .maybeSingle();

    if (project) {
      const org = (project as any).organizations;
      const plan = Array.isArray(org) ? org[0]?.plan : org?.plan;
      const credits = Array.isArray(org) ? org[0]?.credits : org?.credits;

      const rateLimits: Record<string, number> = {
        free: 50,
        pro: 500,
        enterprise: 5000,
      };

      return NextResponse.json({
        valid: true,
        plan: plan || "free",
        credits: plan === "enterprise" ? -1 : (credits || 0),
        org_id: project.org_id,
        rate_limit: rateLimits[plan || "free"] || 50,
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
