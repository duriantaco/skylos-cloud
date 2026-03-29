import test from "node:test";
import assert from "node:assert/strict";
import {
  decideInviteAcceptance,
  getInviteWorkspaceNotice,
} from "../../src/lib/invite-acceptance";

test("invite acceptance recognizes existing membership in target org", () => {
  const decision = decideInviteAcceptance({
    existingOrgIds: ["org-a", "org-b"],
    invitationOrgId: "org-b",
  });

  assert.deepEqual(decision, {
    mode: "already_member",
    activeOrgId: "org-b",
    shouldInsertMembership: false,
    redirectTo: "/dashboard/settings",
  });
});

test("invite acceptance allows joining a first organization", () => {
  const decision = decideInviteAcceptance({
    existingOrgIds: [],
    invitationOrgId: "org-b",
  });

  assert.deepEqual(decision, {
    mode: "join_org",
    activeOrgId: "org-b",
    shouldInsertMembership: true,
    redirectTo: "/dashboard/settings",
  });
});

test("invite acceptance allows joining an additional organization", () => {
  const decision = decideInviteAcceptance({
    existingOrgIds: ["org-a"],
    invitationOrgId: "org-b",
  });

  assert.equal(decision.mode, "join_org");
  assert.equal(decision.shouldInsertMembership, true);
  assert.equal(decision.activeOrgId, "org-b");
});

test("invite workspace notice distinguishes switching from joining another org", () => {
  assert.equal(
    getInviteWorkspaceNotice({
      existingOrgIds: ["org-a", "org-b"],
      invitationOrgId: "org-b",
    }),
    "already_member"
  );

  assert.equal(
    getInviteWorkspaceNotice({
      existingOrgIds: ["org-a"],
      invitationOrgId: "org-b",
    }),
    "joining_additional_org"
  );

  assert.equal(
    getInviteWorkspaceNotice({
      existingOrgIds: [],
      invitationOrgId: "org-b",
    }),
    null
  );
});
