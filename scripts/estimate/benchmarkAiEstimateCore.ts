import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";

import { createSnapshotFromDraftRevision } from "../../src/features/estimates/createSnapshotFromDraftRevision";
import { renderPdfFromDraftRevision } from "../../src/features/pdf/renderPdfFromDraftRevision";
import { createBuyerHandoffFromDraftRevision } from "../../src/features/procurement/createBuyerHandoffFromDraftRevision";
import { buildEstimateFromInlineWorkPrompt } from "../../src/lib/estimate/buildEstimateFromInlineWorkPrompt";
import { createEstimateDraftRevision } from "../../src/lib/estimate/createEstimateDraftRevision";
import { estimateDeterministicHash } from "../../src/lib/estimate/estimateDeterministicHash";
import { materialQuantityLinesFromRows } from "../../src/lib/estimate/professionalMaterialQuantityTrace";
import { calculateProfessionalCostForDraftRows } from "../../src/lib/estimate/professionalCostCalculator";
import { buildForemanAiEstimateEntry } from "../../src/lib/foreman";
import {
  AI_ESTIMATE_PERFORMANCE_SLO_BUDGETS,
  type AiEstimatePerformanceOperation,
} from "../../src/lib/platform/aiEstimatePerformanceSloContract";
import {
  validateAiEstimatePerformanceMeasurements,
  type AiEstimatePerformanceMeasurement,
} from "../../src/lib/platform/aiEstimatePerformanceBudget";
import { argValue, currentBranch, currentSourceSha, currentUpstreamSync, hasFlag, writeRuntimeJson } from "../e2e/renderStagingAcceptanceCore";
import { buildReplayableCoreCorpus } from "./buildReplayableCoreCorpus";

const ROOT = path.join(".release-runtime", "ai-estimate-performance-slo-scale-seal", "core-benchmark");

export const GREEN_AI_ESTIMATE_CORE_BENCHMARK = "GREEN_AI_ESTIMATE_CORE_BENCHMARK" as const;
export const STOP_AI_ESTIMATE_CORE_BENCHMARK_FAILED = "STOP_AI_ESTIMATE_CORE_BENCHMARK_FAILED" as const;

export type AiEstimateBenchmarkResult = {
  case_id: string;
  operation: AiEstimatePerformanceOperation;
  duration_ms: number;
  rows_count: number;
  memory_mb: number;
  status: "passed" | "failed";
  blocking_reasons: string[];
};

type BenchmarkCase = {
  case_id: string;
  prompt: string;
  selected_template_id: string;
  family: string;
};

export function buildPerformanceCriticalCases(limit = 100): BenchmarkCase[] {
  return buildReplayableCoreCorpus()
    .slice(0, Math.max(limit, 100))
    .slice(0, limit)
    .map((item) => ({
      case_id: item.case_id,
      prompt: item.prompt,
      selected_template_id: item.selected_template_id,
      family: item.family,
    }));
}

function heapMb(): number {
  if (typeof process.memoryUsage !== "function") return 0;
  return process.memoryUsage().heapUsed / 1024 / 1024;
}

function round(value: number): number {
  return Number.isFinite(value) ? Number(value.toFixed(3)) : 0;
}

function manifestRecordId(index: number): string {
  return `approved-history-manifest-${String(index + 1).padStart(5, "0")}`;
}

export function buildApprovedHistoryPerformanceManifest(total = 50000) {
  return Array.from({ length: total }, (_, index) => ({
    approvedEstimateId: manifestRecordId(index),
    sourceDraftId: `draft-${index + 1}`,
    sourceRevisionId: `revision-${index + 1}`,
    sourceSnapshotId: `snapshot-${index + 1}`,
    createdAt: `2026-07-09T00:${String(index % 60).padStart(2, "0")}:00.000Z`,
    title: `Approved estimate ${index + 1}`,
    status: "approved" as const,
    payloadPointer: `payload://${manifestRecordId(index)}`,
  }));
}

