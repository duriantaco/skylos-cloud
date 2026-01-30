import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { postSkylosCheckRun } from "@/lib/github-checkrun";
import { getDiffScopeForCommit, isNewByDiff } from "@/lib/github-pr-diff";
import { isSarif, sarifToSkylosPayload } from "@/lib/sarif";
import { sendSlackNotification } from "@/lib/slack";
import { sendDiscordNotification } from "@/lib/discord";
import { getSiteUrl } from "@/lib/site";
import { trackEvent } from "@/lib/analytics";
import { groupFindings, Finding  } from '@/lib/grouping';
import crypto from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

function getSupabaseAdmin(): SupabaseClient | null {
  const url =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL; // fallback for dev
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) return null;
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


export async function createOrUpdateIssueGroups(
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

  console.log("[grouping] groups:", (grouped as any)?.size ?? "unknown");

  for (const [_, items] of grouped as any as Iterable<[string, InsertedFinding[]]>) {
    const canonical = items?.[0];
    if (!canonical) continue;

    const ruleId = String(canonical.rule_id || "UNKNOWN");
    const filePath = String(canonical.file_path || "");
    const line = Number(canonical.line_number || 0);

    if (!filePath) continue;

    const fingerprint = makeGroupFingerprint(projectId, ruleId, filePath, line);

    const affectedFiles = Array.from(
      new Set(items.map((x) => String(x.file_path || "")).filter(Boolean))
    );

    const { data: groupRow, error: gErr } = await supabase
      .from("issue_groups")
      .upsert(
        {
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
        },
        { onConflict: "org_id,project_id,fingerprint" }
      )
      .select("id, first_seen_scan_id, first_seen_at")
      .single();

    if (gErr || !groupRow?.id) {
      throw new Error(gErr?.message || "Failed to upsert issue_group");
    }

    const groupId = String(groupRow.id);

    if (!groupRow.first_seen_scan_id) {
      const { error: firstErr } = await supabase
        .from("issue_groups")
        .update({
          first_seen_at: scanCreatedAtIso,
          first_seen_scan_id: scanId,
        })
        .eq("id", groupId);

      if (firstErr) throw new Error(`Failed to set first_seen fields: ${firstErr.message}`);
    }

    for (const it of items) {
      if (it?.id) mapping[String(it.id)] = groupId;
    }
  }

  console.log("[grouping] mapping:", Object.keys(mapping).length);

  return mapping;
}


type Plan = "free" | "pro" | "enterprise";

type PlanCapabilities = {
  maxScansStored: number;
  prDiffEnabled: boolean;
  suppressionsEnabled: boolean;
  overridesEnabled: boolean;
  checkRunsEnabled: boolean;
  sarifEnabled: boolean;
  slackEnabled: boolean;
  discordEnabled: boolean;
};

const PLAN_CAPABILITIES: Record<Plan, PlanCapabilities> = {
  free: {
    maxScansStored: 10,
    prDiffEnabled: false,
    suppressionsEnabled: false,
    overridesEnabled: false,
    checkRunsEnabled: false,
    sarifEnabled: false,
    slackEnabled: false,
    discordEnabled: false,
  },
  pro: {
    maxScansStored: 500,
    prDiffEnabled: true,
    suppressionsEnabled: true,
    overridesEnabled: true,
    checkRunsEnabled: true,
    sarifEnabled: true,
    slackEnabled: true,
    discordEnabled: true,
  },
  enterprise: {
    maxScansStored: 10000,
    prDiffEnabled: true,
    suppressionsEnabled: true,
    overridesEnabled: true,
    checkRunsEnabled: true,
    sarifEnabled: true,
    slackEnabled: true,
    discordEnabled: true,
  },
};

function getCapabilities(plan: string): PlanCapabilities {
  if (plan === "enterprise") 
    return PLAN_CAPABILITIES.enterprise;
  if (plan === "pro") 
    return PLAN_CAPABILITIES.pro;
  return PLAN_CAPABILITIES.free;
}

function key(ruleId: string, filePath: string) {
  return `${ruleId}::${filePath}`
}

