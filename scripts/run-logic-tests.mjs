import { readdir, rm } from "node:fs/promises";
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

  const logicTestsDir = path.join(outDir, "tests/logic");
  const testFiles = await collectTestFiles(logicTestsDir);

  if (testFiles.length === 0) {
    console.error(`No compiled logic tests found in ${logicTestsDir}`);
    process.exit(1);
  }

  const run = spawnSync(
    process.execPath,
    ["--test", ...testFiles],
    {
      cwd,
      stdio: "inherit",
    }
  );

  process.exit(run.status ?? 1);
}

async function collectTestFiles(dir) {
  let entries = [];

  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return [];
    }
    throw error;
  }

  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectTestFiles(fullPath)));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".test.js")) {
      files.push(fullPath);
    }
  }

  return files.sort();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
