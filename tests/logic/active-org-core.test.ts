import test from "node:test";
import assert from "node:assert/strict";
import {
  getActiveOrgIdFromCookieValue,
  pickActiveMembership,
  unwrapOrganization,
} from "../../src/lib/active-org-core";

test("pickActiveMembership falls back to sorted first membership", () => {
  const memberships = [{ org_id: "org-b" }, { org_id: "org-a" }];

  assert.equal(pickActiveMembership(memberships)?.org_id, "org-a");
});

test("pickActiveMembership honors preferred org when it exists", () => {
  const memberships = [{ org_id: "org-b" }, { org_id: "org-a" }];

  assert.equal(
    pickActiveMembership(memberships, { preferredOrgId: "org-b" })?.org_id,
    "org-b"
  );
});

test("pickActiveMembership honors required org and rejects missing membership", () => {
  const memberships = [{ org_id: "org-b" }, { org_id: "org-a" }];

  assert.equal(
    pickActiveMembership(memberships, { requiredOrgId: "org-b" })?.org_id,
    "org-b"
  );
  assert.equal(
    pickActiveMembership(memberships, { requiredOrgId: "org-c" }),
    null
  );
});

test("unwrapOrganization supports singular and array relations", () => {
  assert.deepEqual(unwrapOrganization({ name: "Alpha" }), { name: "Alpha" });
  assert.deepEqual(unwrapOrganization([{ name: "Beta" }]), { name: "Beta" });
  assert.equal(unwrapOrganization(null), null);
});

test("getActiveOrgIdFromCookieValue normalizes empty cookie values", () => {
  assert.equal(getActiveOrgIdFromCookieValue("  org-123  "), "org-123");
  assert.equal(getActiveOrgIdFromCookieValue("   "), null);
  assert.equal(getActiveOrgIdFromCookieValue(undefined), null);
});
