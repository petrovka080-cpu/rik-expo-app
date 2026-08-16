import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { assertExact, atomicWrite, command, projectRoot, runtimeRoot, sha256, writeJson } from "./support";

type JestResult = {
  success?: boolean;
  numTotalTests?: number;
  numPassedTests?: number;
  numFailedTests?: number;
  numPendingTests?: number;
  numRuntimeErrorTestSuites?: number;
  numTotalTestSuites?: number;
  numPassedTestSuites?: number;
  numFailedTestSuites?: number;
  testResults?: Array<{ name?: string; status?: string }>;
};

function argument(name: string): string {
  const prefix = `--${name}=`;
  const value = process.argv.find((item) => item.startsWith(prefix))?.slice(prefix.length);
  assertExact(value, `CONCRETE_IMPACTED_ARGUMENT_MISSING:${name}`);
  return resolve(value);
}

let focusedPath: string;
let typecheckPath: string;
if (process.argv.includes("--run")) {
  const runRoot = join(runtimeRoot, "preflight-runtime");
  typecheckPath = join(runRoot, "typecheck.log");
  focusedPath = join(runRoot, "focused-jest.json");
  const typecheck = command(process.execPath, [join(projectRoot, "scripts", "typecheck", "runTypecheckShards.mjs")], { timeout: 30 * 60_000 });
  atomicWrite(typecheckPath, `${typecheck.stdout}${typecheck.stderr}`);
  assertExact(typecheck.exitCode === 0, `CONCRETE_TYPECHECK_COMMAND_RED:${typecheck.exitCode}`);
  const focused = command(process.execPath, [
    join(projectRoot, "node_modules", "jest", "bin", "jest.js"),
    "tests/estimateBackend/concreteR5.contract.test.ts",
    "tests/estimateBackend/hvacR4ActivationMigration.contract.test.ts",
    "tests/estimateBackend/inclusionGraph.contract.test.ts",
    "tests/estimateBackend/waterBackendR6A2.contract.test.ts",
    "tests/estimateBackend/canonicalBackendR3.contract.test.ts",
    "--runInBand",
    "--json",
    `--outputFile=${focusedPath}`,
  ], { timeout: 30 * 60_000 });
  atomicWrite(join(runRoot, "focused-jest.log"), `${focused.stdout}${focused.stderr}`);
  assertExact(focused.exitCode === 0, `CONCRETE_FOCUSED_JEST_COMMAND_RED:${focused.exitCode}`);
} else {
  focusedPath = argument("focused-json");
  typecheckPath = argument("typecheck-log");
}
assertExact(existsSync(focusedPath), "CONCRETE_FOCUSED_JEST_RESULT_MISSING");
assertExact(existsSync(typecheckPath), "CONCRETE_TYPECHECK_LOG_MISSING");

const focusedBytes = readFileSync(focusedPath);
const typecheckBytes = readFileSync(typecheckPath);
const focused = JSON.parse(focusedBytes.toString("utf8")) as JestResult;
const selected = Number(focused.numTotalTests ?? 0);
const passed = Number(focused.numPassedTests ?? 0);
const failed = Number(focused.numFailedTests ?? 0);
const skipped = Number(focused.numPendingTests ?? 0);
const runtimeErrors = Number(focused.numRuntimeErrorTestSuites ?? 0);
const suites = Number(focused.numTotalTestSuites ?? 0);
const passedSuites = Number(focused.numPassedTestSuites ?? 0);
const failedSuites = Number(focused.numFailedTestSuites ?? 0);
const typecheckText = typecheckBytes.toString("utf8");

assertExact(
  focused.success === true &&
    selected > 0 &&
    passed === selected &&
    failed === 0 &&
    skipped === 0 &&
    runtimeErrors === 0 &&
    suites > 0 &&
    passedSuites === suites &&
    failedSuites === 0,
  "CONCRETE_FOCUSED_JEST_RED",
);
assertExact(!/error TS\d+:/u.test(typecheckText), "CONCRETE_TYPECHECK_RED");

const report = {
  schemaVersion: "batch008-concrete-r5-impacted-tests.v1",
  typecheck: {
    command: "npm run verify:typecheck",
    exitCode: 0,
    logBytes: typecheckBytes.length,
    logSha256: sha256(typecheckBytes),
    status: "GREEN",
  },
  focusedJest: {
    suites,
    passedSuites,
    failedSuites,
    selected,
    passed,
    failed,
    skipped,
    runtimeErrors,
    resultSha256: sha256(focusedBytes),
    files: (focused.testResults ?? []).map((row) => row.name).filter(Boolean).sort(),
    status: "GREEN",
  },
  selected,
  passed,
  failed,
  skipped,
  timeouts: 0,
  fullJest: "DEFERRED_BY_OPERATOR_NOT_RUN",
  repositoryWideGreen: false,
  status: "GREEN",
};

writeJson("00-preflight/IMPACTED_TEST_MATRIX.json", report);
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
