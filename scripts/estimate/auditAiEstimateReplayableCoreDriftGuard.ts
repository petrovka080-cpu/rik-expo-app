import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import { createSnapshotFromDraftRevision } from "../../src/features/estimates/createSnapshotFromDraftRevision";
import { renderPdfFromDraftRevision } from "../../src/features/pdf/renderPdfFromDraftRevision";
import { createBuyerHandoffFromDraftRevision } from "../../src/features/procurement/createBuyerHandoffFromDraftRevision";
import type { ApprovedEstimateHistoryRecord } from "../../src/lib/consumerRequests";
import { replayApprovedEstimateHistoryRecords } from "../../src/lib/consumerRequests";
import { buildEstimateReplayRecord } from "../../src/lib/estimate/buildEstimateReplayRecord";
import { createEstimateDraftRevision } from "../../src/lib/estimate/createEstimateDraftRevision";
import { replayForemanEstimateProof } from "../../src/lib/foreman";
import {
  currentBranch,
  currentSourceSha,
  currentUpstreamSync,
  hasFlag,
  writeRuntimeJson,
} from "../e2e/renderStagingAcceptanceCore";
import {
  GREEN_AI_ESTIMATE_REPLAYABLE_CORE_ANDROID_SMOKE,
} from "../e2e/runReplayableCoreAndroidSmoke";
import {
  GREEN_AI_ESTIMATE_REPLAYABLE_CORE_WEB_ANDROID_PARITY,
} from "../e2e/runReplayableCoreWebAndroidParity";
import {
  GREEN_AI_ESTIMATE_REPLAYABLE_CORE_WEB_SMOKE,
} from "../e2e/runReplayableCoreWebSmoke";
import {
  GREEN_AI_ESTIMATE_REPLAYABLE_CORE_AUDIT,
  runReplayableEstimateCoreAudit,
} from "./auditReplayableEstimateCore";
import { auditNoSecondEstimateEngine } from "./auditNoSecondEstimateEngine";
import {
  GREEN_AI_ESTIMATE_MIGRATION_RECORD_POLICY,
  validateEstimateMigrationRecords,
} from "./validateEstimateMigrationRecords";

const ROOT = path.join(".release-runtime", "ai-estimate-replayable-core");
const WEB_ROOT = path.join(ROOT, "web");
const ANDROID_ROOT = path.join(ROOT, "android-chrome");
const PARITY_ROOT = path.join(ROOT, "web-android-parity");

export const GREEN_AI_ESTIMATE_REPLAYABLE_CORE_DRIFT_GUARD =
  "GREEN_AI_ESTIMATE_REPLAYABLE_CORE_DRIFT_GUARD_11610_COMMITTED_NO_RELEASE" as const;
export const STOP_AI_ESTIMATE_REPLAYABLE_CORE_DRIFT_GUARD =
  "STOP_AI_ESTIMATE_REPLAYABLE_CORE_DRIFT_GUARD_11610_INCOMPLETE_NO_GREEN" as const;

type SummaryLike = Record<string, unknown>;

function finalStatus(summary: SummaryLike | null | undefined): string {
  return String(summary?.final_status ?? "");
}

function sourceSha(summary: SummaryLike | null | undefined): string {
  return String(summary?.source_sha ?? "");
}

function walkSummaryJson(root: string): string[] {
  try {
    return readdirSync(root).flatMap((entry) => {
      const fullPath = path.join(root, entry);
      const stats = statSync(fullPath);
      if (stats.isDirectory()) return walkSummaryJson(fullPath);
      return stats.isFile() && entry === "summary.json" ? [fullPath] : [];
    });
  } catch {
    return [];
  }
}

function readJsonSafe(filePath: string): SummaryLike | null {
  try {
    return JSON.parse(readFileSync(filePath, "utf8").replace(/^\uFEFF/, "")) as SummaryLike;
  } catch {
    return null;
  }
}

function latestGreen(root: string, marker: string): { path: string; summary: SummaryLike } | null {
  const candidates = walkSummaryJson(root)
    .map((filePath) => ({ filePath, mtimeMs: statSync(filePath).mtimeMs }))
    .sort((left, right) => right.mtimeMs - left.mtimeMs);
  for (const candidate of candidates) {
    const summary = readJsonSafe(candidate.filePath);
    if (summary && finalStatus(summary) === marker) return { path: candidate.filePath, summary };
  }
  return null;
}

