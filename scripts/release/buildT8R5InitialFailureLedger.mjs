import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const EXPECTED_SOURCE_SHA = "a117116b42ff6aca597e7b2e332c88180deb0157";
const EXPECTED_CANDIDATE_HASH =
  "e8fad7fd80ef75a10ae7e222f61e86d64b7ce024a7c5306b38a81177d4b10f1d";

const CLUSTERS = Object.freeze({
  ARTIFACT_PREFLIGHT_AND_PRODUCER_GAP: {
    category: "INFRASTRUCTURE_EVIDENCE",
    cause:
      "The frozen full-Jest runner did not run a required-artifact preflight. Ignored prerequisite evidence was absent, while the older 153-suite remediation path only performed unversioned cross-worktree copying. Several RPC/realtime artifacts have consumers but no canonical source producer.",
    owner: "scripts/release/runFrozenFullJest.ts",
    producerFamilies: [
      "MISSING_CANONICAL_PRODUCER:S_RPC_6/S_RPC_7/S_RT_6",
      "scripts/audit/runConstructionWorkOntologyMigrationCloseout.ts",
      "scripts/e2e/runSelectedWorkEnterpriseVisible1000RealInputAcceptance.ts",
      "scripts/e2e/runSelectedWorkEnterprise1000PdfProof.ts",
      "scripts/e2e/runAiEstimateCanaryEvaluationProof.ts",
      "scripts/ai/verifyAiObservabilitySafety.ts",
      "scripts/release/releasePipelineNoTimeoutMobileRuntime.shared.ts",
    ],
    proof:
      "Direct ENOENT failures plus runFrozenFullJest.ts having no prerequisite stage; currentCoreRemediationEvidencePrerequisites.ts is imported only by runCurrentCoreRemediation153.ts.",
  },
  STALE_REPLAY_AND_FINAL_READINESS_LINEAGE: {
    category: "EVIDENCE_LINEAGE",
    cause:
      "Final-readiness and scorecard consumers evaluated missing or stale historical matrices, including a blocked enterprise release-candidate matrix, instead of an exact-SHA immutable evidence set.",
    owner: "scripts/audit/runAiEstimateEnterpriseFinalReadinessGoNoGo.ts",
    producerFamilies: [
      "scripts/audit/greenClaimArtifactReconciliation.shared.ts",
      "scripts/audit/final50k92ScoreReaudit.shared.ts",
      "scripts/e2e/enterpriseReleaseCandidate.shared.ts",
    ],
    proof:
      "The terminal assertions report NO_GO/BLOCKED statuses and unsuperseded matrix paths; the ignored workspace matrices have mixed GREEN/BLOCKED lineage and no exact candidate SHA.",
  },
  PREVIOUS_BOQ_VISIBLE_LABEL_PROOF_NOT_GREEN: {
    category: "EVIDENCE_PREREQUISITE",
    cause:
      "The structured-pipeline closeout cannot validate its exact-material/live-visible-label prerequisite in a clean candidate.",
    owner: "scripts/audit/runEstimateStructuredPipelineUiPdfBindingCloseout.ts",
    producerFamilies: [
      "scripts/audit/runMultiDomainProfessionalBoqCloseout.ts",
      "artifacts/S_MULTI_DOMAIN_PROFESSIONAL_BOQ_RECIPE_COMPILER_EXACT_MATERIALS/live_ui_visible_label_proof.json",
    ],
    proof:
      "All three consumers return the identical PREVIOUS_LIVE_VISIBLE_LABEL_PROOF_NOT_GREEN failure code.",
  },
  FLATLIST_EXACT_INVENTORY_DRIFT: {
    category: "PRODUCTION_INVENTORY",
    cause:
      "A tuned production FlatList was added to ProfessionalEstimateComposer after the exact 61-instance lock, producing 62 instances (8 FlatList + 54 FlashList) with zero tuning violations.",
    owner: "src/components/estimate/ProfessionalEstimateComposer.tsx",
    producerFamilies: ["scripts/perf/flatListTuningRegression.ts"],
    proof:
      "Scanner output identifies src/components/estimate/ProfessionalEstimateComposer.tsx:358, added by 878fe431, as the new tuned instance; exact assertion received 62 instead of 61.",
  },
  REAL10000_P0_REMEDIATION_INCOMPLETE: {
    category: "PRODUCT_EVIDENCE",
    cause:
      "The canonical Real10000 remediation audit still reports five P0 holes.",
    owner: "scripts/audit/real10000AuditP0RemediationCore.ts",
    producerFamilies: ["scripts/audit/real10000AuditP0RemediationCore.ts"],
    proof: "The terminal assertion expected after_p0_holes=0 and received 5.",
  },
});

