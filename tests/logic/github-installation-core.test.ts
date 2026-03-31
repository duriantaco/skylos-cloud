import test from "node:test";
import assert from "node:assert/strict";
import {
  canAutoConfigureGitHubInstall,
  isGitHubAutoConfigureEnabled,
  mergeGitHubAutoConfigureSetting,
} from "../../src/lib/github-installation-core";

test("isGitHubAutoConfigureEnabled requires both env and project opt-in", () => {
  assert.equal(isGitHubAutoConfigureEnabled(null, false), false);
  assert.equal(isGitHubAutoConfigureEnabled(null, true), false);
  assert.equal(
    isGitHubAutoConfigureEnabled(
      { github_auto_configure_on_install: false },
      true
    ),
    false
  );
  assert.equal(
    isGitHubAutoConfigureEnabled(
      { github_auto_configure_on_install: true },
      true
    ),
    true
  );
});

test("mergeGitHubAutoConfigureSetting preserves other policy config", () => {
  assert.deepEqual(
    mergeGitHubAutoConfigureSetting(
      {
        gate: { enabled: true },
        exclude_paths: ["vendor"],
      },
      true
    ),
    {
      gate: { enabled: true },
      exclude_paths: ["vendor"],
      github_auto_configure_on_install: true,
    }
  );
});

test("canAutoConfigureGitHubInstall requires a paid effective plan", () => {
  assert.equal(
    canAutoConfigureGitHubInstall(
      { github_auto_configure_on_install: true },
      true,
      { plan: "free", pro_expires_at: null }
    ),
    false
  );

  assert.equal(
    canAutoConfigureGitHubInstall(
      { github_auto_configure_on_install: true },
      true,
      { plan: "pro", pro_expires_at: "2999-01-01T00:00:00.000Z" }
    ),
    true
  );

  assert.equal(
    canAutoConfigureGitHubInstall(
      { github_auto_configure_on_install: true },
      true,
      { plan: "pro", pro_expires_at: "2000-01-01T00:00:00.000Z" }
    ),
    false
  );
});
