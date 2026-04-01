import { NextRequest, NextResponse } from "next/server";
import { badRequest, serverError } from "@/lib/api-error";
import { parseGitHubRepoUrl, normalizeGitHubRepoUrl } from "@/lib/github-repo-core";
import { normalizeJudgeAnalysisModes } from "@/lib/judge-core";
import { supabaseAdmin } from "@/utils/supabase/admin";

const BOT_UA_RE =
  /bot|spider|crawl|slurp|headless|preview|facebookexternalhit|curl|wget|python-requests/i;

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60 * 60 * 1000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT) {
    return false;
  }

  entry.count += 1;
  return true;
}

function readOptionalString(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

function isValidEmail(value: string | null): boolean {
  if (!value) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: NextRequest) {
  try {
    const userAgent = request.headers.get("user-agent") || "";
    if (BOT_UA_RE.test(userAgent)) {
      return NextResponse.json({ ok: true }, { status: 202 });
    }

    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";

    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: "Too many repo suggestions. Try again later." },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return badRequest("Invalid request body");
    }

    const repoUrl = normalizeGitHubRepoUrl(readOptionalString(body.repo_url, 500));
    if (!repoUrl) {
      return badRequest("A valid GitHub repository URL is required");
    }

    const repoRef = parseGitHubRepoUrl(repoUrl);
    if (!repoRef) {
      return badRequest("Only public GitHub repository URLs are supported");
    }

    const contactEmail = readOptionalString(body.contact_email, 255);
    if (!isValidEmail(contactEmail)) {
      return badRequest("Please provide a valid email address");
    }

    const notes = readOptionalString(body.notes, 1200);
    const requestedModes = normalizeJudgeAnalysisModes(body.requested_analysis_modes, [
      "static",
      "agent",
    ]);

    const { data: existingPending } = await supabaseAdmin
      .from("judge_suggestions")
      .select("id, status")
      .eq("host", "github")
      .eq("owner", repoRef.owner)
      .eq("name", repoRef.repo)
      .in("status", ["pending", "approved", "queued"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingPending) {
      return NextResponse.json({
        ok: true,
        duplicate: true,
        message: "This repo is already in the Judge queue.",
      });
    }

    const { data: existingRepo } = await supabaseAdmin
      .from("judge_repos")
      .select("id")
      .eq("host", "github")
      .eq("owner", repoRef.owner)
      .eq("name", repoRef.repo)
      .eq("is_active", true)
      .maybeSingle();

    if (existingRepo) {
      return NextResponse.json({
        ok: true,
        duplicate: true,
        message: "This repo is already tracked in Judge.",
      });
    }

    const { data: suggestion, error } = await supabaseAdmin
      .from("judge_suggestions")
      .insert({
        host: "github",
        owner: repoRef.owner,
        name: repoRef.repo,
        source_url: repoUrl,
        contact_email: contactEmail,
        notes,
        requested_analysis_modes: requestedModes,
        submitted_by: "public",
        source_ip: ip,
        user_agent: readOptionalString(userAgent, 300),
      })
      .select("id")
      .single();

    if (error || !suggestion) {
      return NextResponse.json(
        { error: error?.message || "Failed to store repo suggestion" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      suggestion_id: suggestion.id,
      message: "Repo suggestion received. We will review it for Judge.",
    });
  } catch (error) {
    return serverError(error, "Judge suggestion");
  }
}