function supKey(ruleId: string, filePath: string, line: number) {
  return `${ruleId}::${filePath}::${line}`
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

function normalizeIncomingReport(body: any) {
  if (isSarif(body)) {
    const norm = sarifToSkylosPayload(body)
    return {
      summary: norm.summary,
      findings: norm.findings,
      commit_hash: String(body.commit_hash || "local"),
      branch: String(body.branch || "main"),
      actor: String(body.actor || "sarif"),
      tool: "sarif" as const,
    }
  }

  const { summary, findings, commit_hash, branch, actor } = body || {}
  return {
    summary: summary || {},
    findings: findings || [],
    commit_hash: commit_hash || "local",
    branch: branch || "main",
    actor: actor || "unknown",
    tool: "skylos" as const,
  }
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


export async function POST(req: Request) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json(
      {
        error: "Server misconfigured: missing Supabase env vars",
        missing: {
          SUPABASE_URL: !process.env.SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL,
          SUPABASE_SERVICE_ROLE_KEY: !process.env.SUPABASE_SERVICE_ROLE_KEY,
        },
      },
      { status: 500 }
    );
  }
  
  const sb = supabase;

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

    const { data: project, error: projError } = await supabase
      .from('projects')
      .select(`
        id, name, org_id, strict_mode, repo_url, policy_config,
        github_installation_id, slack_webhook_url, slack_notifications_enabled, 
        slack_notify_on, discord_webhook_url, discord_notifications_enabled, 
        discord_notify_on, organizations(plan)`)
      .eq('api_key', token)
      .single()

    if (projError || !project) {
      return NextResponse.json({ 
        error: 'Invalid API Token. Check your SKYLOS_TOKEN.',
        code: 'INVALID_TOKEN'
      }, { status: 403 })
    }

    const orgRef: any = (project as any).organizations
    const plan = String((Array.isArray(orgRef) ? orgRef?.[0]?.plan : orgRef?.plan) || "free") as Plan
    const caps = getCapabilities(plan);

    const body = await req.json()
    const normalized = normalizeIncomingReport(body)
    const { summary, findings, commit_hash, branch, actor, tool } = normalized
    const { is_forced } = body

    if (tool === "sarif" && !caps.sarifEnabled) {
      // return NextResponse.json({
        // success: true,
        // warning: "SARIF import is a Pro feature. Scan accepted but SARIF-specific features disabled.",
        // plan_upgrade_url: "/dashboard/settings?upgrade=true"
        console.log("SARIF on free plan");
      // })
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
    }));

    let diffScope = null;
    if (caps.prDiffEnabled) {
      diffScope = await getDiffScopeForCommit({
        repoUrl: project.repo_url,
        sha: commit_hash || null
      });
    }

    if (project.strict_mode && is_forced) {
      return NextResponse.json({
        success: false,
        error: "STRICT MODE ENABLED. The '--force' flag is disabled by your administrator.",
      }, { status: 403 })
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
        : Promise.resolve({ data: null }),

      caps.suppressionsEnabled
        ? supabase
            .from('suppressions')
            .select('rule_id, file_path, line_number, expires_at')
            .eq('project_id', project.id)
            .is('revoked_at', null)
        : Promise.resolve({ data: [] }),
    ])

   
    let baselineScan: { id: string } | null = null;
    
    const { data: sameBranchScan } = await supabase
      .from('scans')
      .select('id')
      .eq('project_id', project.id)
      .eq('branch', branch)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (sameBranchScan?.id) {
      baselineScan = sameBranchScan;
    } 
    else if (branch !== 'main') {
      const { data: mainScan } = await supabase
        .from('scans')
        .select('id')
        .eq('project_id', project.id)
        .eq('branch', 'main')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (mainScan?.id) {
        baselineScan = mainScan;
      }
    }
    
    const hasBaseline = !!baselineScan?.id;
    const isWhitelisted = !!overriddenScanResult.data


    const baselineCredits = new Map<string, number>()
    if (baselineScan?.id) {
      const { data: oldFindings } = await supabase
        .from('findings')
        .select('rule_id, file_path')
        .eq('scan_id', baselineScan.id)

      oldFindings?.forEach((f: any) => {
        const ruleId = String(f.rule_id || "UNKNOWN")
        const filePath = normPath(String(f.file_path || ""))
        const k = key(ruleId, filePath)
        baselineCredits.set(k, (baselineCredits.get(k) || 0) + 1)
      })
    }

    const activeSuppressions = new Set<string>()
    const now = new Date()
    const nowIso = now.toISOString()

    ;(suppressionsResult.data || []).forEach((s: any) => {
      if (s.expires_at && String(s.expires_at) <= nowIso) 
        return
      const ruleId = String(s.rule_id || "UNKNOWN")
      const filePath = normPath(String(s.file_path || ""))
      const lineNum = Number(s.line_number || 0)
      activeSuppressions.add(supKey(ruleId, filePath, lineNum))
    })

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
        }
      }

      const isSuppressed = caps.suppressionsEnabled 
        ? activeSuppressions.has(supKey(ruleId, filePath, line))
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


    let passedGate = false;

    if (isWhitelisted && caps.overridesEnabled) {
      passedGate = true;
    } else if (!gateEnabled) {
      passedGate = true;
    } else if (criticalSecurityIssues > 0) {
      passedGate = false;
    } else if (mode === "zero-new") {
      passedGate = unsuppressedNewCount === 0;
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
    }

    const { data: scan, error: scanError } = await supabase
      .from('scans')
      .insert({
        project_id: project.id,
        commit_hash: commit_hash || 'local',
        branch: branch || 'main',
        actor: actor || 'unknown',
        tool,
        diff_context: caps.prDiffEnabled ? diffContextForDb(diffScope) : null,
        stats: {
          ...summary,
          new_issues: unsuppressedNewCount,
          legacy_issues: legacyCount,
          suppressed_new_issues: suppressedNewCount,
          gate: {
            enabled: gateEnabled,
            mode,
            thresholds: { by_category: byCategoryThresholds, by_severity: bySeverityThresholds },
            unsuppressed_new_by_category: unsuppressedNewByCategory,
            unsuppressed_new_by_severity: unsuppressedNewBySeverity,
          }
        },
        quality_gate_passed: passedGate,
        is_overridden: isWhitelisted,
        override_reason: isWhitelisted ? `Inherited override` : null,
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (scanError) 
      throw new Error(scanError.message)

    const dbRows = finalFindings.map((f: any) => ({
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
    }))

    if (dbRows.length > 0) {
      await batchInsertFindings(supabase, dbRows);
    }

    const { data: insertedFindings, error: insSelErr } = await supabase
      .from("findings")
      .select("id, rule_id, category, severity, file_path, line_number, snippet, message")
      .eq("scan_id", scan.id);

    if (insSelErr) throw new Error(`Failed to read inserted findings: ${insSelErr.message}`);

    console.log("[grouping] insertedFindings:", insertedFindings?.length || 0);


    if (insertedFindings && insertedFindings.length > 0) {
      const mapping = await createOrUpdateIssueGroups(supabase, {
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
    // Fallback to old method if no GitHub App installed
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
          .eq('branch', branch)
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

    // SLACK
    if (caps.slackEnabled && project.slack_webhook_url) {
      const slackNotifyOn = project.slack_notify_on || 'failure';
      const slackEnabled = project.slack_notifications_enabled;
      
      const { notify, isRecovery } = await shouldNotify(slackNotifyOn, slackEnabled, project.id, scan.id);
      
      if (notify) {
        sendSlackNotification(
          {
            webhookUrl: project.slack_webhook_url,
            projectName: project.name || 'Unknown Project',
            branch: branch || 'main',
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

    // DISCORD
    if (caps.discordEnabled && project.discord_webhook_url) {
      const discordNotifyOn = project.discord_notify_on || 'failure';
      const discordEnabled = project.discord_notifications_enabled;
      
      const { notify, isRecovery } = await shouldNotify(discordNotifyOn, discordEnabled, project.id, scan.id);
      
      if (notify) {
        sendDiscordNotification(
          {
            webhookUrl: project.discord_webhook_url,
            projectName: project.name || 'Unknown Project',
            branch: branch || 'main',
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


    const response: any = {
      success: passedGate,
      scanId: scan.id,
      scan_id: scan.id,
      quality_gate: {
        passed: passedGate,
        new_violations: unsuppressedNewCount,
        suppressed_new_violations: suppressedNewCount,
        message: passedGate
          ? 'Quality Gate Passed.'
          : `Quality Gate Failed! ${unsuppressedNewCount} new violations introduced.`,
      },
      explain: {
            baseline: {
              scan_id: baselineScan?.id || null,
              branch: "main",
              selection_rule:
                "latest scan on main where quality_gate_passed==true OR is_overridden==true",
            },
            detection_mode: caps.prDiffEnabled ? "pr-diff" : "baseline-fallback",
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

    if (plan === "free") {
      response.upgrade_hint = "Upgrade to Pro for PR diff analysis, suppressions, check runs, and Slack/Discord notifications.";
      response.upgrade_url = "/dashboard/settings?upgrade=true";
    }

    trackEvent('scan_completed', project.org_id, {
      findings_count: finalFindings.length,
      passed: passedGate,
      plan: plan,
    });

    return NextResponse.json(response)
  } catch (e: any) {
    console.error('Report API Error:', e)
    return NextResponse.json({ 
      error: "Server error processing report",
      details: process.env.NODE_ENV === "development" ? e.message : undefined
    }, { status: 500 })
  }
}