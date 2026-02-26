import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { testSlackWebhook } from "@/lib/slack";
import { serverError } from "@/lib/api-error";
import { requirePermission, isAuthError } from "@/lib/permissions";


export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;

  const { data: project, error } = await supabase
    .from("projects")
    .select("id, name, slack_webhook_url, slack_notifications_enabled, slack_notify_on, org_id")
    .eq("id", id)
    .single();

  if (error || !project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const auth = await requirePermission(supabase, "view:projects", project.org_id);
  if (isAuthError(auth)) return auth;

  const maskedWebhook = project.slack_webhook_url
    ? "••••••••" + project.slack_webhook_url.slice(-8)
    : null;

  return NextResponse.json({
    hasWebhook: !!project.slack_webhook_url,
    maskedWebhook,
    enabled: project.slack_notifications_enabled ?? false,
    notifyOn: project.slack_notify_on ?? "failure",
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

  const body = await request.json().catch(() => ({}));
  const { webhookUrl, enabled, notifyOn, test } = body;

  if (test && webhookUrl) {
    const result = await testSlackWebhook(webhookUrl, project.name);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ success: true, message: "Test message sent!" });
  }

  if (webhookUrl && !webhookUrl.startsWith("https://hooks.slack.com/")) {
    return NextResponse.json(
      { error: "Invalid webhook URL. Must be a Slack Incoming Webhook URL." },
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
    updates.slack_webhook_url = webhookUrl || null;
  }
  if (enabled !== undefined) {
    updates.slack_notifications_enabled = Boolean(enabled);
  }
  if (notifyOn !== undefined) {
    updates.slack_notify_on = notifyOn;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No updates provided" }, { status: 400 });
  }

  const { error: updateError } = await supabase
    .from("projects")
    .update(updates)
    .eq("id", id);

  if (updateError) {
    return serverError(updateError, "Update Slack settings");
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

  const { error } = await supabase
    .from("projects")
    .update({
      slack_webhook_url: null,
      slack_notifications_enabled: false,
    })
    .eq("id", id);

  if (error) {
    return serverError(error, "Delete Slack webhook");
  }

  return NextResponse.json({ success: true });
}