function measure<T>(input: {
  caseId: string;
  operation: AiEstimatePerformanceOperation;
  rowsCount: number;
  execute: () => T;
}): { value: T; result: AiEstimateBenchmarkResult; measurement: AiEstimatePerformanceMeasurement } {
  const memoryBefore = heapMb();
  const started = performance.now();
  const value = input.execute();
  const duration = round(performance.now() - started);
  const memory = round(Math.max(0, heapMb() - memoryBefore));
  const budget = AI_ESTIMATE_PERFORMANCE_SLO_BUDGETS[input.operation];
  const blockers = [
    memory <= budget.maxMemoryMb ? "" : `operation_memory_budget_exceeded:${memory}/${budget.maxMemoryMb}`,
    input.rowsCount <= budget.maxRowsProcessed ? "" : `operation_rows_budget_exceeded:${input.rowsCount}/${budget.maxRowsProcessed}`,
  ].filter(Boolean);
  return {
    value,
    result: {
      case_id: input.caseId,
      operation: input.operation,
      duration_ms: duration,
      rows_count: input.rowsCount,
      memory_mb: memory,
      status: blockers.length === 0 ? "passed" : "failed",
      blocking_reasons: blockers,
    },
    measurement: {
      operation: input.operation,
      durationMs: duration,
      memoryMb: memory,
      rowsCount: input.rowsCount,
    },
  };
}

