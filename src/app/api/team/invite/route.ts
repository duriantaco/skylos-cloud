import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { serverError } from "@/lib/api-error";
import { requirePermission, isAuthError, type OrgRole } from "@/lib/permissions";

// POST /api/team/invite — add a user to the org by email
export async function POST(request: Request) {
  const supabase = await createClient();

  const auth = await requirePermission(supabase, "manage:members");
  if (isAuthError(auth)) return auth;

  const body = await request.json().catch(() => ({}));
  const { email, role } = body;

  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "email is required" }, { status: 400 });
  }

  const validRoles: OrgRole[] = ["admin", "member", "viewer"];
  const assignRole = role && validRoles.includes(role) ? role : "member";

  // Only owners can assign owner role
  if (role === "owner") {
    if (auth.member.role !== "owner") {
      return NextResponse.json({ error: "Only owners can assign owner role" }, { status: 403 });
    }
  }

  // Look up user by email in profiles/users
  const { data: targetUser } = await supabase
    .from("users")
    .select("id, email")
    .eq("email", email.toLowerCase().trim())
    .maybeSingle();

  if (!targetUser) {
    return NextResponse.json(
      { error: "No account found for this email. They need to sign up at skylos.dev first." },
      { status: 404 }
    );
  }

  // Check if already a member
  const { data: existing } = await supabase
    .from("organization_members")
    .select("user_id")
    .eq("org_id", auth.orgId)
    .eq("user_id", targetUser.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "User is already a member of this organization" }, { status: 409 });
  }

  // Add member
  const { error: insertErr } = await supabase
    .from("organization_members")
    .insert({
      org_id: auth.orgId,
      user_id: targetUser.id,
      role: role === "owner" ? "owner" : assignRole,
    });

  if (insertErr) {
    return serverError(insertErr, "Add team member");
  }

  return NextResponse.json({
    success: true,
    member: {
      user_id: targetUser.id,
      email: targetUser.email,
      role: role === "owner" ? "owner" : assignRole,
    }
  });
}
