const { spawnSync } = require("node:child_process");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const scriptPath = path.join(projectRoot, "scripts", "release", "run-release-guard.ts");

const result = spawnSync(
  "npx",
  ["tsx", scriptPath, "preflight", ...process.argv.slice(2)],
  {
    cwd: projectRoot,
    stdio: "inherit",
    shell: process.platform === "win32",
  },
);

process.exit(result.status ?? 1);