function gitStatusPorcelain(): string {
  return execFileSync("git", ["status", "--porcelain=v1", "--untracked-files=all"], {
    encoding: "utf8",
  }).trim();
}

function buildHistoryReplayProof(sourceShaValue: string) {
  const createdAt = "2026-07-09T00:00:00.000Z";
  const recordsWithReplay = Array.from({ length: 25 }, (_, index) => {
    const revision = createEstimateDraftRevision({
      estimateDraftId: `history-replay-${index + 1}`,
      rawInput: `approved history replay profile sheet fence ${120 + index} linear meters`,
      selectedTemplateId: "profile_sheet_fence",
      createdAt,
    });
    const snapshot = createSnapshotFromDraftRevision(revision);
    const pdf = renderPdfFromDraftRevision({ revision: snapshot.revision, snapshot: snapshot.snapshot });
    const buyer = createBuyerHandoffFromDraftRevision({ revision: pdf.revision, snapshot: pdf.snapshot });
    const replayRecord = buildEstimateReplayRecord({
      caseId: `approved_history_replay_${index + 1}`,
      revision: buyer.revision,
      snapshot: buyer.snapshot,
      pdf: pdf.pdf,
      buyerHandoff: buyer.buyerHandoff,
      sourceSha: sourceShaValue,
      createdAt,
    });
    const historyRecord: ApprovedEstimateHistoryRecord = {
      approvedEstimateId: `approved-history-${index + 1}`,
      sourceDraftId: revision.estimateDraftId,
      sourceRevisionId: revision.revisionId,
      sourceSnapshotId: snapshot.snapshot.snapshotId,
      createdAt,
      updatedAt: createdAt,
      title: `approved history replay ${index + 1}`,
      prompt: revision.rawInput,
      selectedTemplateId: revision.selectedTemplateId,
      family: revision.matchedFamily,
      rowCount: revision.boq.rows.length,
      materialRowsCount: revision.boq.rows.filter((row) => row.rowType === "material").length,
      workRowsCount: revision.boq.rows.filter((row) => row.rowType === "work" || row.rowType === "labor").length,
      pdfArtifactId: pdf.pdf.pdfArtifactId,
      buyerHandoffId: buyer.buyerHandoff.buyerHandoffId,
      status: "approved",
    };
    return { historyRecord, replayRecord };
  });
  return replayApprovedEstimateHistoryRecords({
    records: recordsWithReplay.map((item) => item.historyRecord),
    pageSize: 20,
    loadReplayRecord: (record) =>
      recordsWithReplay.find((item) => item.historyRecord.approvedEstimateId === record.approvedEstimateId)?.replayRecord ?? null,
  });
}

function flag(name: string): boolean {
  return hasFlag(name);
}

