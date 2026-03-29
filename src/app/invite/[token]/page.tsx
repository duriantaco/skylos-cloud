import Link from "next/link";
import type { ReactNode } from "react";
import { CheckCircle2, Clock, LogIn, Shield, UserPlus } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { supabaseAdmin } from "@/utils/supabase/admin";
import AcceptInviteCard from "@/components/invite/AcceptInviteCard";
import { getInviteWorkspaceNotice } from "@/lib/invite-acceptance";
import {
  getInvitationStatus,
  getInvitationStatusMessage,
  normalizeInviteEmail,
  type TeamInvitationRow,
} from "@/lib/team-invitations";

type InvitationPageRow = TeamInvitationRow & {
  organizations: { name: string | null } | { name: string | null }[] | null;
};

function getOrgName(value: InvitationPageRow["organizations"]): string {
  if (Array.isArray(value)) {
    return value[0]?.name || "this workspace";
  }

  return value?.name || "this workspace";
}

function InfoCard({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
      <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: invitation } = await supabaseAdmin
    .from("team_invitations")
    .select("id, org_id, email, role, token, created_at, expires_at, accepted_at, revoked_at, organizations(name)")
    .eq("token", token)
    .maybeSingle();

  if (!invitation) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-12">
        <div className="mx-auto max-w-xl">
          <InfoCard
            title="Invitation Not Found"
            description="This invitation link does not exist or has already been removed."
            action={
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                <LogIn className="h-4 w-4" />
                Sign In
              </Link>
            }
          />
        </div>
      </main>
    );
  }

  const typedInvitation = invitation as InvitationPageRow;
  const orgName = getOrgName(typedInvitation.organizations);
  const status = getInvitationStatus(typedInvitation);
  const loginHref = `/login?next=${encodeURIComponent(`/invite/${token}`)}`;

  if (status !== "pending") {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-12">
        <div className="mx-auto max-w-xl">
          <InfoCard
            title="Invitation Unavailable"
            description={getInvitationStatusMessage(status)}
            action={
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                <LogIn className="h-4 w-4" />
                Sign In
              </Link>
            }
          />
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-12">
        <div className="mx-auto max-w-xl">
          <InfoCard
            title={`Join ${orgName}`}
            description={`You have been invited to join ${orgName} as ${typedInvitation.role}. Sign in with ${typedInvitation.email} to continue.`}
            action={
              <Link
                href={loginHref}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                <LogIn className="h-4 w-4" />
                Sign In With GitHub
              </Link>
            }
          />
        </div>
      </main>
    );
  }

  const currentEmail = normalizeInviteEmail(user.email || "");
  const invitedEmail = normalizeInviteEmail(typedInvitation.email);

  if (!currentEmail || currentEmail !== invitedEmail) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-12">
        <div className="mx-auto max-w-xl">
          <InfoCard
            title="Wrong Account"
            description={`This invitation is for ${typedInvitation.email}, but you are signed in as ${user.email || "an account without an email address"}. Sign in with the invited email address to accept it.`}
            action={
              <Link
                href={loginHref}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                <LogIn className="h-4 w-4" />
                Sign In With Another Account
              </Link>
            }
          />
        </div>
      </main>
    );
  }

  const { data: memberships } = await supabaseAdmin
    .from("organization_members")
    .select("org_id")
    .eq("user_id", user.id);

  const membershipOrgIds = (memberships || []).map((membership) => membership.org_id);
  const workspaceNotice = getInviteWorkspaceNotice({
    existingOrgIds: membershipOrgIds,
    invitationOrgId: typedInvitation.org_id,
  });

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12">
      <div className="mx-auto max-w-xl space-y-6">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
          <UserPlus className="h-4 w-4" />
          Team Invitation
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mb-6 space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Pending Invite
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Join {orgName}</h1>
            <p className="text-sm leading-6 text-slate-600">
              Accept this invitation to join {orgName} as a{" "}
              <span className="font-semibold capitalize">{typedInvitation.role}</span>.
            </p>
          </div>

          <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <div className="flex items-center gap-2 font-medium text-slate-900">
              <Shield className="h-4 w-4" />
              Signed in as {user.email}
            </div>
            {workspaceNotice === "already_member" && (
              <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                This account already belongs to {orgName}. Accepting will switch your active workspace there.
              </div>
            )}
            {workspaceNotice === "joining_additional_org" && (
              <div className="mt-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
                Accepting will add this account to another workspace and switch your active workspace to {orgName}.
              </div>
            )}
            <div className="mt-2 flex items-center gap-2 text-slate-500">
              <Clock className="h-4 w-4" />
              Invitation expires on{" "}
              {new Date(typedInvitation.expires_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </div>
          </div>

          <AcceptInviteCard token={token} orgName={orgName} role={typedInvitation.role} />
        </div>
      </div>
    </main>
  );
}
