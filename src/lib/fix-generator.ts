export interface Finding {
  rule_id: string;
  message: string;
  line_number: number;
  severity: string;
  snippet?: string;
  category?: string;
}

export interface FixResult {
  fixedContent: string;
  explanation: string;
}

const SYSTEM_PROMPT = `You are a precise security and code quality fixer. Given a source file and a specific finding, return ONLY the fixed version of the entire file.

Rules:
- Make the MINIMAL change needed to resolve the issue
- Do NOT add comments explaining the fix
- Do NOT refactor surrounding code
- Do NOT change formatting or whitespace outside the fix
- Preserve all existing imports and structure
- Return the complete file content, not just the changed lines
- If you truly cannot fix the issue, respond with exactly: CANNOT_FIX`;

function buildFixPrompt(fileContent: string, finding: Finding): string {
  const lines = fileContent.split("\n");
  const targetLine = lines[finding.line_number - 1] || "";

  return `## Finding
- **Rule:** ${finding.rule_id}
- **Severity:** ${finding.severity}
- **Message:** ${finding.message}
- **Line ${finding.line_number}:** \`${targetLine.trim()}\`

## File Content
\`\`\`
${fileContent}
\`\`\`

Return the complete fixed file:`;
}

export async function generateFix(
  fileContent: string,
  finding: Finding
): Promise<FixResult | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("OPENAI_API_KEY not configured");
    return null;
  }

  const prompt = buildFixPrompt(fileContent, finding);

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      temperature: 0.1,
      max_tokens: 8192,
    }),
  });

  if (!response.ok) {
    console.error("OpenAI API error:", response.status, await response.text());
    return null;
  }

  const data = await response.json();
  let fixedContent = data.choices?.[0]?.message?.content?.trim();

  if (!fixedContent || fixedContent === "CANNOT_FIX") {
    return null;
  }

  if (fixedContent.startsWith("```")) {
    const firstNewline = fixedContent.indexOf("\n");
    fixedContent = fixedContent.slice(firstNewline + 1);
    if (fixedContent.endsWith("```")) {
      fixedContent = fixedContent.slice(0, -3).trimEnd();
    }
  }

  const originalLines = fileContent.split("\n");
  const fixedLines = fixedContent.split("\n");

  if (fixedContent === fileContent) {
    return null;
  }

  const ratio = fixedLines.length / Math.max(originalLines.length, 1);
  if (ratio < 0.5 || ratio > 2.0) {
    return null;
  }

  const targetIdx = finding.line_number - 1;
  const origLine = originalLines[targetIdx] || "";
  const fixedLine = fixedLines[targetIdx] || "";
  const explanation =
    origLine !== fixedLine
      ? `Changed line ${finding.line_number}: \`${origLine.trim()}\` → \`${fixedLine.trim()}\``
      : "Applied multi-line fix around the flagged area.";

  return { fixedContent, explanation };
}

export function generateDiffPreview(
  original: string,
  fixed: string,
  filePath: string,
  contextLines = 3
): string {
  const origLines = original.split("\n");
  const fixedLines = fixed.split("\n");

  const changes: { origStart: number; origEnd: number; fixStart: number; fixEnd: number }[] = [];
  let i = 0,
    j = 0;
  while (i < origLines.length || j < fixedLines.length) {
    if (i < origLines.length && j < fixedLines.length && origLines[i] === fixedLines[j]) {
      i++;
      j++;
    } else {
      const startI = i,
        startJ = j;
      while (i < origLines.length && (j >= fixedLines.length || origLines[i] !== fixedLines[j])) {
        i++;
      }
      while (j < fixedLines.length && (i >= origLines.length || origLines[i] !== fixedLines[j])) {
        j++;
      }
      changes.push({ origStart: startI, origEnd: i, fixStart: startJ, fixEnd: j });
    }
  }

  if (changes.length === 0) return "";

  let diff = `\`\`\`diff\n--- a/${filePath}\n+++ b/${filePath}\n`;

  for (const change of changes.slice(0, 5)) {
    const ctxStart = Math.max(0, change.origStart - contextLines);
    const ctxEnd = Math.min(origLines.length, change.origEnd + contextLines);

    diff += `@@ -${ctxStart + 1},${ctxEnd - ctxStart} @@\n`;

    for (let k = ctxStart; k < change.origStart; k++) {
      diff += ` ${origLines[k]}\n`;
    }
    for (let k = change.origStart; k < change.origEnd; k++) {
      diff += `-${origLines[k]}\n`;
    }
    for (let k = change.fixStart; k < change.fixEnd; k++) {
      diff += `+${fixedLines[k]}\n`;
    }
    for (let k = change.origEnd; k < ctxEnd; k++) {
      diff += ` ${origLines[k]}\n`;
    }
  }

  diff += "```";
  return diff;
}
