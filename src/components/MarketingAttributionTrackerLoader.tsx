"use client";

import dynamic from "next/dynamic";

const MarketingAttributionTracker = dynamic(
  () => import("@/components/MarketingAttributionTracker"),
  { ssr: false }
);

export default function MarketingAttributionTrackerLoader() {
  return <MarketingAttributionTracker />;
}
