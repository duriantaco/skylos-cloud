import crypto from "crypto";

const API_KEY_PREFIX = "sk_live_";

export function generateApiKey(): { plain: string; hash: string } {
  const plain = API_KEY_PREFIX + crypto.randomBytes(24).toString("hex");
  const hash = hashApiKey(plain);
  return { plain, hash };
}

export function hashApiKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}