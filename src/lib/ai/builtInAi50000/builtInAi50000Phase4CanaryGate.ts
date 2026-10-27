import { BUILT_IN_AI_50000_FULL_CASES } from "./builtInAi50000FullManifest";
import {
  BUILT_IN_AI_50000_PHASE1_MACRO_DOMAIN_IDS,
  BUILT_IN_AI_50000_PHASE4_CHOICE,
  BUILT_IN_AI_50000_PHASE4_WAVE,
} from "./builtInAi50000Ontology";
import {
  planBuiltInAi50000Phase3AndroidDomainSample,
  planBuiltInAi50000Phase3DangerousSafetySample,
  planBuiltInAi50000Phase3PdfViewerSample,
  planBuiltInAi50000Phase3RequestDraftSample,
  planBuiltInAi50000Phase3WebDomainSample,
  type BuiltInAi50000Phase3SampleItem,
} from "./builtInAi50000Phase3LiveSamplePlanner";

export type BuiltInAi50000Phase4CanaryFlag = {
  flag: string;
  defaultEnabled: false;
  canaryAllowed: boolean;
  productionRolloutAllowed: false;
  rollbackValue: false;
  owner: "ai-platform" | "release-ops" | "pdf-platform";
};

export type BuiltInAi50000Phase4CanaryPlan = {
  wave: typeof BUILT_IN_AI_50000_PHASE4_WAVE;
  selectedOption: typeof BUILT_IN_AI_50000_PHASE4_CHOICE;
  canaryInitialState: "disabled";
  productionRolloutEnabled: false;
  maxCanaryPercent: 1;
  eligibleCohort: "internal_staff_only";
  flags: BuiltInAi50000Phase4CanaryFlag[];
  stopConditions: string[];
  observabilityEvents: string[];
  observabilityMetrics: string[];
  costGuard: {
    maxDailyCanaryEstimateRuns: number;
    maxDailyCanaryPdfRuns: number;
    maxDailyCanaryProductSearchRuns: number;
    blockOnBudgetExceeded: true;
  };
  abuseSafetyGuard: {
    dangerousWorkSpecialistWarningRequired: true;
    noDiyInstructionPolicyRequired: true;
    promptInjectionGuardRequired: true;
    fakeSupplierAvailabilityForbidden: true;
  };
  rollback: {
    rollbackAction: "set flags false";
    rollbackTimeTargetMinutes: 10;
    oldPdfRemainsDefault: true;
    oldRoutesRemainDefault: true;
    noDataDestruction: true;
    estimateSnapshotsPreserved: true;
  };
  webCanaryCases: BuiltInAi50000Phase3SampleItem[];
  androidCanaryCases: BuiltInAi50000Phase3SampleItem[];
  pdfCanaryCases: BuiltInAi50000Phase3SampleItem[];
  productCanaryCases: BuiltInAi50000Phase3SampleItem[];
  requestCanaryCases: BuiltInAi50000Phase3SampleItem[];
  dangerousCanaryCases: BuiltInAi50000Phase3SampleItem[];
};

export const BUILT_IN_AI_50000_PHASE4_CANARY_FLAGS: readonly BuiltInAi50000Phase4CanaryFlag[] = Object.freeze([
  {
    flag: "AI_50000_CANARY_ENABLED",
    defaultEnabled: false,
    canaryAllowed: true,
    productionRolloutAllowed: false,
    rollbackValue: false,
    owner: "ai-platform",
  },
  {
    flag: "AI_50000_LIVE_APP_CANARY_ENABLED",
    defaultEnabled: false,
    canaryAllowed: true,
    productionRolloutAllowed: false,
    rollbackValue: false,
    owner: "release-ops",
  },
  {
    flag: "AI_ESTIMATE_PDF_CANARY_ENABLED",
    defaultEnabled: false,
    canaryAllowed: true,
    productionRolloutAllowed: false,
    rollbackValue: false,
    owner: "pdf-platform",
  },
  {
    flag: "AI_50000_PRODUCT_SEARCH_CANARY_ENABLED",
    defaultEnabled: false,
    canaryAllowed: true,
    productionRolloutAllowed: false,
    rollbackValue: false,
    owner: "ai-platform",
  },
  {
    flag: "AI_50000_PRODUCTION_ROLLOUT_ENABLED",
    defaultEnabled: false,
    canaryAllowed: false,
    productionRolloutAllowed: false,
    rollbackValue: false,
    owner: "release-ops",
  },
]);

