export type OrgRole = "owner" | "admin" | "member" | "viewer";

export type Permission =
  | "view:scans"
  | "view:findings"
  | "view:projects"
  | "view:trends"
  | "view:compliance"
  | "view:activity"
  | "view:members"
  | "create:projects"
  | "edit:projects"
  | "suppress:findings"
  | "assign:issues"
  | "comment:issues"
  | "create:scans"
  | "delete:projects"
  | "manage:settings"
  | "manage:integrations"
  | "rotate:keys"
  | "override:gates"
  | "manage:rules"
  | "manage:members"
  | "bulk:delete"
  | "manage:billing"
  | "manage:org";

export const VIEWER_PERMISSIONS: Permission[] = [
  "view:scans",
  "view:findings",
  "view:projects",
  "view:trends",
  "view:compliance",
  "view:activity",
  "view:members",
];

export const MEMBER_PERMISSIONS: Permission[] = [
  ...VIEWER_PERMISSIONS,
  "create:projects",
  "edit:projects",
  "suppress:findings",
  "assign:issues",
  "comment:issues",
  "create:scans",
];

export const ADMIN_PERMISSIONS: Permission[] = [
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

export const OWNER_PERMISSIONS: Permission[] = [
  ...ADMIN_PERMISSIONS,
  "manage:billing",
  "manage:org",
];

export const ROLE_PERMISSIONS: Record<OrgRole, Set<Permission>> = {
  viewer: new Set(VIEWER_PERMISSIONS),
  member: new Set(MEMBER_PERMISSIONS),
  admin: new Set(ADMIN_PERMISSIONS),
  owner: new Set(OWNER_PERMISSIONS),
};

export function hasPermission(role: OrgRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.has(permission) ?? false;
}
