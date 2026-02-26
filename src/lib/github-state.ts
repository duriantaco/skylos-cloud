import crypto from "crypto";

/**
 * HMAC-signs the GitHub App install state to prevent CSRF.
 * State format: projectId.timestamp.signature
 */

function getSecret(): string {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  return secret;
}

function sign(payload: string): string {
  return crypto
    .createHmac("sha256", getSecret())
    .update(payload)
    .digest("hex")
    .slice(0, 16);
}

export function createSignedState(projectId: string): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const payload = `${projectId}.${timestamp}`;
  const sig = sign(payload);
  return `${payload}.${sig}`;
}

/**
 * Verifies the HMAC signature and returns the projectId if valid.
 * Rejects tokens older than 10 minutes.
 */
export function verifySignedState(state: string): string | null {
  const parts = state.split(".");
  if (parts.length !== 3) return null;

  const [projectId, timestampStr, sig] = parts;
  const timestamp = parseInt(timestampStr, 10);
  if (isNaN(timestamp)) return null;

  // Reject if older than 10 minutes
  const now = Math.floor(Date.now() / 1000);
  if (now - timestamp > 600) return null;

  const payload = `${projectId}.${timestampStr}`;
  const expectedSig = sign(payload);

  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) {
      return null;
    }
  } catch {
    return null;
  }

  return projectId;
}
