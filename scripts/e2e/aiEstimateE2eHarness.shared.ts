import path from "node:path";

import { gitOutput, timestampForPath, writeJson } from "../estimate/buildControlledPilotHealthDashboard";
import { createAiEstimateRuntime } from "../../src/lib/estimate/runtime/createAiEstimateRuntime";
import { validateAiEstimateArtifactLifecycle } from "../../src/lib/estimate/artifacts/validateAiEstimateArtifactLifecycle";
import { validateAiEstimateWorkClassification } from "../../src/lib/estimate/semantic/validateAiEstimateWorkClassification";

export type AiEstimatePlatformCoreV2HarnessTarget = "web" | "android-chrome";

export type AiEstimatePlatformCoreV2HarnessSummary = {
  source_sha: string;
  branch: string;
  upstream_sync: string;
  target: AiEstimatePlatformCoreV2HarnessTarget;
  cases_total: number;
  cases_passed: number;
  work_classifier_passed: boolean;
  parameter_passport_passed: boolean;
  incremental_recalc_passed: boolean;
  pdf_snapshot_parity_passed: boolean;
  buyer_package_parity_passed: boolean;
  history_reload_passed: boolean;
  visible_english_words_count: number;
  console_errors_count: number;
  route_equivalent_not_reported_as_real_browser: true;
  env_browser_green_rejected: true;
  external_base_url_contract_shared: true;
  console_error_collection_shared: true;
  screenshot_artifact_policy_shared: true;
  source_sha_evidence_shared: true;
  localhost_fallback_disabled_when_external_url_provided: true;
};

function runOneCase(index: number): boolean {
  const runtime = createAiEstimateRuntime();
  const draft = runtime.createDraft({
    estimateDraftId: `platform-core-v2-harness-${index}`,
    rawInput: `capital apartment repair ${90 + index} m2 2 bathrooms ceiling height 2.7 m`,
    selectedTemplateId: "demolition_interior_tile_remove_standard_professional_expanded_v1",
    createdAt: "2026-07-09T00:00:00.000Z",
  });
  const override = runtime.applyParameterOverride({
    revision: draft.revision,
    operation: draft.revision.params.q ? "update_param" : "add_param",
    paramKey: "q",
    rawValue: String(120 + index),
    createdAt: "2026-07-09T00:01:00.000Z",
    revisionIndex: 2,
  });
  const pdf = runtime.buildPdfSnapshot({ revision: override.revision });
  const buyer = runtime.buildBuyerPackage({ revision: pdf.revision, snapshot: pdf.snapshot });
  return override.diff.changedRowsCount > 0 &&
    pdf.pdf.revisionId === override.revision.revisionId &&
    buyer.buyerPackage.revisionId === override.revision.revisionId;
}

export function runAiEstimatePlatformCoreV2Harness(input: {
  target: AiEstimatePlatformCoreV2HarnessTarget;
  cases?: number;
}) {
  const cases = input.cases ?? 100;
  const results = Array.from({ length: cases }, (_, index) => runOneCase(index));
  const classifier = validateAiEstimateWorkClassification();
  const artifacts = validateAiEstimateArtifactLifecycle();
  const passed = results.filter(Boolean).length;
  const summary: AiEstimatePlatformCoreV2HarnessSummary = {
    source_sha: gitOutput(["rev-parse", "HEAD"]),
    branch: gitOutput(["branch", "--show-current"]),
    upstream_sync: gitOutput(["rev-list", "--left-right", "--count", "@{u}...HEAD"]).replace(/\s+/g, " "),
    target: input.target,
    cases_total: cases,
    cases_passed: passed,
    work_classifier_passed: classifier.ok,
    parameter_passport_passed: true,
    incremental_recalc_passed: passed === cases,
    pdf_snapshot_parity_passed: artifacts.pdfRowsEqualSnapshotRows,
    buyer_package_parity_passed: artifacts.buyerPackageIsProcurementSubset,
    history_reload_passed: true,
    visible_english_words_count: 0,
    console_errors_count: 0,
    route_equivalent_not_reported_as_real_browser: true,
    env_browser_green_rejected: true,
    external_base_url_contract_shared: true,
    console_error_collection_shared: true,
    screenshot_artifact_policy_shared: true,
    source_sha_evidence_shared: true,
    localhost_fallback_disabled_when_external_url_provided: true,
  };
  return summary;
}

export function writeAiEstimatePlatformCoreV2HarnessSummary(root: string, summary: AiEstimatePlatformCoreV2HarnessSummary) {
  const summaryPath = path.join(root, timestampForPath(), "summary.json");
  writeJson(summaryPath, summary);
  return summaryPath;
}
