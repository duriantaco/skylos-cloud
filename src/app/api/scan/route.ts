import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { mkdtemp, rm } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";

const execAsync = promisify(exec);

// ---------------------------------------------------------------------------
// Rate limiting (in-memory, resets on deploy)
// ---------------------------------------------------------------------------
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour

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

  entry.count++;
  return true;
}

// Periodically clean up old entries to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap) {
    if (now > entry.resetAt) rateLimitMap.delete(ip);
  }
}, 10 * 60 * 1000); // every 10 minutes

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------
const GITHUB_URL_REGEX = /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/?$/;

function parseRepoUrl(url: string): { owner: string; repo: string } | null {
  try {
    const u = new URL(url);
    if (u.hostname !== "github.com") return null;
    const parts = u.pathname.replace(/\/+$/, "").split("/").filter(Boolean);
    if (parts.length < 2) return null;
    // Only allow alphanumeric, hyphens, underscores, dots
    const owner = parts[0];
    const repo = parts[1].replace(/\.git$/, "");
    if (!/^[\w.-]+$/.test(owner) || !/^[\w.-]+$/.test(repo)) return null;
    return { owner, repo };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Risk score computation
// ---------------------------------------------------------------------------
type SeverityKey = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

function computeRiskScore(severityCounts: Record<SeverityKey, number>): {
  score: number;
  riskLevel: string;
} {
  let score = 0;
  score += (severityCounts.CRITICAL || 0) * 10;
  score += (severityCounts.HIGH || 0) * 5;
  score += (severityCounts.MEDIUM || 0) * 2;
  score += (severityCounts.LOW || 0) * 1;
  score = Math.min(score, 100);

  let riskLevel: string;
  if (score <= 25) riskLevel = "Low Risk";
  else if (score <= 50) riskLevel = "Moderate Risk";
  else if (score <= 75) riskLevel = "High Risk";
  else riskLevel = "Critical Risk";

  return { score, riskLevel };
}

// ---------------------------------------------------------------------------
// POST /api/scan
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  // Rate limiting
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Please try again later (max 10 scans per hour)." },
      { status: 429 }
    );
  }

  // Parse body
  let body: { url?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const url = body.url?.trim();
  if (!url) {
    return NextResponse.json({ error: "GitHub repo URL is required." }, { status: 400 });
  }

  // Validate URL
  const parsed = parseRepoUrl(url);
  if (!parsed) {
    return NextResponse.json(
      { error: "Invalid URL. Please provide a valid GitHub repository URL (e.g., https://github.com/user/repo)." },
      { status: 400 }
    );
  }

  const cloneUrl = `https://github.com/${parsed.owner}/${parsed.repo}.git`;
  const repoName = `${parsed.owner}/${parsed.repo}`;
  let tmpDir: string | null = null;

  try {
    // Create temp directory
    tmpDir = await mkdtemp(join(tmpdir(), "skylos-scan-"));

    // Shallow clone with timeout (30s)
    try {
      await execAsync(`git clone --depth 1 --single-branch "${cloneUrl}" "${tmpDir}/repo"`, {
        timeout: 30000,
        env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
      });
    } catch (cloneErr: unknown) {
      const msg = cloneErr instanceof Error ? cloneErr.message : String(cloneErr);
      if (msg.includes("timeout") || msg.includes("TIMEOUT")) {
        return NextResponse.json(
          { error: "Repository is too large or clone timed out. Try a smaller repo." },
          { status: 408 }
        );
      }
      if (msg.includes("not found") || msg.includes("Repository") || msg.includes("128")) {
        return NextResponse.json(
          { error: "Repository not found. Make sure it exists and is public." },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: "Failed to clone repository. Make sure it's a public GitHub repo." },
        { status: 400 }
      );
    }

    // Run skylos with timeout (60s)
    let stdout: string;
    try {
      const result = await execAsync(
        `python3 -m skylos "${tmpDir}/repo" --json -a --danger --quality --secrets`,
        {
          timeout: 60000,
          maxBuffer: 10 * 1024 * 1024, // 10MB
        }
      );
      stdout = result.stdout;
    } catch (scanErr: unknown) {
      const msg = scanErr instanceof Error ? scanErr.message : String(scanErr);
      if (msg.includes("timeout") || msg.includes("TIMEOUT")) {
        return NextResponse.json(
          { error: "Scan timed out. The repository may be too large." },
          { status: 408 }
        );
      }
      // skylos may exit non-zero but still produce output
      const errObj = scanErr as { stdout?: string };
      if (errObj.stdout) {
        stdout = errObj.stdout;
      } else {
        return NextResponse.json(
          { error: "Scan failed. The repository may not contain Python code." },
          { status: 500 }
        );
      }
    }

    // Parse JSON output
    let scanData: { findings?: Array<{ severity?: string; category?: string; message?: string; file_path?: string; line_number?: number; rule_id?: string }> };
    try {
      scanData = JSON.parse(stdout);
    } catch {
      return NextResponse.json(
        { error: "Failed to parse scan results." },
        { status: 500 }
      );
    }

    const findings = scanData.findings || [];

    // Compute severity counts
    const severityCounts: Record<SeverityKey, number> = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
    const categoryCounts: Record<string, number> = {};

    for (const f of findings) {
      const sev = (f.severity || "LOW").toUpperCase() as SeverityKey;
      if (sev in severityCounts) {
        severityCounts[sev]++;
      } else {
        severityCounts.LOW++;
      }

      const cat = f.category || "UNCATEGORIZED";
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    }

    const { score, riskLevel } = computeRiskScore(severityCounts);

    // Top 10 findings (sorted by severity)
    const sevOrder: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    const topFindings = [...findings]
      .sort((a, b) => {
        const aOrder = sevOrder[(a.severity || "LOW").toUpperCase()] ?? 4;
        const bOrder = sevOrder[(b.severity || "LOW").toUpperCase()] ?? 4;
        return aOrder - bOrder;
      })
      .slice(0, 10)
      .map((f) => ({
        severity: f.severity || "LOW",
        category: f.category || "UNCATEGORIZED",
        message: f.message || "",
        file_path: f.file_path || "",
        line_number: f.line_number || 0,
        rule_id: f.rule_id || "",
      }));

    return NextResponse.json({
      score,
      riskLevel,
      totalFindings: findings.length,
      severityCounts,
      categoryCounts,
      topFindings,
      repoUrl: `https://github.com/${repoName}`,
      repoName,
    });
  } catch (err: unknown) {
    console.error("Scan error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  } finally {
    // Clean up temp dir
    if (tmpDir) {
      rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    }
  }
}
