import assert from "node:assert/strict";
import { pickActiveMembership, unwrapOrganization } from "../src/lib/active-org";

function run(): void {
  const memberships = [
    { org_id: "org-b", role: "member", organizations: [{ name: "Beta" }] },
    { org_id: "org-a", role: "owner", organizations: { name: "Alpha" } },
  ];

  assert.equal(pickActiveMembership(memberships)?.org_id, "org-a");
  assert.equal(
    pickActiveMembership(memberships, { preferredOrgId: "org-b" })?.org_id,
    "org-b"
  );
  assert.equal(
    pickActiveMembership(memberships, { requiredOrgId: "org-c" }),
    null
  );
  assert.equal(
    unwrapOrganization(memberships[0].organizations)?.name,
    "Beta"
  );
  assert.equal(
    unwrapOrganization(memberships[1].organizations)?.name,
    "Alpha"
  );

  console.log("verify-active-org: ok");
}

run();
