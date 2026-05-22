import { assertGlobalEstimateResultSafe } from "./globalEstimateGuard";
import type { GlobalEstimateInput, GlobalEstimateResult } from "./globalEstimateTypes";
import { calculateGlobalConstructionEstimate } from "./globalEstimateCalculator";
import { formatGlobalEstimateAnswer } from "./globalEstimateAnswerFormatter";

export const GLOBAL_ESTIMATE_PRODUCTION_SAFE_WAVE =
  "S_GLOBAL_ESTIMATE_PRODUCTION_SAFE_DELIVERY_CLOSEOUT_POINT_OF_NO_RETURN";

export const GLOBAL_ESTIMATE_PRODUCTION_SAFE_GREEN_STATUS =
  "GREEN_GLOBAL_ESTIMATE_PRODUCTION_SAFE_READY";

export type GlobalEstimateFeatureFlags = {
  engineEnabled: boolean;
  aiToolEnabled: boolean;
  b2cRequestEnabled: boolean;
  marketplaceSendEnabled: boolean;
  pdfEnabled: boolean;
};

export type GlobalEstimateProductionEvent =
  | "estimate_request_started"
  | "work_type_resolved"
  | "locale_resolved"
  | "template_loaded"
  | "rates_loaded"
  | "tax_rule_loaded"
  | "estimate_calculated"
  | "formatter_rendered"
  | "b2c_draft_created"
  | "pdf_generated"
  | "marketplace_send_validated";

export type GlobalEstimateProductionTraceEvent = {
  event: GlobalEstimateProductionEvent;
  estimateId?: string;
  workKey?: string;
  locale?: string;
  result: "success" | "blocked" | "warning";
  metadata: Record<string, string | number | boolean | null>;
};

export type GlobalEstimateAiChatRuntimeResult = {
  result: GlobalEstimateResult;
  answer: string;
  trace: GlobalEstimateProductionTraceEvent[];
};

const FLAG_DEFAULTS: GlobalEstimateFeatureFlags = {
  engineEnabled: false,
  aiToolEnabled: false,
  b2cRequestEnabled: false,
  marketplaceSendEnabled: false,
  pdfEnabled: false,
};

const FLAG_ENV_KEYS: Record<keyof GlobalEstimateFeatureFlags, string> = {
  engineEnabled: "GLOBAL_ESTIMATE_ENGINE_ENABLED",
  aiToolEnabled: "GLOBAL_ESTIMATE_AI_TOOL_ENABLED",
  b2cRequestEnabled: "GLOBAL_ESTIMATE_B2C_REQUEST_ENABLED",
  marketplaceSendEnabled: "GLOBAL_ESTIMATE_MARKETPLACE_SEND_ENABLED",
  pdfEnabled: "GLOBAL_ESTIMATE_PDF_ENABLED",
};

function envFlag(value: unknown): boolean {
  const normalized = String(value ?? "").trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

export function resolveGlobalEstimateFeatureFlags(env: Record<string, string | undefined> = process.env): GlobalEstimateFeatureFlags {
  return {
    engineEnabled: envFlag(env[FLAG_ENV_KEYS.engineEnabled]) || FLAG_DEFAULTS.engineEnabled,
    aiToolEnabled: envFlag(env[FLAG_ENV_KEYS.aiToolEnabled]) || FLAG_DEFAULTS.aiToolEnabled,
    b2cRequestEnabled: envFlag(env[FLAG_ENV_KEYS.b2cRequestEnabled]) || FLAG_DEFAULTS.b2cRequestEnabled,
    marketplaceSendEnabled: envFlag(env[FLAG_ENV_KEYS.marketplaceSendEnabled]) || FLAG_DEFAULTS.marketplaceSendEnabled,
    pdfEnabled: envFlag(env[FLAG_ENV_KEYS.pdfEnabled]) || FLAG_DEFAULTS.pdfEnabled,
  };
}

export function assertGlobalEstimateFeatureFlagsDefaultOff(flags: GlobalEstimateFeatureFlags): void {
  const enabled = Object.entries(flags).filter(([, value]) => value).map(([key]) => key);
  if (enabled.length > 0) {
    throw new Error(`GLOBAL_ESTIMATE_FEATURE_FLAGS_MUST_DEFAULT_OFF:${enabled.join(",")}`);
  }
}

function safeMetadataValue(value: unknown): string | number | boolean | null {
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value !== "string") return value == null ? null : "[redacted]";
  if (/service_role|authorization|apikey|password|secret|storageKey|storage_key|signedUrl|phone|contact/i.test(value)) {
    return "[redacted]";
  }
  return value.length > 120 ? `${value.slice(0, 117)}...` : value;
}

export function createGlobalEstimateProductionTraceEvent(input: {
  event: GlobalEstimateProductionEvent;
  result?: GlobalEstimateProductionTraceEvent["result"];
  estimateId?: string;
  workKey?: string;
  locale?: string;
  metadata?: Record<string, unknown>;
}): GlobalEstimateProductionTraceEvent {
  return {
    event: input.event,
    estimateId: input.estimateId,
    workKey: input.workKey,
    locale: input.locale,
    result: input.result ?? "success",
    metadata: Object.fromEntries(
      Object.entries(input.metadata ?? {}).map(([key, value]) => [key, safeMetadataValue(value)]),
    ),
  };
}

export function assertGlobalEstimateTraceRedacted(trace: GlobalEstimateProductionTraceEvent[]): void {
  const serialized = JSON.stringify(trace);
  if (/service_role|authorization|apikey|password|secret|private-media\/|consumer-repair\/|signedUrl/i.test(serialized)) {
    throw new Error("GLOBAL_ESTIMATE_TRACE_CONTAINS_UNREDACTED_PRIVATE_DATA");
  }
}

