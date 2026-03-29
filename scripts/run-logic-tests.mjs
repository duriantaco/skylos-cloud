import { rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import process from "node:process";

const cwd = process.cwd();
const outDir = path.join(os.tmpdir(), "skylos-cloud-logic-tests");

async function main() {
  await rm(outDir, { recursive: true, force: true });

  const compile = spawnSync(
    "npx",
    ["tsc", "-p", "tsconfig.logic-tests.json", "--outDir", outDir],
    {
      cwd,
      stdio: "inherit",
    }
  );

  if (compile.status !== 0) {
    process.exit(compile.status ?? 1);
  }

  const run = spawnSync(
    process.execPath,
    [
      "--test",
      path.join(outDir, "tests/logic/active-org-core.test.js"),
      path.join(outDir, "tests/logic/invite-acceptance.test.js"),
    ],
    {
      cwd,
      stdio: "inherit",
    }
  );

  process.exit(run.status ?? 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
