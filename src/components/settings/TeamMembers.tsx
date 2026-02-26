'use client'
import { useState, useEffect } from "react";
import { Users, UserPlus, Trash2, Shield, Crown, Eye, UserCog } from "lucide-react";
import type { OrgRole } from "@/lib/permissions";

type Member = {
  user_id: string;
  role: string;
  users: { id: string; email: string } | null;
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
}: {
  currentUserId: string;
  currentUserRole: string;
}) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<OrgRole>("member");
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const canManage = currentUserRole === "admin" || currentUserRole === "owner";
  const isOwner = currentUserRole === "owner";

  useEffect(() => {
    fetchMembers();
  }, []);

  async function fetchMembers() {
    setLoading(true);
    const res = await fetch("/api/team/members");
    const data = await res.json();
    setMembers(data.members || []);
    setLoading(false);
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

    await fetchMembers();
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

    await fetchMembers();
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setInviting(true);
    setError("");
    setSuccess("");

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

    setSuccess(`Added ${inviteEmail} as ${inviteRole}`);
    setInviteEmail("");
    setInviteRole("member");
    await fetchMembers();
    setTimeout(() => setSuccess(""), 3000);
  }

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
          const email = (m.users as any)?.email || "Unknown";
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

      {/* Invite form — admin/owner only */}
      {canManage && (
        <form onSubmit={handleInvite} className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <UserPlus className="w-4 h-4" />
            Add Team Member
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
              {inviting ? "Adding..." : "Add"}
            </button>
          </div>
        </form>
      )}

      {/* Status messages */}
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
          {error}
        </div>
      )}
      {success && (
        <div className="text-sm text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2">
          {success}
        </div>
      )}
    </div>
  );
}
