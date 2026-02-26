import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { serverError } from "@/lib/api-error";
import { requirePermission, isAuthError } from "@/lib/permissions";

export async function GET(request: Request) {
  const supabase = await createClient();

  const auth = await requirePermission(supabase, "view:activity");
  if (isAuthError(auth)) return auth;

  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 100);
  const offset = parseInt(url.searchParams.get("offset") || "0");
  const activityType = url.searchParams.get("activity_type");

  let query = supabase
    .from("team_activity_log")
    .select(`
      id,
      activity_type,
      entity_type,
      entity_id,
      metadata,
      created_at,
      user:user_id (
        id,
        email
      )
    `)
    .eq("org_id", auth.orgId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (activityType) {
    query = query.eq("activity_type", activityType);
  }

  const { data: activities, error: activitiesErr } = await query;

  if (activitiesErr) {
    return serverError(activitiesErr, "Fetch activity feed");
  }

  return NextResponse.json({ activities: activities || [], limit, offset });
}