export const BUILT_IN_AI_50000_PHASE4_STOP_CONDITIONS = Object.freeze([
  "runtime_trace_missing",
  "calculate_global_estimate_error_rate_above_1_percent",
  "source_evidence_missing_for_priced_row",
  "tax_status_missing_without_warning",
  "pdf_open_failure_rate_above_1_percent",
  "pdf_mojibake_detected",
  "product_search_fake_stock_supplier_or_availability",
  "dangerous_diy_instruction_detected",
  "legacy_pdf_route_payload_or_renderer_changed",
  "android_emulator_regression",
  "web_live_app_regression",
  "cost_budget_exceeded",
  "production_rollout_flag_enabled",
]);

export const BUILT_IN_AI_50000_PHASE4_OBSERVABILITY_EVENTS = Object.freeze([
  "ai_50000_canary_request_received",
  "ai_50000_canary_intent_resolved",
  "ai_50000_canary_tool_selected",
  "ai_50000_canary_global_estimate_validated",
  "ai_50000_canary_product_search_validated",
  "ai_50000_canary_pdf_action_created",
  "ai_50000_canary_pdf_viewer_opened",
  "ai_50000_canary_source_evidence_checked",
  "ai_50000_canary_tax_status_checked",
  "ai_50000_canary_dangerous_work_guard_applied",
  "ai_50000_canary_budget_checked",
  "ai_50000_canary_stop_condition_triggered",
  "ai_50000_canary_rollback_started",
  "ai_50000_canary_rollback_completed",
]);

export const BUILT_IN_AI_50000_PHASE4_OBSERVABILITY_METRICS = Object.freeze([
  "canary_request_count",
  "canary_estimate_success_rate",
  "canary_product_search_success_rate",
  "canary_pdf_success_rate",
  "runtime_trace_capture_rate",
  "source_evidence_coverage_rate",
  "tax_status_or_warning_rate",
  "dangerous_work_guard_rate",
  "fake_availability_detection_count",
  "pdf_mojibake_count",
  "legacy_pdf_regression_count",
  "android_regression_count",
  "web_regression_count",
  "canary_budget_usage",
]);

function takeByMacro(
  items: readonly BuiltInAi50000Phase3SampleItem[],
  perMacro: number,
): BuiltInAi50000Phase3SampleItem[] {
  return BUILT_IN_AI_50000_PHASE1_MACRO_DOMAIN_IDS.flatMap((macroDomainId) =>
    items.filter((item) => item.macroDomainId === macroDomainId).slice(0, perMacro),
  );
}

function productCasesByMacro(): BuiltInAi50000Phase3SampleItem[] {
  return BUILT_IN_AI_50000_PHASE1_MACRO_DOMAIN_IDS.flatMap((macroDomainId) => {
    const testCase = BUILT_IN_AI_50000_FULL_CASES.find((item) => item.macroDomainId === macroDomainId && item.intent === "product_search");
    if (!testCase) return [];
    return [{
      caseId: testCase.id,
      domainId: testCase.domainId,
      macroDomainId: testCase.macroDomainId,
      route: "/product/search",
      kind: "product_search",
      prompt: testCase.promptRu,
      intent: testCase.intent,
      expectedTool: testCase.expectedTool,
      workKey: testCase.workKey,
      workFamily: testCase.workFamily,
      dangerousWork: testCase.dangerousWork,
    } satisfies BuiltInAi50000Phase3SampleItem];
  });
}

export function buildBuiltInAi50000Phase4CanaryPlan(): BuiltInAi50000Phase4CanaryPlan {
  return {
    wave: BUILT_IN_AI_50000_PHASE4_WAVE,
    selectedOption: BUILT_IN_AI_50000_PHASE4_CHOICE,
    canaryInitialState: "disabled",
    productionRolloutEnabled: false,
    maxCanaryPercent: 1,
    eligibleCohort: "internal_staff_only",
    flags: [...BUILT_IN_AI_50000_PHASE4_CANARY_FLAGS],
    stopConditions: [...BUILT_IN_AI_50000_PHASE4_STOP_CONDITIONS],
    observabilityEvents: [...BUILT_IN_AI_50000_PHASE4_OBSERVABILITY_EVENTS],
    observabilityMetrics: [...BUILT_IN_AI_50000_PHASE4_OBSERVABILITY_METRICS],
    costGuard: {
      maxDailyCanaryEstimateRuns: 500,
      maxDailyCanaryPdfRuns: 75,
      maxDailyCanaryProductSearchRuns: 100,
      blockOnBudgetExceeded: true,
    },
    abuseSafetyGuard: {
      dangerousWorkSpecialistWarningRequired: true,
      noDiyInstructionPolicyRequired: true,
      promptInjectionGuardRequired: true,
      fakeSupplierAvailabilityForbidden: true,
    },
    rollback: {
      rollbackAction: "set flags false",
      rollbackTimeTargetMinutes: 10,
      oldPdfRemainsDefault: true,
      oldRoutesRemainDefault: true,
      noDataDestruction: true,
      estimateSnapshotsPreserved: true,
    },
    webCanaryCases: takeByMacro(planBuiltInAi50000Phase3WebDomainSample(), 2),
    androidCanaryCases: takeByMacro(planBuiltInAi50000Phase3AndroidDomainSample(), 2),
    pdfCanaryCases: planBuiltInAi50000Phase3PdfViewerSample().slice(0, 25),
    productCanaryCases: productCasesByMacro(),
    requestCanaryCases: takeByMacro(planBuiltInAi50000Phase3RequestDraftSample(), 1),
    dangerousCanaryCases: planBuiltInAi50000Phase3DangerousSafetySample().slice(0, 25),
  };
}

