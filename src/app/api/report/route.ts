/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { postSkylosCheckRun } from "@/lib/github-checkrun";
import { getDiffScopeForCommit, isNewByDiff } from "@/lib/github-pr-diff";
import { sendSlackNotification } from "@/lib/slack";
import { sendDiscordNotification } from "@/lib/discord";
import { getSiteUrl } from "@/lib/site";
import { trackEvent } from "@/lib/analytics";
import { groupFindings  } from '@/lib/grouping';
import crypto from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { serverError } from "@/lib/api-error";
import { isClaudeSecurityReport } from "@/lib/claude-security";
import { getEffectivePlan, getCapabilities as getEntitlementCaps } from "@/lib/entitlements";
import { normalizeIncomingReport } from "@/lib/report-normalization";
import { resolveOidcProject } from "@/lib/oidc-project";
import { resolveGitHubDefaultBranch } from "@/lib/github-repo";
import { resolveProjectFromToken } from "@/lib/project-api-keys";
import {
  buildActiveSuppressionKeys,
  buildSuppressionKey,
} from "@/lib/report-suppressions-core";

function getSupabaseAdmin(): SupabaseClient | null {
  const url =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL; // fallback for dev
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) 
    return null;
  return createClient(url, key);
}

function makeGroupFingerprint(projectId: string, ruleId: string, filePath: string, line: number) {
  const input = `${projectId}|${ruleId}|${filePath}|${line}`;
  return crypto.createHash("sha256").update(input).digest("hex").slice(0, 24);
}

type InsertedFinding = {
  id: string;
  rule_id: string;
  category: string;
  severity: string;
  file_path: string;
  line_number: number | null;
  snippet: string | null;
  author_email?: string | null;
};


const LIMITS = {
  MAX_BODY_SIZE_MB: 5,
  MAX_FINDINGS: 5000,
  MAX_SNIPPET_LENGTH: 2000,
  MAX_MESSAGE_LENGTH: 1000,
  MAX_FILE_PATH_LENGTH: 500,
};

async function batchInsertFindings(
  supabase: SupabaseClient,
  rows: any[]
): Promise<void> {
  if (rows.length === 0) 
    return;
  
  const BATCH_SIZE = 500;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('findings').insert(batch);
    if (error) throw new Error(`Batch insert failed: ${error.message}`);
  }
}


async function createOrUpdateIssueGroups(
  supabase: SupabaseClient,
  args: {
    orgId: string;
    projectId: string;
    scanId: string;
    scanCreatedAtIso: string;
    findings: InsertedFinding[];
  }
): Promise<Record<string, string>> {
  const { orgId, projectId, scanId, scanCreatedAtIso, findings } = args;
  const mapping: Record<string, string> = {};

  const grouped = groupFindings(findings as any);

  const upsertRows: any[] = [];
  const fingerprintToItems: Map<string, InsertedFinding[]> = new Map();

  for (const [, items] of grouped as any as Iterable<[string, InsertedFinding[]]>) {
    const canonical = items?.[0];
    if (!canonical) 
      continue;

    const ruleId = String(canonical.rule_id || "UNKNOWN");
    const filePath = String(canonical.file_path || "");
    const line = Number(canonical.line_number || 0);

    if (!filePath) 
      continue;

    const fingerprint = makeGroupFingerprint(projectId, ruleId, filePath, line);

    const affectedFiles = Array.from(
      new Set(items.map((x) => String(x.file_path || "")).filter(Boolean))
    );

    upsertRows.push({
      org_id: orgId,
      project_id: projectId,
      fingerprint,
      rule_id: ruleId,
      category: String(canonical.category || "SECURITY"),
      severity: String(canonical.severity || "MEDIUM"),
      canonical_file: filePath,
      canonical_line: line,
      canonical_snippet: canonical.snippet || null,
      occurrence_count: items.length,
      affected_files: affectedFiles,
      last_seen_at: scanCreatedAtIso,
      last_seen_scan_id: scanId,
      status: "open",
      author_email: canonical.author_email || null,
    });

    fingerprintToItems.set(fingerprint, items);
  }

  if (upsertRows.length === 0) {
    return mapping;
  }

  const BATCH_SIZE = 100;
  for (let i = 0; i < upsertRows.length; i += BATCH_SIZE) {
    const batch = upsertRows.slice(i, i + BATCH_SIZE);

    const { data: upsertedRows, error: upsertErr } = await supabase
      .from("issue_groups")
      .upsert(batch, { onConflict: "org_id,project_id,fingerprint" })
      .select("id, fingerprint, first_seen_scan_id");

    if (upsertErr) {
      throw new Error(`Batch upsert failed: ${upsertErr.message}`);
    }

    const needsFirstSeen = (upsertedRows || []).filter((r) => !r.first_seen_scan_id);
    if (needsFirstSeen.length > 0) {
      const idsToUpdate = needsFirstSeen.map((r) => r.id);
      const { error: firstErr } = await supabase
        .from("issue_groups")
        .update({
          first_seen_at: scanCreatedAtIso,
          first_seen_scan_id: scanId,
        })
        .in("id", idsToUpdate);

      if (firstErr) {
        throw new Error(`Failed to set first_seen fields: ${firstErr.message}`);
      }
    }

    for (const row of upsertedRows || []) {
      const items = fingerprintToItems.get(row.fingerprint);
      if (items) {
        for (const it of items) {
          if (it?.id) mapping[String(it.id)] = String(row.id);
        }
      }
    }
  }

  return mapping;
}


type ReportCaps = {
  maxScansStored: number;
  prDiffEnabled: boolean;
  suppressionsEnabled: boolean;
  overridesEnabled: boolean;
  checkRunsEnabled: boolean;
  sarifEnabled: boolean;
  slackEnabled: boolean;
  discordEnabled: boolean;
};

function getReportCaps(plan: string): ReportCaps {
  const caps = getEntitlementCaps(plan);
  return {
    maxScansStored: caps.maxScansStored,
    prDiffEnabled: caps.prDiffEnabled,
    suppressionsEnabled: caps.suppressionsEnabled,
    overridesEnabled: caps.overridesEnabled,
    checkRunsEnabled: caps.checkRunsEnabled,
    sarifEnabled: caps.sarifEnabled,
    slackEnabled: caps.integrationsEnabled,
    discordEnabled: caps.integrationsEnabled,
  };
}

function key(ruleId: string, filePath: string) {
  return `${ruleId}::${filePath}`
}

