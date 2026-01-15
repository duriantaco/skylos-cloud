import { supabaseAdmin } from "@/utils/supabase/admin";

type EventType =
  | "scan_completed"
  | "project_created"
  | "login"
  | "dashboard_view"
  | "finding_suppressed";

export async function trackEvent(
  eventType: EventType,
  orgId?: string | null,
  metadata?: Record<string, any>
) {
  try {
    const { error } = await supabaseAdmin
      .from("analytics_events")
      .insert({
        event_type: eventType,
        org_id: orgId ?? null,
        metadata: metadata ?? {},
      });

    if (error) {
      console.error("trackEvent insert failed:", error);
    }
  } catch (err) {
    console.error("trackEvent unexpected error:", err);
  }
}
