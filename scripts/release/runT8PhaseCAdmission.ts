import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import {
  T8_PHASE_C_ADMISSION_SUITES,
  T8_PHASE_C_MIN_SUITES,
  T8_PHASE_C_MIN_TESTS,
} from "./t8PhaseCAdmissionManifest";

type JestTerminalResult = {
  success: boolean;
  numTotalTestSuites: number;
  numPassedTestSuites: number;
  numFailedTestSuites: number;
  numTotalTests: number;
  numPassedTests: number;
  numFailedTests: number;
  numPendingTests: number;
  numTodoTests: number;
  runWasInterrupted?: boolean;
};

function gitOutput(args: string[]): string {
  return execFileSync("git", args, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  }).trim();
}

function sha256File(filePath: string): string {
  return createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

const sourceSha = gitOutput(["rev-parse", "HEAD"]);
const sourceTreeStatusBefore = gitOutput(["status", "--porcelain"]);
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const outputDir = path.resolve(".release-runtime", sourceSha, "t8-phase-c", stamp);
const resultPath = path.join(outputDir, "result.json");
const stdoutPath = path.join(outputDir, "stdout.log");
const stderrPath = path.join(outputDir, "stderr.log");
const summaryPath = path.join(outputDir, "summary.json");
fs.mkdirSync(outputDir, { recursive: true });

const jestBin = path.resolve("node_modules", "jest", "bin", "jest.js");
const run = spawnSync(process.execPath, [
  jestBin,
  "--runInBand",
  "--no-cache",
  "--detectOpenHandles",
  "--runTestsByPath",
  ...T8_PHASE_C_ADMISSION_SUITES,
  "--json",
  `--outputFile=${resultPath}`,
], {
  cwd: process.cwd(),
  encoding: "utf8",
  env: process.env,
  maxBuffer: 256 * 1024 * 1024,
  timeout: 30 * 60 * 1000,
});

fs.writeFileSync(stdoutPath, run.stdout ?? "", "utf8");
fs.writeFileSync(stderrPath, run.stderr ?? "", "utf8");

let result: JestTerminalResult | null = null;
try {
  result = JSON.parse(fs.readFileSync(resultPath, "utf8")) as JestTerminalResult;
} catch {
  result = null;
}
const openHandlesDetected = /Jest has detected the following \d+ open handle|did not exit one second after/i.test(
  `${run.stdout ?? ""}\n${run.stderr ?? ""}`,
);
const green = Boolean(
  run.status === 0 &&
  result?.success === true &&
  result.numTotalTestSuites >= T8_PHASE_C_MIN_SUITES &&
  result.numPassedTestSuites === result.numTotalTestSuites &&
  result.numFailedTestSuites === 0 &&
  result.numTotalTests >= T8_PHASE_C_MIN_TESTS &&
  result.numPassedTests === result.numTotalTests &&
  result.numFailedTests === 0 &&
  result.numPendingTests === 0 &&
  result.numTodoTests === 0 &&
  result.runWasInterrupted !== true &&
  !openHandlesDetected
);
const summary = {
  schema: "t8-phase-c-admission:v1",
  final_status: green ? "GREEN_T8_PHASE_C_ADMISSION" : "STOP_T8_PHASE_C_ADMISSION",
  generated_at: new Date().toISOString(),
  source_sha: sourceSha,
  source_tree_clean: sourceTreeStatusBefore.length === 0,
  source_tree_status: sourceTreeStatusBefore,
  exit_code: run.status,
  signal: run.signal,
  terminal_json_present: result !== null,
  suites_expected_minimum: T8_PHASE_C_MIN_SUITES,
  tests_expected_minimum: T8_PHASE_C_MIN_TESTS,
  suites_total: result?.numTotalTestSuites ?? 0,
  suites_passed: result?.numPassedTestSuites ?? 0,
  suites_failed: result?.numFailedTestSuites ?? 0,
  tests_total: result?.numTotalTests ?? 0,
  tests_passed: result?.numPassedTests ?? 0,
  tests_failed: result?.numFailedTests ?? 0,
  pending: result?.numPendingTests ?? 0,
  todo: result?.numTodoTests ?? 0,
  interrupted: result?.runWasInterrupted === true,
  open_handles_detected: openHandlesDetected,
  result_path: resultPath,
  stdout_path: stdoutPath,
  stderr_path: stderrPath,
  result_sha256: fs.existsSync(resultPath) ? sha256File(resultPath) : null,
  stdout_sha256: sha256File(stdoutPath),
  stderr_sha256: sha256File(stderrPath),
  admission_suites_sha256: createHash("sha256")
    .update(`${T8_PHASE_C_ADMISSION_SUITES.join("\n")}\n`)
    .digest("hex"),
  fake_green_claimed: false,
};
fs.writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
console.info(JSON.stringify({ ...summary, summary_path: summaryPath }, null, 2));
if (!green) process.exitCode = 1;
