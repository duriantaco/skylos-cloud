import assert from "node:assert/strict";
import {
  hasPermission,
  ROLE_PERMISSIONS,
  type OrgRole,
} from "../src/lib/permission-matrix";

function run(): void {
  const roles: OrgRole[] = ["viewer", "member", "admin", "owner"];
  for (const role of roles) {
    assert.ok(ROLE_PERMISSIONS[role], `Missing permission set for ${role}`);
  }

  assert.equal(hasPermission("viewer", "view:projects"), true);
  assert.equal(hasPermission("viewer", "edit:projects"), false);
  assert.equal(hasPermission("member", "create:scans"), true);
  assert.equal(hasPermission("member", "manage:members"), false);
  assert.equal(hasPermission("admin", "manage:members"), true);
  assert.equal(hasPermission("admin", "manage:billing"), false);
  assert.equal(hasPermission("owner", "manage:billing"), true);
  assert.equal(hasPermission("owner", "manage:org"), true);

  console.log("verify-permission-matrix: ok");
}

run();
