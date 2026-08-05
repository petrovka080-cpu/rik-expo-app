import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { T8_PHASE_C_PRIMARY_ROOT_CAUSE_SUITES } from "./t8PhaseCAdmissionManifest";

type BaselineRootCause = {
  root_cause_id: string;
  category: "PRODUCT" | "EVIDENCE" | "TEST_BASELINE" | "INFRA";
  locations: string[];
  cause: string;
  fix: string;
  regression: string;
  dependent_suites: string[];
  status: string;
};

type BaselineEntry = {
  suite: string;
  failing_tests: { name: string; expected_actual: string }[];
  reproduce: string;
  root_cause_id: string;
  category: string;
};

type BaselineLedger = {
  schema: string;
  run: {
    source_commit: string;
    numFailedTestSuites: number;
    numFailedTests: number;
  };
  root_causes: BaselineRootCause[];
  entries: BaselineEntry[];
};

type JestAssertionResult = {
  fullName?: string;
  status?: string;
};

type JestSuiteResult = {
  name: string;
  status: string;
  assertionResults?: JestAssertionResult[];
};

type JestResult = {
  success: boolean;
  numTotalTestSuites: number;
  numPassedTestSuites: number;
  numFailedTestSuites: number;
  numFailedTests: number;
  numPendingTests: number;
  numTodoTests: number;
  runWasInterrupted?: boolean;
  testResults: JestSuiteResult[];
};

const PRODUCTION_OWNERS: Readonly<Record<string, string>> = Object.freeze({
  ROUTE_ADMIN_INVENTORY: "scripts/scale/canonicalAppRouteInventory.ts",
  REVISION_IDEMPOTENCY: "src/lib/consumerRequests/consumerRequestEditableEstimateSnapshot.ts",
  CONSOLE_GOVERNANCE: "src/lib/observability/logger.ts",
  EXTENDED_CANONICAL_PACK: "src/lib/estimate/professionalUnitRegistry.ts",
  TRANSPORT_MAP_DRIFT: "scripts/architecture/scanTransportOwnership.ts",
  FLATLIST_STALE_PROOF: "src/features/ai/AIAssistantMessageList.tsx",
  CATALOG_DEBOUNCE: "src/features/catalog/CatalogItemPicker.tsx",
  OFFICE_FACADE_BUDGET: "src/screens/office/officeHub.directionSections.tsx",
  ROUTE_ESTIMATE_BOUNDARY: "src/lib/consumerRequests/consumerRequestEstimateApplicationService.ts",
  TIMER_OWNER: "src/features/consumerRepair/ConsumerRepairRequestScreen.tsx",
  CENTRAL_JSON_PARSE: "src/lib/format.ts",
  REALTIME_OWNER_CLASSIFICATION: "scripts/scale/verifyRealtimeManagerEnforcement.ts",
  PDF_VISUAL_EVIDENCE: "scripts/e2e/runAiEstimate11610PdfVisualProof.ts",
  REAL10000_UNIT_NORMALIZATION: "src/lib/estimate/professionalUnitRegistry.ts",
  CONSUMER_FEATURE_BOUNDARY: "src/lib/consumerRequests/consumerRequestService.ts",
  CONSUMER_MOJIBAKE: "src/lib/text/encoding.ts",
  SEMANTIC_AI_FRAMEWORK_SCANNER:
    "tests/architecture/consumerRepairNoSecondAiFramework.contract.test.ts",
  CONSUMER_APPLICATION_SERVICE:
    "src/lib/consumerRequests/consumerRequestEstimateApplicationService.ts",
  PDF_INTERNAL_KEY: "src/lib/consumerRequests/consumerRequestPdfService.ts",
  AI_CHAT_RUNTIME: "src/features/ai/AIAssistantReadyProductPanels.tsx",
});

