import { NextResponse } from "next/server";
import { SupabaseClient } from "@supabase/supabase-js";
import { unauthorized, forbidden } from "@/lib/api-error";
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

  let memberQuery = supabase
    .from("organization_members")
    .select("org_id, role")
    .eq("user_id", user.id);

  if (orgId) {
    memberQuery = memberQuery.eq("org_id", orgId);
  }

  const { data: member } = await memberQuery.maybeSingle();

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
