import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import {
  applyActiveOrgCookie,
  resolveActiveOrganizationForRequest,
  unwrapOrganization,
} from "@/lib/active-org";

type ContextOrganizationRow = {
  id: string | null;
  name: string | null;
};

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const context = await resolveActiveOrganizationForRequest<ContextOrganizationRow>(
    supabase,
    user.id,
    {
      select: "org_id, role, organizations(id, name)",
    }
  );

  return NextResponse.json({
    org_id: context.orgId,
    organizations: context.memberships.map((membership) => {
      const organization = unwrapOrganization(membership.organizations);
      return {
        org_id: membership.org_id,
        role: membership.role || "member",
        name: organization?.name || "Untitled Workspace",
        is_active: membership.org_id === context.orgId,
      };
    }),
  });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const orgId = typeof body.org_id === "string" ? body.org_id.trim() : "";

  if (!orgId) {
    return NextResponse.json({ error: "org_id is required" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const context = await resolveActiveOrganizationForRequest(supabase, user.id, {
    requiredOrgId: orgId,
    select: "org_id",
  });

  if (!context.membership) {
    return NextResponse.json(
      { error: "Not a member of this organization" },
      { status: 403 }
    );
  }

  return applyActiveOrgCookie(
    NextResponse.json({ success: true, org_id: context.membership.org_id }),
    context.membership.org_id
  );
}
