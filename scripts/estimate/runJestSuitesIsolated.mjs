import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";

const SUITE_TIMEOUT_MS = 700_000;
const suites = process.argv.slice(2);

if (suites.length === 0 || suites.some((suite) => !/\.contract\.test\.tsx?$/u.test(suite))) {
  process.stderr.write("ISOLATED_JEST_SUITE_LIST_INVALID\n");
  process.exit(2);
}

const results = [];
for (const suite of suites) {
  const startedAt = new Date();
  process.stdout.write(`[isolated-jest] suite=${suite} status=STARTED timeoutMs=${SUITE_TIMEOUT_MS}\n`);
  const result = spawnSync(
    process.execPath,
    [path.join("node_modules", "jest", "bin", "jest.js"), "--runInBand", "--runTestsByPath", suite],
    {
      cwd: process.cwd(),
      env: process.env,
      stdio: "inherit",
      timeout: SUITE_TIMEOUT_MS,
      windowsHide: true,
    },
  );
  const timedOut = result.error?.code === "ETIMEDOUT";
  const exitCode = timedOut ? 124 : result.status ?? 1;
  const summary = {
    suite,
    startedAt: startedAt.toISOString(),
    finishedAt: new Date().toISOString(),
    durationMs: Date.now() - startedAt.getTime(),
    exitCode,
    signal: result.signal,
    timedOut,
  };
  results.push(summary);
  process.stdout.write(`[isolated-jest] suite=${suite} status=${exitCode === 0 ? "GREEN" : timedOut ? "TIMEOUT" : "RED"} exitCode=${exitCode} durationMs=${summary.durationMs}\n`);
}

const green = results.length === suites.length && results.every((result) => result.exitCode === 0);
process.stdout.write(`${JSON.stringify({
  schemaVersion: "p0-one-monolith-r5.8-isolated-jest-suite-summary.v1",
  suiteTimeoutMs: SUITE_TIMEOUT_MS,
  suitesDiscovered: suites.length,
  suitesExecutedOnce: results.length,
  suitesPassed: results.filter((result) => result.exitCode === 0).length,
  suitesFailed: results.filter((result) => result.exitCode !== 0).length,
  results,
  status: green ? "GREEN_ISOLATED_JEST_SUITES" : "RED_ISOLATED_JEST_SUITES",
}, null, 2)}\n`);
if (!green) process.exitCode = 1;