export function validateGlobalEstimateMigrationSafety(sql: string) {
  const normalized = sql.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/--.*$/gm, " ").toLowerCase();
  const destructive = {
    dropTableFound: /\bdrop\s+table\b/.test(normalized),
    truncateFound: /\btruncate(?:\s+table)?\b/.test(normalized),
    deleteBusinessRowsFound: /\bdelete\s+from\b/.test(normalized),
    dropSchemaFound: /\bdrop\s+schema\b/.test(normalized),
    alterTableDropColumnFound: /\balter\s+table\b[\s\S]*\bdrop\s+column\b/.test(normalized),
    rlsDisabled: /\bdisable\s+row\s+level\s+security\b/.test(normalized),
    broadPublicWritePolicyFound:
      /\bcreate\s+policy\b[\s\S]*\bfor\s+(?:all|insert|update|delete)\b[\s\S]*\bto\s+(?:public|authenticated)\b/i.test(normalized),
  };
  const destructiveSqlFound = Object.values(destructive).some(Boolean);
  return {
    destructiveSqlFound,
    ...destructive,
    migrationSafeToApply: !destructiveSqlFound,
  };
}

export async function runGlobalEstimateAiChatRuntime(input: GlobalEstimateInput): Promise<GlobalEstimateAiChatRuntimeResult> {
  const trace: GlobalEstimateProductionTraceEvent[] = [
    createGlobalEstimateProductionTraceEvent({
      event: "estimate_request_started",
      metadata: { hasText: Boolean(input.text), hasPhoto: Boolean(input.photoAnalysis) },
    }),
  ];
  const result = await calculateGlobalConstructionEstimate(input);
  assertGlobalEstimateResultSafe(result);
  trace.push(
    createGlobalEstimateProductionTraceEvent({
      event: "locale_resolved",
      estimateId: result.estimateId,
      workKey: result.work.workKey,
      locale: result.locale.locale,
      metadata: { countryCode: result.locale.countryCode, precision: result.locale.addressPrecision },
    }),
    createGlobalEstimateProductionTraceEvent({
      event: "work_type_resolved",
      estimateId: result.estimateId,
      workKey: result.work.workKey,
      locale: result.locale.locale,
      metadata: { category: result.work.category, requiresReview: result.requiresReview },
    }),
    createGlobalEstimateProductionTraceEvent({
      event: "template_loaded",
      estimateId: result.estimateId,
      workKey: result.work.workKey,
      locale: result.locale.locale,
      metadata: { sections: result.sections.length },
    }),
    createGlobalEstimateProductionTraceEvent({
      event: "rates_loaded",
      estimateId: result.estimateId,
      workKey: result.work.workKey,
      locale: result.locale.locale,
      metadata: { sourceCount: result.sources.length, confidence: result.confidence },
    }),
    createGlobalEstimateProductionTraceEvent({
      event: "tax_rule_loaded",
      estimateId: result.estimateId,
      workKey: result.work.workKey,
      locale: result.locale.locale,
      result: result.tax.taxType === "unknown" ? "warning" : "success",
      metadata: { taxType: result.tax.taxType, requiresLocationPrecision: result.tax.requiresLocationPrecision },
    }),
    createGlobalEstimateProductionTraceEvent({
      event: "estimate_calculated",
      estimateId: result.estimateId,
      workKey: result.work.workKey,
      locale: result.locale.locale,
      metadata: {
        materialsRows: result.sections.find((section) => section.type === "materials")?.rows.length ?? 0,
        laborRows: result.sections.find((section) => section.type === "labor")?.rows.length ?? 0,
      },
    }),
  );
  const answer = formatGlobalEstimateAnswer(result);
  trace.push(createGlobalEstimateProductionTraceEvent({
    event: "formatter_rendered",
    estimateId: result.estimateId,
    workKey: result.work.workKey,
    locale: result.locale.locale,
    metadata: { professionalBoq: result.outputContract.format === "professional_boq" },
  }));
  assertGlobalEstimateTraceRedacted(trace);
  return { result, answer, trace };
}

export function formatGlobalEstimateBackendUnavailableAnswer(language = "ru"): string {
  return language === "ru"
    ? "Могу подготовить состав сметы, но расчетный backend сейчас недоступен. Цены и налоги не показываю, чтобы не выдумывать расчет."
    : "I can prepare the estimate structure, but the calculation backend is unavailable. I will not show prices or tax to avoid invented numbers.";
}

export function assertNoPriceOrTaxWithoutBackendResult(answer: string, result?: GlobalEstimateResult | null): void {
  if (result) {
    assertGlobalEstimateResultSafe(result);
    return;
  }
  if (/\d+\s*(?:USD|EUR|KGS|GBP|AED|INR|\$|€|₽)|VAT|GST|sales tax|tax\s+\d/i.test(answer)) {
    throw new Error("GLOBAL_ESTIMATE_PRICE_OR_TAX_OUTPUT_REQUIRES_BACKEND_RESULT");
  }
}

export function buildGlobalEstimateRollbackPlan() {
  return {
    featureFlagsDefaultOff: true,
    steps: [
      "Disable GLOBAL_ESTIMATE_AI_TOOL_ENABLED.",
      "Disable GLOBAL_ESTIMATE_B2C_REQUEST_ENABLED.",
      "Keep existing B2C draft and PDF history readable.",
      "Do not delete global_estimate_snapshots.",
      "Do not remove migrations during incident rollback.",
      "Show safe fallback: estimate calculation is temporarily unavailable.",
    ],
  };
}
