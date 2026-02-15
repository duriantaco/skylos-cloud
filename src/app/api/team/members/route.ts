import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { serverError } from "@/lib/api-error";

export async function GET(request: Request) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  let orgId = url.searchParams.get("org_id");

  if (!orgId) {
    const { data: member } = await supabase
      .from("organization_members")
      .select("org_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!member?.org_id) {
      return NextResponse.json({ error: "No organization found" }, { status: 404 });
    }

    orgId = member.org_id;
  }

  const { data: userMembership } = await supabase
    .from("organization_members")
    .select("id")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!userMembership) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const { data: members, error: membersErr } = await supabase
    .from("organization_members")
    .select(`
      user_id,
      role,
      created_at,
      users:user_id (
        id,
        email
      )
    `)
    .eq("org_id", orgId)
    .order("created_at", { ascending: true });

  if (membersErr) {
    return serverError(membersErr, "Fetch team members");
  }

  return NextResponse.json(
    { members: members || [] },
    {
      headers: {
        'Cache-Control': 'private, max-age=300, stale-while-revalidate=60'
      }
    }
  );
}
