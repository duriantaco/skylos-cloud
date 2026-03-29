import assert from "node:assert/strict";
import {
  buildInviteUrl,
  getInvitationExpiryDate,
  getInvitationStatus,
  getInvitationStatusMessage,
  isInvitationExpired,
  normalizeInviteEmail,
  resolveInviteRole,
} from "../src/lib/team-invitations";

function run(): void {
  assert.equal(normalizeInviteEmail("  Founder@Skylos.dev "), "founder@skylos.dev");
  assert.equal(resolveInviteRole("admin"), "admin");
  assert.equal(resolveInviteRole("not-a-role"), "member");

  assert.equal(
    buildInviteUrl("https://skylos.dev/", "abc 123"),
    "https://skylos.dev/invite/abc%20123"
  );

  const futureExpiry = getInvitationExpiryDate();
  assert.equal(isInvitationExpired(futureExpiry), false);
  assert.equal(isInvitationExpired("2000-01-01T00:00:00.000Z"), true);

  assert.equal(
    getInvitationStatus({
      expires_at: futureExpiry,
      accepted_at: null,
      revoked_at: null,
    }),
    "pending"
  );
  assert.equal(
    getInvitationStatus({
      expires_at: futureExpiry,
      accepted_at: "2026-03-28T00:00:00.000Z",
      revoked_at: null,
    }),
    "accepted"
  );
  assert.equal(
    getInvitationStatus({
      expires_at: futureExpiry,
      accepted_at: null,
      revoked_at: "2026-03-28T00:00:00.000Z",
    }),
    "revoked"
  );
  assert.equal(
    getInvitationStatus({
      expires_at: "2000-01-01T00:00:00.000Z",
      accepted_at: null,
      revoked_at: null,
    }),
    "expired"
  );
  assert.equal(
    getInvitationStatusMessage("expired"),
    "This invitation has expired."
  );

  console.log("verify-team-invitations: ok");
}

run();
