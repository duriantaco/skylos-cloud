import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { requirePermission, isAuthError } from "@/lib/permissions";
import { serverError } from "@/lib/api-error";
import { getSiteUrl } from "@/lib/site";
import crypto from "crypto";

function generateShareToken(): string {
  return crypto.randomBytes(9).toString("base64url").slice(0, 12);
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const auth = await requirePermission(supabase, "view:scans");
    if (isAuthError(auth)) return auth;

    const { data: scan, error: scanErr } = await supabase
      .from("scans")
      .select("id, project_id, share_token, is_public, projects(org_id)")
      .eq("id", id)
      .single();

    if (scanErr || !scan) {
      return NextResponse.json({ error: "Scan not found" }, { status: 404 });
    }

    const orgId = (scan.projects as any)?.org_id;
    if (orgId !== auth.orgId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (scan.share_token && scan.is_public) {
      return NextResponse.json({
        share_token: scan.share_token,
        url: `${getSiteUrl()}/scan/${scan.share_token}`,
      });
    }

    const token = generateShareToken();

    const { error: updateErr } = await supabase
      .from("scans")
      .update({ share_token: token, is_public: true })
      .eq("id", id);

    if (updateErr) {
      return NextResponse.json(
        { error: "Failed to share scan" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      share_token: token,
      url: `${getSiteUrl()}/scan/${token}`,
    });
  } catch (e) {
    return serverError(e, "Share scan");
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const auth = await requirePermission(supabase, "view:scans");
    if (isAuthError(auth)) return auth;

    const { data: scan, error: scanErr } = await supabase
      .from("scans")
      .select("id, projects(org_id)")
      .eq("id", id)
      .single();

    if (scanErr || !scan) {
      return NextResponse.json({ error: "Scan not found" }, { status: 404 });
    }

    const orgId = (scan.projects as any)?.org_id;
    if (orgId !== auth.orgId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { error: updateErr } = await supabase
      .from("scans")
      .update({ share_token: null, is_public: false })
      .eq("id", id);

    if (updateErr) {
      return NextResponse.json(
        { error: "Failed to unshare scan" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    return serverError(e, "Unshare scan");
  }
}