function arg(name: string): string {
  const prefix = `--${name}=`;
  const value = process.argv.find((item) => item.startsWith(prefix))?.slice(prefix.length);
  if (!value) throw new Error(`Missing required ${prefix}<path> argument`);
  return path.resolve(value);
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

function sha256(value: Buffer | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function sha256File(filePath: string): string {
  return sha256(fs.readFileSync(filePath));
}

function normalizePath(value: string): string {
  return value.replace(/\\/g, "/").toLowerCase();
}

function findSuite(result: JestResult, suitePath: string): JestSuiteResult | null {
  const suffix = normalizePath(suitePath);
  return result.testResults.find((item) => normalizePath(item.name).endsWith(suffix)) ?? null;
}

function gitOutput(args: string[]): string {
  return execFileSync("git", args, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  }).trim();
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const baselineLedgerPath = arg("baseline-ledger");
const originalResultPath = arg("original-result");
const phaseCResultPath = arg("phase-c-result");
const phaseCSummaryPath = arg("phase-c-summary");
const outputDir = arg("output-dir");

const baseline = readJson<BaselineLedger>(baselineLedgerPath);
const original = readJson<JestResult>(originalResultPath);
const phaseC = readJson<JestResult>(phaseCResultPath);
const phaseCSummary = readJson<{
  final_status: string;
  source_sha: string;
  source_tree_clean: boolean;
}>(phaseCSummaryPath);
const commitSha = gitOutput(["rev-parse", "HEAD"]);
const sourceTreeStatus = gitOutput(["status", "--porcelain"]);

assert(commitSha.length === 40, "Candidate commit SHA is not exact");
assert(sourceTreeStatus.length === 0, `Candidate source tree is not clean:\n${sourceTreeStatus}`);
assert(baseline.run.numFailedTestSuites === 47, "Baseline failed suite count drifted");
assert(baseline.run.numFailedTests === 48, "Baseline failed test count drifted");
assert(baseline.entries.length === 47, "Baseline ledger must contain exactly 47 suite entries");
assert(baseline.root_causes.length === 20, "Baseline ledger must contain exactly 20 root causes");
assert(original.success === true, "Original failed-suite replay is not GREEN");
assert(original.numTotalTestSuites === 47, "Original replay must contain exactly 47 suites");
assert(original.numPassedTestSuites === 47, "Original replay did not pass all 47 suites");
assert(original.numFailedTestSuites === 0, "Original replay contains failed suites");
assert(original.numFailedTests === 0, "Original replay contains failed tests");
assert(original.numPendingTests === 0, "Original replay contains pending tests");
assert(original.numTodoTests === 0, "Original replay contains todo tests");
assert(original.runWasInterrupted !== true, "Original replay was interrupted");
assert(phaseC.success === true, "Phase C terminal result is not GREEN");
assert(phaseC.numFailedTestSuites === 0, "Phase C contains failed suites");
assert(phaseC.numFailedTests === 0, "Phase C contains failed tests");
assert(phaseC.numPendingTests === 0, "Phase C contains pending tests");
assert(phaseC.numTodoTests === 0, "Phase C contains todo tests");
assert(phaseC.runWasInterrupted !== true, "Phase C was interrupted");
assert(
  phaseCSummary.final_status === "GREEN_T8_PHASE_C_ADMISSION",
  "Phase C summary status is not GREEN",
);
assert(phaseCSummary.source_sha === commitSha, "Phase C evidence belongs to another SHA");
assert(phaseCSummary.source_tree_clean === true, "Phase C did not start from a clean tree");

const entrySuites = baseline.entries.map((entry) => normalizePath(entry.suite));
assert(new Set(entrySuites).size === 47, "Baseline ledger contains duplicate suite mappings");
for (const entry of baseline.entries) {
  const replay = findSuite(original, entry.suite);
  assert(replay?.status === "passed", `Original failed suite is not proven passed: ${entry.suite}`);
}

const phaseCResultSha = sha256File(phaseCResultPath);
const originalResultSha = sha256File(originalResultPath);
const closedRootCauses = baseline.root_causes.map((rootCause) => {
  const primarySuite =
    T8_PHASE_C_PRIMARY_ROOT_CAUSE_SUITES[
      rootCause.root_cause_id as keyof typeof T8_PHASE_C_PRIMARY_ROOT_CAUSE_SUITES
    ];
  assert(primarySuite, `No Phase C primary suite for ${rootCause.root_cause_id}`);
  const primaryResult = findSuite(phaseC, primarySuite);
  assert(primaryResult?.status === "passed", `Primary regression is not passed: ${primarySuite}`);
  const dependentReplay = baseline.entries
    .filter((entry) => entry.root_cause_id === rootCause.root_cause_id)
    .map((entry) => {
      const suite = findSuite(original, entry.suite);
      assert(suite?.status === "passed", `Dependent replay is not passed: ${entry.suite}`);
      return { suite: entry.suite, status: suite.status };
    });
  const regressionEvidence = {
    root_cause_id: rootCause.root_cause_id,
    commit_sha: commitSha,
    primary_suite: primarySuite,
    primary_status: primaryResult.status,
    dependent_replay: dependentReplay,
    phase_c_result_sha256: phaseCResultSha,
    original_result_sha256: originalResultSha,
  };
  return {
    identifier: rootCause.root_cause_id,
    category: rootCause.category,
    primary_producer: rootCause.locations[0] ?? null,
    dependent_suites: rootCause.dependent_suites,
    reproduce_command: rootCause.regression,
    expected_actual: rootCause.cause,
    production_owner: PRODUCTION_OWNERS[rootCause.root_cause_id],
    chosen_fix: rootCause.fix,
    regression_tests: [primarySuite, ...dependentReplay.map((item) => item.suite)],
    commit_sha: commitSha,
    evidence_sha256: sha256(JSON.stringify(regressionEvidence)),
    evidence: regressionEvidence,
    status: "CLOSED" as const,
  };
});

assert(
  closedRootCauses.every((item) => typeof item.production_owner === "string"),
  "Every root cause must have a production owner",
);

const failedTests = baseline.entries.reduce((sum, entry) => sum + entry.failing_tests.length, 0);
assert(failedTests === 48, "Baseline failing-test mapping drifted");
const ledger = {
  schema: "t8-full-jest-failure-ledger-closeout:v1",
  generated_at: new Date().toISOString(),
  baseline_sha: baseline.run.source_commit,
  final_sha: commitSha,
  terminal_artifacts: {
    baseline_ledger: {
      path: baselineLedgerPath,
      sha256: sha256File(baselineLedgerPath),
    },
    original_failed_suite_result: {
      path: originalResultPath,
      sha256: originalResultSha,
    },
    phase_c_result: {
      path: phaseCResultPath,
      sha256: phaseCResultSha,
    },
    phase_c_summary: {
      path: phaseCSummaryPath,
      sha256: sha256File(phaseCSummaryPath),
    },
  },
  summary: {
    failed_suites: 47,
    mapped_suites: entrySuites.length,
    unmapped_suites: 0,
    duplicate_mappings: entrySuites.length - new Set(entrySuites).size,
    failed_tests: failedTests,
    mapped_failed_tests: failedTests,
    root_causes: closedRootCauses.length,
    root_causes_closed: closedRootCauses.filter((item) => item.status === "CLOSED").length,
    open_root_causes: closedRootCauses.filter((item) => item.status !== "CLOSED").length,
  },
  root_causes: closedRootCauses,
  entries: baseline.entries.map((entry) => ({
    suite: entry.suite,
    root_cause_id: entry.root_cause_id,
    original_failed_tests: entry.failing_tests.map((test) => test.name),
    original_failed_tests_count: entry.failing_tests.length,
    exact_sha_replay_status: findSuite(original, entry.suite)?.status,
    commit_sha: commitSha,
    evidence_sha256: originalResultSha,
    status: "CLOSED",
  })),
  final_status: "GREEN_T8_FAILURE_LEDGER_CLOSED",
  fake_green_claimed: false,
};

fs.mkdirSync(outputDir, { recursive: true });
const jsonPath = path.join(outputDir, "failure-ledger-closeout.json");
const markdownPath = path.join(outputDir, "failure-ledger-closeout.md");
fs.writeFileSync(jsonPath, `${JSON.stringify(ledger, null, 2)}\n`, "utf8");
const markdown = [
  "# T8 failure ledger closeout",
  "",
  `- Baseline SHA: \`${ledger.baseline_sha}\``,
  `- Final SHA: \`${ledger.final_sha}\``,
  `- Failed suites mapped: ${ledger.summary.mapped_suites}/${ledger.summary.failed_suites}`,
  `- Failed tests mapped: ${ledger.summary.mapped_failed_tests}/${ledger.summary.failed_tests}`,
  `- Root causes closed: ${ledger.summary.root_causes_closed}/${ledger.summary.root_causes}`,
  `- Final status: \`${ledger.final_status}\``,
  "",
  "| Root cause | Category | Production owner | Evidence SHA-256 | Status |",
  "| --- | --- | --- | --- | --- |",
  ...closedRootCauses.map(
    (item) =>
      `| ${item.identifier} | ${item.category} | \`${item.production_owner}\` | \`${item.evidence_sha256}\` | ${item.status} |`,
  ),
  "",
].join("\n");
fs.writeFileSync(markdownPath, markdown, "utf8");
console.info(JSON.stringify({
  final_status: ledger.final_status,
  final_sha: commitSha,
  ...ledger.summary,
  json_path: jsonPath,
  json_sha256: sha256File(jsonPath),
  markdown_path: markdownPath,
  markdown_sha256: sha256File(markdownPath),
}, null, 2));
