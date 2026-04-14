import test from "node:test";
import assert from "node:assert/strict";
import {
  getEffectivePlan,
  hasActiveWorkspaceTrial,
  hasExpiredWorkspaceTrial,
  hasPermanentWorkspaceAccess,
} from "../../src/lib/entitlements";

test("getEffectivePlan keeps enterprise and permanent workspace access", () => {
  assert.equal(
    getEffectivePlan({ plan: "enterprise", pro_expires_at: "2000-01-01T00:00:00.000Z" }),
    "enterprise"
  );
  assert.equal(
    getEffectivePlan({ plan: "pro", pro_expires_at: null }),
    "pro"
  );
});

test("getEffectivePlan treats finite pro_expires_at as trial-only", () => {
  assert.equal(
    getEffectivePlan({ plan: "pro", pro_expires_at: "2999-01-01T00:00:00.000Z" }),
    "pro"
  );
  assert.equal(
    getEffectivePlan({ plan: "pro", pro_expires_at: "2000-01-01T00:00:00.000Z" }),
    "free"
  );
});

test("workspace access helpers distinguish permanent access from trials", () => {
  assert.equal(
    hasPermanentWorkspaceAccess({ plan: "pro", pro_expires_at: null }),
    true
  );
  assert.equal(
    hasActiveWorkspaceTrial({ plan: "pro", pro_expires_at: "2999-01-01T00:00:00.000Z" }),
    true
  );
  assert.equal(
    hasExpiredWorkspaceTrial({ plan: "pro", pro_expires_at: "2000-01-01T00:00:00.000Z" }),
    true
  );
});
