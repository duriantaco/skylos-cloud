import { NextResponse } from "next/server";
import { SupabaseClient } from "@supabase/supabase-js";
import { unauthorized, forbidden } from "@/lib/api-error";

export type OrgRole = "owner" | "admin" | "member" | "viewer";

export type Permission =
  // Read
  | "view:scans"
  | "view:findings"
  | "view:projects"
  | "view:trends"
  | "view:compliance"
  | "view:activity"
  | "view:members"
  // Write
  | "create:projects"
  | "edit:projects"
  | "suppress:findings"
  | "assign:issues"
  | "comment:issues"
  | "create:scans"
  // Admin
  | "delete:projects"
  | "manage:settings"
  | "manage:integrations"
  | "rotate:keys"
  | "override:gates"
  | "manage:rules"
  | "manage:members"
  | "bulk:delete"
  // Owner
  | "manage:billing"
  | "manage:org";

const VIEWER_PERMISSIONS: Permission[] = [
  "view:scans",
  "view:findings",
  "view:projects",
  "view:trends",
  "view:compliance",
  "view:activity",
  "view:members",
];

const MEMBER_PERMISSIONS: Permission[] = [
  ...VIEWER_PERMISSIONS,
  "create:projects",
  "edit:projects",
  "suppress:findings",
  "assign:issues",
  "comment:issues",
  "create:scans",
];

const ADMIN_PERMISSIONS: Permission[] = [
  ...MEMBER_PERMISSIONS,
  "delete:projects",
  "manage:settings",
  "manage:integrations",
  "rotate:keys",
  "override:gates",
  "manage:rules",
  "manage:members",
  "bulk:delete",
];

const OWNER_PERMISSIONS: Permission[] = [
  ...ADMIN_PERMISSIONS,
  "manage:billing",
  "manage:org",
];

const ROLE_PERMISSIONS: Record<OrgRole, Set<Permission>> = {
  viewer: new Set(VIEWER_PERMISSIONS),
  member: new Set(MEMBER_PERMISSIONS),
  admin: new Set(ADMIN_PERMISSIONS),
  owner: new Set(OWNER_PERMISSIONS),
};

export function hasPermission(role: OrgRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.has(permission) ?? false;
}

type AuthSuccess = {
  user: { id: string; email?: string };
  member: { org_id: string; role: OrgRole };
  orgId: string;
};

/**
 * Checks auth + org membership + permission in one call.
 * Returns auth data on success, or a NextResponse error.
 *
 * If orgId is not provided, uses the user's first org membership.
 */
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

/**
 * Helper to check if requirePermission returned an error response.
 */
export function isAuthError(
  result: AuthSuccess | NextResponse
): result is NextResponse {
  return result instanceof NextResponse;
}