function normPath(p: string) {
  let s = String(p || "");
  try { 
    s = decodeURIComponent(s); 
  } 
  catch {}
  s = s.replace(/\\/g, "/");
  s = s.replace(/^file:\/*/i, "");
  s = s.replace(/^[A-Za-z]:\//, "");
  s = s.replace(/^\/+/, "");
  s = s.replace(/^home\/runner\/work\/[^/]+\/[^/]+\//, "");
  s = s.replace(/^__w\/[^/]+\/[^/]+\//, "");
  s = s.replace(/^github\/workspace\//, "");
  return s.trim();
}

function truncate(str: string | null | undefined, maxLen: number): string | null {
  if (!str) 
    return null;
  return str.length > maxLen ? str.slice(0, maxLen) + "..." : str;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function readNumber(
  value: Record<string, unknown> | null,
  key: string,
  fallback = 0
): number {
  const candidate = value?.[key];
  if (typeof candidate === "number" && Number.isFinite(candidate)) {
    return candidate;
  }
  if (typeof candidate === "string" && candidate.trim().length > 0) {
    const parsed = Number(candidate);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
}

function readString(
  value: Record<string, unknown> | null,
  key: string,
  fallback: string
): string {
  const candidate = value?.[key];
  return typeof candidate === "string" && candidate.length > 0
    ? candidate
    : fallback;
}

function diffContextForDb(scope: any) {
  if (!scope) 
    return null
  return {
    prNumber: scope.prNumber,
    baseRef: scope.baseRef,
    baseSha: scope.baseSha,
    headSha: scope.headSha,
    filesMissingPatch: Array.from(scope.filesMissingPatch || []),
    changedFilesCount: scope.changedFiles?.size ?? scope.changedFilesCount ?? 0,
  }
}

async function cleanupOldScans(
  supabase: SupabaseClient,
  projectId: string,
  maxScans: number
) {
  const { count, error: countErr } = await supabase
    .from("scans")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);

  if (countErr) throw new Error(`Failed to count scans: ${countErr.message}`);
  if (!count || count <= maxScans) return;

  const { data: oldScans, error: oldErr } = await supabase
    .from("scans")
    .select("id")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true })
    .limit(count - maxScans);

  if (oldErr) throw new Error(`Failed to list old scans: ${oldErr.message}`);

  if (oldScans && oldScans.length > 0) {
    const idsToDelete = oldScans.map((s: any) => s.id);
    const { error: delErr } = await supabase.from("scans").delete().in("id", idsToDelete);
    if (delErr) throw new Error(`Failed to delete old scans: ${delErr.message}`);
  }
}


async function getPrNumberForCommit(args: {
  octokit: any;
  owner: string;
  repo: string;
  sha: string;
}): Promise<number | null> {
  const { octokit, owner, repo, sha } = args;
  try {
    const { data } = await octokit.repos.listPullRequestsAssociatedWithCommit({
      owner,
      repo,
      commit_sha: sha,
      per_page: 1,
    });
    return data?.[0]?.number ?? null;
  } catch {
    return null;
  }
}


type NotificationPayload = {
  passed: boolean;
  isRecovery: boolean;
  newIssues: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  suppressedCount: number;
};

type BaselineScanRow = {
  id: string;
  branch: string | null;
  commit_hash: string | null;
  created_at: string | null;
};


export async function POST(req: Request) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    console.error("Server misconfigured: missing Supabase env vars", {
      SUPABASE_URL: !process.env.SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: !process.env.SUPABASE_SERVICE_ROLE_KEY,
    });
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
  
  const sb = supabase;
  let chargedCredits:
    | { orgId: string; amount: number; projectId: string; featureKey: string }
    | null = null;

  try {
    const contentLength = req.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > LIMITS.MAX_BODY_SIZE_MB * 1024 * 1024) {
      return NextResponse.json({ 
        error: `Payload too large. Max ${LIMITS.MAX_BODY_SIZE_MB}MB allowed.` 
      }, { status: 413 })
    }

    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({
        error: 'Missing token. Run with --token or set SKYLOS_TOKEN env var.',
        code: 'NO_TOKEN'
      }, { status: 401 })
    }
    const token = authHeader.split(' ')[1]
    const authMode = req.headers.get('x-skylos-auth')

    let project: any;

    if (authMode === 'oidc') {
      const { verifyGitHubOIDC } = await import('@/lib/github-oidc')
      const claims = await verifyGitHubOIDC(token)
      if (!claims) {
        return NextResponse.json({
          error: 'Invalid OIDC token. Ensure your workflow has id-token: write permission.',
          code: 'INVALID_OIDC'
        }, { status: 401 })
      }

      const resolution = await resolveOidcProject<{
        id: string;
        name: string;
        org_id: string;
        strict_mode: boolean | null;
        repo_url: string | null;
        policy_config: Record<string, unknown> | null;
        ai_assurance_enabled: boolean | null;
        github_installation_id: number | null;
        slack_webhook_url: string | null;
        slack_notifications_enabled: boolean | null;
        slack_notify_on: string | null;
        discord_webhook_url: string | null;
        discord_notifications_enabled: boolean | null;
        discord_notify_on: string | null;
        organizations: unknown;
      }>(
        supabase,
        claims.repository,
        `
          id, name, org_id, strict_mode, repo_url, policy_config, ai_assurance_enabled,
          github_installation_id, slack_webhook_url, slack_notifications_enabled,
          slack_notify_on, discord_webhook_url, discord_notifications_enabled,
          discord_notify_on, organizations(plan, pro_expires_at)`
      )

      if (resolution.kind === "not_found") {
        return NextResponse.json({
          error: `No project linked to ${claims.repository}. Create a project at skylos.dev and set the repo URL.`,
          code: 'REPO_NOT_LINKED'
        }, { status: 404 })
      }

      if (resolution.kind === "ambiguous") {
        return NextResponse.json({
          error: `Multiple projects are linked to ${claims.repository}. OIDC uploads require a unique repo-to-project binding.`,
          code: "AMBIGUOUS_REPO_BINDING",
        }, { status: 409 })
      }

      project = resolution.project
    } else {
      const resolved = await resolveProjectFromToken<{
        id: string;
        name: string;
        org_id: string;
        strict_mode: boolean | null;
        repo_url: string | null;
        policy_config: Record<string, unknown> | null;
        ai_assurance_enabled: boolean | null;
        github_installation_id: number | null;
        slack_webhook_url: string | null;
        slack_notifications_enabled: boolean | null;
        slack_notify_on: string | null;
        discord_webhook_url: string | null;
        discord_notifications_enabled: boolean | null;
        discord_notify_on: string | null;
        organizations: unknown;
      }>(
        supabase,
        token,
        `
          id, name, org_id, strict_mode, repo_url, policy_config, ai_assurance_enabled,
          github_installation_id, slack_webhook_url, slack_notifications_enabled,
          slack_notify_on, discord_webhook_url, discord_notifications_enabled,
          discord_notify_on, organizations(plan, pro_expires_at)`
      );

      const apiKeyProject = resolved?.project;

      if (!apiKeyProject) {
        return NextResponse.json({
          error: 'Invalid API Token. Check your SKYLOS_TOKEN.',
          code: 'INVALID_TOKEN'
        }, { status: 403 })
      }
      project = apiKeyProject
    }

    const orgRef: any = (project as any).organizations
    const rawPlan = String((Array.isArray(orgRef) ? orgRef?.[0]?.plan : orgRef?.plan) || "free");
    const proExpiresAt = Array.isArray(orgRef) ? orgRef?.[0]?.pro_expires_at : orgRef?.pro_expires_at;
    const plan = getEffectivePlan({ plan: rawPlan, pro_expires_at: proExpiresAt });
    const caps = getReportCaps(plan);

    const body = await req.json().catch(() => null)
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 })
    }
    const normalized = normalizeIncomingReport(body)
    const { summary, findings, commit_hash, branch, actor, tool, source, source_metadata, defense_score, ops_score, owasp_coverage, defense_findings, defense_integrations } = normalized
    const { is_forced } = body
    const analysis_mode = String(body.analysis_mode || "static");
    const ai_code = body.ai_code || null;
    const provenance = body.provenance || null;
    const definitions = body.definitions || null;
    const requestedBranch =
      typeof body.branch === "string" && body.branch.trim().length > 0
        ? body.branch.trim()
        : null;
    const defaultBranch =
      (await resolveGitHubDefaultBranch(
        project.repo_url,
        project.github_installation_id || null
      ).catch(() => null)) || "main";
    const effectiveBranch = requestedBranch || defaultBranch || branch || "main";

    if (project.strict_mode && is_forced) {
      return NextResponse.json({
        success: false,
        error: "STRICT MODE ENABLED. The '--force' flag is disabled by your administrator.",
      }, { status: 403 })
    }

    const isClaudeSecurity = String(body.analysis_mode || "").includes("claude-security")
      || isClaudeSecurityReport(body);
    const creditCost = isClaudeSecurity ? 2 : 1;
    const creditFeatureKey = isClaudeSecurity ? "claude_security_ingest" : "scan_upload";

    let creditsWarning = false;
    let creditsRemaining: number | null = null;
    if (plan !== "enterprise") {
      const { data: deducted, error: creditErr } = await supabase.rpc("deduct_credits", {
        p_org_id: project.org_id,
        p_amount: creditCost,
        p_description: isClaudeSecurity ? "Claude Security ingestion" : "Scan upload",
        p_metadata: {
          feature_key: creditFeatureKey,
          project_id: project.id,
        },
      });

      if (creditErr) {
        console.error("Credit deduction failed:", creditErr);
        return NextResponse.json({
          error: "Credit check failed. Please try again.",
          code: "CREDIT_ERROR",
        }, { status: 500 });
      }

      if (deducted === false) {
        return NextResponse.json({
          error: "No credits remaining. Buy more at skylos.dev/dashboard/billing",
          code: "NO_CREDITS",
          credits_remaining: 0,
          buy_url: "https://skylos.dev/dashboard/billing",
        }, { status: 402 });
      }

      chargedCredits = {
        orgId: project.org_id,
        amount: creditCost,
        projectId: project.id,
        featureKey: creditFeatureKey,
      };

      // Check remaining balance
      const { data: updatedOrg } = await supabase
        .from("organizations")
        .select("credits")
        .eq("id", project.org_id)
        .single();

      if (updatedOrg) {
        creditsRemaining = updatedOrg.credits;
        if (updatedOrg.credits < 50) {
          creditsWarning = true;
        }
      }
    }

    if (tool === "sarif" && !caps.sarifEnabled) {
      // SARIF import is a Pro feature — scan accepted but SARIF-specific features disabled
    }

    let processedFindings = (findings || []).slice(0, LIMITS.MAX_FINDINGS);
    
    if (findings.length > LIMITS.MAX_FINDINGS) {
      console.warn(`Truncated findings from ${findings.length} to ${LIMITS.MAX_FINDINGS}`);
    }

    processedFindings = processedFindings.map((f: any) => ({
      ...f,
      rule_id: String(f.rule_id || "UNKNOWN").slice(0, 100),
      file_path: truncate(normPath(String(f.file_path || f.file || "")), LIMITS.MAX_FILE_PATH_LENGTH),
      line_number: Number(f.line_number || f.line || 0) || 0,
      message: truncate(f.message, LIMITS.MAX_MESSAGE_LENGTH),
      snippet: truncate(f.snippet, LIMITS.MAX_SNIPPET_LENGTH),
      severity: String(f.severity || "MEDIUM").toUpperCase(),
      category: String(f.category || "QUALITY").toUpperCase(),
      metadata: f.metadata || null,
    }));

    let diffScope = null;
    if (caps.prDiffEnabled) {
      diffScope = await getDiffScopeForCommit({
        repoUrl: project.repo_url,
        sha: commit_hash || null
      });
    }

    const [overriddenScanResult, suppressionsResult] = await Promise.all([
      caps.overridesEnabled
        ? supabase
            .from('scans')
            .select('id, override_reason')
            .eq('project_id', project.id)
            .eq('commit_hash', commit_hash)
            .eq('is_overridden', true)
            .limit(1)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),

      caps.suppressionsEnabled
        ? supabase
            .from('finding_suppressions')
            .select('rule_id, file_path, line_number, expires_at')
            .eq('project_id', project.id)
            .is('revoked_at', null)
        : Promise.resolve({ data: [], error: null }),
    ])

    if (caps.suppressionsEnabled && suppressionsResult.error) {
      throw new Error(`Failed to load suppressions: ${suppressionsResult.error.message}`);
    }

   
    let baselineScan: BaselineScanRow | null = null;
    let baselineSource: "same-branch-pass" | "default-branch-pass" | "none" = "none";

    const { data: sameBranchScan } = await supabase
      .from('scans')
      .select('id, branch, commit_hash, created_at')
      .eq('project_id', project.id)
      .eq('branch', effectiveBranch)
      .or('quality_gate_passed.eq.true,is_overridden.eq.true')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (sameBranchScan?.id) {
      baselineScan = sameBranchScan as BaselineScanRow;
      baselineSource = "same-branch-pass";
    }
    else if (effectiveBranch !== defaultBranch) {
      const { data: fallbackScan } = await supabase
        .from('scans')
        .select('id, branch, commit_hash, created_at')
        .eq('project_id', project.id)
        .eq('branch', defaultBranch)
        .or('quality_gate_passed.eq.true,is_overridden.eq.true')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fallbackScan?.id) {
        baselineScan = fallbackScan as BaselineScanRow;
        baselineSource = "default-branch-pass";
      }
    }

    const hasBaseline = !!baselineScan?.id;
    const comparisonScope: "pr-diff" | "baseline" | "first-scan-baseline" =
      diffScope && caps.prDiffEnabled
        ? "pr-diff"
        : hasBaseline
        ? "baseline"
        : "first-scan-baseline";
    const isWhitelisted = !!overriddenScanResult.data

    if (process.env.SKYLOS_DEBUG) {
      console.log(
        `[gate-debug] project=${project.id} branch=${branch} hasBaseline=${hasBaseline} baselineScanId=${baselineScan?.id || 'none'} incomingFindings=${processedFindings.length} diffScope=${!!diffScope} prDiffEnabled=${caps.prDiffEnabled}`
      )
    }

    const baselineCredits = new Map<string, number>()
    if (baselineScan?.id) {
      const { data: oldFindings, error: oldErr } = await supabase
        .from('findings')
        .select('rule_id, file_path')
        .eq('scan_id', baselineScan.id)

      if (process.env.SKYLOS_DEBUG) {
        console.log(
          `[gate-debug] baseline findings loaded: ${oldFindings?.length ?? 0} error: ${oldErr?.message || 'none'}`
        )
      }

      oldFindings?.forEach((f: any) => {
        const ruleId = String(f.rule_id || "UNKNOWN")
        const filePath = String(f.file_path || "")
        const k = key(ruleId, filePath)
        baselineCredits.set(k, (baselineCredits.get(k) || 0) + 1)
      })

      if (process.env.SKYLOS_DEBUG) {
        console.log(`[gate-debug] baseline unique keys: ${baselineCredits.size}`)
      }

      // Show first 5 baseline keys for comparison
      if (process.env.SKYLOS_DEBUG) {
        const bKeys = Array.from(baselineCredits.keys()).slice(0, 5)
        console.log(`[gate-debug] sample baseline keys: ${JSON.stringify(bKeys)}`)
      }

      // Show first 5 incoming keys for comparison
      if (process.env.SKYLOS_DEBUG) {
        const iKeys = processedFindings
          .slice(0, 5)
          .map((f: any) => key(f.rule_id, f.file_path))
        console.log(`[gate-debug] sample incoming keys: ${JSON.stringify(iKeys)}`)
      }
    }

    const now = new Date()
    const nowIso = now.toISOString()
    const activeSuppressions = buildActiveSuppressionKeys(
      (suppressionsResult.data || []) as Array<{
        rule_id?: string | null;
        file_path?: string | null;
        line_number?: number | null;
        expires_at?: string | null;
      }>,
      nowIso,
      normPath
    )

    const finalFindings = processedFindings.map((f: any) => {
      const ruleId = f.rule_id
      const filePath = f.file_path
      const line = f.line_number

      const k = key(ruleId, filePath)

      let isNew = false
      let new_reason: "pr-changed-line" | "pr-file-fallback" | "legacy" | "non-pr" | "first-scan-baseline" | "not-in-baseline" = "legacy"

      if (diffScope && caps.prDiffEnabled) {
        isNew = isNewByDiff({ scope: diffScope, filePath, lineNumber: line })

        if (diffScope.changedLinesMap.has(filePath)) {
          new_reason = "pr-changed-line"
        } else if (diffScope.changedFiles.has(filePath)) {
          new_reason = "pr-file-fallback"
        } else {
          new_reason = "legacy"
        }
      } 
      else if (!hasBaseline) {
        isNew = false
        new_reason = "first-scan-baseline"
      }
      else {
        const credits = baselineCredits.get(k) || 0
        isNew = credits <= 0

        if (credits > 0) {
          baselineCredits.set(k, credits - 1)
          new_reason = "legacy"
        } else {
          new_reason = "not-in-baseline"
          if (process.env.SKYLOS_DEBUG) {
            console.log(`[baseline-miss] key=${k} | baseline has ${baselineCredits.size} keys`)
          }
        }
      }

      const isSuppressed = caps.suppressionsEnabled 
        ? activeSuppressions.has(buildSuppressionKey(ruleId, filePath, line))
        : false

      return {
        ...f,
        is_new: isNew,
        new_reason,
        is_suppressed: isSuppressed,
      }
    })

    const unsuppressedNewCount = finalFindings.filter(
      (f: any) => f.is_new && !f.is_suppressed
    ).length

    const suppressedNewCount = finalFindings.filter(
      (f: any) => f.is_new && f.is_suppressed
    ).length

    const totalNewCount = unsuppressedNewCount + suppressedNewCount
    const legacyCount = finalFindings.length - totalNewCount

    const policy: any = (project as any).policy_config || {};
    const gate: any = policy.gate || {};
    const gateEnabled = gate.enabled !== false;
    const mode = String(gate.mode || "zero-new");

    const byCategoryThresholds: Record<string, number> = {
      SECURITY: Number(gate.by_category?.SECURITY ?? 0),
      SECRET: Number(gate.by_category?.SECRET ?? 0),
      QUALITY: Number(gate.by_category?.QUALITY ?? 0),
      DEAD_CODE: Number(gate.by_category?.DEAD_CODE ?? 0),
      DEPENDENCY: Number(gate.by_category?.DEPENDENCY ?? 0),
    };

    const bySeverityThresholds: Record<string, number> = {
      CRITICAL: Number(gate.by_severity?.CRITICAL ?? 0),
      HIGH: Number(gate.by_severity?.HIGH ?? 0),
      MEDIUM: Number(gate.by_severity?.MEDIUM ?? 0),
      LOW: Number(gate.by_severity?.LOW ?? 0),
    };

    const unsuppressedNewByCategory: Record<string, number> = {};
    const unsuppressedNewBySeverity: Record<string, number> = {};

    for (const f of finalFindings) {
      if (!f.is_new || f.is_suppressed) 
        continue;
      
      const cat = String(f.category || "UNCATEGORIZED").toUpperCase();
      const sev = String(f.severity || "MEDIUM").toUpperCase();
      unsuppressedNewByCategory[cat] = (unsuppressedNewByCategory[cat] || 0) + 1;
      unsuppressedNewBySeverity[sev] = (unsuppressedNewBySeverity[sev] || 0) + 1;
    }

    const criticalSecurityIssues = finalFindings.filter((f: any) =>
      !f.is_suppressed &&
      String(f.severity || "").toUpperCase() === "CRITICAL" &&
      String(f.category || "").toUpperCase() === "SECURITY"
    ).length;
    const aiAssuranceEnabled = !!(ai_code?.detected && (project as any).ai_assurance_enabled);
    const aiFiles = new Set(ai_code?.ai_files || []);
    const aiFileFindings = aiAssuranceEnabled
      ? finalFindings.filter(
          (f: any) => f.is_new && !f.is_suppressed && aiFiles.has(f.file_path)
        )
      : [];


    let passedGate = false;
    let failedByCritical = false;
    let failedByZeroNew = false;
    let failedByThresholds = false;
    let failedByAiAssurance = false;

    if (isWhitelisted && caps.overridesEnabled) {
      passedGate = true;
    } else if (!gateEnabled) {
      passedGate = true;
    } else if (criticalSecurityIssues > 0) {
      passedGate = false;
      failedByCritical = true;
    } else if (mode === "zero-new") {
      passedGate = unsuppressedNewCount === 0;
      failedByZeroNew = unsuppressedNewCount > 0;
    } else {
      let ok = true;

      if (mode === "category" || mode === "both") {
        for (const k of Object.keys(byCategoryThresholds)) {
          const limit = Math.max(0, Math.floor(byCategoryThresholds[k] ?? 0));
          const got = unsuppressedNewByCategory[k] || 0;
          if (got > limit) ok = false;
        }
      }

      if (mode === "severity" || mode === "both") {
        for (const k of Object.keys(bySeverityThresholds)) {
          const limit = Math.max(0, Math.floor(bySeverityThresholds[k] ?? 0));
          const got = unsuppressedNewBySeverity[k] || 0;
          if (got > limit) ok = false;
        }
      }

      passedGate = ok;
      failedByThresholds = !ok;
    }

    if (aiAssuranceEnabled) {
      if (aiFileFindings.length > 0) {
        passedGate = false;
        failedByAiAssurance = true;
      }
      if (ai_code) {
        ai_code.gate_passed = aiFileFindings.length === 0;
        ai_code.ai_findings_count = aiFileFindings.length;
      }
    }

    const { data: scan, error: scanError } = await supabase
      .from('scans')
      .insert({
        project_id: project.id,
        commit_hash: commit_hash || 'local',
        branch: effectiveBranch,
        actor: actor || 'unknown',
        tool,
        analysis_mode,
        diff_context: caps.prDiffEnabled ? diffContextForDb(diffScope) : null,
        stats: {
          ...summary,
          new_issues: unsuppressedNewCount,
          legacy_issues: legacyCount,
          suppressed_new_issues: suppressedNewCount,
          gate: {
            enabled: gateEnabled,
            mode,
            comparison_scope: comparisonScope,
            thresholds: { by_category: byCategoryThresholds, by_severity: bySeverityThresholds },
            unsuppressed_new_by_category: unsuppressedNewByCategory,
            unsuppressed_new_by_severity: unsuppressedNewBySeverity,
            baseline: baselineScan
              ? {
                  scan_id: baselineScan.id,
                  branch: baselineScan.branch,
                  commit_hash: baselineScan.commit_hash,
                  created_at: baselineScan.created_at,
                  source: baselineSource,
                }
              : {
                  scan_id: null,
                  branch: effectiveBranch,
                  commit_hash: null,
                  created_at: null,
                  source: baselineSource,
                },
          }
        },
        quality_gate_passed: passedGate,
        is_overridden: isWhitelisted,
        override_reason: isWhitelisted ? `Inherited override` : null,
        ai_code_detected: !!ai_code?.detected,
        ai_code_stats: ai_code || null,
        provenance_summary: provenance?.summary || null,
        provenance_agent_count: provenance?.summary?.agent_count || 0,
        provenance_confidence: provenance?.confidence || null,
        defense_score: defense_score || null,
        ops_score: ops_score || null,
        owasp_coverage: owasp_coverage || null,
        result: definitions ? { definitions } : null,
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (scanError) 
      throw new Error(scanError.message)

    const dbRows = finalFindings.map((f: any, idx: number) => ({
      scan_id: scan.id,
      rule_id: f.rule_id || 'UNKNOWN',
      tool_rule_id: f.tool_rule_id || null,
      file_path: f.file_path,
      line_number: f.line_number || 0,
      message: f.message,
      severity: f.severity || 'MEDIUM',
      category: f.category,
      snippet: f.snippet || null,
      is_new: !!f.is_new,
      new_reason: f.new_reason || null,
      is_suppressed: !!f.is_suppressed,
      source: source || 'skylos',
      source_metadata: source_metadata?.[idx] || null,
      analysis_source: f.metadata?.source || null,
      analysis_confidence: f.metadata?.confidence || null,
      llm_verdict: f.metadata?.llm_verdict || null,
      llm_rationale: f.metadata?.llm_rationale ? String(f.metadata.llm_rationale).slice(0, 2000) : null,
      llm_challenged: !!f.metadata?.llm_challenged,
      needs_review: !!f.metadata?.needs_review,
      sca_metadata: f.category === 'DEPENDENCY' && f.metadata ? {
        vuln_id: f.metadata.vuln_id || null,
        display_id: f.metadata.display_id || null,
        aliases: f.metadata.aliases || [],
        affected_range: f.metadata.affected_range || null,
        fixed_version: f.metadata.fixed_version || null,
        cvss_score: f.metadata.cvss_score ?? null,
        references: f.metadata.references || [],
        ecosystem: f.metadata.ecosystem || null,
        package_name: f.metadata.package_name || null,
        package_version: f.metadata.package_version || null,
      } : null,
      author_email: f.metadata?.blame_email || null,
    }))

    if (dbRows.length > 0) {
      await batchInsertFindings(supabase, dbRows);
    }

    // --- AI Provenance: populate provenance_files table ---
    if (provenance?.files && Object.keys(provenance.files).length > 0) {
      try {
        const provRows = Object.values(provenance.files).map((f: any) => ({
          scan_id: scan.id,
          project_id: project.id,
          file_path: f.file_path,
          agent_authored: !!f.agent_authored,
          agent_name: f.agent_name || null,
          agent_lines: f.agent_lines || [],
          indicators: f.indicators || [],
        }));
        const PROV_BATCH = 500;
        for (let i = 0; i < provRows.length; i += PROV_BATCH) {
          const { error: provErr } = await supabase.from('provenance_files').insert(provRows.slice(i, i + PROV_BATCH));
          if (provErr) console.error('Provenance insert error:', provErr.message);
        }
      } catch (e: any) {
        console.error('Provenance insert failed:', e.message);
      }
    }

    // --- AI Defense: populate normalized tables if defense data present ---
    if (defense_score && typeof defense_score === 'object') {
      try {
        const defenseScore = asRecord(defense_score);
        const opsScore = asRecord(ops_score);
        const defenseIntegrations = Array.isArray(defense_integrations)
          ? defense_integrations
              .map((integration) => asRecord(integration))
              .filter((integration): integration is Record<string, unknown> => !!integration)
          : [];
        const defenseFindings = Array.isArray(defense_findings)
          ? defense_findings
              .map((finding) => asRecord(finding))
              .filter((finding): finding is Record<string, unknown> => !!finding)
          : [];

        // 1. Insert aggregate defense score
        const { error: dsErr } = await supabase.from('defense_scores').insert({
          scan_id: scan.id,
          project_id: project.id,
          weighted_score: readNumber(defenseScore, "weighted_score"),
          weighted_max: readNumber(defenseScore, "weighted_max"),
          score_pct: readNumber(defenseScore, "score_pct"),
          risk_rating: readString(defenseScore, "risk_rating", 'UNKNOWN'),
          passed: readNumber(defenseScore, "passed"),
          total:
            readNumber(defenseScore, "total_checks") ||
            readNumber(defenseScore, "total"),
          ops_passed: readNumber(opsScore, "passed"),
          ops_total: readNumber(opsScore, "total"),
          ops_score_pct: readNumber(opsScore, "score_pct", 100),
          ops_rating: readString(opsScore, "rating", 'EXCELLENT'),
          integrations_found: readNumber(defenseScore, "integrations_found"),
          files_scanned: readNumber(defenseScore, "files_scanned"),
        });
        if (dsErr) console.error('defense_scores insert failed:', dsErr.message);

        // 2. Insert integrations FIRST (from CLI payload or derived from findings)
        //    Build location -> integration_id map for findings FK.
        const locationToIntegrationId = new Map<string, string>();

        if (defenseIntegrations.length > 0) {
          // Use explicit integrations from CLI payload (includes real metadata)
          const integrationRows = defenseIntegrations.map((integ) => ({
            scan_id: scan.id,
            project_id: project.id,
            provider: readString(integ, "provider", 'unknown'),
            integration_type: readString(integ, "integration_type", 'chat'),
            location: readString(integ, "location", 'unknown'),
            model: readString(integ, "model_value", readString(integ, "model", "")) || null,
            tools_count: Array.isArray(integ.tools) ? integ.tools.length : readNumber(integ, "tools_count"),
            input_sources: Array.isArray(integ.input_sources) ? integ.input_sources : [],
            weighted_score: readNumber(integ, "weighted_score"),
            weighted_max: readNumber(integ, "weighted_max"),
            score_pct: readNumber(integ, "score_pct"),
            risk_rating: readString(integ, "risk_rating", 'UNKNOWN'),
          }));

          const { data: insertedIntegs, error: diErr } = await supabase
            .from('defense_integrations')
            .insert(integrationRows)
            .select('id, location');
          if (diErr) {
            console.error('defense_integrations insert failed:', diErr.message);
          } else if (insertedIntegs) {
            for (const row of insertedIntegs) {
              locationToIntegrationId.set(row.location, row.id);
            }
          }
        } else if (defenseFindings.length > 0) {
          // Fallback: derive unique integrations from findings (legacy payloads)
          const uniqueLocations = new Map<string, Record<string, unknown>>();
          for (const f of defenseFindings) {
            const loc =
              readString(f, "integration_location", readString(f, "location", 'unknown'));
            if (!uniqueLocations.has(loc)) {
              uniqueLocations.set(loc, {
                scan_id: scan.id,
                project_id: project.id,
                provider: 'unknown',
                integration_type: 'chat',
                location: loc,
                model: null,
                tools_count: 0,
                input_sources: [],
                weighted_score: 0,
                weighted_max: 0,
                score_pct: 0,
                risk_rating: 'UNKNOWN',
              });
            }
          }
          if (uniqueLocations.size > 0) {
            const { data: insertedIntegs, error: diErr } = await supabase
              .from('defense_integrations')
              .insert(Array.from(uniqueLocations.values()))
              .select('id, location');
            if (diErr) {
              console.error('defense_integrations insert failed:', diErr.message);
            } else if (insertedIntegs) {
              for (const row of insertedIntegs) {
                locationToIntegrationId.set(row.location, row.id);
              }
            }
          }
        }

        // 3. Insert defense findings WITH integration_id populated
        if (defenseFindings.length > 0) {
          const capped = defenseFindings.slice(0, 500);
          const defenseRows = capped.map((f) => {
            const loc =
              readString(f, "integration_location", readString(f, "location", "")) || null;
            return {
              scan_id: scan.id,
              project_id: project.id,
              integration_id: (loc && locationToIntegrationId.get(loc)) || null,
              plugin_id: readString(f, "plugin_id", 'unknown'),
              category: readString(f, "category", 'defense'),
              severity: readString(f, "severity", 'medium'),
              weight: readNumber(f, "weight", 2),
              passed: Boolean(f.passed),
              location: loc,
              message: readString(f, "message", "") || null,
              owasp_llm: readString(f, "owasp_llm", "") || null,
              remediation: readString(f, "remediation", "") || null,
            };
          });
          const { error: dfErr } = await supabase.from('defense_findings').insert(defenseRows);
          if (dfErr) console.error('defense_findings insert failed:', dfErr.message);
        }
      } catch (defErr: any) {
        // Defense insert failures are non-fatal — don't break the scan upload
        console.error('Defense data insert failed:', defErr?.message);
      }
    }

    const { data: insertedFindings, error: insSelErr } = await supabase
      .from("findings")
      .select("id, rule_id, category, severity, file_path, line_number, snippet, message, author_email")
      .eq("scan_id", scan.id);

    if (insSelErr) throw new Error(`Failed to read inserted findings: ${insSelErr.message}`);

    let mapping: Record<string, string> = {};
    if (insertedFindings && insertedFindings.length > 0) {
      mapping = await createOrUpdateIssueGroups(supabase, {
        orgId: project.org_id,
        projectId: project.id,
        scanId: scan.id,
        scanCreatedAtIso: scan.created_at,
        findings: insertedFindings as InsertedFinding[],
      });

    const groupToIds = new Map<string, string[]>();
    for (const [findingId, groupId] of Object.entries(mapping)) {
      if (!groupToIds.has(groupId)) groupToIds.set(groupId, []);
      groupToIds.get(groupId)!.push(findingId);
    }

    for (const [groupId, ids] of groupToIds.entries()) {
      const CHUNK = 500;
      for (let i = 0; i < ids.length; i += CHUNK) {
        const slice = ids.slice(i, i + CHUNK);

        const { error } = await supabase
          .from("findings")
          .update({ group_id: groupId })
          .in("id", slice);

        if (error) {
          throw new Error(`Failed to link findings to issue_groups: ${error.message}`);
        }
      }
    }
    }

    // ── Cross-tool auto-verification ──────────────────────────────────────
    // When a Claude Security finding matches a Skylos finding at the same
    // (file_path, line_number), promote the issue group to VERIFIED.
    if (source === "claude-code-security" && insertedFindings && insertedFindings.length > 0) {
      try {
        // Find existing Skylos findings in the same project at matching locations
        const locations = insertedFindings.map((f: any) => ({
          file_path: f.file_path,
          line_number: f.line_number,
        }));

        // Query recent Skylos findings for this project (last scan from skylos source)
        const { data: recentSkylosScan } = await supabase
          .from("scans")
          .select("id")
          .eq("project_id", project.id)
          .eq("tool", "skylos")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (recentSkylosScan?.id) {
          const { data: skylosFindings } = await supabase
            .from("findings")
            .select("file_path, line_number, group_id")
            .eq("scan_id", recentSkylosScan.id)
            .eq("category", "SECURITY");

          if (skylosFindings && skylosFindings.length > 0) {
            const skylosLocationSet = new Set(
              skylosFindings.map((f: any) => `${f.file_path}::${f.line_number}`)
            );

            // Collect group IDs of Claude findings that overlap with Skylos findings
            const verifiedGroupIds = new Set<string>();
            for (const cf of insertedFindings as any[]) {
              const locKey = `${cf.file_path}::${cf.line_number}`;
              if (skylosLocationSet.has(locKey)) {
                // Find the group_id from the mapping
                const gid = mapping[cf.id];
                if (gid) verifiedGroupIds.add(gid);
              }
            }

            // Also check Skylos-side group IDs
            for (const sf of skylosFindings as any[]) {
              const locKey = `${sf.file_path}::${sf.line_number}`;
              const claudeMatch = locations.some(
                (l: any) => `${l.file_path}::${l.line_number}` === locKey
              );
              if (claudeMatch && sf.group_id) {
                verifiedGroupIds.add(sf.group_id);
              }
            }

            if (verifiedGroupIds.size > 0) {
              const ids = Array.from(verifiedGroupIds);
              await supabase
                .from("issue_groups")
                .update({ verification_status: "VERIFIED" })
                .in("id", ids)
                .eq("verification_status", "UNVERIFIED");

              console.log(
                `[cross-verify] Auto-verified ${ids.length} issue groups via Claude+Skylos corroboration`
              );
            }
          }
        }
      } catch (e) {
        console.error("Cross-tool verification failed (non-fatal):", e);
      }
    }

    await cleanupOldScans(supabase, project.id, caps.maxScansStored);

    if (caps.checkRunsEnabled && (project as any).github_installation_id) {
      try {
        const { getInstallationOctokit } = await import("@/lib/github-app");
        const octokit = await getInstallationOctokit((project as any).github_installation_id);
        
        const [owner, repo] = (project.repo_url || "")
          .replace("https://github.com/", "")
          .replace(".git", "")
          .split("/");
        
        if (owner && repo && commit_hash && commit_hash !== "local") {
          const { data: checkRuns } = await octokit.checks.listForRef({
            owner,
            repo,
            ref: commit_hash,
            check_name: "Skylos Quality Gate",
          });
          
          const checkRun = checkRuns.check_runs[0];
          
          if (checkRun) {
            await octokit.checks.update({
              owner,
              repo,
              check_run_id: checkRun.id,
              status: "completed",
              conclusion: passedGate ? "success" : "failure",
              output: {
                title: passedGate ? "Quality Gate Passed" : "Quality Gate Failed",
                summary: `Found ${unsuppressedNewCount} new issue(s).`,
                text: `[View full report](${process.env.APP_BASE_URL}/dashboard/scans/${scan.id})`,
              },
            });
          } else {
            await octokit.checks.create({
              owner,
              repo,
              name: "Skylos Quality Gate",
              head_sha: commit_hash,
              status: "completed",
              conclusion: passedGate ? "success" : "failure",
              output: {
                title: passedGate ? "Quality Gate Passed" : "Quality Gate Failed",
                summary: `Found ${unsuppressedNewCount} new issue(s).`,
                text: `[View full report](${process.env.APP_BASE_URL}/dashboard/scans/${scan.id})`,
              },
            });
          }
        }
      } catch (e) {
        console.error("GitHub App CheckRun failed:", e);
      }
    }
    else if (caps.checkRunsEnabled) {
      try {
        await postSkylosCheckRun({
          repoUrl: project.repo_url || null,
          sha: commit_hash || "local",
          scanId: scan.id,
          appBaseUrl: process.env.APP_BASE_URL || "http://localhost:3000",
          passedGate,
          findings: finalFindings,
          diffScope: diffScope ? {
            prNumber: diffScope.prNumber,
            baseRef: diffScope.baseRef,
            baseSha: diffScope.baseSha,
            headSha: diffScope.headSha,
            filesMissingPatch: Array.from(diffScope.filesMissingPatch),
            changedFilesCount: diffScope.changedFiles.size,
          } : null,
        });
      } catch (e) {
        console.error("GitHub CheckRun failed:", e);
      }
    }

    if ((project as any).github_installation_id) {
    try {
      const sha = commit_hash || "local";
      if (sha !== "local") {
        const { getInstallationOctokit } = await import("@/lib/github-app");
        const { upsertSkylosPrComment, buildSkylosCommentBody } = await import(
          "@/lib/github/upsertSkylosPrComment"
        );

        const octokit = await getInstallationOctokit((project as any).github_installation_id);

        const [owner, repo] = (project.repo_url || "")
          .replace("https://github.com/", "")
          .replace(".git", "")
          .split("/");

        if (owner && repo) {
          const prNumber =
            (diffScope && (diffScope as any).prNumber) ||
            (await getPrNumberForCommit({ octokit, owner, repo, sha }));

          if (prNumber) {
            const scanUrl = `${process.env.APP_BASE_URL || getSiteUrl()}/dashboard/scans/${scan.id}`;

            const reasons: string[] = [];
            if (!passedGate) {
              if (criticalSecurityIssues > 0) reasons.push(`${criticalSecurityIssues} critical security issue(s)`);
              if (failedByAiAssurance) reasons.push(`${aiFileFindings.length} new unsuppressed AI-authored file issue(s)`);
              if (failedByZeroNew) reasons.push(`${unsuppressedNewCount} new unsuppressed issue(s) introduced`);
              if (failedByThresholds) reasons.push(`saved ${mode} thresholds exceeded`);
            }

            const summaryMd = [
              `**New (unsuppressed):** ${unsuppressedNewCount}`,
              `**Suppressed new:** ${suppressedNewCount}`,
              `**Total findings:** ${finalFindings.length}`,
            ].join("\n");

            const body = buildSkylosCommentBody({
              title: "Skylos Review",
              summaryMd,
              scanUrl,
              gatePassed: passedGate,
              reasons,
              statsLine: `**Commit:** \`${sha.slice(0, 7)}\` • **Branch:** \`${branch || "unknown"}\``,
              projectId: project.id,
            });

            await upsertSkylosPrComment({
              octokit,
              owner,
              repo,
              prNumber,
              body,
            });
          }
        }
      }
    } catch (e) {
      console.error("Skylos PR comment upsert failed:", e);
    }
  }

    if (
      plan !== "free" &&
      (project as any).github_installation_id &&
      diffScope &&
      (diffScope as any).prNumber
    ) {
      try {
        const { getInstallationOctokit } = await import("@/lib/github-app");
        const octokit = await getInstallationOctokit(
          (project as any).github_installation_id
        );

        const [owner, repo] = (project.repo_url || "")
          .replace("https://github.com/", "")
          .replace(".git", "")
          .split("/");

        const prNumber = (diffScope as any).prNumber;

        if (owner && repo && prNumber) {
          const changedFiles = diffScope.changedFiles;
          const inlineFindings = finalFindings.filter(
            (f: any) =>
              f.is_new &&
              !f.is_suppressed &&
              changedFiles.has(f.file_path) &&
              f.line_number > 0
          );

          const MAX_INLINE_COMMENTS = 10;
          const commentsToPost = inlineFindings.slice(0, MAX_INLINE_COMMENTS);

          if (commentsToPost.length > 0) {
            const sevEmoji: Record<string, string> = {
              CRITICAL: "🔴",
              HIGH: "🟠",
              MEDIUM: "🟡",
              LOW: "🔵",
            };

            const reviewComments = commentsToPost.map((f: any) => ({
              path: f.file_path,
              line: f.line_number,
              body: `${sevEmoji[f.severity] || "⚠️"} **${f.rule_id}** (${f.severity})\n\n${f.message || "Issue detected by Skylos"}`,
            }));

            const truncatedNote =
              inlineFindings.length > MAX_INLINE_COMMENTS
                ? `\n\n> Showing ${MAX_INLINE_COMMENTS} of ${inlineFindings.length} new findings. [View all →](${process.env.APP_BASE_URL || getSiteUrl()}/dashboard/scans/${scan.id})`
                : "";

            await octokit.pulls.createReview({
              owner,
              repo,
              pull_number: prNumber,
              event: "COMMENT",
              body: `Skylos found **${inlineFindings.length}** new issue(s) in this PR.${truncatedNote}`,
              comments: reviewComments,
            });
          }
        }
      } catch (e) {
        console.error("Skylos PR inline decoration failed:", e);
      }
    }

    const notificationPayload: NotificationPayload = {
      passed: passedGate,
      isRecovery: false,
      newIssues: unsuppressedNewCount,
      criticalCount: unsuppressedNewBySeverity['CRITICAL'] || 0,
      highCount: unsuppressedNewBySeverity['HIGH'] || 0,
      mediumCount: unsuppressedNewBySeverity['MEDIUM'] || 0,
      lowCount: unsuppressedNewBySeverity['LOW'] || 0,
      suppressedCount: suppressedNewCount,
    };

    async function shouldNotify(
      notifyOn: string,
      webhookEnabled: boolean,
      projectId: string,
      scanId: string   
    ): Promise<{ notify: boolean; isRecovery: boolean }> {
      if (!webhookEnabled) return { notify: false, isRecovery: false };

      if (notifyOn === 'always') {
        return { notify: true, isRecovery: false };
      }
      
      if (notifyOn === 'failure' && !passedGate) {
        return { notify: true, isRecovery: false };
      }
      
      if (notifyOn === 'recovery') {
        const { data: prevScan } = await sb
          .from('scans')
          .select('quality_gate_passed')
          .eq('project_id', projectId)
          .eq('branch', effectiveBranch)
          .neq('id', scanId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        const isRecovery = !!(prevScan && !prevScan.quality_gate_passed && passedGate);
        return { 
          notify: !passedGate || isRecovery,
          isRecovery 
        };
      }

      return { notify: false, isRecovery: false };
    }

    if (caps.slackEnabled && project.slack_webhook_url) {
      const slackNotifyOn = project.slack_notify_on || 'failure';
      const slackEnabled = project.slack_notifications_enabled;
      
      const { notify, isRecovery } = await shouldNotify(slackNotifyOn, slackEnabled, project.id, scan.id);
      
      if (notify) {
        sendSlackNotification(
          {
            webhookUrl: project.slack_webhook_url,
            projectName: project.name || 'Unknown Project',
            branch: effectiveBranch,
            commitHash: commit_hash || 'local',
            repoUrl: project.repo_url,
            scanId: scan.id,
            siteUrl: getSiteUrl(),
          },
          { ...notificationPayload, isRecovery }
        ).catch((err) => {
          console.error('Slack notification failed:', err);
        });
      }
    }

    if (caps.discordEnabled && project.discord_webhook_url) {
      const discordNotifyOn = project.discord_notify_on || 'failure';
      const discordEnabled = project.discord_notifications_enabled;
      
      const { notify, isRecovery } = await shouldNotify(discordNotifyOn, discordEnabled, project.id, scan.id);
      
      if (notify) {
        sendDiscordNotification(
          {
            webhookUrl: project.discord_webhook_url,
            projectName: project.name || 'Unknown Project',
            branch: effectiveBranch,
            commitHash: commit_hash || 'local',
            repoUrl: project.repo_url,
            scanId: scan.id,
            siteUrl: getSiteUrl(),
          },
          { ...notificationPayload, isRecovery }
        ).catch((err) => {
          console.error('Discord notification failed:', err);
        });
      }
    }


    const qualityGateFailureReasons: string[] = [];
    if (failedByCritical) qualityGateFailureReasons.push(`${criticalSecurityIssues} critical security issue${criticalSecurityIssues !== 1 ? "s" : ""}`);
    if (failedByAiAssurance) qualityGateFailureReasons.push(`${aiFileFindings.length} new unsuppressed finding${aiFileFindings.length !== 1 ? "s" : ""} in AI-authored files`);
    if (failedByZeroNew) qualityGateFailureReasons.push(`${unsuppressedNewCount} new unsuppressed finding${unsuppressedNewCount !== 1 ? "s" : ""}`);
    if (failedByThresholds) qualityGateFailureReasons.push(`saved ${mode} thresholds exceeded`);
    const qualityGateMessage = passedGate
      ? 'Quality Gate Passed.'
      : qualityGateFailureReasons.length > 0
      ? `Quality Gate Failed! ${qualityGateFailureReasons.join("; ")}.`
      : 'Quality Gate Failed.';

    const response: any = {
      success: passedGate,
      scanId: scan.id,
      scan_id: scan.id,
      quality_gate: {
        passed: passedGate,
        new_violations: unsuppressedNewCount,
        suppressed_new_violations: suppressedNewCount,
        message: qualityGateMessage,
      },
      explain: {
            baseline: {
              scan_id: baselineScan?.id || null,
              branch: baselineScan?.id ? (sameBranchScan?.id ? effectiveBranch : defaultBranch) : null,
              selection_rule:
                "latest successful or overridden scan on the current branch, otherwise the repository default branch",
            },
            detection_mode: comparisonScope,
            suppressions_enabled: caps.suppressionsEnabled,
            strict_mode: !!project.strict_mode,
            force_disabled_when_strict: !!project.strict_mode,
            new_reason_values: {
              pr_changed_line: "pr-changed-line",
              pr_file_fallback: "pr-file-fallback",
              legacy: "legacy",
              non_pr: "non-pr",
            },
          },
      plan,
      capabilities: {
        pr_diff: caps.prDiffEnabled,
        suppressions: caps.suppressionsEnabled,
        check_runs: caps.checkRunsEnabled,
        slack: caps.slackEnabled,
        discord: caps.discordEnabled,
      }
    };

    if (creditsRemaining !== null) {
      response.credits_remaining = creditsRemaining;
    }

    if (creditsWarning) {
      response.credits_warning = true;
      response.credits_message = "Low credits. Top up at skylos.dev/dashboard/billing";
    }

    if (plan === "free") {
      response.upgrade_hint = "Purchase credits to unlock overrides, SARIF import, Slack/Discord notifications, and higher limits.";
      response.upgrade_url = "/dashboard/billing";
    }

    trackEvent('scan_completed', project.org_id, {
      findings_count: finalFindings.length,
      passed: passedGate,
      plan: plan,
    });

    return NextResponse.json(response)
  } catch (e) {
    if (chargedCredits) {
      try {
        await sb.rpc("add_credits", {
          p_org_id: chargedCredits.orgId,
          p_amount: chargedCredits.amount,
          p_transaction_type: "refund",
          p_description: `Automatic refund for failed ${chargedCredits.featureKey}`,
          p_metadata: {
            feature_key: chargedCredits.featureKey,
            project_id: chargedCredits.projectId,
            refund_reason: "report_api_failure",
          },
        });
      } catch (refundErr) {
        console.error("Automatic credit refund failed:", refundErr);
      }
    }

    return serverError(e, "Report API");
  }
}
