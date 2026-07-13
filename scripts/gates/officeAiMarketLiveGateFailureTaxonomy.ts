export const OFFICE_AI_MARKET_LIVE_GATE_FAILURE_CATEGORIES = [
  "ROLE_FIXTURE_DRIFT",
  "AUTH_CREDENTIAL_INVALID",
  "COMPANY_SCOPE_MISMATCH",
  "DIRECTOR_VISIBILITY_BROKEN",
  "DIRECTOR_PDF_BROKEN",
  "DIRECTOR_APPROVE_BROKEN",
  "BUYER_HANDOFF_BROKEN",
  "BUYER_ITEM_TRUNCATION",
  "WAREHOUSE_SCOPE_BROKEN",
  "CONTRACTOR_VISIBILITY_BROKEN",
  "ACCOUNTANT_DEBUG_NOISE",
  "MARKET_UPLOAD_BROKEN",
  "MARKET_PERSISTENT_IMAGE_BROKEN",
  "MARKET_ADD_TO_ESTIMATE_BROKEN",
  "AI_CONFIRMATION_BROKEN",
  "CLEANUP_SCOPE_UNSAFE",
  "SECRET_LEAK_RISK",
  "INFRA_FLAKE",
  "UNKNOWN_PRODUCT_REGRESSION",
] as const;

export type OfficeAiMarketLiveGateFailureCategory =
  (typeof OFFICE_AI_MARKET_LIVE_GATE_FAILURE_CATEGORIES)[number];

export type OfficeAiMarketLiveGateStopStatus = `STOP_${OfficeAiMarketLiveGateFailureCategory}`;

export type OfficeAiMarketLiveGateFailure = {
  status: OfficeAiMarketLiveGateStopStatus;
  failure_category: OfficeAiMarketLiveGateFailureCategory;
  root_cause_hint: string;
  safe_to_retry: boolean;
  source_change_required: boolean;
  fixture_repair_required: boolean;
  secret_redacted: true;
};

export const OFFICE_AI_MARKET_LIVE_GATE_STOP_STATUS_BY_CATEGORY = {
  ROLE_FIXTURE_DRIFT: "STOP_ROLE_FIXTURE_DRIFT",
  AUTH_CREDENTIAL_INVALID: "STOP_AUTH_CREDENTIAL_INVALID",
  COMPANY_SCOPE_MISMATCH: "STOP_COMPANY_SCOPE_MISMATCH",
  DIRECTOR_VISIBILITY_BROKEN: "STOP_DIRECTOR_VISIBILITY_BROKEN",
  DIRECTOR_PDF_BROKEN: "STOP_DIRECTOR_PDF_BROKEN",
  DIRECTOR_APPROVE_BROKEN: "STOP_DIRECTOR_APPROVE_BROKEN",
  BUYER_HANDOFF_BROKEN: "STOP_BUYER_HANDOFF_BROKEN",
  BUYER_ITEM_TRUNCATION: "STOP_BUYER_ITEM_TRUNCATION",
  WAREHOUSE_SCOPE_BROKEN: "STOP_WAREHOUSE_SCOPE_BROKEN",
  CONTRACTOR_VISIBILITY_BROKEN: "STOP_CONTRACTOR_VISIBILITY_BROKEN",
  ACCOUNTANT_DEBUG_NOISE: "STOP_ACCOUNTANT_DEBUG_NOISE",
  MARKET_UPLOAD_BROKEN: "STOP_MARKET_UPLOAD_BROKEN",
  MARKET_PERSISTENT_IMAGE_BROKEN: "STOP_MARKET_PERSISTENT_IMAGE_BROKEN",
  MARKET_ADD_TO_ESTIMATE_BROKEN: "STOP_MARKET_ADD_TO_ESTIMATE_BROKEN",
  AI_CONFIRMATION_BROKEN: "STOP_AI_CONFIRMATION_BROKEN",
  CLEANUP_SCOPE_UNSAFE: "STOP_CLEANUP_SCOPE_UNSAFE",
  SECRET_LEAK_RISK: "STOP_SECRET_LEAK_RISK",
  INFRA_FLAKE: "STOP_INFRA_FLAKE",
  UNKNOWN_PRODUCT_REGRESSION: "STOP_UNKNOWN_PRODUCT_REGRESSION",
} as const satisfies Record<OfficeAiMarketLiveGateFailureCategory, OfficeAiMarketLiveGateStopStatus>;

const FIXTURE_REPAIR_CATEGORIES = new Set<OfficeAiMarketLiveGateFailureCategory>([
  "ROLE_FIXTURE_DRIFT",
  "AUTH_CREDENTIAL_INVALID",
  "COMPANY_SCOPE_MISMATCH",
]);

