import type { Octokit } from "@octokit/rest";

const SKYLOS_MARKER = "<!-- SKYLOS_STICKY_COMMENT v1 -->";

export function buildSkylosCommentBody(opts: {
  title: string;
  summaryMd: string;
  scanUrl?: string;
  gatePassed: boolean;
  reasons?: string[];
  statsLine?: string;
}) {
  const { title, summaryMd, scanUrl, gatePassed, reasons, statsLine } = opts;

  const gate = gatePassed ? "✅ **Quality Gate: PASSED**" : "❌ **Quality Gate: FAILED**";
  const linkLine = scanUrl ? `\n\nView full report: ${scanUrl}` : "";
  const stats = statsLine ? `\n\n${statsLine}` : "";
  const reasonsMd =
    !gatePassed && reasons?.length
      ? `\n\n**Blocked because:**\n${reasons.map((r) => `- ${r}`).join("\n")}`
      : "";

  return [
    SKYLOS_MARKER,
    `## ${title}`,
    gate,
    stats,
    reasonsMd,
    "\n---\n",
    summaryMd,
    linkLine,
    "\n\n<sub>Skylos updates this single comment on every push to avoid spam.</sub>",
  ].join("\n");
}

async function findExistingSkylosComment(params: {
  octokit: Octokit;
  owner: string;
  repo: string;
  issueNumber: number;
}) {
  const { octokit, owner, repo, issueNumber } = params;

  const comments = await octokit.paginate(octokit.issues.listComments, {
    owner,
    repo,
    issue_number: issueNumber,
    per_page: 100,
  });

  const marked = comments.find((c) => (c.body || "").includes(SKYLOS_MARKER));
  if (marked) return marked;

  const fallback = comments.find((c) => {
    const body = c.body || "";
    const isBot = (c.user?.type || "").toLowerCase() === "bot";
    return isBot && body.includes("## Skylos");
  });

  return fallback ?? null;
}

export async function upsertSkylosPrComment(params: {
  octokit: Octokit;
  owner: string;
  repo: string;
  prNumber: number;
  body: string;
}) {
  const { octokit, owner, repo, prNumber, body } = params;

  const existing = await findExistingSkylosComment({
    octokit,
    owner,
    repo,
    issueNumber: prNumber,
  });

  if (existing) {
    const oldBody = existing.body || "";
    if (oldBody.trim() === body.trim()) {
      return { action: "noop", commentId: existing.id };
    }

    const updated = await octokit.issues.updateComment({
      owner,
      repo,
      comment_id: existing.id,
      body,
    });

    return { action: "updated", commentId: updated.data.id };
  }

  const created = await octokit.issues.createComment({
    owner,
    repo,
    issue_number: prNumber,
    body,
  });

  return { action: "created", commentId: created.data.id };
}
