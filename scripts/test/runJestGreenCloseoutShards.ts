import { spawnSync } from "node:child_process";

const args = [
  "tsx",
  "scripts/test/runJestCloseoutShards.ts",
  "--artifact-prefix",
  "S_RELEASE_PIPELINE",
  "--wave",
  "S_RELEASE_PIPELINE_NO_TIMEOUT_MOBILE_RUNTIME_CLOSEOUT",
  ...process.argv.slice(2),
];

const result = spawnSync("npx", args, {
  cwd: process.cwd(),
  encoding: "utf8",
  stdio: "inherit",
  shell: process.platform === "win32",
});

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

process.exit(result.status ?? 1);
