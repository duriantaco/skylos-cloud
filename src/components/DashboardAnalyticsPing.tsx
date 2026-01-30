"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics";

export default function DashboardAnalyticsPing({ orgId }: { orgId: string }) {
  useEffect(() => {
    try { trackEvent("dashboard_view", orgId); } catch {}
  }, [orgId]);

  return null;
}
