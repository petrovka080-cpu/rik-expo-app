import { SENSITIVE_REDACTION_MARKER, redactSensitiveText, redactSensitiveValue } from "../security/redaction";

export const REQUIRED_OPS_METRIC_NAMES = [
  "api_request_duration_ms",
  "db_query_duration_ms",
  "ai_context_build_ms",
  "ai_llm_duration_ms",
  "pdf_generation_ms",
  "storage_upload_ms",
  "marketplace_publish_attempts",
  "b2c_marketplace_send_attempts",
  "validation_error_counts",
  "rate_limit_blocks",
] as const;

export type OpsMetricName = (typeof REQUIRED_OPS_METRIC_NAMES)[number];

export type OpsMetricKind = "duration" | "counter";
export type OpsMetricUnit = "ms" | "count";
export type OpsMetricDomain =
  | "api"
  | "database"
  | "ai"
  | "pdf"
  | "storage"
  | "marketplace"
  | "b2c"
  | "validation"
  | "rate_limit";

export type OpsMetricDefinition = {
  name: OpsMetricName;
  kind: OpsMetricKind;
  unit: OpsMetricUnit;
  domain: OpsMetricDomain;
  description: string;
  piiSafe: true;
  structuredLogEvent: string;
  alertThreshold: number;
};

export type OpsMetricEvent = {
  name: OpsMetricName;
  value: number;
  unit: OpsMetricUnit;
  kind: OpsMetricKind;
  domain: OpsMetricDomain;
  at: string;
  attributes: Record<string, unknown>;
  structuredLogEvent: string;
  piiSafe: true;
  redacted: true;
};

export const REQUIRED_OPS_RATE_LIMIT_IDS = [
  "ai_questions_per_user_hour",
  "media_uploads_per_user_hour",
  "marketplace_publish_attempts_per_hour",
  "b2c_marketplace_send_attempts_per_hour",
  "pdf_generation_attempts_per_hour",
  "auth_sensitive_actions_per_hour",
] as const;

export type OpsRateLimitId = (typeof REQUIRED_OPS_RATE_LIMIT_IDS)[number];

export type OpsRateLimitDefinition = {
  id: OpsRateLimitId;
  operation:
    | "ai.question"
    | "media.upload"
    | "marketplace.publish"
    | "b2c.marketplace.send"
    | "pdf.generate"
    | "auth.sensitive";
  subject: "user";
  windowMs: 3_600_000;
  maxAttempts: number;
  burst: number;
  enabled: true;
  actionOnBlock: "deny_with_safe_error";
  safeErrorCode: string;
  metricOnBlock: "rate_limit_blocks";
  piiSafeKey: true;
  rawPayloadAllowedInKey: false;
};

export type OpsRateLimitDecision = {
  id: OpsRateLimitId;
  allowed: boolean;
  blocked: boolean;
  remaining: number;
  retryAfterMs: number | null;
  safeErrorCode: string | null;
  metricOnBlock: "rate_limit_blocks" | null;
  piiSafe: true;
};

type OpsMetricStore = {
  events: OpsMetricEvent[];
};

type OpsMetricGlobal = typeof globalThis & {
  __RIK_PRODUCTION_OPS_METRICS__?: OpsMetricStore;
};

const MAX_OPS_METRIC_EVENTS = 500;
const HOUR_MS = 3_600_000 as const;

const OPS_FORBIDDEN_KEY_RE =
  /(?:authorization|bearer|token|access.?key|api.?key|signed.?url|service.?role|provider.?payload|raw.?prompt|raw.?db.?rows|phone|email|contact|address)/i;
const OPS_FORBIDDEN_TEXT_RE =
  /\b(?:service[_-]?role|provider[_-]?payload|raw[_-]?prompt|raw[_-]?db[_-]?rows)\b/i;
const OPS_EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const OPS_PHONE_RE = /(?:\+\d[\d\s().-]{7,}\d|\b\d{3}[\s().-]\d{3}[\s().-]\d{2,}\b)/;
const OPS_CREDENTIAL_RE =
  /\b(?:Bearer\s+[A-Za-z0-9._~+/=-]+|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+|(?:access_token|refresh_token|api_key|apikey|signature)=\S+)/i;

