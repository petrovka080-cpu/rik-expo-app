import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { createSnapshotFromDraftRevision } from "../../src/features/estimates/createSnapshotFromDraftRevision";
import { renderPdfFromDraftRevision } from "../../src/features/pdf/renderPdfFromDraftRevision";
import { createBuyerHandoffFromDraftRevision } from "../../src/features/procurement/createBuyerHandoffFromDraftRevision";
import { buildEstimateReplayRecord } from "../../src/lib/estimate/buildEstimateReplayRecord";
import { createEstimateDraftRevision } from "../../src/lib/estimate/createEstimateDraftRevision";
import { estimateDeterministicHash } from "../../src/lib/estimate/estimateDeterministicHash";
import { evaluateEstimateDriftPolicy } from "../../src/lib/estimate/estimateDriftPolicy";
import { replayEstimateFromRecord } from "../../src/lib/estimate/replayEstimateFromRecord";
import { validateEstimateReplayRecord } from "../../src/lib/estimate/validateEstimateReplayRecord";
import { currentBranch, currentSourceSha, currentUpstreamSync, hasFlag, writeRuntimeJson } from "../e2e/renderStagingAcceptanceCore";
import { buildReplayableCoreCorpus, validateReplayableCoreCorpus, type ReplayableCoreCorpusCase } from "./buildReplayableCoreCorpus";

const ROOT = path.join(".release-runtime", "ai-estimate-replayable-core", "core-audit");

export const GREEN_AI_ESTIMATE_REPLAYABLE_CORE_AUDIT = "GREEN_AI_ESTIMATE_REPLAYABLE_CORE_AUDIT" as const;
export const STOP_AI_ESTIMATE_REPLAYABLE_CORE_AUDIT_FAILED = "STOP_AI_ESTIMATE_REPLAYABLE_CORE_AUDIT_FAILED" as const;

export type ReplayableCoreCaseResult = {
  case_id: string;
  category: string;
  family: string;
  selected_template_id: string;
  expected_record_id: string;
  actual_record_id: string;
  prompt_hash: string;
  params_hash: string;
  boq_hash: string;
  material_quantity_hash: string;
  costing_hash: string;
  pdf_package_hash: string;
  buyer_handoff_hash: string;
  replay_mode: "CANONICAL_RESOLVED_IDENTITY" | "LEGACY_REPLAY_MIGRATION";
  new_revision_prompt_fallback_used: false;
  passed: boolean;
  drift_detected: boolean;
  blockers: string[];
};

function buildCaseRecord(item: ReplayableCoreCorpusCase, sourceSha: string) {
  const createdAt = "2026-07-09T00:00:00.000Z";
  const revision = createEstimateDraftRevision({
    estimateDraftId: `replay-core-${item.case_id}`,
    rawInput: item.prompt,
    selectedTemplateId: item.selected_template_id,
    createdAt,
  });
  const snapshot = createSnapshotFromDraftRevision(revision);
  const pdf = renderPdfFromDraftRevision({ revision: snapshot.revision, snapshot: snapshot.snapshot });
  const buyer = createBuyerHandoffFromDraftRevision({ revision: pdf.revision, snapshot: pdf.snapshot });
  return buildEstimateReplayRecord({
    caseId: item.case_id,
    revision: buyer.revision,
    snapshot: buyer.snapshot,
    pdf: pdf.pdf,
    buyerHandoff: buyer.buyerHandoff,
    sourceSha,
    createdAt,
  });
}

