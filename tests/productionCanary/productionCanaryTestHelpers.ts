import {
  AI_ESTIMATE_KILL_SWITCH_DEFAULT_POLICY,
  type AiEstimateKillSwitchAction,
  type AiEstimateKillSwitchEntrypoint,
} from "../../src/lib/ai/killSwitch/aiEstimateKillSwitch";
import { buildAiEstimateTelemetryEvent } from "../../src/lib/ai/observability/buildAiEstimateTelemetryEvent";
import type { AiEstimateTelemetryInput } from "../../src/lib/ai/observability/aiEstimateTelemetryTypes";
import {
  buildAiEstimateCanaryConfig,
  type AiEstimateCanaryConfig,
  type AiEstimateCanaryEntrypoint,
  type AiEstimateCanaryErrorBudgetMetrics,
} from "../../src/lib/ai/productionCanary";

export function canaryConfig(overrides: Partial<AiEstimateCanaryConfig> = {}) {
  return buildAiEstimateCanaryConfig(overrides);
}

export function enabledInternalCanaryConfig(overrides: Partial<AiEstimateCanaryConfig> = {}) {
  return buildAiEstimateCanaryConfig({
    internal_canary_enabled: true,
    ...overrides,
  });
}

export function killSwitchPolicy(overrides: Partial<typeof AI_ESTIMATE_KILL_SWITCH_DEFAULT_POLICY>) {
  return {
    ...AI_ESTIMATE_KILL_SWITCH_DEFAULT_POLICY,
    ...overrides,
  };
}

export function killSwitchScenario(
  overrides: Partial<typeof AI_ESTIMATE_KILL_SWITCH_DEFAULT_POLICY>,
  entrypoint: AiEstimateKillSwitchEntrypoint,
  action: AiEstimateKillSwitchAction,
) {
  return {
    policy: killSwitchPolicy(overrides),
    entrypoint,
    action,
  };
}

export function telemetryInput(overrides: Partial<AiEstimateTelemetryInput> = {}): AiEstimateTelemetryInput {
  return {
    runtimeTraceId: "trace_production_canary_contract",
    route: "/request",
    entrypoint: "request",
    intent: "estimate",
    canaryStatus: "disabled",
    workKey: "metal_canopy_installation",
    domain: "canopies",
    object: "metal_canopy",
    operation: "installation",
    classification: "EXPANDED_PROFESSIONAL_ESTIMATE_OK",
    estimateMode: "dynamic_boq",
    rowCount: 32,
    qualityScore: 100,
    pdfActionVisible: true,
    pdfGenerated: false,
    pdfMojibakeFound: false,
    catalogBindingStatus: "bound",
    sourceEvidenceStatus: "present",
    taxWarningStatus: "present",
    latencyMs: 240,
    ...overrides,
  };
}

export function telemetryEvent(overrides: Partial<AiEstimateTelemetryInput> = {}) {
  return buildAiEstimateTelemetryEvent(telemetryInput(overrides));
}

export function feedbackPayload(overrides: {
  runtimeTraceId?: string;
  entrypoint?: AiEstimateCanaryEntrypoint;
  classification?: string;
  visibleWorkTitle?: string;
  rowCount?: number;
  reason?: "wrong_estimate" | "wrong_work" | "too_few_rows" | "wrong_materials" | "wrong_units" | "pdf_problem" | "other";
  optionalUserComment?: string;
} = {}) {
  return {
    runtimeTraceId: "trace_feedback_contract",
    entrypoint: "/request" as const,
    classification: "EXPANDED_PROFESSIONAL_ESTIMATE_OK",
    visibleWorkTitle: "floor_covering",
    rowCount: 18,
    reason: "wrong_units" as const,
    ...overrides,
  };
}

export function errorBudgetMetrics(overrides: Partial<AiEstimateCanaryErrorBudgetMetrics> = {}): AiEstimateCanaryErrorBudgetMetrics {
  return {
    estimatesTotal: 1700,
    estimatesSucceeded: 1700,
    pdfTotal: 100,
    pdfSucceeded: 100,
    pdfMojibakeFound: 0,
    objectMisclassified: 0,
    weakGenericRowsFound: 0,
    templateGapForParsableWork: 0,
    regulatedSafetyMissing: 0,
    p95VisibleEstimateLatencyMs: 1200,
    ...overrides,
  };
}
