import { NextRequest, NextResponse } from "next/server";
import { trackEvent } from "@/lib/analytics";
import { badRequest, serverError } from "@/lib/api-error";

const BOT_UA_RE =
  /bot|spider|crawl|slurp|headless|preview|facebookexternalhit|curl|wget|python-requests/i;

function asNullableString(value: unknown, maxLength: number = 500): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export async function POST(req: NextRequest) {
  try {
    const userAgent = req.headers.get("user-agent") || "";
    if (BOT_UA_RE.test(userAgent)) {
      return NextResponse.json({ ok: true }, { status: 202 });
    }

    const body = await req.json();
    const pagePath = asNullableString(body?.page_path, 300);
    if (!pagePath) {
      return badRequest("Missing page_path");
    }

    await trackEvent("marketing_page_view", null, {
      page_path: pagePath,
      page_url: asNullableString(body?.page_url, 1000),
      page_title: asNullableString(body?.page_title, 300),
      page_kind: asNullableString(body?.page_kind, 80),
      referrer: asNullableString(body?.referrer, 1000),
      referrer_host: asNullableString(body?.referrer_host, 255),
      utm_source: asNullableString(body?.utm_source, 120),
      utm_medium: asNullableString(body?.utm_medium, 120),
      utm_campaign: asNullableString(body?.utm_campaign, 200),
      utm_content: asNullableString(body?.utm_content, 200),
      utm_term: asNullableString(body?.utm_term, 200),
      first_touch: asObject(body?.first_touch),
      user_agent: asNullableString(userAgent, 300),
    });

    return NextResponse.json({ ok: true }, { status: 202 });
  } catch (error) {
    return serverError(error, "Track marketing page view");
  }
}
