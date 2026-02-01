import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { Octokit } from "@octokit/rest";
import { serverError } from "@/lib/api-error";

export async function POST(request: Request) {
  const supabase = await createClient();
  
  try {
    const body = await request.json();
    const { sha, report, repo_owner, repo_name } = body;
    
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "No token" }, { status: 401 });
    }
    
    const token = authHeader.substring(7);
    
    const { data: project, error } = await supabase
      .from("projects")
      .select(`
        id,
        name,
        github_token,
        organizations (
          plan
        )
      `)
      .eq("api_key", token)
      .single();
    
    if (error || !project) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    
    const orgRef = project.organizations as any;
    const org = Array.isArray(orgRef) ? orgRef[0] : orgRef;
    const plan = String(org?.plan || 'free');
    
    const qualityGatePassed = checkQualityGate(report);
    
    let conclusion: "success" | "failure";
    let summary: string;
    
    if (plan === "free") {
      conclusion = "success";
      summary = `Quality Gate: ${qualityGatePassed ? "✅ PASSED" : "⚠️ FAILED (Info only - Upgrade to Pro to block)"}`;
    } else if (plan === "pro" || plan === "enterprise" || plan === "beta") {
      conclusion = qualityGatePassed ? "success" : "failure";
      summary = `Quality Gate: ${qualityGatePassed ? "✅ PASSED" : "❌ FAILED - Merge blocked"}`;
    } else {
      conclusion = "success";
      summary = "Unknown plan";
    }
    
    if (project.github_token) {
      const octokit = new Octokit({ auth: project.github_token });
      
      await octokit.checks.create({
        owner: repo_owner,
        repo: repo_name,
        name: "Skylos Quality Gate",
        head_sha: sha,
        status: "completed",
        conclusion: conclusion,
        output: {
          title: summary,
          summary: formatReport(report),
        },
      });
    }
    
    return NextResponse.json({
      conclusion,
      summary,
      plan,
      quality_gate_passed: qualityGatePassed,
    });
    
  } catch (error) {
    return serverError(error, "GitHub check");
  }
}

function checkQualityGate(report: any): boolean {
  const criticalCount = report.critical_issues?.length || 0;
  const highCount = report.high_issues?.length || 0;
  
  return criticalCount === 0 && highCount < 10;
}

function formatReport(report: any): string {
  const issues = [
    `Critical: ${report.critical_issues?.length || 0}`,
    `High: ${report.high_issues?.length || 0}`,
    `Medium: ${report.medium_issues?.length || 0}`,
  ].join("\n");
  
  return `## Scan Results\n\n${issues}`;
}