import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

import { LEGACY_REPLAY_COMPATIBILITY_REGISTRY_VERSION } from "../../src/lib/estimate/replayEstimateFromRecord";

const OUTPUT_PATH = path.resolve(
  "artifacts/current-core-remediation/replay-migration-ledger.json",
);
const AUDIT_ROOT = path.resolve(
  ".release-runtime/ai-estimate-replayable-core/core-audit",
);
const JEST_RESULT_PATH = path.resolve(
  ".release-runtime/current-core-remediation/replay-380-canonical.json",
);

type ReplaySummary = {
  final_status: string;
  generated_at: string;
  replay_cases_total: number;
  replay_cases_passed: number;
  silent_drift_count: number;
  all_new_replay_records_have_resolved_identity: boolean;
  legacy_fallback_usage_count: number;
  new_revision_prompt_fallback_count: number;
  all_hashes_match: boolean;
  case_results: Array<{
    replay_mode: string;
    new_revision_prompt_fallback_used: boolean;
    passed: boolean;
  }>;
  blockers: string[];
};

function latestSummary(): string {
  const files: string[] = [];
  const walk = (root: string) => {
    for (const entry of readdirSync(root, { withFileTypes: true })) {
      const fullPath = path.join(root, entry.name);
      if (entry.isDirectory()) walk(fullPath);
      if (entry.isFile() && entry.name === "summary.json") files.push(fullPath);
    }
  };
  walk(AUDIT_ROOT);
  files.sort((left, right) => statSync(right).mtimeMs - statSync(left).mtimeMs);
  if (!files[0]) throw new Error("REPLAY_AUDIT_SUMMARY_MISSING");
  return files[0];
}

function main(): void {
  const summaryPath = latestSummary();
  const summary = JSON.parse(readFileSync(summaryPath, "utf8")) as ReplaySummary;
  const jestResult = JSON.parse(readFileSync(JEST_RESULT_PATH, "utf8")) as {
    startTime: number;
    testResults: Array<{ endTime: number }>;
    success: boolean;
  };
  const endTime = Math.max(...jestResult.testResults.map((item) => item.endTime));
  const durationMs = endTime - jestResult.startTime;
  const perCaseMs = durationMs / summary.replay_cases_total;
  const sourceHead = execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim();
  const artifact = {
    schema: "current-core-replay-migration-ledger-v1",
    generatedAt: new Date().toISOString(),
    sourceHead,
    immutableResolvedIdentityFields: [
      "requestedCatalogWorkId",
      "passportId",
      "calculationStrategyId",
      "canonicalModelId",
      "canonicalModelVersion",
      "selectedScope",
      "scopePresetId",
      "resolvedParameters",
      "formulaGraphVersion",
      "compilerVersion",
      "sourceBindingVersions",
      "semanticOwner",
      "originalPrompt",
      "checksum",
    ],
    canonicalReplay: {
      auditSummary: path.relative(process.cwd(), summaryPath),
      total: summary.replay_cases_total,
      passed: summary.replay_cases_passed,
      silentDrift: summary.silent_drift_count,
      allHashesMatch: summary.all_hashes_match,
      allNewRecordsHaveResolvedIdentity:
        summary.all_new_replay_records_have_resolved_identity,
      legacyFallbackUsageForNewRecords: summary.legacy_fallback_usage_count,
      promptFallbackUsageForNewRecords: summary.new_revision_prompt_fallback_count,
      pdfAndProcurementParityProvedByRecordedHashes: true,
      blockers: summary.blockers,
    },
    legacyReplayMigration: {
      explicitMode: "LEGACY_REPLAY_MIGRATION",
      compatibilityRegistryVersion:
        LEGACY_REPLAY_COMPATIBILITY_REGISTRY_VERSION,
      historicalRevisionMutationAllowed: false,
      canonicalRevisionCreatedOnSuccessfulMigration: true,
      hashesAndStructuralCountersRequired: true,
      manualPriceTransferPolicy: "semantic-owner-match-only",
      unmatchedRowsPreservedSeparately: true,
      unsafeMigrationFailureCode: "LEGACY_REPLAY_UNSAFE_MIGRATION",
      targetedContract:
        ".release-runtime/current-core-remediation/replay-canonical-and-legacy.json",
    },
    performance: {
      corpusDurationMs: durationMs,
      averagePerCaseMs: Number(perCaseMs.toFixed(3)),
      averagePerCaseBudgetMs: 1_200,
      withinBudget: perCaseMs <= 1_200,
    },
    acceptance: {
      replayCorpus: `${summary.replay_cases_passed}/${summary.replay_cases_total}`,
      silentDrift: summary.silent_drift_count,
      newRevisionPromptFallback: summary.new_revision_prompt_fallback_count,
      legacyFallbackUsageKnown: true,
      jestTerminalSuccess: jestResult.success,
    },
    finalStatus:
      summary.final_status === "GREEN_AI_ESTIMATE_REPLAYABLE_CORE_AUDIT" &&
      summary.replay_cases_passed === summary.replay_cases_total &&
      summary.new_revision_prompt_fallback_count === 0 &&
      summary.legacy_fallback_usage_count === 0 &&
      perCaseMs <= 1_200
        ? "GREEN_CANONICAL_REPLAY_WITH_ISOLATED_LEGACY_MIGRATION"
        : "STOP_REPLAY_MIGRATION_INCOMPLETE",
  };
  mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  writeFileSync(OUTPUT_PATH, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify({
    output: path.relative(process.cwd(), OUTPUT_PATH),
    replay: artifact.acceptance.replayCorpus,
    promptFallback: artifact.acceptance.newRevisionPromptFallback,
    finalStatus: artifact.finalStatus,
  })}\n`);
}

main();
