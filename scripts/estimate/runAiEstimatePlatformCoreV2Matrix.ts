import path from "node:path";

import { buildAiEstimateCatalogIndex } from "../../src/lib/estimate/catalog/buildAiEstimateCatalogIndex";
import { buildProfessionalWorkPassport } from "../../src/lib/estimate/buildProfessionalWorkPassport";
import { buildNormativeParameterCompletenessModel } from "../../src/lib/estimate/buildNormativeParameterCompletenessModel";
import { createInMemoryAiEstimateHistoryStore } from "../../src/lib/estimate/storage/AiEstimateHistoryStore";
import { validateAiEstimateBuyerPackageParity } from "../../src/lib/estimate/artifacts/validateAiEstimateBuyerPackageParity";
import { validateAiEstimatePdfSnapshotParity } from "../../src/lib/estimate/artifacts/validateAiEstimatePdfSnapshotParity";
import { createAiEstimateRuntime } from "../../src/lib/estimate/runtime/createAiEstimateRuntime";
import { runAiEstimatePlatformCoreV2Harness } from "../e2e/aiEstimateE2eHarness.shared";
import { gitOutput, timestampForPath, writeJson } from "./buildControlledPilotHealthDashboard";

export const GREEN_AI_ESTIMATE_PLATFORM_CORE_V2_MATRIX =
  "GREEN_AI_ESTIMATE_PLATFORM_CORE_V2_MATRIX" as const;
export const STOP_AI_ESTIMATE_PLATFORM_CORE_V2_MATRIX_FAILED =
  "STOP_AI_ESTIMATE_PLATFORM_CORE_V2_MATRIX_FAILED" as const;

const ROOT = path.join(".release-runtime", "ai-estimate-platform-core-v2-semantic-scale-refactor", "matrix");

function stableSample<T>(values: readonly T[], count: number, salt: number): T[] {
  const selected: T[] = [];
  const used = new Set<number>();
  for (let index = 0; selected.length < count && index < values.length * 4; index += 1) {
    const sourceIndex = (index * 41 + salt * 97) % values.length;
    if (used.has(sourceIndex)) continue;
    used.add(sourceIndex);
    selected.push(values[sourceIndex]);
  }
  return selected;
}

function promptForTemplate(templateId: string, index: number): string {
  const passport = buildProfessionalWorkPassport(templateId);
  return [
    passport?.localizedNameRu ?? templateId,
    `${80 + index} m2`,
    "length 20 m",
    "width 5 m",
    "height 3 m",
    "diameter 110 mm",
    "voltage 10 kV",
  ].join(" ");
}

function runCreateCase(templateId: string, index: number): boolean {
  const runtime = createAiEstimateRuntime();
  const draft = runtime.createDraft({
    estimateDraftId: `platform-core-v2-create-${index}-${templateId}`,
    rawInput: promptForTemplate(templateId, index),
    selectedTemplateId: templateId,
    createdAt: "2026-07-09T00:00:00.000Z",
  });
  return draft.revision.selectedTemplateId.length > 0 && draft.revision.boq.rows.length > 0;
}

function runOverrideCase(templateId: string, index: number): boolean {
  const runtime = createAiEstimateRuntime();
  const draft = runtime.createDraft({
    estimateDraftId: `platform-core-v2-override-${index}-${templateId}`,
    rawInput: promptForTemplate(templateId, index),
    selectedTemplateId: templateId,
    createdAt: "2026-07-09T00:00:00.000Z",
  });
  const paramKey = draft.revision.trace.params
    .filter((param) => param.affectsRowIds.length > 0 && typeof draft.revision.params[param.key]?.value === "number")
    .sort((a, b) => b.affectsRowIds.length - a.affectsRowIds.length)[0]?.key ?? "q";
  const before = Number(draft.revision.params[paramKey]?.value ?? 1);
  const result = runtime.applyParameterOverride({
    revision: draft.revision,
    operation: draft.revision.params[paramKey] ? "update_param" : "add_param",
    paramKey,
    rawValue: String(before + 5),
    createdAt: "2026-07-09T00:01:00.000Z",
    revisionIndex: 2,
  });
  return result.revision.revisionId !== draft.revision.revisionId && result.diff.changedRowsCount > 0;
}

function runMissingCase(templateId: string, index: number): boolean {
  const runtime = createAiEstimateRuntime();
  const draft = runtime.createDraft({
    estimateDraftId: `platform-core-v2-missing-${index}-${templateId}`,
    rawInput: promptForTemplate(templateId, index),
    selectedTemplateId: templateId,
    createdAt: "2026-07-09T00:00:00.000Z",
  });
  return Boolean(buildNormativeParameterCompletenessModel(draft.revision));
}

function runPdfBuyerCase(templateId: string, index: number): { pdf: boolean; buyer: boolean } {
  const runtime = createAiEstimateRuntime();
  const draft = runtime.createDraft({
    estimateDraftId: `platform-core-v2-artifacts-${index}-${templateId}`,
    rawInput: promptForTemplate(templateId, index),
    selectedTemplateId: templateId,
    createdAt: "2026-07-09T00:00:00.000Z",
  });
  const pdf = runtime.buildPdfSnapshot({ revision: draft.revision });
  const buyer = runtime.buildBuyerPackage({ revision: pdf.revision, snapshot: pdf.snapshot });
  return {
    pdf: validateAiEstimatePdfSnapshotParity({ snapshot: pdf.snapshot, pdf: pdf.pdf }),
    buyer: validateAiEstimateBuyerPackageParity({ snapshot: buyer.snapshot, buyerPackage: buyer.buyerPackage }),
  };
}

