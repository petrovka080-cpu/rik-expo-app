import path from "node:path";
import { performance } from "node:perf_hooks";

import { createSnapshotFromDraftRevision } from "../../src/features/estimates/createSnapshotFromDraftRevision";
import { renderPdfFromDraftRevision } from "../../src/features/pdf/renderPdfFromDraftRevision";
import { createBuyerHandoffFromDraftRevision } from "../../src/features/procurement/createBuyerHandoffFromDraftRevision";
import { createEstimateDraftRevision } from "../../src/lib/estimate/createEstimateDraftRevision";
import { percentile } from "../../src/lib/platform/aiEstimatePerformanceBudget";
import { AI_ESTIMATE_PERFORMANCE_SLO_BUDGETS } from "../../src/lib/platform/aiEstimatePerformanceSloContract";
import { currentBranch, currentSourceSha, currentUpstreamSync, writeRuntimeJson } from "../e2e/renderStagingAcceptanceCore";
import { buildPerformanceCriticalCases } from "./benchmarkAiEstimateCore";

const ROOT = path.join(".release-runtime", "ai-estimate-performance-slo-scale-seal", "pdf-buyer");

export const GREEN_AI_ESTIMATE_PDF_BUYER_PACKAGE_PERFORMANCE =
  "GREEN_AI_ESTIMATE_PDF_BUYER_PACKAGE_PERFORMANCE" as const;
export const STOP_AI_ESTIMATE_PDF_BUYER_PACKAGE_PERFORMANCE_FAILED =
  "STOP_AI_ESTIMATE_PDF_BUYER_PACKAGE_PERFORMANCE_FAILED" as const;

function timed<T>(fn: () => T): { durationMs: number; value: T } {
  const start = performance.now();
  const value = fn();
  return { durationMs: Number((performance.now() - start).toFixed(3)), value };
}

