import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const projectRoot = process.cwd();
const compiler = path.join(
  projectRoot,
  "node_modules",
  "typescript",
  "bin",
  "tsc",
);
export const requiredTypecheckShards = Object.freeze([
  "tsconfig.typecheck.product.json",
  "tsconfig.typecheck.scripts.json",
  "tsconfig.typecheck.tests-heavy.json",
  "tsconfig.typecheck.tests-rest.json",
]);

function runShard(project) {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    const child = spawn(
      process.execPath,
      [compiler, "--project", project, "--noEmit", "--pretty", "false",
        ...(process.argv.includes("--diagnostics") ? ["--extendedDiagnostics"] : [])],
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

// A single full compiler already approaches the host's measured free-memory
// window. Run complete coverage shards sequentially so the product, scripts
// and both test partitions are all checked without four TypeScript heaps
// competing and turning a type error into an OOM.
export async function runRequiredTypecheckShards(executeShard, reportResult = () => {}) {
  const results = [];
  let stoppedForHeapLimit = false;
  for (const project of requiredTypecheckShards) {
    const result = await executeShard(project);
    results.push(result);
    reportResult(result);
    if (result.exitCode !== 0 && /(?:heap out of memory|reached heap limit|allocation failed[^\n]*heap)/iu.test(`${result.stdout}${result.stderr}`)) {
      stoppedForHeapLimit = true;
      break;
    }
  }
  return { results, stoppedForHeapLimit, pendingProjects: requiredTypecheckShards.slice(results.length),
    green: results.length === requiredTypecheckShards.length && results.every(result => result.exitCode === 0) };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const startedAt = Date.now();
  const outcome = await runRequiredTypecheckShards(runShard, result => {
    const output = `${result.stdout}${result.stderr}`.trim();
    if (output) process.stderr.write(`${output}\n`);
    process.stdout.write(`[typecheck] ${result.project} exit=${result.exitCode} durationMs=${result.durationMs}\n`);
  });
  if (outcome.stoppedForHeapLimit) process.stderr.write(`[typecheck] stopped after heap limit; pending=${outcome.pendingProjects.join(",")}; resource diagnosis required before retry\n`);
  process.stdout.write(`[typecheck] shards=${outcome.results.length} requiredShards=${requiredTypecheckShards.length} totalDurationMs=${Date.now() - startedAt} status=${outcome.green ? "GREEN" : "RED"}\n`);
  if (!outcome.green) process.exitCode = 1;
}