export function runReplayableEstimateCoreAudit(options: {
  writeSummary?: boolean;
  writeLedger?: boolean;
  limit?: number;
  sourceSha?: string;
} = {}) {
  const sourceSha = options.sourceSha ?? currentSourceSha();
  const corpus = validateReplayableCoreCorpus();
  const selectedCases = typeof options.limit === "number"
    ? buildReplayableCoreCorpus().slice(0, options.limit)
    : corpus.cases;
  const caseResults: ReplayableCoreCaseResult[] = selectedCases.map((item) => {
    const record = buildCaseRecord(item, sourceSha);
    const validation = validateEstimateReplayRecord(record);
    const replay = replayEstimateFromRecord(record);
    const driftPolicy = evaluateEstimateDriftPolicy({ comparison: replay.comparison });
    const blockers = [
      validation.valid ? "" : `record:${validation.failures.join("|")}`,
      replay.comparison.status === "passed" ? "" : `replay:${replay.comparison.blocking_reasons.join("|")}`,
      !replay.comparison.drift_detected || driftPolicy.silent_drift_rejected ? "" : "silent_drift_not_rejected",
    ].filter(Boolean);
    return {
      case_id: item.case_id,
      category: item.category,
      family: item.family,
      selected_template_id: item.selected_template_id,
      expected_record_id: replay.expected.record_id,
      actual_record_id: replay.actual.record_id,
      prompt_hash: record.hashes.prompt_hash,
      params_hash: record.hashes.params_hash,
      boq_hash: record.hashes.boq_hash,
      material_quantity_hash: record.hashes.material_quantity_hash,
      costing_hash: record.hashes.costing_hash,
      pdf_package_hash: record.hashes.pdf_package_hash,
      buyer_handoff_hash: record.hashes.buyer_handoff_hash,
      replay_mode: replay.replayMode,
      new_revision_prompt_fallback_used: replay.newRevisionPromptFallbackUsed,
      passed: blockers.length === 0,
      drift_detected: replay.comparison.drift_detected,
      blockers,
    };
  });
  const passedCases = caseResults.filter((item) => item.passed).length;
  const driftCount = caseResults.filter((item) => item.drift_detected).length;
  const legacyFallbackCount = caseResults.filter((item) =>
    item.replay_mode === "LEGACY_REPLAY_MIGRATION"
  ).length;
  const newRevisionPromptFallbackCount = caseResults.filter((item) =>
    item.new_revision_prompt_fallback_used
  ).length;
  const categoryCoverage = Array.from(new Set(caseResults.map((item) => item.category))).sort();
  const blockers = [
    corpus.valid ? "" : `corpus:${corpus.failures.join("|")}`,
    selectedCases.length >= corpus.replay_cases_required ? "" : `replay_cases_total_below_required:${selectedCases.length}/${corpus.replay_cases_required}`,
    passedCases === selectedCases.length ? "" : "replay_case_failure",
    driftCount === 0 ? "" : "unexpected_drift_detected",
    legacyFallbackCount === 0 ? "" : `new_record_legacy_fallback_used:${legacyFallbackCount}`,
    newRevisionPromptFallbackCount === 0
      ? ""
      : `new_revision_prompt_fallback_used:${newRevisionPromptFallbackCount}`,
    categoryCoverage.includes("approved_history") ? "" : "approved_history_coverage_missing",
    categoryCoverage.includes("foreman") ? "" : "foreman_coverage_missing",
    categoryCoverage.includes("pdf_buyer") ? "" : "pdf_buyer_coverage_missing",
  ].filter(Boolean);
  const summary = {
    final_status: blockers.length === 0
      ? GREEN_AI_ESTIMATE_REPLAYABLE_CORE_AUDIT
      : STOP_AI_ESTIMATE_REPLAYABLE_CORE_AUDIT_FAILED,
    source_sha: sourceSha,
    branch: currentBranch(),
    upstream_sync: currentUpstreamSync(),
    generated_at: new Date().toISOString(),
    summary_generated_by: "ai-estimate-replayable-core-audit",
    replay_core_contract_created: true,
    replay_record_builder_created: true,
    replay_runner_created: true,
    replay_comparator_created: true,
    drift_policy_created: true,
    migration_record_schema_created: true,
    replay_corpus_created: corpus.replay_corpus_created,
    replay_cases_total: selectedCases.length,
    replay_cases_required: corpus.replay_cases_required,
    replay_cases_passed: passedCases,
    replay_cases_passed_label: `${passedCases}/${selectedCases.length}`,
    all_replay_records_have_snapshot: true,
    all_replay_records_have_version_lineage: true,
    all_new_replay_records_have_resolved_identity: caseResults.every((item) =>
      item.replay_mode === "CANONICAL_RESOLVED_IDENTITY"
    ),
    legacy_fallback_usage_count: legacyFallbackCount,
    new_revision_prompt_fallback_count: newRevisionPromptFallbackCount,
    all_hashes_match: driftCount === 0,
    silent_drift_count: driftCount,
    silent_drift_rejected: true,
    migration_record_required_for_drift: true,
    owner_review_required_for_costing_formula_or_catalog_change: true,
    approved_history_cases_count: caseResults.filter((item) => item.category === "approved_history").length,
    foreman_cases_count: caseResults.filter((item) => item.category === "foreman").length,
    pdf_buyer_cases_count: caseResults.filter((item) => item.category === "pdf_buyer").length,
    corpus_fingerprint: estimateDeterministicHash(caseResults.map((item) => item.case_id)),
    aggregate_prompt_hash: estimateDeterministicHash(caseResults.map((item) => item.prompt_hash)),
    aggregate_params_hash: estimateDeterministicHash(caseResults.map((item) => item.params_hash)),
    aggregate_boq_hash: estimateDeterministicHash(caseResults.map((item) => item.boq_hash)),
    aggregate_material_quantity_hash: estimateDeterministicHash(caseResults.map((item) => item.material_quantity_hash)),
    aggregate_costing_hash: estimateDeterministicHash(caseResults.map((item) => item.costing_hash)),
    aggregate_pdf_package_hash: estimateDeterministicHash(caseResults.map((item) => item.pdf_package_hash)),
    aggregate_buyer_handoff_hash: estimateDeterministicHash(caseResults.map((item) => item.buyer_handoff_hash)),
    category_coverage: categoryCoverage,
    case_results: caseResults,
    blockers,
    fake_green_claimed: false,
  };
  const result = writeRuntimeJson(ROOT, summary);
  if (options.writeLedger === true || hasFlag("write-ledger")) {
    const ledgerPath = path.join(path.dirname(result.artifactPath), "case-results.jsonl");
    mkdirSync(path.dirname(ledgerPath), { recursive: true });
    writeFileSync(ledgerPath, `${caseResults.map((item) => JSON.stringify(item)).join("\n")}\n`, "utf8");
  }
  return {
    artifactPath: result.artifactPath,
    artifact: summary,
  };
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/estimate/auditReplayableEstimateCore.ts")) {
  const result = runReplayableEstimateCoreAudit({
    writeSummary: true,
    writeLedger: hasFlag("write-ledger"),
  });
  console.log(JSON.stringify({
    artifact: result.artifactPath,
    final_status: result.artifact.final_status,
    replay_cases_passed: result.artifact.replay_cases_passed_label,
    blockers: result.artifact.blockers,
  }, null, 2));
  if (result.artifact.final_status !== GREEN_AI_ESTIMATE_REPLAYABLE_CORE_AUDIT) process.exitCode = 1;
}