const SUITE_CLUSTERS = Object.freeze({
  "tests/api/sRpc6HighRiskRpcValidation.contract.test.ts": "ARTIFACT_PREFLIGHT_AND_PRODUCER_GAP",
  "tests/api/sRpc7MutationResultEnvelopes.contract.test.ts": "ARTIFACT_PREFLIGHT_AND_PRODUCER_GAP",
  "tests/architecture/aiEstimateFinalReadinessNoProductionRollout.contract.test.ts": "STALE_REPLAY_AND_FINAL_READINESS_LINEAGE",
  "tests/architecture/aiTraceObservabilityArchitecture.contract.test.ts": "ARTIFACT_PREFLIGHT_AND_PRODUCER_GAP",
  "tests/architecture/finalReadinessRequiresRollbackAndKillSwitch.contract.test.ts": "STALE_REPLAY_AND_FINAL_READINESS_LINEAGE",
  "tests/architecture/maxArchitectureScaleRiskAuditCurrentEvidence.contract.test.ts": "STALE_REPLAY_AND_FINAL_READINESS_LINEAGE",
  "tests/architecture/noGreenClaimWithoutReplayEvidence.contract.test.ts": "STALE_REPLAY_AND_FINAL_READINESS_LINEAGE",
  "tests/architecture/noSilentHistoricalMatrixMutation.contract.test.ts": "ARTIFACT_PREFLIGHT_AND_PRODUCER_GAP",
  "tests/audit/final50kReadiness.contract.test.ts": "STALE_REPLAY_AND_FINAL_READINESS_LINEAGE",
  "tests/audit/finalScorecardEvidence.contract.test.ts": "STALE_REPLAY_AND_FINAL_READINESS_LINEAGE",
  "tests/audit/greenClaimArtifactConsistency.contract.test.ts": "STALE_REPLAY_AND_FINAL_READINESS_LINEAGE",
  "tests/audit/releaseGuardUsesReplayLedger.contract.test.ts": "STALE_REPLAY_AND_FINAL_READINESS_LINEAGE",
  "tests/audit/replayVerifiedMatrices.contract.test.ts": "STALE_REPLAY_AND_FINAL_READINESS_LINEAGE",
  "tests/canaryEvaluation/canaryEvaluationProofArtifacts.contract.test.ts": "ARTIFACT_PREFLIGHT_AND_PRODUCER_GAP",
  "tests/canaryEvaluation/evidenceLedgerRequiresAllArtifacts.contract.test.ts": "ARTIFACT_PREFLIGHT_AND_PRODUCER_GAP",
  "tests/canaryEvaluation/manualEstimatorReviewThreshold.contract.test.ts": "ARTIFACT_PREFLIGHT_AND_PRODUCER_GAP",
  "tests/constructionWorkOntology/catalogItemsUntouched.contract.test.ts": "ARTIFACT_PREFLIGHT_AND_PRODUCER_GAP",
  "tests/constructionWorkOntology/catalogLinksNoFakeReferences.contract.test.ts": "ARTIFACT_PREFLIGHT_AND_PRODUCER_GAP",
  "tests/constructionWorkOntology/noPromptLookup.contract.test.ts": "ARTIFACT_PREFLIGHT_AND_PRODUCER_GAP",
  "tests/constructionWorkOntology/noSecondCatalog.contract.test.ts": "ARTIFACT_PREFLIGHT_AND_PRODUCER_GAP",
  "tests/constructionWorkOntology/productNoRegression.contract.test.ts": "ARTIFACT_PREFLIGHT_AND_PRODUCER_GAP",
  "tests/constructionWorkOntology/repositoryReadContracts.contract.test.ts": "ARTIFACT_PREFLIGHT_AND_PRODUCER_GAP",
  "tests/constructionWorkOntology/rlsPolicies.contract.test.ts": "ARTIFACT_PREFLIGHT_AND_PRODUCER_GAP",
  "tests/constructionWorkOntology/standardsLicenseGuard.contract.test.ts": "ARTIFACT_PREFLIGHT_AND_PRODUCER_GAP",
  "tests/constructionWorkOntology/workAliasesNormalization.contract.test.ts": "ARTIFACT_PREFLIGHT_AND_PRODUCER_GAP",
  "tests/constructionWorkOntology/workDefinitionsUniqueKeys.contract.test.ts": "ARTIFACT_PREFLIGHT_AND_PRODUCER_GAP",
  "tests/estimateStructuredPipeline/finalMatrix.contract.test.ts": "PREVIOUS_BOQ_VISIBLE_LABEL_PROOF_NOT_GREEN",
  "tests/estimateStructuredPipeline/previousBoqExactMaterialsGreenRequired.contract.test.ts": "PREVIOUS_BOQ_VISIBLE_LABEL_PROOF_NOT_GREEN",
  "tests/finalReadiness/aiEstimateGoNoGoMatrix.contract.test.ts": "STALE_REPLAY_AND_FINAL_READINESS_LINEAGE",
  "tests/finalReadiness/canaryDisabledByDefault.contract.test.ts": "STALE_REPLAY_AND_FINAL_READINESS_LINEAGE",
  "tests/finalReadiness/killSwitchRequired.contract.test.ts": "STALE_REPLAY_AND_FINAL_READINESS_LINEAGE",
  "tests/finalReadiness/liveWebJourneyRequired.contract.test.ts": "STALE_REPLAY_AND_FINAL_READINESS_LINEAGE",
  "tests/finalReadiness/matrixLedgerRequiresAllPrerequisitesGreen.contract.test.ts": "STALE_REPLAY_AND_FINAL_READINESS_LINEAGE",
  "tests/finalReadiness/observabilityRequired.contract.test.ts": "STALE_REPLAY_AND_FINAL_READINESS_LINEAGE",
  "tests/finalReadiness/pdfFinalProofRequired.contract.test.ts": "STALE_REPLAY_AND_FINAL_READINESS_LINEAGE",
  "tests/finalReadiness/rollbackRequired.contract.test.ts": "STALE_REPLAY_AND_FINAL_READINESS_LINEAGE",
  "tests/perf/flatListTuningRegressionScanner.contract.test.ts": "FLATLIST_EXACT_INVENTORY_DRIFT",
  "tests/real10000Audit/remediationRerunAuditP0Zero.contract.test.ts": "REAL10000_P0_REMEDIATION_INCOMPLETE",
  "tests/realtime/realtimeFanoutBudgetProof.contract.test.ts": "ARTIFACT_PREFLIGHT_AND_PRODUCER_GAP",
  "tests/release/closeoutReadOnly.contract.test.ts": "ARTIFACT_PREFLIGHT_AND_PRODUCER_GAP",
  "tests/releasePipeline/preflightCanonicalEvidenceImmutability.contract.test.ts": "ARTIFACT_PREFLIGHT_AND_PRODUCER_GAP",
  "tests/requestEstimate/estimateStructuredPipelineUiPdfBindingCloseout.contract.test.ts": "PREVIOUS_BOQ_VISIBLE_LABEL_PROOF_NOT_GREEN",
  "tests/selectedWorkEnterprise1000/selectedWorkEnterprise1000.contract.test.ts": "ARTIFACT_PREFLIGHT_AND_PRODUCER_GAP",
});