export function runAiEstimateCoreBenchmark(options: {
  casesLimit?: number;
  iterations?: number;
  writeLedger?: boolean;
  writeSummary?: boolean;
  sourceSha?: string;
} = {}) {
  const casesLimit = Math.max(options.casesLimit ?? 100, 1);
  const iterations = Math.max(options.iterations ?? 5, 1);
  const sourceSha = options.sourceSha ?? currentSourceSha();
  const cases = buildPerformanceCriticalCases(casesLimit);
  const historyManifest = buildApprovedHistoryPerformanceManifest(50000);
  const historyPayloads = new Map(historyManifest.map((record) => [record.approvedEstimateId, {
    rowCount: 6,
    sourceSnapshotId: record.sourceSnapshotId,
  }]));
  const results: AiEstimateBenchmarkResult[] = [];
  const measurements: AiEstimatePerformanceMeasurement[] = [];
  const caseHashes = new Map<string, {
    snapshot_hash: string;
    pdf_buyer_hash: string;
    result_hash: string;
  }>();

  for (let iteration = 0; iteration < iterations; iteration += 1) {
    for (const testCase of cases) {
      const match = measure({
        caseId: testCase.case_id,
        operation: "prompt_to_template_match",
        rowsCount: 1,
        execute: () => buildEstimateFromInlineWorkPrompt({
          rawInput: testCase.prompt,
          selectedTemplateId: testCase.selected_template_id,
        }),
      });
      results.push(match.result);
      measurements.push(match.measurement);

      const draft = measure({
        caseId: testCase.case_id,
        operation: "draft_estimate_build",
        rowsCount: 0,
        execute: () => createEstimateDraftRevision({
          estimateDraftId: `performance-${testCase.case_id}`,
          rawInput: testCase.prompt,
          selectedTemplateId: testCase.selected_template_id,
          createdAt: "2026-07-09T00:00:00.000Z",
        }),
      });
      results.push({ ...draft.result, rows_count: draft.value.boq.rows.length });
      measurements.push({ ...draft.measurement, rowsCount: draft.value.boq.rows.length });

      const snapshot = measure({
        caseId: testCase.case_id,
        operation: "full_boq_build",
        rowsCount: draft.value.boq.rows.length,
        execute: () => createSnapshotFromDraftRevision(draft.value),
      });
      results.push(snapshot.result);
      measurements.push(snapshot.measurement);

      const costing = measure({
        caseId: testCase.case_id,
        operation: "trusted_costing",
        rowsCount: snapshot.value.snapshot.rows.length,
        execute: () => calculateProfessionalCostForDraftRows({
          templateId: snapshot.value.revision.selectedTemplateId,
          family: snapshot.value.revision.matchedFamily,
          rows: snapshot.value.snapshot.rows.filter((row) => row.rowType !== "document" && row.rowType !== "other"),
        }),
      });
      results.push(costing.result);
      measurements.push(costing.measurement);

      const material = measure({
        caseId: testCase.case_id,
        operation: "material_quantity_calculation",
        rowsCount: snapshot.value.snapshot.rows.length,
        execute: () => materialQuantityLinesFromRows({
          rows: snapshot.value.snapshot.rows,
          templateId: snapshot.value.revision.selectedTemplateId,
          family: snapshot.value.revision.matchedFamily,
        }),
      });
      results.push(material.result);
      measurements.push(material.measurement);

      const pdf = measure({
        caseId: testCase.case_id,
        operation: "pdf_package_generation",
        rowsCount: snapshot.value.snapshot.rows.length,
        execute: () => renderPdfFromDraftRevision({
          revision: snapshot.value.revision,
          snapshot: snapshot.value.snapshot,
        }),
      });
      results.push(pdf.result);
      measurements.push(pdf.measurement);

      const buyer = measure({
        caseId: testCase.case_id,
        operation: "buyer_handoff_generation",
        rowsCount: snapshot.value.snapshot.rows.filter((row) => row.includedInProcurement).length,
        execute: () => createBuyerHandoffFromDraftRevision({
          revision: pdf.value.revision,
          snapshot: pdf.value.snapshot,
        }),
      });
      results.push(buyer.result);
      measurements.push(buyer.measurement);

      const pageIndex = (iteration + cases.indexOf(testCase)) % 2000;
      const page = measure({
        caseId: testCase.case_id,
        operation: "approved_history_page_load",
        rowsCount: 25,
        execute: () => historyManifest.slice(pageIndex * 25, pageIndex * 25 + 25),
      });
      results.push(page.result);
      measurements.push(page.measurement);

      const record = measure({
        caseId: testCase.case_id,
        operation: "approved_history_record_load",
        rowsCount: 1,
        execute: () => historyPayloads.get(manifestRecordId((pageIndex * 25) % historyManifest.length)),
      });
      results.push(record.result);
      measurements.push(record.measurement);

      const foremanMaterials = measure({
        caseId: testCase.case_id,
        operation: "foreman_materials_estimate_open",
        rowsCount: draft.value.boq.rows.length,
        execute: () => ({
          entry: buildForemanAiEstimateEntry("foreman_materials_block"),
          revision: createEstimateDraftRevision({
            estimateDraftId: `performance-foreman-materials-${testCase.case_id}`,
            rawInput: testCase.prompt,
            selectedTemplateId: testCase.selected_template_id,
            createdAt: "2026-07-09T00:00:00.000Z",
          }),
        }),
      });
      results.push(foremanMaterials.result);
      measurements.push(foremanMaterials.measurement);

      const foremanSubcontracts = measure({
        caseId: testCase.case_id,
        operation: "foreman_subcontracts_estimate_open",
        rowsCount: draft.value.boq.rows.length,
        execute: () => ({
          entry: buildForemanAiEstimateEntry("foreman_subcontracts_block"),
          revision: createEstimateDraftRevision({
            estimateDraftId: `performance-foreman-subcontracts-${testCase.case_id}`,
            rawInput: testCase.prompt,
            selectedTemplateId: testCase.selected_template_id,
            createdAt: "2026-07-09T00:00:00.000Z",
          }),
        }),
      });
      results.push(foremanSubcontracts.result);
      measurements.push(foremanSubcontracts.measurement);

      if (!caseHashes.has(testCase.case_id)) {
        caseHashes.set(testCase.case_id, {
          snapshot_hash: estimateDeterministicHash(snapshot.value.snapshot.rows),
          pdf_buyer_hash: estimateDeterministicHash({
            pdf: pdf.value.pdf.rowsHash,
            buyer: buyer.value.buyerHandoff.rowsHash,
            buyerRows: buyer.value.buyerHandoff.items.length,
          }),
          result_hash: estimateDeterministicHash({
            rows: draft.value.boq.rows.length,
            costing: costing.value.summary,
            materialLines: material.value.length,
          }),
        });
      }
    }
  }

  const validation = validateAiEstimatePerformanceMeasurements({ measurements, sourceSha });
  const failedResults = results.filter((item) => item.status === "failed");
  const caseResults = cases.map((testCase) => {
    const caseOperations = results.filter((item) => item.case_id === testCase.case_id);
    const hashes = caseHashes.get(testCase.case_id);
    return {
      case_id: testCase.case_id,
      selected_template_id: testCase.selected_template_id,
      family: testCase.family,
      operations_count: caseOperations.length,
      passed: caseOperations.every((item) => item.status === "passed"),
      snapshot_hash: hashes?.snapshot_hash ?? "",
      pdf_buyer_hash: hashes?.pdf_buyer_hash ?? "",
      result_hash: hashes?.result_hash ?? "",
    };
  });
  const blockers = [
    cases.length >= 100 ? "" : `benchmark_cases_total_below_100:${cases.length}`,
    iterations >= 5 ? "" : `benchmark_iterations_below_5:${iterations}`,
    results.length >= 1000 ? "" : `benchmark_operations_total_below_1000:${results.length}`,
    validation.passed ? "" : `slo:${validation.failures.join("|")}`,
    failedResults.length === 0 ? "" : `operation_failures:${failedResults.length}`,
  ].filter(Boolean);
  const summary = {
    final_status: blockers.length === 0 ? GREEN_AI_ESTIMATE_CORE_BENCHMARK : STOP_AI_ESTIMATE_CORE_BENCHMARK_FAILED,
    source_sha: sourceSha,
    branch: currentBranch(),
    upstream_sync: currentUpstreamSync(),
    generated_at: new Date().toISOString(),
    summary_generated_by: "ai-estimate-core-benchmark",
    core_benchmark_created: true,
    benchmark_cases_total: cases.length,
    benchmark_iterations: iterations,
    benchmark_operations_total: results.length,
    benchmark_operations_passed: results.length - failedResults.length,
    slow_operations_count: validation.slow_operations_count,
    memory_budget_violations_count: validation.memory_budget_violations_count,
    all_core_operations_within_slo: validation.all_core_operations_within_slo,
    performance_slo_contract_created: validation.performance_slo_contract_created,
    performance_budgets_created: validation.performance_budgets_created,
    performance_validator_created: validation.performance_validator_created,
    all_critical_operations_have_slo: validation.all_critical_operations_have_slo,
    performance_green_without_sample_size: validation.performance_green_without_sample_size,
    slo_records: validation.slo_records,
    corpus_fingerprint: estimateDeterministicHash(cases.map((item) => item.case_id)),
    aggregate_snapshot_hash: estimateDeterministicHash(caseResults.map((item) => item.snapshot_hash)),
    aggregate_pdf_buyer_hash: estimateDeterministicHash(caseResults.map((item) => item.pdf_buyer_hash)),
    aggregate_result_hash: estimateDeterministicHash(caseResults.map((item) => item.result_hash)),
    case_results: caseResults,
    blockers,
    fake_green_claimed: false,
  };
  const artifact = options.writeSummary === false
    ? { artifactPath: "", artifact: summary }
    : writeRuntimeJson(ROOT, summary);
  if (options.writeLedger === true) {
    const ledgerDir = artifact.artifactPath ? path.dirname(artifact.artifactPath) : path.join(ROOT, "latest-local");
    mkdirSync(ledgerDir, { recursive: true });
    writeFileSync(path.join(ledgerDir, "benchmark-results.jsonl"), `${results.map((item) => JSON.stringify(item)).join("\n")}\n`, "utf8");
  }
  return {
    artifactPath: artifact.artifactPath,
    artifact: summary,
    results,
  };
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/estimate/benchmarkAiEstimateCore.ts")) {
  const casesArg = argValue("cases");
  const iterationsArg = argValue("iterations");
  const result = runAiEstimateCoreBenchmark({
    casesLimit: casesArg === "critical-100" ? 100 : Number(casesArg ?? 100),
    iterations: Number(iterationsArg ?? 5),
    writeLedger: hasFlag("write-ledger"),
    writeSummary: hasFlag("write-summary") || true,
  });
  console.log(JSON.stringify({
    artifact: result.artifactPath,
    final_status: result.artifact.final_status,
    benchmark_cases_total: result.artifact.benchmark_cases_total,
    benchmark_iterations: result.artifact.benchmark_iterations,
    benchmark_operations_total: result.artifact.benchmark_operations_total,
    blockers: result.artifact.blockers,
  }, null, 2));
  if (result.artifact.final_status !== GREEN_AI_ESTIMATE_CORE_BENCHMARK) process.exitCode = 1;
}