export const OPS_METRIC_REGISTRY: readonly OpsMetricDefinition[] = Object.freeze([
  {
    name: "api_request_duration_ms",
    kind: "duration",
    unit: "ms",
    domain: "api",
    description: "End-to-end API/BFF/RPC request duration excluding client render time.",
    piiSafe: true,
    structuredLogEvent: "ops.api.request.duration",
    alertThreshold: 1_000,
  },
  {
    name: "db_query_duration_ms",
    kind: "duration",
    unit: "ms",
    domain: "database",
    description: "Database query or RPC transport duration.",
    piiSafe: true,
    structuredLogEvent: "ops.db.query.duration",
    alertThreshold: 300,
  },
  {
    name: "ai_context_build_ms",
    kind: "duration",
    unit: "ms",
    domain: "ai",
    description: "AI screen/domain context build duration before model execution.",
    piiSafe: true,
    structuredLogEvent: "ops.ai.context.duration",
    alertThreshold: 1_000,
  },
  {
    name: "ai_llm_duration_ms",
    kind: "duration",
    unit: "ms",
    domain: "ai",
    description: "LLM provider duration without storing prompt or provider payload.",
    piiSafe: true,
    structuredLogEvent: "ops.ai.llm.duration",
    alertThreshold: 8_000,
  },
  {
    name: "pdf_generation_ms",
    kind: "duration",
    unit: "ms",
    domain: "pdf",
    description: "PDF generation/materialization duration.",
    piiSafe: true,
    structuredLogEvent: "ops.pdf.generation.duration",
    alertThreshold: 5_000,
  },
  {
    name: "storage_upload_ms",
    kind: "duration",
    unit: "ms",
    domain: "storage",
    description: "Storage upload/session completion duration without signed URLs.",
    piiSafe: true,
    structuredLogEvent: "ops.storage.upload.duration",
    alertThreshold: 5_000,
  },
  {
    name: "marketplace_publish_attempts",
    kind: "counter",
    unit: "count",
    domain: "marketplace",
    description: "Marketplace publish attempts, including validation failures.",
    piiSafe: true,
    structuredLogEvent: "ops.marketplace.publish.attempt",
    alertThreshold: 20,
  },
  {
    name: "b2c_marketplace_send_attempts",
    kind: "counter",
    unit: "count",
    domain: "b2c",
    description: "B2C request send-to-marketplace attempts.",
    piiSafe: true,
    structuredLogEvent: "ops.b2c.marketplace.send.attempt",
    alertThreshold: 10,
  },
  {
    name: "validation_error_counts",
    kind: "counter",
    unit: "count",
    domain: "validation",
    description: "Backend validation error counters by safe code.",
    piiSafe: true,
    structuredLogEvent: "ops.validation.error.count",
    alertThreshold: 25,
  },
  {
    name: "rate_limit_blocks",
    kind: "counter",
    unit: "count",
    domain: "rate_limit",
    description: "Rate-limit block counters by safe operation code.",
    piiSafe: true,
    structuredLogEvent: "ops.rate_limit.block",
    alertThreshold: 1,
  },
] as const);

