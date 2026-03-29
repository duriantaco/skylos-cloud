import crypto from "crypto";
import type { OrgRole } from "./permission-matrix";

export type InvitationStatus = "pending" | "accepted" | "revoked" | "expired";

export type InvitationState = {
  accepted_at?: string | null;
  revoked_at?: string | null;
  expires_at?: string | null;
};

export type TeamInvitationRow = {
  id: string;
  org_id: string;
  email: string;
  role: OrgRole;
  token: string;
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
};

const INVITABLE_ROLES: OrgRole[] = ["owner", "admin", "member", "viewer"];
const INVITE_DURATION_DAYS = 7;

export function normalizeInviteEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isInvitableRole(value: unknown): value is OrgRole {
  return typeof value === "string" && INVITABLE_ROLES.includes(value as OrgRole);
}

export function resolveInviteRole(value: unknown): OrgRole {
  return isInvitableRole(value) ? value : "member";
}

export function generateInvitationToken(): string {
  return crypto.randomBytes(24).toString("hex");
}

export function getInvitationExpiryDate(days: number = INVITE_DURATION_DAYS): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

export function buildInviteUrl(baseUrl: string, token: string): string {
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");
  return `${normalizedBaseUrl}/invite/${encodeURIComponent(token)}`;
}

export function isInvitationExpired(expiresAt: string | null | undefined): boolean {
  if (!expiresAt) return true;

  const time = Date.parse(expiresAt);
  if (Number.isNaN(time)) return true;

  return time <= Date.now();
}

export function getInvitationStatus(invitation: InvitationState): InvitationStatus {
  if (invitation.accepted_at) return "accepted";
  if (invitation.revoked_at) return "revoked";
  if (isInvitationExpired(invitation.expires_at)) return "expired";
  return "pending";
}

export function getInvitationStatusMessage(status: InvitationStatus): string {
  switch (status) {
    case "accepted":
      return "This invitation has already been accepted.";
    case "revoked":
      return "This invitation has been revoked.";
    case "expired":
      return "This invitation has expired.";
    default:
      return "Invitation is pending.";
  }
}
