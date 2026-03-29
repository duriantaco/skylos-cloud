import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { badRequest, serverError, unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/utils/supabase/admin";
import { applyActiveOrgCookie } from "@/lib/active-org";
import { decideInviteAcceptance } from "@/lib/invite-acceptance";
import {
  getInvitationStatus,
  getInvitationStatusMessage,
  normalizeInviteEmail,
  type TeamInvitationRow,
} from "@/lib/team-invitations";

type MembershipRow = {
  org_id: string;
};

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const token = typeof body.token === "string" ? body.token.trim() : "";

  if (!token) {
    return badRequest("token is required");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return unauthorized();
  }

  const { data: invitation, error: invitationError } = await supabaseAdmin
    .from("team_invitations")
    .select("id, org_id, email, role, token, created_at, expires_at, accepted_at, revoked_at")
    .eq("token", token)
    .maybeSingle();

  if (invitationError) {
    return serverError(invitationError, "Fetch team invitation");
  }

  if (!invitation) {
    return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
  }

  const status = getInvitationStatus(invitation as TeamInvitationRow);
  if (status !== "pending") {
    return NextResponse.json(
      { error: getInvitationStatusMessage(status) },
      { status: status === "expired" ? 410 : 409 }
    );
  }

  const invitedEmail = normalizeInviteEmail(invitation.email);
  const currentEmail = normalizeInviteEmail(user.email || "");
  if (!currentEmail) {
    return badRequest("Your account does not have an email address");
  }

  if (currentEmail !== invitedEmail) {
    return NextResponse.json(
      {
        error: `This invitation is for ${invitedEmail}. You are signed in as ${currentEmail}.`,
      },
      { status: 403 }
    );
  }

  const { data: memberships, error: membershipsError } = await supabaseAdmin
    .from("organization_members")
    .select("org_id")
    .eq("user_id", user.id);

  if (membershipsError) {
    return serverError(membershipsError, "Fetch organization memberships");
  }

  const existingMemberships = (memberships || []) as MembershipRow[];
  const decision = decideInviteAcceptance({
    existingOrgIds: existingMemberships.map((membership) => membership.org_id),
    invitationOrgId: invitation.org_id,
  });

  if (decision.mode === "already_member") {
    const { error: markAcceptedError } = await supabaseAdmin
      .from("team_invitations")
      .update({
        accepted_at: new Date().toISOString(),
        accepted_by: user.id,
      })
      .eq("id", invitation.id)
      .is("accepted_at", null)
      .is("revoked_at", null);

    if (markAcceptedError) {
      return serverError(markAcceptedError, "Mark invitation accepted");
    }

    return applyActiveOrgCookie(
      NextResponse.json({
        success: true,
        already_member: true,
        redirect_to: decision.redirectTo,
      }),
      decision.activeOrgId
    );
  }

  const { error: insertError } = await supabaseAdmin
    .from("organization_members")
    .insert({
      org_id: invitation.org_id,
      user_id: user.id,
      email: currentEmail,
      role: invitation.role,
    });

  if (insertError) {
    return serverError(insertError, "Accept team invitation");
  }

  const { error: acceptError } = await supabaseAdmin
    .from("team_invitations")
    .update({
      accepted_at: new Date().toISOString(),
      accepted_by: user.id,
    })
    .eq("id", invitation.id)
    .is("accepted_at", null)
    .is("revoked_at", null);

  if (acceptError) {
    return serverError(acceptError, "Finalize team invitation");
  }

  return applyActiveOrgCookie(
    NextResponse.json({
      success: true,
      redirect_to: decision.redirectTo,
    }),
    decision.activeOrgId
  );
}
