'use client'
import { useState, useEffect } from "react";
import { Users, UserPlus, Trash2, Shield, Crown, Eye, UserCog, Lock } from "lucide-react";
import type { OrgRole } from "@/lib/permissions";

type Member = {
  user_id: string;
  role: string;
  users: { id: string; email: string } | null;
};

type PendingInvitation = {
  id: string;
  email: string;
  role: string;
  created_at: string;
  expires_at: string;
  status: "pending" | "expired";
  invite_url: string;
};

const ROLE_LABELS: Record<string, { label: string; color: string; icon: typeof Crown }> = {
  owner: { label: "Owner", color: "bg-amber-100 text-amber-800 border-amber-200", icon: Crown },
  admin: { label: "Admin", color: "bg-indigo-100 text-indigo-800 border-indigo-200", icon: Shield },
  member: { label: "Member", color: "bg-slate-100 text-slate-700 border-slate-200", icon: UserCog },
  viewer: { label: "Viewer", color: "bg-gray-100 text-gray-600 border-gray-200", icon: Eye },
};

const ASSIGNABLE_ROLES: OrgRole[] = ["viewer", "member", "admin", "owner"];

export default function TeamMembers({
  currentUserId,
  currentUserRole,
  plan = "free",
}: {
  currentUserId: string;
  currentUserRole: string;
  plan?: string;
}) {
  const [members, setMembers] = useState<Member[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<OrgRole>("member");
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [inviteLink, setInviteLink] = useState("");

  const canManage = currentUserRole === "admin" || currentUserRole === "owner";
  const isOwner = currentUserRole === "owner";

  async function fetchMembers(): Promise<Member[]> {
    const res = await fetch("/api/team/members");
    const data = await res.json();
    return data.members || [];
  }

  async function fetchInvites(): Promise<PendingInvitation[]> {
    const res = await fetch("/api/team/invite");
    if (!res.ok) return [];
    const data = await res.json();
    return data.invitations || [];
  }

  async function refreshMembers() {
    setMembers(await fetchMembers());
  }

  async function refreshInvites() {
    setPendingInvites(await fetchInvites());
  }

  async function handleRoleChange(userId: string, newRole: string) {
    setError("");
    const res = await fetch("/api/team/members", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, role: newRole }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to update role");
      return;
    }

    await refreshMembers();
  }

  async function handleRemove(userId: string, email: string) {
    if (!confirm(`Remove ${email} from this organization?`)) return;

    setError("");
    const res = await fetch(`/api/team/members?user_id=${userId}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to remove member");
      return;
    }

    await refreshMembers();
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setInviting(true);
    setError("");
    setSuccess("");
    setInviteLink("");

    const res = await fetch("/api/team/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
    });

    const data = await res.json();
    setInviting(false);

    if (!res.ok) {
      setError(data.error || "Failed to invite member");
      return;
    }

    setSuccess(
      data.resent
        ? `Invitation refreshed for ${inviteEmail}`
        : `Invitation created for ${inviteEmail}`
    );
    setInviteLink(data.invitation?.invite_url || "");
    setInviteEmail("");
    setInviteRole("member");
    const [nextMembers, nextInvites] = await Promise.all([
      fetchMembers(),
      fetchInvites(),
    ]);
    setMembers(nextMembers);
    setPendingInvites(nextInvites);
  }

  async function handleRevokeInvite(invitationId: string, email: string) {
    if (!confirm(`Revoke the invitation for ${email}?`)) return;

    setError("");
    const res = await fetch(`/api/team/invite?id=${invitationId}`, {
      method: "DELETE",
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to revoke invitation");
      return;
    }

    setSuccess(`Invitation revoked for ${email}`);
    if (inviteLink && pendingInvites.find((invite) => invite.id === invitationId)?.invite_url === inviteLink) {
      setInviteLink("");
    }
    await refreshInvites();
  }

  async function handleCopyInviteLink(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setSuccess("Invite link copied to clipboard");
    } catch {
      setError("Failed to copy invite link");
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function loadTeamData() {
      const [nextMembers, nextInvites] = await Promise.all([
        fetchMembers(),
        canManage ? fetchInvites() : Promise.resolve([]),
      ]);

      if (cancelled) return;

      setMembers(nextMembers);
      setPendingInvites(nextInvites);
      setLoading(false);
    }

    void loadTeamData();

    return () => {
      cancelled = true;
    };
  }, [canManage]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 bg-slate-100 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Member list */}
      <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
        {members.map((m) => {
          const email = m.users?.email || "Unknown";
          const roleInfo = ROLE_LABELS[m.role] || ROLE_LABELS.member;
          const isSelf = m.user_id === currentUserId;
          const RoleIcon = roleInfo.icon;

          return (
            <div
              key={m.user_id}
              className="flex items-center justify-between p-4 bg-white hover:bg-slate-50 transition"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-sm font-medium text-slate-600 shrink-0">
                  {email.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-900 truncate">
                    {email} {isSelf && <span className="text-slate-400">(you)</span>}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {canManage && !isSelf ? (
                  <select
                    value={m.role}
                    onChange={(e) => handleRoleChange(m.user_id, e.target.value)}
                    className="text-xs border border-slate-200 rounded-md px-2 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {ASSIGNABLE_ROLES.filter(
                      (r) => r !== "owner" || isOwner
                    ).map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABELS[r]?.label || r}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border ${roleInfo.color}`}
                  >
                    <RoleIcon className="w-3 h-3" />
                    {roleInfo.label}
                  </span>
                )}

                {canManage && !isSelf && (
                  <button
                    onClick={() => handleRemove(m.user_id, email)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition"
                    title="Remove member"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Invite form — admin/owner only, Pro plan required */}
      {canManage && pendingInvites.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          <div className="border-b border-slate-100 px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <Users className="w-4 h-4" />
              Pending Invitations
            </div>
          </div>
          <div className="divide-y divide-slate-100">
            {pendingInvites.map((invite) => (
              <div
                key={invite.id}
                className="flex items-center justify-between gap-4 px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-900 truncate">
                    {invite.email}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {invite.role} • {invite.status === "expired" ? "Expired" : "Expires"}{" "}
                    {new Date(invite.expires_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleCopyInviteLink(invite.invite_url)}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                  >
                    Copy Link
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRevokeInvite(invite.id, invite.email)}
                    className="px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition"
                  >
                    Revoke
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {canManage && plan !== "pro" && plan !== "enterprise" && (
        <div className="p-4 rounded-lg bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200">
          <div className="flex items-center gap-2 text-sm font-semibold text-indigo-900 mb-1">
            <Lock className="w-4 h-4" />
            Team Collaboration — Pro Feature
          </div>
          <p className="text-xs text-indigo-700 mb-2">Invite team members, assign roles, and collaborate on issues.</p>
          <a href="/dashboard/billing" className="inline-flex items-center gap-1 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 px-3 py-1.5 rounded-lg transition">
            Buy any credit pack to unlock
          </a>
        </div>
      )}
      {canManage && (plan === "pro" || plan === "enterprise") && (
        <form onSubmit={handleInvite} className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <UserPlus className="w-4 h-4" />
            Invite Team Member
          </div>
          <div className="flex gap-2">
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="email@example.com"
              className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as OrgRole)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="viewer">Viewer</option>
              <option value="member">Member</option>
              <option value="admin">Admin</option>
              {isOwner && <option value="owner">Owner</option>}
            </select>
            <button
              type="submit"
              disabled={inviting || !inviteEmail.trim()}
              className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition disabled:opacity-50"
            >
              {inviting ? "Inviting..." : "Invite"}
            </button>
          </div>
          <p className="text-xs text-slate-500">
            Invitations generate a secure link. The recipient must sign in with the invited email to accept it.
          </p>
        </form>
      )}

      {/* Status messages */}
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
          {error}
        </div>
      )}
      {success && (
        <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 space-y-2">
          <div>{success}</div>
          {inviteLink && (
            <div className="flex items-center gap-2">
              <code className="flex-1 overflow-x-auto whitespace-nowrap rounded bg-white px-2 py-1 text-xs text-slate-700 border border-emerald-200">
                {inviteLink}
              </code>
              <button
                type="button"
                onClick={() => handleCopyInviteLink(inviteLink)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-emerald-200 hover:bg-emerald-100 rounded-lg transition"
              >
                Copy
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