export function auditAiEstimateReplayableCoreDriftGuard() {
  const head = currentSourceSha();
  const branch = currentBranch();
  const upstreamSync = currentUpstreamSync();
  const gitStatus = gitStatusPorcelain();
  const coreAudit = runReplayableEstimateCoreAudit({ writeLedger: true }).artifact;
  const migrationPolicy = validateEstimateMigrationRecords().artifact;
  const noSecond = auditNoSecondEstimateEngine().artifact;
  const historyReplay = buildHistoryReplayProof(head);
  const foremanReplay = replayForemanEstimateProof(head);
  const web = latestGreen(WEB_ROOT, GREEN_AI_ESTIMATE_REPLAYABLE_CORE_WEB_SMOKE);
  const android = latestGreen(ANDROID_ROOT, GREEN_AI_ESTIMATE_REPLAYABLE_CORE_ANDROID_SMOKE);
  const parity = latestGreen(PARITY_ROOT, GREEN_AI_ESTIMATE_REPLAYABLE_CORE_WEB_ANDROID_PARITY);

  const sourceGates = {
    targeted_tests_passed: flag("targeted-tests-passed"),
    typecheck_passed: flag("typecheck-passed"),
    lint_passed: flag("lint-passed"),
    diff_check_passed: flag("diff-check-passed"),
    no_test_weakening_passed: flag("no-test-weakening-passed"),
    secret_scan_passed: flag("secret-scan-passed"),
  };

  const webFresh = sourceSha(web?.summary) === head;
  const androidFresh = sourceSha(android?.summary) === head;
  const parityFresh = sourceSha(parity?.summary) === head;
  const webPassed =
    webFresh &&
    web?.summary.actual_web_browser_replay_guard_passed === true &&
    web?.summary.web_replay_cases_passed === "380/380" &&
    Number(web?.summary.web_console_errors_count ?? -1) === 0;
  const androidPassed =
    androidFresh &&
    android?.summary.actual_android_emulator_replay_guard_passed === true &&
    android?.summary.android_replay_cases_passed === "380/380" &&
    Number(android?.summary.android_console_errors_count ?? -1) === 0 &&
    android?.summary.android_emulator_health_degraded === false;
  const parityPassed =
    parityFresh &&
    parity?.summary.same_replay_corpus_used_for_web_android === true &&
    parity?.summary.web_android_case_id_parity === true &&
    parity?.summary.web_android_boq_hash_parity === true &&
    parity?.summary.web_android_material_quantity_hash_parity === true &&
    parity?.summary.web_android_costing_hash_parity === true &&
    parity?.summary.web_android_pdf_package_hash_parity === true &&
    parity?.summary.web_android_buyer_handoff_hash_parity === true;

  const blockers = [
    branch === "release/ios-after-build48-integration" ? "" : `branch:${branch}`,
    upstreamSync === "0 0" ? "" : `upstream_sync:${upstreamSync}`,
    gitStatus.length === 0 ? "" : "worktree_not_clean",
    coreAudit.final_status === GREEN_AI_ESTIMATE_REPLAYABLE_CORE_AUDIT ? "" : "core_replay_audit_failed",
    migrationPolicy.final_status === GREEN_AI_ESTIMATE_MIGRATION_RECORD_POLICY ? "" : "migration_policy_failed",
    noSecond.passed ? "" : `no_second_engine:${(noSecond.violations as string[]).join("|")}`,
    historyReplay.passed ? "" : `approved_history_replay:${historyReplay.blocking_reasons.join("|")}`,
    foremanReplay.passed ? "" : `foreman_replay:${foremanReplay.blocking_reasons.join("|")}`,
    webPassed ? "" : webFresh ? "web_replay_smoke_failed" : "web_replay_smoke_missing_or_stale",
    androidPassed ? "" : androidFresh ? "android_replay_smoke_failed" : "android_replay_smoke_missing_or_stale",
    parityPassed ? "" : parityFresh ? "web_android_replay_parity_failed" : "web_android_replay_parity_missing_or_stale",
    ...Object.entries(sourceGates).map(([key, value]) => (value ? "" : key)),
  ].filter(Boolean);
  const green = blockers.length === 0;
  const summary = {
    final_status: green
      ? GREEN_AI_ESTIMATE_REPLAYABLE_CORE_DRIFT_GUARD
      : STOP_AI_ESTIMATE_REPLAYABLE_CORE_DRIFT_GUARD,
    source_sha: head,
    branch,
    upstream_sync: upstreamSync,
    generated_at: new Date().toISOString(),
    replay_core_contract_created: coreAudit.replay_core_contract_created === true,
    replay_record_builder_created: coreAudit.replay_record_builder_created === true,
    replay_runner_created: coreAudit.replay_runner_created === true,
    replay_comparator_created: coreAudit.replay_comparator_created === true,
    replay_corpus_created: coreAudit.replay_corpus_created === true,
    replay_cases_total: coreAudit.replay_cases_total,
    replay_cases_passed: coreAudit.replay_cases_passed,
    all_replay_records_have_snapshot: coreAudit.all_replay_records_have_snapshot === true,
    all_replay_records_have_version_lineage: coreAudit.all_replay_records_have_version_lineage === true,
    all_hashes_match: coreAudit.all_hashes_match === true,
    silent_drift_count: coreAudit.silent_drift_count,
    drift_policy_created: migrationPolicy.drift_policy_created === true,
    migration_record_schema_created: migrationPolicy.migration_record_schema_created === true,
    silent_drift_rejected: migrationPolicy.silent_drift_rejected === true,
    migration_record_required_for_drift: migrationPolicy.migration_record_required_for_drift === true,
    owner_review_required_for_costing_formula_or_catalog_change:
      migrationPolicy.owner_review_required_for_costing_formula_or_catalog_change === true,
    approved_history_replay_guard_created: historyReplay.approved_history_replay_guard_created,
    history_replay_does_not_load_all_payloads: historyReplay.history_replay_does_not_load_all_payloads,
    history_page_size_lte_20: historyReplay.history_page_size_lte_20,
    approved_history_records_checked: historyReplay.approved_history_records_checked,
    replay_payloads_loaded: historyReplay.replay_payloads_loaded,
    foreman_estimate_replay_guard_created: foremanReplay.foreman_estimate_replay_guard_created,
    foreman_materials_replay_passed: foremanReplay.foreman_materials_replay_passed,
    foreman_subcontracts_replay_passed: foremanReplay.foreman_subcontracts_replay_passed,
    foreman_pdf_uses_latest_revision: foremanReplay.foreman_pdf_uses_latest_revision,
    foreman_buyer_uses_latest_revision: foremanReplay.foreman_buyer_uses_latest_revision,
    no_second_estimate_engine_passed: noSecond.no_second_estimate_engine_passed,
    no_screen_local_calculation_passed: noSecond.no_screen_local_calculation_passed,
    no_duplicate_pdf_engine_passed: noSecond.no_duplicate_pdf_engine_passed,
    no_duplicate_buyer_handoff_engine_passed: noSecond.no_duplicate_buyer_handoff_engine_passed,
    actual_web_browser_replay_guard_passed: webPassed,
    web_replay_cases_passed: String(web?.summary.web_replay_cases_passed ?? "0/380"),
    web_console_errors_count: Number(web?.summary.web_console_errors_count ?? -1),
    actual_android_emulator_replay_guard_passed: androidPassed,
    android_replay_cases_passed: String(android?.summary.android_replay_cases_passed ?? "0/380"),
    android_console_errors_count: Number(android?.summary.android_console_errors_count ?? -1),
    android_emulator_health_degraded: android?.summary.android_emulator_health_degraded === true,
    same_replay_corpus_used_for_web_android: parity?.summary.same_replay_corpus_used_for_web_android === true,
    web_android_case_id_parity: parity?.summary.web_android_case_id_parity === true,
    web_android_boq_hash_parity: parity?.summary.web_android_boq_hash_parity === true,
    web_android_material_quantity_hash_parity: parity?.summary.web_android_material_quantity_hash_parity === true,
    web_android_costing_hash_parity: parity?.summary.web_android_costing_hash_parity === true,
    web_android_pdf_package_hash_parity: parity?.summary.web_android_pdf_package_hash_parity === true,
    web_android_buyer_handoff_hash_parity: parity?.summary.web_android_buyer_handoff_hash_parity === true,
    ...sourceGates,
    owner_go_no_go_started: false,
    marketplace_touched: false,
    rfq_touched: false,
    warehouse_touched: false,
    payment_touched: false,
    native_build_started: false,
    eas_started: false,
    release_started: false,
    production_db_touched: false,
    full_jest_started: false,
    fake_green_claimed: false,
    web_summary_path: web?.path ?? null,
    android_summary_path: android?.path ?? null,
    parity_summary_path: parity?.path ?? null,
    blocking_reasons: blockers,
  };
  const result = writeRuntimeJson(ROOT, summary);
  return {
    artifactPath: result.artifactPath,
    artifact: summary,
  };
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/estimate/auditAiEstimateReplayableCoreDriftGuard.ts")) {
  const result = auditAiEstimateReplayableCoreDriftGuard();
  console.log(JSON.stringify({
    artifact: result.artifactPath,
    final_status: result.artifact.final_status,
    blocking_reasons: result.artifact.blocking_reasons,
  }, null, 2));
  if (result.artifact.final_status !== GREEN_AI_ESTIMATE_REPLAYABLE_CORE_DRIFT_GUARD) process.exitCode = 1;
}
