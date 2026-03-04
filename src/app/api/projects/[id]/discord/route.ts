import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { testDiscordWebhook } from "@/lib/discord";
import { serverError } from "@/lib/api-error";
import { requirePermission, isAuthError } from "@/lib/permissions";
import { getEffectivePlan } from "@/lib/entitlements";
import { requirePlan } from "@/lib/require-credits";


export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;

  const { data: project, error } = await supabase
    .from("projects")
    .select("id, name, discord_webhook_url, discord_notifications_enabled, discord_notify_on, org_id")
    .eq("id", id)
    .single();

  if (error || !project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const auth = await requirePermission(supabase, "view:projects", project.org_id);
  if (isAuthError(auth)) return auth;

  const maskedWebhook = project.discord_webhook_url
    ? "••••••••" + project.discord_webhook_url.slice(-8)
    : null;

  return NextResponse.json({
    hasWebhook: !!project.discord_webhook_url,
    maskedWebhook,
    enabled: project.discord_notifications_enabled ?? false,
    notifyOn: project.discord_notify_on ?? "failure",
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;

  const { data: project } = await supabase
    .from("projects")
    .select("id, name, org_id")
    .eq("id", id)
    .single();

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const auth = await requirePermission(supabase, "manage:integrations", project.org_id);
  if (isAuthError(auth)) return auth;

  // Plan gate: Discord integration requires Pro
  const { data: org } = await supabase
    .from("organizations")
    .select("plan, pro_expires_at")
    .eq("id", project.org_id)
    .single();
  const effectivePlan = getEffectivePlan({ plan: org?.plan || "free", pro_expires_at: org?.pro_expires_at });
  const planCheck = requirePlan(effectivePlan, "pro", "Discord Integration");
  if (!planCheck.ok) return planCheck.response;

  const body = await request.json().catch(() => ({}));
  const { webhookUrl, enabled, notifyOn, test } = body;

  if (test && webhookUrl) {
    const result = await testDiscordWebhook(webhookUrl, project.name);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ success: true, message: "Test message sent!" });
  }

  if (webhookUrl && !webhookUrl.startsWith("https://discord.com/api/webhooks/")) {
    return NextResponse.json(
      { error: "Invalid webhook URL. Must be a Discord Webhook URL." },
      { status: 400 }
    );
  }

  const validNotifyOn = ["failure", "always", "recovery"];
  if (notifyOn && !validNotifyOn.includes(notifyOn)) {
    return NextResponse.json(
      { error: "Invalid notifyOn value. Must be: failure, always, or recovery" },
      { status: 400 }
    );
  }

  const updates: Record<string, any> = {};

  if (webhookUrl !== undefined) {
    updates.discord_webhook_url = webhookUrl || null;
  }
  if (enabled !== undefined) {
    updates.discord_notifications_enabled = Boolean(enabled);
  }
  if (notifyOn !== undefined) {
    updates.discord_notify_on = notifyOn;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No updates provided" }, { status: 400 });
  }

  const { error: updateError } = await supabase
    .from("projects")
    .update(updates)
    .eq("id", id);

  if (updateError) {
    return serverError(updateError, "Update Discord settings");
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;

  const { data: project } = await supabase
    .from("projects")
    .select("id, org_id")
    .eq("id", id)
    .single();

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const auth = await requirePermission(supabase, "manage:integrations", project.org_id);
  if (isAuthError(auth)) return auth;

  // Plan gate: Discord integration requires Pro
  const { data: delOrg } = await supabase
    .from("organizations")
    .select("plan, pro_expires_at")
    .eq("id", project.org_id)
    .single();
  const delPlan = getEffectivePlan({ plan: delOrg?.plan || "free", pro_expires_at: delOrg?.pro_expires_at });
  const delPlanCheck = requirePlan(delPlan, "pro", "Discord Integration");
  if (!delPlanCheck.ok) return delPlanCheck.response;

  const { error } = await supabase
    .from("projects")
    .update({
      discord_webhook_url: null,
      discord_notifications_enabled: false,
    })
    .eq("id", id);

  if (error) {
    return serverError(error, "Delete Discord webhook");
  }

  return NextResponse.json({ success: true });
}
