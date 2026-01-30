import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";


export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: finding, error } = await supabase
    .from("findings")
    .select(`
      id,
      rule_id,
      category,
      severity,
      message,
      file_path,
      line_number,
      snippet,
      taint_flow,
      scan_id,
      scans!inner (
        id,
        commit_hash,
        projects!inner (
          id,
          name,
          repo_url,
          org_id
        )
      )
    `)
    .eq("id", id)
    .single();

  if (error || !finding) {
    return NextResponse.json({ error: "Finding not found" }, { status: 404 });
  }

  const orgId = (finding.scans as any)?.projects?.org_id;
  const { data: member } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("user_id", user.id)
    .eq("org_id", orgId)
    .single();

  if (!member) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  
  const flowData = finding.taint_flow || generateFallbackFlow(finding);

  const repoUrl = (finding.scans as any)?.projects?.repo_url || "";
  const commitHash = (finding.scans as any)?.commit_hash || "";

  return NextResponse.json({
    finding_id: finding.id,
    rule_id: finding.rule_id,
    title: finding.message,
    severity: finding.severity,
    confidence: flowData?.confidence || "MEDIUM",
    category: finding.category,
    file: finding.file_path,
    line: finding.line_number,
    
    source: flowData?.source || null,
    transforms: flowData?.transforms || [],
    sink: flowData?.sink || null,
    
    attack_example: flowData?.attack_example || null,
    fix_suggestion: flowData?.fix_suggestion || null,
    
    snippet: finding.snippet,
    
    repo_url: repoUrl,
    commit_hash: commitHash,
    
    has_flow_data: !!finding.taint_flow,
  });
}

function generateFallbackFlow(finding: any) {
  const ruleId = String(finding.rule_id || "").toUpperCase();
  const category = String(finding.category || "").toUpperCase();
  
  const flowTemplates: Record<string, any> = {
    "SKY-D201": {
      confidence: "HIGH",
      source: {
        type: "user_input",
        label: "User Input",
        file: finding.file_path,
        line: finding.line_number,
        code: finding.snippet || "# User input source",
        annotation: "Untrusted data enters the application here"
      },
      sink: {
        type: "sql_execute",
        label: "SQL Query Execution",
        file: finding.file_path,
        line: finding.line_number,
        code: finding.snippet || "cursor.execute(query)",
        annotation: "Tainted data used in database query",
        vulnerability: "Attacker could inject malicious SQL commands"
      },
      fix_suggestion: {
        title: "Use Parameterized Queries",
        code: 'cursor.execute("SELECT * FROM table WHERE id = %s", (user_input,))',
        explanation: "Parameterized queries separate SQL code from data, preventing injection."
      }
    },
    
    "SKY-D210": {
      confidence: "HIGH",
      source: {
        type: "user_input",
        label: "User Input",
        file: finding.file_path,
        line: finding.line_number,
        code: finding.snippet || "# User input",
        annotation: "Untrusted data enters here"
      },
      sink: {
        type: "command_exec",
        label: "Shell Command Execution",
        file: finding.file_path,
        line: finding.line_number,
        code: finding.snippet || "os.system(cmd)",
        annotation: "Tainted data passed to shell",
        vulnerability: "Attacker could execute arbitrary system commands"
      },
      fix_suggestion: {
        title: "Use subprocess with shell=False",
        code: 'subprocess.run(["cmd", arg1, arg2], shell=False)',
        explanation: "Avoid shell=True and pass arguments as a list to prevent injection."
      }
    },
    
    "SKY-D226": {
      confidence: "HIGH",
      source: {
        type: "user_input",
        label: "User Input",
        file: finding.file_path,
        line: finding.line_number,
        code: finding.snippet || "# User input",
        annotation: "Untrusted content enters here"
      },
      sink: {
        type: "html_output",
        label: "HTML Output",
        file: finding.file_path,
        line: finding.line_number,
        code: finding.snippet || "Markup(user_content)",
        annotation: "Unescaped content rendered as HTML",
        vulnerability: "Attacker could inject malicious scripts"
      },
      fix_suggestion: {
        title: "Escape User Content",
        code: 'from markupsafe import escape\nMarkup(escape(user_content))',
        explanation: "Always escape user content before marking it safe for HTML rendering."
      }
    },
    
    "SKY-S101": {
      confidence: "HIGH",
      source: {
        type: "hardcoded",
        label: "Hardcoded Value",
        file: finding.file_path,
        line: finding.line_number,
        code: finding.snippet || 'API_KEY = "sk-..."',
        annotation: "Secret value hardcoded in source"
      },
      sink: {
        type: "exposure",
        label: "Potential Exposure",
        file: finding.file_path,
        line: finding.line_number,
        code: finding.snippet || "# Secret in code",
        annotation: "Secret could be exposed via version control",
        vulnerability: "Credentials visible in repository history"
      },
      fix_suggestion: {
        title: "Use Environment Variables",
        code: 'import os\nAPI_KEY = os.environ.get("API_KEY")',
        explanation: "Store secrets in environment variables or a secrets manager, never in code."
      }
    }
  };

  if (flowTemplates[ruleId]) {
    return flowTemplates[ruleId];
  }

  if (category === "SECURITY" || category === "SECRET") {
    return {
      confidence: "LOW",
      source: {
        type: "unknown",
        label: "Potential Source",
        file: finding.file_path,
        line: finding.line_number,
        code: finding.snippet || "# Source location",
        annotation: "Security issue detected at this location"
      },
      sink: {
        type: "unknown", 
        label: "Security Sink",
        file: finding.file_path,
        line: finding.line_number,
        code: finding.snippet || "# Issue location",
        annotation: finding.message,
        vulnerability: "See finding details for more information"
      }
    };
  }

  return null;
}