const RETRYABLE_CATEGORIES = new Set<OfficeAiMarketLiveGateFailureCategory>([
  "AUTH_CREDENTIAL_INVALID",
  "INFRA_FLAKE",
]);

export function redactOfficeAiMarketLiveGateText(value: unknown): string {
  return String(value ?? "")
    .replace(/([?&](?:apikey|access_token|refresh_token|token|password|authorization)=)[^&\s]+/gi, "$1<redacted>")
    .replace(/\bBearer\s+[A-Za-z0-9._-]+/gi, "Bearer <redacted>")
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, "<redacted.jwt>")
    .replace(/\bsk-[A-Za-z0-9_-]{20,}\b/g, "<redacted.key>")
    .replace(/\b(?:SUPABASE|SENTRY|OPENAI|DATABASE|REDIS)_[A-Z0-9_]*KEY\b\s*[:=]\s*["']?[^\s"',}]+/gi, "<redacted.env_key>")
    .slice(0, 600);
}

export function classifyOfficeAiMarketLiveGateFailure(input: unknown): OfficeAiMarketLiveGateFailureCategory {
  const text = redactOfficeAiMarketLiveGateText(
    input instanceof Error ? `${input.name} ${input.message} ${input.stack ?? ""}` : input,
  ).toLowerCase();

  if (/credential|password|sign.?in|auth/.test(text)) return "AUTH_CREDENTIAL_INVALID";
  if (/role|fixture|profile|membership|same user|duplicate user/.test(text)) return "ROLE_FIXTURE_DRIFT";
  if (/company|scope|foreign/.test(text)) return "COMPANY_SCOPE_MISMATCH";
  if (/director.*visible|director.*request/.test(text)) return "DIRECTOR_VISIBILITY_BROKEN";
  if (/pdf/.test(text)) return "DIRECTOR_PDF_BROKEN";
  if (/approve|approval/.test(text)) return "DIRECTOR_APPROVE_BROKEN";
  if (/buyer.*handoff|buyer.*visible/.test(text)) return "BUYER_HANDOFF_BROKEN";
  if (/truncation|item count|full items/.test(text)) return "BUYER_ITEM_TRUNCATION";
  if (/warehouse/.test(text)) return "WAREHOUSE_SCOPE_BROKEN";
  if (/contractor/.test(text)) return "CONTRACTOR_VISIBILITY_BROKEN";
  if (/accountant|debug|trace|nan|undefined|null/.test(text)) return "ACCOUNTANT_DEBUG_NOISE";
  if (/upload|file select|photo attach/.test(text)) return "MARKET_UPLOAD_BROKEN";
  if (/persistent image|blob:|file:|data:|media-local|image record|counter/.test(text)) {
    return "MARKET_PERSISTENT_IMAGE_BROKEN";
  }
  if (/add.to.(estimate|request)|duplicate row/.test(text)) return "MARKET_ADD_TO_ESTIMATE_BROKEN";
  if (/ai.*confirm|auto.?apply/.test(text)) return "AI_CONFIRMATION_BROKEN";
  if (/cleanup|truncate|broad delete|orphan/.test(text)) return "CLEANUP_SCOPE_UNSAFE";
  if (/secret|jwt|token|signed url|raw photo/.test(text)) return "SECRET_LEAK_RISK";
  if (/timeout|network|fetch|unreachable|flake/.test(text)) return "INFRA_FLAKE";

  return "UNKNOWN_PRODUCT_REGRESSION";
}

export function buildOfficeAiMarketLiveGateFailure(
  category: OfficeAiMarketLiveGateFailureCategory,
  rootCauseHint: unknown,
): OfficeAiMarketLiveGateFailure {
  const fixtureRepairRequired = FIXTURE_REPAIR_CATEGORIES.has(category);
  return {
    status: OFFICE_AI_MARKET_LIVE_GATE_STOP_STATUS_BY_CATEGORY[category],
    failure_category: category,
    root_cause_hint: redactOfficeAiMarketLiveGateText(rootCauseHint),
    safe_to_retry: RETRYABLE_CATEGORIES.has(category),
    source_change_required: !fixtureRepairRequired && category !== "INFRA_FLAKE",
    fixture_repair_required: fixtureRepairRequired,
    secret_redacted: true,
  };
}

export function buildClassifiedOfficeAiMarketLiveGateFailure(input: unknown): OfficeAiMarketLiveGateFailure {
  return buildOfficeAiMarketLiveGateFailure(classifyOfficeAiMarketLiveGateFailure(input), input);
}
