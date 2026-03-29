import { NextResponse } from "next/server";
import { SupabaseClient } from "@supabase/supabase-js";
import { unauthorized, forbidden } from "@/lib/api-error";
import { resolveActiveOrganizationForRequest } from "@/lib/active-org";
export {
  hasPermission,
  type OrgRole,
  type Permission,
} from "@/lib/permission-matrix";
import { hasPermission, type OrgRole, type Permission } from "@/lib/permission-matrix";

type AuthSuccess = {
  user: { id: string; email?: string };
  member: { org_id: string; role: OrgRole };
  orgId: string;
};

export async function requirePermission(
  supabase: SupabaseClient,
  permission: Permission,
  orgId?: string
): Promise<AuthSuccess | NextResponse> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return unauthorized();
  }

  const context = await resolveActiveOrganizationForRequest(supabase, user.id, {
    requiredOrgId: orgId,
    select: "org_id, role",
  });
  const member = context.membership;

  if (!member) {
    return forbidden("Not a member of this organization");
  }

  const role = (member.role || "member").toLowerCase() as OrgRole;

  if (!hasPermission(role, permission)) {
    return forbidden("Insufficient permissions");
  }

  return {
    user,
    member: { org_id: member.org_id, role },
    orgId: member.org_id,
  };
}

export function isAuthError(
  result: AuthSuccess | NextResponse
): result is NextResponse {
  return result instanceof NextResponse;
}
