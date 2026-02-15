import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { serverError } from "@/lib/api-error";

/**
 * GET /api/team/activity
 * Fetch team activity feed for user's organization
 *
 * Query params:
 * - limit: number of activities to return (default: 50, max: 100)
 * - offset: pagination offset (default: 0)
 * - activity_type: filter by activity type (optional)
 */
export async function GET(request: Request) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get user's organization
  const { data: member } = await supabase
    .from("organization_members")
    .select("org_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!member?.org_id) {
    return NextResponse.json({ error: "No organization found" }, { status: 404 });
  }

  const orgId = member.org_id;

  // Parse query params
  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 100);
  const offset = parseInt(url.searchParams.get("offset") || "0");
  const activityType = url.searchParams.get("activity_type");

  // Build query
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
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  // Filter by activity type if provided
  if (activityType) {
    query = query.eq("activity_type", activityType);
  }

  const { data: activities, error: activitiesErr } = await query;

  if (activitiesErr) {
    return serverError(activitiesErr, "Fetch activity feed");
  }

  return NextResponse.json({ activities: activities || [], limit, offset });
}