export const OPS_RATE_LIMIT_REGISTRY: readonly OpsRateLimitDefinition[] = Object.freeze([
  {
    id: "ai_questions_per_user_hour",
    operation: "ai.question",
    subject: "user",
    windowMs: HOUR_MS,
    maxAttempts: 60,
    burst: 10,
    enabled: true,
    actionOnBlock: "deny_with_safe_error",
    safeErrorCode: "ai_question_rate_limited",
    metricOnBlock: "rate_limit_blocks",
    piiSafeKey: true,
    rawPayloadAllowedInKey: false,
  },
  {
    id: "media_uploads_per_user_hour",
    operation: "media.upload",
    subject: "user",
    windowMs: HOUR_MS,
    maxAttempts: 120,
    burst: 20,
    enabled: true,
    actionOnBlock: "deny_with_safe_error",
    safeErrorCode: "media_upload_rate_limited",
    metricOnBlock: "rate_limit_blocks",
    piiSafeKey: true,
    rawPayloadAllowedInKey: false,
  },
  {
    id: "marketplace_publish_attempts_per_hour",
    operation: "marketplace.publish",
    subject: "user",
    windowMs: HOUR_MS,
    maxAttempts: 20,
    burst: 5,
    enabled: true,
    actionOnBlock: "deny_with_safe_error",
    safeErrorCode: "marketplace_publish_rate_limited",
    metricOnBlock: "rate_limit_blocks",
    piiSafeKey: true,
    rawPayloadAllowedInKey: false,
  },
  {
    id: "b2c_marketplace_send_attempts_per_hour",
    operation: "b2c.marketplace.send",
    subject: "user",
    windowMs: HOUR_MS,
    maxAttempts: 10,
    burst: 2,
    enabled: true,
    actionOnBlock: "deny_with_safe_error",
    safeErrorCode: "b2c_marketplace_send_rate_limited",
    metricOnBlock: "rate_limit_blocks",
    piiSafeKey: true,
    rawPayloadAllowedInKey: false,
  },
  {
    id: "pdf_generation_attempts_per_hour",
    operation: "pdf.generate",
    subject: "user",
    windowMs: HOUR_MS,
    maxAttempts: 30,
    burst: 5,
    enabled: true,
    actionOnBlock: "deny_with_safe_error",
    safeErrorCode: "pdf_generation_rate_limited",
    metricOnBlock: "rate_limit_blocks",
    piiSafeKey: true,
    rawPayloadAllowedInKey: false,
  },
  {
    id: "auth_sensitive_actions_per_hour",
    operation: "auth.sensitive",
    subject: "user",
    windowMs: HOUR_MS,
    maxAttempts: 20,
    burst: 3,
    enabled: true,
    actionOnBlock: "deny_with_safe_error",
    safeErrorCode: "auth_sensitive_action_rate_limited",
    metricOnBlock: "rate_limit_blocks",
    piiSafeKey: true,
    rawPayloadAllowedInKey: false,
  },
] as const);

const metricByName = new Map<OpsMetricName, OpsMetricDefinition>(
  OPS_METRIC_REGISTRY.map((metric) => [metric.name, metric]),
);

const limitById = new Map<OpsRateLimitId, OpsRateLimitDefinition>(
  OPS_RATE_LIMIT_REGISTRY.map((limit) => [limit.id, limit]),
);

function getOpsMetricStore(): OpsMetricStore {
  const root = globalThis as OpsMetricGlobal;
  root.__RIK_PRODUCTION_OPS_METRICS__ ??= { events: [] };
  return root.__RIK_PRODUCTION_OPS_METRICS__;
}

function normalizeMetricValue(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.round(value));
}

function sanitizeOpsString(value: string): string {
  return redactSensitiveText(value).replace(OPS_FORBIDDEN_TEXT_RE, SENSITIVE_REDACTION_MARKER);
}

function sanitizeOpsValue(value: unknown, seen = new WeakSet<object>()): unknown {
  if (value == null) return value;
  if (typeof value === "string") return sanitizeOpsString(value);
  if (typeof value !== "object") return value;
  if (value instanceof Error) return new Error(sanitizeOpsString(value.message));
  if (seen.has(value)) return "[circular]";
  seen.add(value);
  if (Array.isArray(value)) return value.map((entry) => sanitizeOpsValue(entry, seen));

  const redacted = redactSensitiveValue(value);
  const record = redacted && typeof redacted === "object" && !Array.isArray(redacted)
    ? (redacted as Record<string, unknown>)
    : {};
  const out: Record<string, unknown> = {};
  let redactedFieldIndex = 0;
  for (const [key, entry] of Object.entries(record)) {
    if (OPS_FORBIDDEN_KEY_RE.test(key)) {
      out[`redacted_field_${redactedFieldIndex}`] = SENSITIVE_REDACTION_MARKER;
      redactedFieldIndex += 1;
      continue;
    }
    out[key] = sanitizeOpsValue(entry, seen);
  }
  return out;
}

export function getOpsMetricDefinition(name: OpsMetricName): OpsMetricDefinition {
  const definition = metricByName.get(name);
  if (!definition) throw new Error(`Unknown ops metric: ${name}`);
  return definition;
}

export function getOpsRateLimitDefinition(id: OpsRateLimitId): OpsRateLimitDefinition {
  const definition = limitById.get(id);
  if (!definition) throw new Error(`Unknown ops rate limit: ${id}`);
  return definition;
}

export function validateOpsMetricDefinition(definition: OpsMetricDefinition): boolean {
  return (
    REQUIRED_OPS_METRIC_NAMES.includes(definition.name) &&
    definition.piiSafe === true &&
    definition.alertThreshold > 0 &&
    definition.structuredLogEvent.startsWith("ops.") &&
    ((definition.kind === "duration" && definition.unit === "ms") ||
      (definition.kind === "counter" && definition.unit === "count"))
  );
}

