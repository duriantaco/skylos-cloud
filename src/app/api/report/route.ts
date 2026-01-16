import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { postSkylosCheckRun } from "@/lib/github-checkrun";
import { getDiffScopeForCommit, isNewByDiff } from "@/lib/github-pr-diff";
import { isSarif, sarifToSkylosPayload } from "@/lib/sarif";
import { sendSlackNotification } from "@/lib/slack";
import { sendDiscordNotification } from "@/lib/discord";
import { getSiteUrl } from "@/lib/site";
import { trackEvent } from "@/lib/analytics";
import { SupabaseClient } from '@supabase/supabase-js';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

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

async function cleanupOldScans(projectId: string, maxScans: number) {
  const { count } = await supabase
    .from('scans')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', projectId);

  if (!count || count <= maxScans) 
    return;

  const { data: oldScans } = await supabase
    .from('scans')
    .select('id')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true })
    .limit(count - maxScans);

  if (oldScans && oldScans.length > 0) {
    const idsToDelete = oldScans.map(s => s.id);
    await supabase.from('scans').delete().in('id', idsToDelete);
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

    const [overriddenScanResult, baselineScanResult, suppressionsResult] = await Promise.all([
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

      supabase
        .from('scans')
        .select('id')
        .eq('project_id', project.id)
        .eq('branch', 'main')
        .or('quality_gate_passed.eq.true,is_overridden.eq.true')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),

      caps.suppressionsEnabled
        ? supabase
            .from('suppressions')
            .select('rule_id, file_path, line_number, expires_at')
            .eq('project_id', project.id)
            .is('revoked_at', null)
        : Promise.resolve({ data: [] }),
    ])

    const isWhitelisted = !!overriddenScanResult.data
    const baselineScan = baselineScanResult.data

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
      let new_reason: "pr-changed-line" | "pr-file-fallback" | "legacy" | "non-pr" = "legacy"

      if (diffScope && caps.prDiffEnabled) {
        isNew = isNewByDiff({ scope: diffScope, filePath, lineNumber: line })

        if (diffScope.changedLinesMap.has(filePath)) {
          new_reason = "pr-changed-line"
        } else if (diffScope.changedFiles.has(filePath)) {
          new_reason = "pr-file-fallback"
        } else {
          new_reason = "legacy"
        }
      } else {
        new_reason = "non-pr"
        const credits = baselineCredits.get(k) || 0
        isNew = credits <= 0
        if (credits > 0) baselineCredits.set(k, credits - 1)
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

    await cleanupOldScans(project.id, caps.maxScansStored);

    if (caps.checkRunsEnabled && (project as any).github_installation_id) {
      try {
        const { getInstallationOctokit } = await import("@/lib/github-app");
        const octokit = await getInstallationOctokit((project as any).github_installation_id);
        
        const [owner, repo] = (project.repo_url || "")
          .replace("https://github.com/", "")
          .replace(".git", "")
          .split("/");
        
        if (owner && repo && commit_hash && commit_hash !== "local") {
          // Find existing check run for this SHA
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
        const { data: prevScan } = await supabase
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