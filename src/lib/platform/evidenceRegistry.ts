export type AiEstimateEvidenceLayerName =
  | "real_named_boq"
  | "trusted_costing_pricebook"
  | "approved_history_scaling"
  | "material_quantity_accuracy"
  | "foreman_materials_subcontracts_sync"
  | "platform_core_scale_seal";

export type AiEstimateEvidenceLayer = {
  layerName: AiEstimateEvidenceLayerName;
  runtimeRoot: string;
  expectedFinalStatusIncludes: string;
  requiresCurrentHead: boolean;
  requiredWebEvidence: boolean;
  requiredAndroidEvidence: boolean;
  requiredParityEvidence: boolean;
  requiredSourceGates: readonly string[];
  stalePolicy: "latest-green-required" | "current-head-required";
};

export type EvidenceSummaryLike = {
  final_status?: unknown;
  source_sha?: unknown;
  branch?: unknown;
  route_equivalent_claimed_as_real_browser?: unknown;
  route_equivalent_smoke_passed?: unknown;
  manual_summary_green_detected?: unknown;
  fake_green_claimed?: unknown;
  summary_generated_by?: unknown;
};

export type EvidenceRegistryValidationInput = {
  headSha: string;
  currentScopeSummaries: readonly EvidenceSummaryLike[];
  currentWebSummary?: EvidenceSummaryLike | null;
  currentAndroidSummary?: EvidenceSummaryLike | null;
  currentParitySummary?: EvidenceSummaryLike | null;
};

export type EvidenceRegistryValidation = {
  evidence_registry_created: boolean;
  no_stale_green_accepted: boolean;
  source_sha_matches_head_for_current_scope: boolean;
  web_android_artifacts_current: boolean;
  route_equivalent_rejected_as_real_browser: boolean;
  manual_summary_green_rejected: boolean;
  latest_green_summary_missing: boolean;
  summary_source_sha_not_head: boolean;
  web_artifact_stale: boolean;
  android_artifact_stale: boolean;
  parity_artifact_stale: boolean;
  route_equivalent_claimed_as_real_browser: boolean;
  manual_summary_green_detected: boolean;
  passed: boolean;
  failures: string[];
};

export const AI_ESTIMATE_EVIDENCE_REGISTRY: readonly AiEstimateEvidenceLayer[] = [
  {
    layerName: "real_named_boq",
    runtimeRoot: ".release-runtime/ai-estimate-real-named-boq-line-items",
    expectedFinalStatusIncludes: "GREEN_AI_ESTIMATE_REAL_NAMED",
    requiresCurrentHead: false,
    requiredWebEvidence: true,
    requiredAndroidEvidence: true,
    requiredParityEvidence: false,
    requiredSourceGates: [],
    stalePolicy: "latest-green-required",
  },
  {
    layerName: "trusted_costing_pricebook",
    runtimeRoot: ".release-runtime/ai-estimate-trusted-costing-pricebook",
    expectedFinalStatusIncludes: "GREEN_AI_ESTIMATE_TRUSTED_COSTING_PRICEBOOK",
    requiresCurrentHead: false,
    requiredWebEvidence: true,
    requiredAndroidEvidence: true,
    requiredParityEvidence: false,
    requiredSourceGates: [],
    stalePolicy: "latest-green-required",
  },
  {
    layerName: "approved_history_scaling",
    runtimeRoot: ".release-runtime/ai-estimate-approved-history-scaling",
    expectedFinalStatusIncludes: "GREEN_AI_ESTIMATE_APPROVED_HISTORY",
    requiresCurrentHead: false,
    requiredWebEvidence: false,
    requiredAndroidEvidence: false,
    requiredParityEvidence: false,
    requiredSourceGates: [],
    stalePolicy: "latest-green-required",
  },
  {
    layerName: "material_quantity_accuracy",
    runtimeRoot: ".release-runtime/ai-estimate-material-quantity-accuracy",
    expectedFinalStatusIncludes: "GREEN_AI_ESTIMATE_MATERIAL_QUANTITY_ACCURACY",
    requiresCurrentHead: false,
    requiredWebEvidence: true,
    requiredAndroidEvidence: true,
    requiredParityEvidence: true,
    requiredSourceGates: [],
    stalePolicy: "latest-green-required",
  },
  {
    layerName: "foreman_materials_subcontracts_sync",
    runtimeRoot: ".release-runtime/ai-estimate-foreman-materials-subcontracts-sync",
    expectedFinalStatusIncludes: "GREEN_AI_ESTIMATE_FOREMAN_MATERIALS_SUBCONTRACTS_SYNCED",
    requiresCurrentHead: false,
    requiredWebEvidence: true,
    requiredAndroidEvidence: true,
    requiredParityEvidence: false,
    requiredSourceGates: [],
    stalePolicy: "latest-green-required",
  },
  {
    layerName: "platform_core_scale_seal",
    runtimeRoot: ".release-runtime/ai-estimate-platform-core-scale-seal",
    expectedFinalStatusIncludes: "GREEN_AI_ESTIMATE_PLATFORM_CORE_SCALE_SEAL_11610",
    requiresCurrentHead: true,
    requiredWebEvidence: true,
    requiredAndroidEvidence: true,
    requiredParityEvidence: true,
    requiredSourceGates: [
      "targeted_tests_passed",
      "typecheck_passed",
      "lint_passed",
      "diff_check_passed",
      "no_test_weakening_passed",
      "web_public_smoke_passed",
      "ci_office_market_passed",
      "secret_scan_passed",
    ],
    stalePolicy: "current-head-required",
  },
];