export function validateOpsRateLimitDefinition(definition: OpsRateLimitDefinition): boolean {
  return (
    REQUIRED_OPS_RATE_LIMIT_IDS.includes(definition.id) &&
    definition.subject === "user" &&
    definition.windowMs === HOUR_MS &&
    definition.maxAttempts > 0 &&
    definition.burst > 0 &&
    definition.burst <= definition.maxAttempts &&
    definition.enabled === true &&
    definition.actionOnBlock === "deny_with_safe_error" &&
    definition.metricOnBlock === "rate_limit_blocks" &&
    definition.piiSafeKey === true &&
    definition.rawPayloadAllowedInKey === false
  );
}

export function recordOpsMetric(input: {
  name: OpsMetricName;
  value: number;
  attributes?: Record<string, unknown>;
  at?: string;
}): OpsMetricEvent {
  const definition = getOpsMetricDefinition(input.name);
  const event: OpsMetricEvent = {
    name: definition.name,
    value: normalizeMetricValue(input.value),
    unit: definition.unit,
    kind: definition.kind,
    domain: definition.domain,
    at: input.at ?? new Date(0).toISOString(),
    attributes: (sanitizeOpsValue(input.attributes ?? {}) as Record<string, unknown>) ?? {},
    structuredLogEvent: definition.structuredLogEvent,
    piiSafe: true,
    redacted: true,
  };
  const store = getOpsMetricStore();
  store.events.push(event);
  if (store.events.length > MAX_OPS_METRIC_EVENTS) {
    store.events.splice(0, store.events.length - MAX_OPS_METRIC_EVENTS);
  }
  return event;
}

export function resetOpsMetricEvents(): void {
  getOpsMetricStore().events.length = 0;
}

export function getOpsMetricEvents(): OpsMetricEvent[] {
  return [...getOpsMetricStore().events];
}

export function evaluateOpsRateLimit(input: {
  id: OpsRateLimitId;
  previousAttemptTimestamps: readonly number[];
  now: number;
}): OpsRateLimitDecision {
  const definition = getOpsRateLimitDefinition(input.id);
  const windowStart = input.now - definition.windowMs;
  const attemptsInWindow = input.previousAttemptTimestamps
    .filter((timestamp) => Number.isFinite(timestamp) && timestamp > windowStart)
    .sort((left, right) => left - right);
  const remaining = Math.max(0, definition.maxAttempts - attemptsInWindow.length);
  if (remaining > 0) {
    return {
      id: definition.id,
      allowed: true,
      blocked: false,
      remaining,
      retryAfterMs: null,
      safeErrorCode: null,
      metricOnBlock: null,
      piiSafe: true,
    };
  }

  const oldest = attemptsInWindow[0] ?? input.now;
  return {
    id: definition.id,
    allowed: false,
    blocked: true,
    remaining: 0,
    retryAfterMs: Math.max(1, oldest + definition.windowMs - input.now),
    safeErrorCode: definition.safeErrorCode,
    metricOnBlock: definition.metricOnBlock,
    piiSafe: true,
  };
}

export function recordOpsRateLimitBlock(id: OpsRateLimitId, attributes?: Record<string, unknown>): OpsMetricEvent {
  const definition = getOpsRateLimitDefinition(id);
  return recordOpsMetric({
    name: "rate_limit_blocks",
    value: 1,
    attributes: {
      rateLimitId: definition.id,
      operation: definition.operation,
      ...attributes,
    },
  });
}

export function containsSensitiveOpsText(value: unknown): boolean {
  const text = typeof value === "string" ? value : JSON.stringify(value ?? "");
  return (
    OPS_EMAIL_RE.test(text) ||
    OPS_PHONE_RE.test(text) ||
    OPS_CREDENTIAL_RE.test(text) ||
    OPS_FORBIDDEN_TEXT_RE.test(text)
  );
}

export function buildOpsAlertThresholds(): Record<OpsMetricName, number> {
  return Object.fromEntries(
    OPS_METRIC_REGISTRY.map((metric) => [metric.name, metric.alertThreshold]),
  ) as Record<OpsMetricName, number>;
}
