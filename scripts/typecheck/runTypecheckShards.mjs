import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";

const projectRoot = process.cwd();
const compiler = path.join(
  projectRoot,
  "node_modules",
  "typescript",
  "bin",
  "tsc",
);
const shards = [
  "tsconfig.typecheck.product.json",
  "tsconfig.typecheck.scripts.json",
  "tsconfig.typecheck.tests-heavy.json",
  "tsconfig.typecheck.tests-rest.json",
];

function runShard(project) {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    const child = spawn(
      process.execPath,
      [compiler, "--project", project, "--noEmit", "--pretty", "false"],
      {
        cwd: projectRoot,
        env: process.env,
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
      },
    );
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", (error) => {
      resolve({
        project,
        exitCode: 1,
        durationMs: Date.now() - startedAt,
        stdout,
        stderr: `${stderr}${error instanceof Error ? error.message : String(error)}`,
      });
    });
    child.on("close", (exitCode) => {
      resolve({
        project,
        exitCode: exitCode ?? 1,
        durationMs: Date.now() - startedAt,
        stdout,
        stderr,
      });
    });
  });
}

const startedAt = Date.now();
const results = await Promise.all(shards.map(runShard));
for (const result of results) {
  const output = `${result.stdout}${result.stderr}`.trim();
  if (output) process.stderr.write(`${output}\n`);
  process.stdout.write(
    `[typecheck] ${result.project} exit=${result.exitCode} durationMs=${result.durationMs}\n`,
  );
}
const failed = results.filter((result) => result.exitCode !== 0);
process.stdout.write(
  `[typecheck] shards=${results.length} totalDurationMs=${Date.now() - startedAt} status=${failed.length === 0 ? "GREEN" : "RED"}\n`,
);
if (failed.length > 0) process.exitCode = 1;