function arg(name) {
  const prefix = `--${name}=`;
  const value = process.argv.find((item) => item.startsWith(prefix))?.slice(prefix.length);
  if (!value) throw new Error(`missing_argument:${name}`);
  return value;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function fileRecord(filePath) {
  const content = fs.readFileSync(filePath);
  return { path: path.resolve(filePath), bytes: content.byteLength, sha256: sha256(content) };
}

function normalizeSuite(name) {
  const normalized = name.replace(/\\/g, "/");
  const marker = "/tests/";
  const index = normalized.lastIndexOf(marker);
  return index >= 0 ? normalized.slice(index + 1) : normalized;
}

function cleanFailureMessage(messages) {
  return messages
    .join("\n")
    .replace(/\x1b\[[0-9;]*m/g, "")
    .replace(/\r/g, "")
    .split("\n")
    .filter((line) => !/^\s+at /.test(line))
    .join("\n")
    .trim();
}

const resultPath = path.resolve(arg("result"));
const summaryPath = path.resolve(arg("summary"));
const stderrPath = path.resolve(arg("stderr"));
const stdoutPath = path.resolve(arg("stdout"));
const exitCodePath = path.resolve(arg("exit-code"));
const outputDir = path.resolve(arg("output-dir"));
const endedAt = arg("ended-at");
const result = JSON.parse(fs.readFileSync(resultPath, "utf8"));
const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
const exitCode = Number(fs.readFileSync(exitCodePath, "utf8").trim());
const stderr = fs.readFileSync(stderrPath, "utf8");

if (result.source_commit !== EXPECTED_SOURCE_SHA) throw new Error("source_sha_mismatch");
if (result.candidate_hash !== EXPECTED_CANDIDATE_HASH) throw new Error("candidate_hash_mismatch");
if (summary.candidate_hash !== EXPECTED_CANDIDATE_HASH) throw new Error("summary_candidate_hash_mismatch");
if (exitCode !== 1 || summary.exit_code !== 1) throw new Error("unexpected_exit_code");
if (result.numFailedTestSuites !== 43 || result.numFailedTests !== 57) {
  throw new Error("terminal_failure_count_drift");
}

const failedSuites = result.testResults
  .filter((suite) => suite.status === "failed")
  .map((suite) => {
    const suitePath = normalizeSuite(suite.name);
    const clusterId = SUITE_CLUSTERS[suitePath];
    if (!clusterId) throw new Error(`unmapped_failed_suite:${suitePath}`);
    const assertions = suite.assertionResults
      .filter((assertion) => assertion.status === "failed")
      .map((assertion) => ({
        full_name: assertion.fullName,
        expected_actual: cleanFailureMessage(assertion.failureMessages ?? []),
      }));
    return { suite: suitePath, cluster_id: clusterId, failed_assertions: assertions };
  })
  .sort((left, right) => left.suite.localeCompare(right.suite));

if (failedSuites.length !== 43 || new Set(failedSuites.map((item) => item.suite)).size !== 43) {
  throw new Error("failed_suite_uniqueness_drift");
}
const failedAssertionCount = failedSuites.reduce((sum, item) => sum + item.failed_assertions.length, 0);
if (failedAssertionCount !== 57) throw new Error("failed_assertion_count_drift");

const clusterRecords = Object.entries(CLUSTERS).map(([id, definition]) => {
  const suites = failedSuites.filter((suite) => suite.cluster_id === id);
  return {
    id,
    ...definition,
    failed_suites: suites.length,
    failed_assertions: suites.reduce((sum, suite) => sum + suite.failed_assertions.length, 0),
    suites: suites.map((suite) => suite.suite),
    status: "OPEN",
  };
});
if (clusterRecords.some((cluster) => cluster.failed_suites === 0)) {
  throw new Error("empty_root_cause_cluster");
}

const start = new Date(Number(result.startTime));
const terminalArtifacts = [resultPath, summaryPath, stderrPath, stdoutPath, exitCodePath].map(fileRecord);
const baseLedger = {
  schema: "t8-final-r5-initial-full-jest-failure-ledger:v1",
  status: "NOT_GREEN_INITIAL_TERMINAL_RED_CAPTURED",
  source_sha: EXPECTED_SOURCE_SHA,
  source_tree_hash: "3bfaaa98686d235b4b05357653c4f251ce06c564",
  product_source_sha: "48fece69993197530e69647ff5f3f63ec69bdee2",
  candidate_hash: EXPECTED_CANDIDATE_HASH,
  run: {
    started_at: start.toISOString(),
    ended_at: new Date(endedAt).toISOString(),
    duration_ms: result.duration_ms,
    exit_code: exitCode,
    was_interrupted: result.wasInterrupted === true || result.runWasInterrupted === true,
    oom_detected: /heap out of memory|allocation failed|javascript heap/i.test(stderr),
    crash_detected: false,
    force_exit_requested: true,
    force_exit_warning_observed: stderr.includes("Force exiting Jest"),
  },
  totals: {
    suites: {
      total: result.numTotalTestSuites,
      passed: result.numPassedTestSuites,
      failed: result.numFailedTestSuites,
      skipped: result.numPendingTestSuites,
      runtime_error: result.numRuntimeErrorTestSuites,
    },
    tests: {
      total: result.numTotalTests,
      passed: result.numPassedTests,
      failed: result.numFailedTests,
      skipped: result.numPendingTests,
      todo: result.numTodoTests,
    },
  },
  terminal_artifacts: terminalArtifacts,
  root_cause_clusters: clusterRecords,
  failed_suites: failedSuites,
  unmapped_failed_suites: [],
  duplicate_suite_mappings: [],
  fake_green_claimed: false,
};
const contentSha256 = sha256(JSON.stringify(baseLedger));
const ledger = {
  ...baseLedger,
  generated_at: new Date().toISOString(),
  generated_at_excluded_from_content_hash: true,
  content_sha256: contentSha256,
};

fs.mkdirSync(outputDir, { recursive: true });
const jsonPath = path.join(outputDir, "initial-full-jest-failure-ledger.json");
const markdownPath = path.join(outputDir, "initial-full-jest-failure-ledger.md");
fs.writeFileSync(jsonPath, `${JSON.stringify(ledger, null, 2)}\n`, "utf8");

const markdown = [
  "# T8-FINAL-R5 initial Full Jest failure ledger",
  "",
  `- Status: \`${ledger.status}\``,
  `- Source SHA: \`${ledger.source_sha}\``,
  `- Candidate hash: \`${ledger.candidate_hash}\``,
  `- Started: ${ledger.run.started_at}`,
  `- Ended: ${ledger.run.ended_at}`,
  `- Duration: ${ledger.run.duration_ms} ms`,
  `- Exit code: ${ledger.run.exit_code}`,
  `- Suites: ${ledger.totals.suites.passed} passed, ${ledger.totals.suites.failed} failed, ${ledger.totals.suites.skipped} skipped, ${ledger.totals.suites.total} total`,
  `- Tests: ${ledger.totals.tests.passed} passed, ${ledger.totals.tests.failed} failed, ${ledger.totals.tests.skipped} skipped, ${ledger.totals.tests.todo} todo, ${ledger.totals.tests.total} total`,
  `- OOM/crash/interrupted: ${ledger.run.oom_detected}/${ledger.run.crash_detected}/${ledger.run.was_interrupted}`,
  `- Force-exit warning: ${ledger.run.force_exit_warning_observed}`,
  `- Content SHA-256: \`${ledger.content_sha256}\``,
  "",
  "## Root-cause clusters",
  "",
  "| Cluster | Category | Suites | Assertions | Status | Canonical owner |",
  "| --- | --- | ---: | ---: | --- | --- |",
  ...clusterRecords.map(
    (cluster) =>
      `| ${cluster.id} | ${cluster.category} | ${cluster.failed_suites} | ${cluster.failed_assertions} | ${cluster.status} | \`${cluster.owner}\` |`,
  ),
  "",
  ...clusterRecords.flatMap((cluster) => [
    `### ${cluster.id}`,
    "",
    cluster.cause,
    "",
    `Proof: ${cluster.proof}`,
    "",
  ]),
  "## Failed suites and assertions",
  "",
  ...failedSuites.flatMap((suite) => [
    `### ${suite.suite}`,
    "",
    `Cluster: \`${suite.cluster_id}\``,
    "",
    ...suite.failed_assertions.map((assertion) => `- ${assertion.full_name}`),
    "",
  ]),
].join("\n");
fs.writeFileSync(markdownPath, `${markdown}\n`, "utf8");

console.info(
  JSON.stringify(
    {
      status: ledger.status,
      source_sha: ledger.source_sha,
      candidate_hash: ledger.candidate_hash,
      failed_suites: failedSuites.length,
      failed_assertions: failedAssertionCount,
      root_cause_clusters: clusterRecords.length,
      json_path: jsonPath,
      json_sha256: fileRecord(jsonPath).sha256,
      markdown_path: markdownPath,
      markdown_sha256: fileRecord(markdownPath).sha256,
      fake_green_claimed: false,
    },
    null,
    2,
  ),
);