export function validateBuiltInAi50000Phase4CanaryPlan(plan = buildBuiltInAi50000Phase4CanaryPlan()): string[] {
  const issues: string[] = [];
  const flagsDefaultSafe = plan.flags.every((flag) => flag.defaultEnabled === false && flag.rollbackValue === false);
  const productionDisabled = plan.productionRolloutEnabled === false &&
    plan.flags.every((flag) => flag.productionRolloutAllowed === false);
  const macroCoverage = (items: readonly BuiltInAi50000Phase3SampleItem[]) => new Set(items.map((item) => item.macroDomainId)).size;

  if (plan.selectedOption !== BUILT_IN_AI_50000_PHASE4_CHOICE) issues.push(`CHOICE_MISMATCH:${plan.selectedOption}`);
  if (plan.canaryInitialState !== "disabled") issues.push("CANARY_NOT_DISABLED_BY_DEFAULT");
  if (!productionDisabled) issues.push("PRODUCTION_ROLLOUT_ENABLED");
  if (!flagsDefaultSafe) issues.push("FLAGS_NOT_DEFAULT_SAFE");
  if (plan.maxCanaryPercent !== 1) issues.push(`MAX_CANARY_PERCENT:${plan.maxCanaryPercent}`);
  if (plan.eligibleCohort !== "internal_staff_only") issues.push(`ELIGIBLE_COHORT:${plan.eligibleCohort}`);
  if (plan.stopConditions.length < 10) issues.push("STOP_CONDITIONS_INSUFFICIENT");
  if (plan.observabilityEvents.length < 12) issues.push("OBSERVABILITY_EVENTS_INSUFFICIENT");
  if (plan.observabilityMetrics.length < 10) issues.push("OBSERVABILITY_METRICS_INSUFFICIENT");
  if (plan.costGuard.blockOnBudgetExceeded !== true) issues.push("COST_GUARD_NOT_BLOCKING");
  if (plan.rollback.oldPdfRemainsDefault !== true || plan.rollback.oldRoutesRemainDefault !== true) issues.push("ROLLBACK_LEGACY_NOT_PROTECTED");
  if (plan.rollback.noDataDestruction !== true || plan.rollback.estimateSnapshotsPreserved !== true) issues.push("ROLLBACK_DATA_NOT_SAFE");
  if (plan.webCanaryCases.length !== 50 || macroCoverage(plan.webCanaryCases) !== 25) issues.push(`WEB_CANARY_COVERAGE:${plan.webCanaryCases.length}`);
  if (plan.androidCanaryCases.length !== 50 || macroCoverage(plan.androidCanaryCases) !== 25) issues.push(`ANDROID_CANARY_COVERAGE:${plan.androidCanaryCases.length}`);
  if (plan.pdfCanaryCases.length !== 25) issues.push(`PDF_CANARY_COUNT:${plan.pdfCanaryCases.length}`);
  if (plan.productCanaryCases.length !== 25 || macroCoverage(plan.productCanaryCases) !== 25) issues.push(`PRODUCT_CANARY_COVERAGE:${plan.productCanaryCases.length}`);
  if (plan.requestCanaryCases.length !== 25 || macroCoverage(plan.requestCanaryCases) !== 25) issues.push(`REQUEST_CANARY_COVERAGE:${plan.requestCanaryCases.length}`);
  if (plan.dangerousCanaryCases.length !== 25 || !plan.dangerousCanaryCases.every((item) => item.dangerousWork)) issues.push(`DANGEROUS_CANARY_COUNT:${plan.dangerousCanaryCases.length}`);
  return issues;
}
