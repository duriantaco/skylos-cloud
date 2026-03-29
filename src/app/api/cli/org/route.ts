import { createClient } from "@/utils/supabase/server";
import { resolveActiveOrganizationForRequest } from "@/lib/active-org";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const activeOrg = await resolveActiveOrganizationForRequest(supabase, user.id, {
    select: "org_id",
  });

  return NextResponse.json({ org_id: activeOrg.orgId });
}