export function runAiEstimatePlatformCoreV2Matrix(input: { writeSummary?: boolean } = {}) {
  const index = buildAiEstimateCatalogIndex();
  const templates = index.entries.map((entry) => entry.templateId);
  const random = stableSample(templates, 1000, 1);
  const critical = stableSample(index.entries.filter((entry) => entry.complexityClass !== "simple").map((entry) => entry.templateId), 200, 2);
  const override = stableSample(templates, 200, 3);
  const missing = stableSample(templates, 100, 4);
  const artifacts = stableSample(templates, 100, 5);
  const historyStore = createInMemoryAiEstimateHistoryStore();

  const randomPassed = random.filter(runCreateCase).length;
  const criticalPassed = critical.filter(runCreateCase).length;
  const overridePassed = override.filter(runOverrideCase).length;
  const missingPassed = missing.filter(runMissingCase).length;
  const artifactResults = artifacts.map(runPdfBuyerCase);
  const pdfPassed = artifactResults.filter((result) => result.pdf).length;
  const buyerPassed = artifactResults.filter((result) => result.buyer).length;
  const runtime = createAiEstimateRuntime();
  for (let index = 0; index < 100; index += 1) {
    const revision = runtime.createDraft({
      estimateDraftId: `platform-core-v2-history-${index}`,
      rawInput: `capital apartment repair ${90 + index} m2`,
      selectedTemplateId: "demolition_interior_tile_remove_standard_professional_expanded_v1",
      createdAt: new Date(Date.UTC(2026, 6, 9, 0, index)).toISOString(),
    }).revision;
    historyStore.approve({
      id: `history-${revision.revisionId}`,
      userId: "platform-core-v2",
      revisionId: revision.revisionId,
      approvedAt: new Date(Date.UTC(2026, 6, 9, 0, index)).toISOString(),
      revision,
    });
  }
  const historyReloadPassed = historyStore.listApproved("platform-core-v2", { limit: 100 }).totalApprovedCount;
  const web = runAiEstimatePlatformCoreV2Harness({ target: "web", cases: 100 });
  const android = runAiEstimatePlatformCoreV2Harness({ target: "android-chrome", cases: 100 });
  const blockers = [
    index.entries.length === 11610 ? "" : "catalog_coverage",
    randomPassed === 1000 ? "" : "random_create_draft",
    criticalPassed === 200 ? "" : "critical_create_draft",
    overridePassed === 200 ? "" : "parameter_override",
    missingPassed === 100 ? "" : "missing_input",
    pdfPassed === 100 ? "" : "pdf_snapshot_parity",
    buyerPassed === 100 ? "" : "buyer_package_parity",
    historyReloadPassed === 100 ? "" : "history_reload",
    web.cases_passed === 100 ? "" : "web_smoke",
    android.cases_passed === 100 ? "" : "android_smoke",
  ].filter(Boolean);
  const summary = {
    final_status: blockers.length === 0
      ? GREEN_AI_ESTIMATE_PLATFORM_CORE_V2_MATRIX
      : STOP_AI_ESTIMATE_PLATFORM_CORE_V2_MATRIX_FAILED,
    source_sha: gitOutput(["rev-parse", "HEAD"]),
    branch: gitOutput(["branch", "--show-current"]),
    upstream_sync: gitOutput(["rev-list", "--left-right", "--count", "@{u}...HEAD"]).replace(/\s+/g, " "),
    platform_core_v2_matrix_created: true,
    catalog_coverage: `${index.entries.length}/${index.catalogTotalTemplates}`,
    random_create_draft_cases_passed: `${randomPassed}/1000`,
    critical_create_draft_cases_passed: `${criticalPassed}/200`,
    parameter_override_cases_passed: `${overridePassed}/200`,
    missing_input_cases_passed: `${missingPassed}/100`,
    pdf_snapshot_parity_cases_passed: `${pdfPassed}/100`,
    buyer_package_parity_cases_passed: `${buyerPassed}/100`,
    history_reload_cases_passed: `${historyReloadPassed}/100`,
    web_smoke_cases_passed: `${web.cases_passed}/100`,
    android_smoke_cases_passed: `${android.cases_passed}/100`,
    blockers,
  };
  const summaryPath = path.join(ROOT, timestampForPath(), "summary.json");
  if (input.writeSummary !== false) writeJson(summaryPath, summary);
  return { summary, summaryPath };
}

if (require.main === module) {
  const result = runAiEstimatePlatformCoreV2Matrix({ writeSummary: true });
  console.log(JSON.stringify({ ...result.summary, summary_path: result.summaryPath }, null, 2));
  if (result.summary.final_status !== GREEN_AI_ESTIMATE_PLATFORM_CORE_V2_MATRIX) process.exitCode = 1;
}