export function summaryClaimsGreen(summary: EvidenceSummaryLike | null | undefined): boolean {
  return String(summary?.final_status ?? "").startsWith("GREEN");
}

export function isEvidenceSummaryAcceptedForCurrentHead(summary: EvidenceSummaryLike | null | undefined, headSha: string): boolean {
  if (!summaryClaimsGreen(summary)) return false;
  if (String(summary?.source_sha ?? "") !== headSha) return false;
  if (summary?.route_equivalent_claimed_as_real_browser === true) return false;
  if (summary?.manual_summary_green_detected === true) return false;
  if (summary?.fake_green_claimed === true) return false;
  return true;
}

export function validateAiEstimateEvidenceRegistry(input: EvidenceRegistryValidationInput): EvidenceRegistryValidation {
  const summaries = input.currentScopeSummaries;
  const currentSummariesCurrent = summaries.every((summary) => isEvidenceSummaryAcceptedForCurrentHead(summary, input.headSha));
  const latestMissing = summaries.length === 0;
  const staleSummary = summaries.some((summary) => summaryClaimsGreen(summary) && String(summary.source_sha ?? "") !== input.headSha);
  const webStale = !isEvidenceSummaryAcceptedForCurrentHead(input.currentWebSummary, input.headSha);
  const androidStale = !isEvidenceSummaryAcceptedForCurrentHead(input.currentAndroidSummary, input.headSha);
  const parityStale = !isEvidenceSummaryAcceptedForCurrentHead(input.currentParitySummary, input.headSha);
  const routeEquivalentRejected = !isEvidenceSummaryAcceptedForCurrentHead({
    final_status: "GREEN_ROUTE_EQUIVALENT",
    source_sha: input.headSha,
    route_equivalent_claimed_as_real_browser: true,
    fake_green_claimed: false,
  }, input.headSha);
  const manualRejected = !isEvidenceSummaryAcceptedForCurrentHead({
    final_status: "GREEN_MANUAL",
    source_sha: input.headSha,
    manual_summary_green_detected: true,
    fake_green_claimed: false,
  }, input.headSha);
  const routeEquivalentClaimed = summaries.some((summary) => summary.route_equivalent_claimed_as_real_browser === true);
  const manualSummary = summaries.some((summary) => summary.manual_summary_green_detected === true);
  const failures = [
    AI_ESTIMATE_EVIDENCE_REGISTRY.length > 0 ? "" : "evidence_registry_empty",
    latestMissing ? "latest_green_summary_missing" : "",
    staleSummary ? "summary_source_sha_not_head" : "",
    webStale ? "web_artifact_stale" : "",
    androidStale ? "android_artifact_stale" : "",
    parityStale ? "parity_artifact_stale" : "",
    routeEquivalentRejected ? "" : "route_equivalent_not_rejected",
    manualRejected ? "" : "manual_summary_green_not_rejected",
    routeEquivalentClaimed ? "route_equivalent_claimed_as_real_browser" : "",
    manualSummary ? "manual_summary_green_detected" : "",
  ].filter(Boolean);
  return {
    evidence_registry_created: AI_ESTIMATE_EVIDENCE_REGISTRY.length > 0,
    no_stale_green_accepted: !staleSummary,
    source_sha_matches_head_for_current_scope: currentSummariesCurrent,
    web_android_artifacts_current: !webStale && !androidStale && !parityStale,
    route_equivalent_rejected_as_real_browser: routeEquivalentRejected,
    manual_summary_green_rejected: manualRejected,
    latest_green_summary_missing: latestMissing,
    summary_source_sha_not_head: staleSummary,
    web_artifact_stale: webStale,
    android_artifact_stale: androidStale,
    parity_artifact_stale: parityStale,
    route_equivalent_claimed_as_real_browser: routeEquivalentClaimed,
    manual_summary_green_detected: manualSummary,
    passed: failures.length === 0,
    failures,
  };
}
