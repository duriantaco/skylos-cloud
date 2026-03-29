import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { badRequest, serverError } from "@/lib/api-error";
import { requirePermission, isAuthError, type OrgRole } from "@/lib/permissions";
import { getEffectivePlan } from "@/lib/entitlements";
import { requirePlan } from "@/lib/require-credits";
import { supabaseAdmin } from "@/utils/supabase/admin";
import {
  buildInviteUrl,
  generateInvitationToken,
  getInvitationExpiryDate,
  getInvitationStatus,
  normalizeInviteEmail,
  resolveInviteRole,
  type TeamInvitationRow,
} from "@/lib/team-invitations";

type ProfileRow = {
  id: string;
  email: string | null;
};

type PendingInvitationResponse = {
  id: string;
  email: string;
  role: OrgRole;
  created_at: string;
  expires_at: string;
  status: "pending" | "expired";
  invite_url: string;
};

async function requireInvitePlan(supabase: Awaited<ReturnType<typeof createClient>>, orgId: string) {
  const { data: org } = await supabase
    .from("organizations")
    .select("plan, pro_expires_at")
    .eq("id", orgId)
    .single();

  const effectivePlan = getEffectivePlan({
    plan: org?.plan || "free",
    pro_expires_at: org?.pro_expires_at,
  });

  return requirePlan(effectivePlan, "pro", "Team Collaboration");
}

function getBaseUrl(request: Request): string {
  return process.env.APP_BASE_URL || new URL(request.url).origin;
}

function formatInvitation(
  invitation: TeamInvitationRow,
  baseUrl: string
): PendingInvitationResponse {
  const status = getInvitationStatus(invitation);
  return {
    id: invitation.id,
    email: invitation.email,
    role: invitation.role,
    created_at: invitation.created_at,
    expires_at: invitation.expires_at,
    status: status === "expired" ? "expired" : "pending",
    invite_url: buildInviteUrl(baseUrl, invitation.token),
  };
}

// GET /api/team/invite — list pending invitations for the current org
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const auth = await requirePermission(supabase, "manage:members");
  if (isAuthError(auth)) return auth;

  const { data: invitations, error } = await supabaseAdmin
    .from("team_invitations")
    .select("id, org_id, email, role, token, created_at, expires_at, accepted_at, revoked_at")
    .eq("org_id", auth.orgId)
    .is("accepted_at", null)
    .is("revoked_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    return serverError(error, "List team invitations");
  }

  const baseUrl = getBaseUrl(request);

  return NextResponse.json({
    invitations: (invitations || []).map((invitation) =>
      formatInvitation(invitation as TeamInvitationRow, baseUrl)
    ),
  });
}

// POST /api/team/invite — create or resend a team invitation
export async function POST(request: Request) {
  const supabase = await createClient();

  const auth = await requirePermission(supabase, "manage:members");
  if (isAuthError(auth)) return auth;

  const planCheck = await requireInvitePlan(supabase, auth.orgId);
  if (!planCheck.ok) return planCheck.response;

  const body = await request.json().catch(() => ({}));
  const { email, role } = body;

  if (!email || typeof email !== "string") {
    return badRequest("email is required");
  }

  const normalizedEmail = normalizeInviteEmail(email);
  if (!normalizedEmail || !normalizedEmail.includes("@")) {
    return badRequest("A valid email is required");
  }

  const assignRole = resolveInviteRole(role);

  // Only owners can assign owner role
  if (assignRole === "owner") {
    if (auth.member.role !== "owner") {
      return NextResponse.json({ error: "Only owners can assign owner role" }, { status: 403 });
    }
  }

  const inviterEmail = normalizeInviteEmail(auth.user.email || "");
  if (inviterEmail && inviterEmail === normalizedEmail) {
    return badRequest("You are already a member of this organization");
  }

  const { data: targetProfile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("id, email")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (profileError) {
    return serverError(profileError, "Lookup invitee profile");
  }

  if (targetProfile) {
    const { data: existingMember, error: memberError } = await supabaseAdmin
      .from("organization_members")
      .select("user_id")
      .eq("org_id", auth.orgId)
      .eq("user_id", (targetProfile as ProfileRow).id)
      .maybeSingle();

    if (memberError) {
      return serverError(memberError, "Check existing membership");
    }

    if (existingMember) {
      return NextResponse.json(
        { error: "User is already a member of this organization" },
        { status: 409 }
      );
    }
  }

  const { data: activeInvitation, error: invitationError } = await supabaseAdmin
    .from("team_invitations")
    .select("id, org_id, email, role, token, created_at, expires_at, accepted_at, revoked_at")
    .eq("org_id", auth.orgId)
    .eq("email", normalizedEmail)
    .is("accepted_at", null)
    .is("revoked_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (invitationError) {
    return serverError(invitationError, "Lookup existing invitation");
  }

  const token = generateInvitationToken();
  const expiresAt = getInvitationExpiryDate();

  let invitation: TeamInvitationRow | null = null;

  if (activeInvitation) {
    const { data: updatedInvitation, error: updateError } = await supabaseAdmin
      .from("team_invitations")
      .update({
        role: assignRole,
        token,
        invited_by: auth.user.id,
        expires_at: expiresAt,
      })
      .eq("id", activeInvitation.id)
      .select("id, org_id, email, role, token, created_at, expires_at, accepted_at, revoked_at")
      .single();

    if (updateError) {
      return serverError(updateError, "Update team invitation");
    }

    invitation = updatedInvitation as TeamInvitationRow;
  } else {
    const { data: createdInvitation, error: createError } = await supabaseAdmin
      .from("team_invitations")
      .insert({
        org_id: auth.orgId,
        email: normalizedEmail,
        role: assignRole,
        token,
        invited_by: auth.user.id,
        expires_at: expiresAt,
      })
      .select("id, org_id, email, role, token, created_at, expires_at, accepted_at, revoked_at")
      .single();

    if (createError) {
      return serverError(createError, "Create team invitation");
    }

    invitation = createdInvitation as TeamInvitationRow;
  }

  const baseUrl = getBaseUrl(request);

  return NextResponse.json({
    success: true,
    invitation: formatInvitation(invitation, baseUrl),
    invited_user_exists: Boolean(targetProfile),
    resent: Boolean(activeInvitation),
  });
}

// DELETE /api/team/invite?id=... — revoke a pending invitation
export async function DELETE(request: NextRequest) {
  const supabase = await createClient();

  const auth = await requirePermission(supabase, "manage:members");
  if (isAuthError(auth)) return auth;

  const invitationId = request.nextUrl.searchParams.get("id");
  if (!invitationId) {
    return badRequest("id is required");
  }

  const { data: invitation, error: fetchError } = await supabaseAdmin
    .from("team_invitations")
    .select("id, org_id")
    .eq("id", invitationId)
    .eq("org_id", auth.orgId)
    .is("accepted_at", null)
    .is("revoked_at", null)
    .maybeSingle();

  if (fetchError) {
    return serverError(fetchError, "Fetch team invitation");
  }

  if (!invitation) {
    return NextResponse.json(
      { error: "Invitation not found" },
      { status: 404 }
    );
  }

  const { error: revokeError } = await supabaseAdmin
    .from("team_invitations")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", invitation.id);

  if (revokeError) {
    return serverError(revokeError, "Revoke team invitation");
  }

  return NextResponse.json({ success: true, id: invitation.id });
}
