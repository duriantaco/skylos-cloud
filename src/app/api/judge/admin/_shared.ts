import crypto from "node:crypto";
import { NextResponse } from "next/server";

function timingSafeMatch(actual: string, expected: string): boolean {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);

  if (actualBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(actualBuffer, expectedBuffer);
}

export function requireJudgeAdmin(request: Request): NextResponse | null {
  const configuredToken = process.env.JUDGE_ADMIN_TOKEN;
  if (!configuredToken) {
    return NextResponse.json(
      { error: "JUDGE_ADMIN_TOKEN is not configured" },
      { status: 500 }
    );
  }

  const headerToken =
    request.headers.get("x-judge-admin-token") ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() ||
    "";

  if (!headerToken || !timingSafeMatch(headerToken, configuredToken)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