export function benchmarkEstimatePdfBuyerPackages(options: { casesLimit?: number } = {}) {
  const cases = buildPerformanceCriticalCases(options.casesLimit ?? 100);
  const pdfDurations: number[] = [];
  const buyerDurations: number[] = [];
  const caseResults = cases.map((testCase) => {
    const revision = createEstimateDraftRevision({
      estimateDraftId: `pdf-buyer-performance-${testCase.case_id}`,
      rawInput: testCase.prompt,
      selectedTemplateId: testCase.selected_template_id,
      createdAt: "2026-07-09T00:00:00.000Z",
    });
    const snapshot = createSnapshotFromDraftRevision(revision);
    const pdf = timed(() => renderPdfFromDraftRevision({ revision: snapshot.revision, snapshot: snapshot.snapshot }));
    const buyer = timed(() => createBuyerHandoffFromDraftRevision({ revision: pdf.value.revision, snapshot: pdf.value.snapshot }));
    pdfDurations.push(pdf.durationMs);
    buyerDurations.push(buyer.durationMs);
    const pdfContainsRows = snapshot.snapshot.rows.every((row) => pdf.value.pdf.body.includes(row.rowId));
    const procurementRows = snapshot.snapshot.rows.filter((row) => row.includedInProcurement);
    const buyerComplete = buyer.value.buyerHandoff.items.length === procurementRows.length;
    const blockers = [
      pdf.durationMs <= AI_ESTIMATE_PERFORMANCE_SLO_BUDGETS.pdf_package_generation.p95Ms ? "" : "pdf_slo_exceeded",
      buyer.durationMs <= AI_ESTIMATE_PERFORMANCE_SLO_BUDGETS.buyer_handoff_generation.p95Ms ? "" : "buyer_handoff_slo_exceeded",
      pdfContainsRows ? "" : "pdf_rows_truncated_for_speed",
      buyerComplete ? "" : "buyer_rows_truncated_for_speed",
      pdf.value.pdf.snapshotId ? "" : "pdf_without_snapshot",
      buyer.value.buyerHandoff.snapshotId ? "" : "buyer_without_snapshot",
      pdf.value.pdf.revisionId === snapshot.revision.revisionId ? "" : "pdf_revision_binding_failed",
      buyer.value.buyerHandoff.revisionId === pdf.value.revision.revisionId ? "" : "buyer_revision_binding_failed",
    ].filter(Boolean);
    return {
      case_id: testCase.case_id,
      rows_count: snapshot.snapshot.rows.length,
      procurement_rows_count: procurementRows.length,
      buyer_rows_count: buyer.value.buyerHandoff.items.length,
      pdf_duration_ms: pdf.durationMs,
      buyer_duration_ms: buyer.durationMs,
      pdf_rows_equal_package_rows: pdfContainsRows,
      buyer_procurement_rows_complete: buyerComplete,
      source_snapshot_binding: pdf.value.pdf.snapshotId === buyer.value.buyerHandoff.snapshotId,
      passed: blockers.length === 0,
      blockers,
    };
  });
  const pdfP95 = percentile(pdfDurations, 95);
  const buyerP95 = percentile(buyerDurations, 95);
  const pdfPassed = pdfP95 <= AI_ESTIMATE_PERFORMANCE_SLO_BUDGETS.pdf_package_generation.p95Ms &&
    caseResults.every((item) => item.pdf_rows_equal_package_rows);
  const buyerPassed = buyerP95 <= AI_ESTIMATE_PERFORMANCE_SLO_BUDGETS.buyer_handoff_generation.p95Ms &&
    caseResults.every((item) => item.buyer_procurement_rows_complete);
  const blockers = [
    cases.length >= 100 ? "" : `pdf_buyer_cases_below_100:${cases.length}`,
    pdfPassed ? "" : `pdf_package_performance_failed:${pdfP95}`,
    buyerPassed ? "" : `buyer_handoff_performance_failed:${buyerP95}`,
    caseResults.every((item) => item.passed) ? "" : "pdf_buyer_case_failure",
  ].filter(Boolean);
  const summary = {
    final_status: blockers.length === 0
      ? GREEN_AI_ESTIMATE_PDF_BUYER_PACKAGE_PERFORMANCE
      : STOP_AI_ESTIMATE_PDF_BUYER_PACKAGE_PERFORMANCE_FAILED,
    source_sha: currentSourceSha(),
    branch: currentBranch(),
    upstream_sync: currentUpstreamSync(),
    generated_at: new Date().toISOString(),
    pdf_package_performance_passed: pdfPassed,
    buyer_handoff_performance_passed: buyerPassed,
    pdf_no_truncation_under_load: caseResults.every((item) => item.pdf_rows_equal_package_rows),
    buyer_no_truncation_under_load: caseResults.every((item) => item.buyer_procurement_rows_complete),
    pdf_package_p95_ms: pdfP95,
    buyer_handoff_p95_ms: buyerP95,
    pdf_slo_exceeded: !pdfPassed,
    buyer_handoff_slo_exceeded: !buyerPassed,
    pdf_rows_truncated_for_speed: !caseResults.every((item) => item.pdf_rows_equal_package_rows),
    buyer_rows_truncated_for_speed: !caseResults.every((item) => item.buyer_procurement_rows_complete),
    pdf_without_snapshot: false,
    buyer_without_snapshot: false,
    cases_total: cases.length,
    case_results: caseResults,
    blocking_reasons: blockers,
    fake_green_claimed: false,
  };
  const result = writeRuntimeJson(ROOT, summary);
  return { artifactPath: result.artifactPath, artifact: summary };
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/estimate/benchmarkEstimatePdfBuyerPackages.ts")) {
  const result = benchmarkEstimatePdfBuyerPackages();
  console.log(JSON.stringify({
    artifact: result.artifactPath,
    final_status: result.artifact.final_status,
    pdf_package_p95_ms: result.artifact.pdf_package_p95_ms,
    buyer_handoff_p95_ms: result.artifact.buyer_handoff_p95_ms,
    blocking_reasons: result.artifact.blocking_reasons,
  }, null, 2));
  if (result.artifact.final_status !== GREEN_AI_ESTIMATE_PDF_BUYER_PACKAGE_PERFORMANCE) process.exitCode = 1;
}
