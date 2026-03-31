import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { serverError } from "@/lib/api-error";
import { requirePermission, isAuthError } from "@/lib/permissions";
import { getEffectivePlan } from "@/lib/entitlements";
import { requirePlan, requireCredits } from "@/lib/require-credits";
import {
  fetchTriageFindings,
  type TriageFinding,
  type TriageFindingsClient,
} from "@/lib/issue-groups/triage";

const TRIAGE_SYSTEM_PROMPT = `You are a security triage expert. Given a security finding with its context, provide a structured triage assessment.

Return ONLY valid JSON with this exact structure:
{
  "priority": "P1" | "P2" | "P3" | "P4",
  "impact": "Brief impact assessment (1-2 sentences)",
  "remediation": ["Step 1", "Step 2", ...],
  "effort_hours": number,
  "reasoning": "Why this priority level (1 sentence)"
}

Priority definitions:
- P1: Critical — actively exploitable, immediate fix required
- P2: High — exploitable with some conditions, fix within days
- P3: Medium — limited exploitability or impact, fix within sprint
- P4: Low — informational or defense-in-depth, fix when convenient`;

type TriageIssueGroup = {
  rule_id: string;
  title?: string | null;
  category?: string | null;
  severity?: string | null;
};

function extractOrgId(
  projects: unknown
): string | undefined {
  if (Array.isArray(projects)) {
    const first = projects[0];
    if (first && typeof first === "object" && "org_id" in first) {
      const orgId = (first as { org_id?: unknown }).org_id;
      return typeof orgId === "string" ? orgId : undefined;
    }
    return undefined;
  }

  if (projects && typeof projects === "object" && "org_id" in projects) {
    const orgId = (projects as { org_id?: unknown }).org_id;
    return typeof orgId === "string" ? orgId : undefined;
  }

  return undefined;
}

function buildTriagePrompt(issueGroup: TriageIssueGroup, findings: TriageFinding[]): string {
  const finding = findings[0];
  const allFiles = [...new Set(findings.map((f) => f.file_path))].join(", ");

  let prompt = `## Security Finding

- **Rule:** ${issueGroup.rule_id}
- **Category:** ${issueGroup.category || "Unknown"}
- **Severity:** ${issueGroup.severity || "Unknown"}
- **Occurrences:** ${findings.length} finding(s) across: ${allFiles}

### Description
${issueGroup.title || finding?.message || "No description available"}
`;

  if (finding?.snippet) {
    prompt += `\n### Code Snippet\n\`\`\`\n${finding.snippet}\n\`\`\`\n`;
  }

  if (finding?.taint_flow) {
    prompt += `\n### Data Flow\nSource → Sink taint flow detected\n`;
    if (finding.taint_flow.source) {
      prompt += `- Source: ${finding.taint_flow.source.file}:${finding.taint_flow.source.line}\n`;
    }
    if (finding.taint_flow.sink) {
      prompt += `- Sink: ${finding.taint_flow.sink.file}:${finding.taint_flow.sink.line}\n`;
    }
  }

  prompt += `\nProvide your triage assessment as JSON:`;
  return prompt;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  try {
    // Fetch issue group with project context
    const { data: group, error: groupErr } = await supabase
      .from("issue_groups")
      .select("id, rule_id, title, category, severity, status, project_id, projects(org_id)")
      .eq("id", id)
      .single();

    if (groupErr || !group) {
      return NextResponse.json({ error: "Issue group not found" }, { status: 404 });
    }

    const orgId = extractOrgId(group.projects);
    if (!orgId) {
      return NextResponse.json({ error: "Issue group is missing organization context" }, { status: 400 });
    }

    const auth = await requirePermission(supabase, "view:findings", orgId);
    if (isAuthError(auth)) return auth;

    // Plan gate: AI Triage requires Pro
    const { data: org } = await supabase
      .from("organizations")
      .select("plan, pro_expires_at")
      .eq("id", orgId)
      .single();
    const effectivePlan = getEffectivePlan({ plan: org?.plan || "free", pro_expires_at: org?.pro_expires_at });
    const planCheck = requirePlan(effectivePlan, "pro", "AI Issue Triage");
    if (!planCheck.ok) return planCheck.response;

    // Credit gate: 5 credits for LLM-powered triage
    const creditCheck = await requireCredits(supabase, orgId, effectivePlan, "ai_triage", { issue_group_id: id });
    if (!creditCheck.ok) return creditCheck.response;

    // Fetch findings for this issue group
    const { data: findings } = await fetchTriageFindings(
      supabase as unknown as TriageFindingsClient,
      id
    );

    if (!findings || findings.length === 0) {
      return NextResponse.json({ error: "No findings found for this issue group" }, { status: 404 });
    }

    // Call LLM for triage
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "AI triage is not configured. Contact support." }, { status: 503 });
    }

    const prompt = buildTriagePrompt(group, findings);

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: TRIAGE_SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
        temperature: 0.2,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      console.error("OpenAI API error:", response.status, await response.text());
      return NextResponse.json({ error: "AI triage failed. Please try again." }, { status: 502 });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();

    if (!content) {
      return NextResponse.json({ error: "AI returned empty response" }, { status: 502 });
    }

    // Parse JSON from LLM response (handle markdown code blocks)
    let triageResult;
    try {
      let jsonStr = content;
      if (jsonStr.startsWith("```")) {
        const firstNewline = jsonStr.indexOf("\n");
        jsonStr = jsonStr.slice(firstNewline + 1);
        if (jsonStr.endsWith("```")) {
          jsonStr = jsonStr.slice(0, -3).trimEnd();
        }
      }
      triageResult = JSON.parse(jsonStr);
    } catch {
      return NextResponse.json({ error: "AI returned invalid triage format" }, { status: 502 });
    }

    // Validate structure
    const validPriorities = ["P1", "P2", "P3", "P4"];
    if (!validPriorities.includes(triageResult.priority)) {
      triageResult.priority = "P3"; // safe default
    }

    return NextResponse.json({
      triage: {
        priority: triageResult.priority,
        impact: triageResult.impact || "Unable to assess impact",
        remediation: Array.isArray(triageResult.remediation) ? triageResult.remediation : [],
        effort_hours: typeof triageResult.effort_hours === "number" ? triageResult.effort_hours : null,
        reasoning: triageResult.reasoning || "",
      },
      issue_group_id: id,
    });
  } catch (err) {
    return serverError(err, "AI Triage");
  }
}
