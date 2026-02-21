import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { testSlackWebhook } from "@/lib/slack";
import { serverError } from "@/lib/api-error";


export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: project, error } = await supabase
    .from("projects")
    .select("id, name, slack_webhook_url, slack_notifications_enabled, slack_notify_on")
    .eq("id", id)
    .single();

  if (error || !project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

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

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: project } = await supabase
    .from("projects")
    .select("id, name, org_id")
    .eq("id", id)
    .single();

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const { data: member } = await supabase
    .from("organization_members")
    .select("org_id")
    .eq("user_id", user.id)
    .eq("org_id", project.org_id)
    .single();

  if (!member) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

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

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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