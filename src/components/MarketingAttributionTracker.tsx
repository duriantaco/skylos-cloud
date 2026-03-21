"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

type FirstTouch = {
  page_path: string;
  referrer: string | null;
  referrer_host: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  captured_at: string;
};

const EXCLUDED_PREFIXES = ["/api", "/dashboard", "/login", "/scan", "/cli", "/_next"];
const FIRST_TOUCH_KEY = "skylos:first-touch";

function isMarketingPath(pathname: string): boolean {
  return !EXCLUDED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function getPageKind(pathname: string): string {
  if (pathname === "/") return "home";
  if (pathname === "/blog") return "blog_index";
  if (pathname.startsWith("/blog/")) return "blog_article";
  if (pathname === "/compare") return "compare_index";
  if (pathname.startsWith("/compare/")) return "compare_article";
  if (pathname === "/use-cases") return "use_cases_index";
  if (pathname.startsWith("/use-cases/")) return "use_case_article";
  if (pathname === "/vscode") return "vscode";
  if (pathname === "/roadmap") return "roadmap";
  return "marketing_page";
}

function getReferrerHost(referrer: string | null): string | null {
  if (!referrer) return null;
  try {
    return new URL(referrer).hostname || null;
  } catch {
    return null;
  }
}

function readFirstTouch(): FirstTouch | null {
  try {
    const raw = window.sessionStorage.getItem(FIRST_TOUCH_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as FirstTouch;
  } catch {
    return null;
  }
}

function writeFirstTouch(value: FirstTouch) {
  try {
    window.sessionStorage.setItem(FIRST_TOUCH_KEY, JSON.stringify(value));
  } catch {
    // Best effort only.
  }
}

export default function MarketingAttributionTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || !isMarketingPath(pathname)) return;

    const search = window.location.search || "";
    const dedupeKey = `skylos:page-view:${pathname}${search}`;

    try {
      if (window.sessionStorage.getItem(dedupeKey)) return;
      window.sessionStorage.setItem(dedupeKey, "1");
    } catch {
      // Ignore storage failures and still attempt tracking.
    }

    const params = new URLSearchParams(search);
    const referrer = document.referrer || null;
    const currentTouch: FirstTouch = {
      page_path: `${pathname}${search}`,
      referrer,
      referrer_host: getReferrerHost(referrer),
      utm_source: params.get("utm_source"),
      utm_medium: params.get("utm_medium"),
      utm_campaign: params.get("utm_campaign"),
      utm_content: params.get("utm_content"),
      utm_term: params.get("utm_term"),
      captured_at: new Date().toISOString(),
    };

    const hasCampaignData = Boolean(
      currentTouch.utm_source ||
        currentTouch.utm_medium ||
        currentTouch.utm_campaign ||
        currentTouch.referrer_host
    );

    const firstTouch = readFirstTouch();
    if (!firstTouch && hasCampaignData) {
      writeFirstTouch(currentTouch);
    }

    void fetch("/api/analytics/page-view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        page_path: pathname,
        page_url: window.location.href,
        page_title: document.title || null,
        page_kind: getPageKind(pathname),
        referrer,
        referrer_host: getReferrerHost(referrer),
        utm_source: currentTouch.utm_source,
        utm_medium: currentTouch.utm_medium,
        utm_campaign: currentTouch.utm_campaign,
        utm_content: currentTouch.utm_content,
        utm_term: currentTouch.utm_term,
        first_touch: firstTouch || (hasCampaignData ? currentTouch : null),
      }),
      keepalive: true,
    }).catch(() => {
      // Ignore tracking failures.
    });
  }, [pathname]);

  return null;
}
