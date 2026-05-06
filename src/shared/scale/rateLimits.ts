import { redactBffText } from "./bffSafety";

export type RateLimitedOperation =
  | "request.list"
  | "proposal.list"
  | "marketplace.search"
  | "catalog.search"
  | "proposal.submit"
  | "warehouse.receive.apply"
  | "accountant.payment.apply"
  | "accountant.invoice.update"
  | "director.approval.apply"
  | "request.item.update"
  | "catalog.request.meta.update"
  | "catalog.request.item.cancel"
  | "pdf.report.generate"
  | "notification.fanout"
  | "cache.readModel.refresh"
  | "realtime.channel.setup"
  | "offline.replay.bridge";

export type RateLimitSubject =
  | "user"
  | "company"
  | "ip"
  | "device"
  | "session"
  | "api_key"
  | "global";

export type RateLimitBucket =
  | "read_light"
  | "read_heavy"
  | "write_sensitive"
  | "expensive_job"
  | "external_side_effect"
  | "realtime"
  | "auth_sensitive"
  | "global_safety";

export type RateLimitWindow = {
  windowSeconds: number;
  maxRequests: number;
  burst: number;
};

export type RateLimitPolicy = {
  operation: RateLimitedOperation;
  bucket: RateLimitBucket;
  subjects: readonly RateLimitSubject[];
  windows: readonly RateLimitWindow[];
  enforcement: "disabled_scaffold" | "shadow" | "enforced";
  failMode: "allow_with_observation" | "deny_with_safe_error";
  piiAllowedInKey: false;
  rawPayloadAllowedInKey: false;
};

export type RateLimitKeyParts = {
  operation: RateLimitedOperation;
  subject: RateLimitSubject;
  opaqueSubjectKey: string;
  containsPii: false;
  containsRawPayload: false;
};

export type RateLimitBoundaryConfig = {
  enabled: boolean;
  shadowMode?: boolean | null;
};

export const RATE_LIMITED_OPERATIONS: readonly RateLimitedOperation[] = [
  "request.list",
  "proposal.list",
  "marketplace.search",
  "catalog.search",
  "proposal.submit",
  "warehouse.receive.apply",
  "accountant.payment.apply",
  "accountant.invoice.update",
  "director.approval.apply",
  "request.item.update",
  "catalog.request.meta.update",
  "catalog.request.item.cancel",
  "pdf.report.generate",
  "notification.fanout",
  "cache.readModel.refresh",
  "realtime.channel.setup",
  "offline.replay.bridge",
] as const;

export const RATE_LIMIT_SUBJECTS: readonly RateLimitSubject[] = [
  "user",
  "company",
  "ip",
  "device",
  "session",
  "api_key",
  "global",
] as const;

export const RATE_LIMIT_BUCKETS: readonly RateLimitBucket[] = [
  "read_light",
  "read_heavy",
  "write_sensitive",
  "expensive_job",
  "external_side_effect",
  "realtime",
  "auth_sensitive",
  "global_safety",
] as const;

export const RATE_LIMIT_BUCKET_WINDOWS: Record<RateLimitBucket, readonly RateLimitWindow[]> = {
  read_light: [{ windowSeconds: 60, maxRequests: 120, burst: 30 }],
  read_heavy: [{ windowSeconds: 60, maxRequests: 60, burst: 15 }],
  write_sensitive: [{ windowSeconds: 60, maxRequests: 20, burst: 5 }],
  expensive_job: [{ windowSeconds: 300, maxRequests: 10, burst: 2 }],
  external_side_effect: [{ windowSeconds: 300, maxRequests: 5, burst: 1 }],
  realtime: [{ windowSeconds: 60, maxRequests: 30, burst: 5 }],
  auth_sensitive: [{ windowSeconds: 300, maxRequests: 10, burst: 3 }],
  global_safety: [{ windowSeconds: 60, maxRequests: 1000, burst: 200 }],
} as const;

const RAW_ID_OR_PII_HINT_PATTERN =
  /\b(?:user|company|request|proposal|invoice|payment|phone|email|address|session|device|api)[_-]?[a-z0-9-]{4,}\b/i;
const JSON_LIKE_PAYLOAD_PATTERN = /^\s*(?:\{|\[)/;

const disabledPolicy = (
  operation: RateLimitedOperation,
  bucket: RateLimitBucket,
  subjects: readonly RateLimitSubject[],
): RateLimitPolicy => ({
  operation,
  bucket,
  subjects,
  windows: RATE_LIMIT_BUCKET_WINDOWS[bucket],
  enforcement: "disabled_scaffold",
  failMode: "allow_with_observation",
  piiAllowedInKey: false,
  rawPayloadAllowedInKey: false,
});

export const RATE_LIMIT_POLICIES: readonly RateLimitPolicy[] = [
  disabledPolicy("request.list", "read_heavy", ["user", "company"]),
  disabledPolicy("proposal.list", "read_heavy", ["user", "company"]),
  disabledPolicy("marketplace.search", "read_heavy", ["user", "company", "ip"]),
  disabledPolicy("catalog.search", "read_heavy", ["user", "company", "ip"]),
  disabledPolicy("proposal.submit", "write_sensitive", ["user", "company"]),
  disabledPolicy("warehouse.receive.apply", "write_sensitive", ["user", "company"]),
  disabledPolicy("accountant.payment.apply", "external_side_effect", ["user", "company"]),
  disabledPolicy("accountant.invoice.update", "write_sensitive", ["user", "company"]),
  disabledPolicy("director.approval.apply", "write_sensitive", ["user", "company"]),
  disabledPolicy("request.item.update", "write_sensitive", ["user", "company"]),
  disabledPolicy("catalog.request.meta.update", "write_sensitive", ["user", "company"]),
  disabledPolicy("catalog.request.item.cancel", "write_sensitive", ["user", "company"]),
  disabledPolicy("pdf.report.generate", "expensive_job", ["user", "company", "global"]),
  disabledPolicy("notification.fanout", "external_side_effect", ["user", "company", "global"]),
  disabledPolicy("cache.readModel.refresh", "expensive_job", ["global"]),
  disabledPolicy("realtime.channel.setup", "realtime", ["user", "company", "device"]),
  disabledPolicy("offline.replay.bridge", "write_sensitive", ["user", "device"]),
] as const;

export function isKnownRateLimitedOperation(value: unknown): value is RateLimitedOperation {
  return RATE_LIMITED_OPERATIONS.includes(value as RateLimitedOperation);
}

export function isKnownRateLimitSubject(value: unknown): value is RateLimitSubject {
  return RATE_LIMIT_SUBJECTS.includes(value as RateLimitSubject);
}

export function isKnownRateLimitBucket(value: unknown): value is RateLimitBucket {
  return RATE_LIMIT_BUCKETS.includes(value as RateLimitBucket);
}

export function isLiveRateLimitEnforcementEnabled(_config: RateLimitBoundaryConfig): false {
  return false;
}

export function getRateLimitPolicy(operation: RateLimitedOperation): RateLimitPolicy | null {
  return RATE_LIMIT_POLICIES.find((policy) => policy.operation === operation) ?? null;
}

export function validateRateLimitWindow(window: RateLimitWindow): boolean {
  return (
    Number.isFinite(window.windowSeconds) &&
    Number.isFinite(window.maxRequests) &&
    Number.isFinite(window.burst) &&
    Math.trunc(window.windowSeconds) === window.windowSeconds &&
    Math.trunc(window.maxRequests) === window.maxRequests &&
    Math.trunc(window.burst) === window.burst &&
    window.windowSeconds > 0 &&
    window.maxRequests > 0 &&
    window.burst > 0 &&
    window.burst <= window.maxRequests
  );
}

export function validateRateLimitPolicy(policy: RateLimitPolicy): boolean {
  return (
    isKnownRateLimitedOperation(policy.operation) &&
    isKnownRateLimitBucket(policy.bucket) &&
    policy.subjects.length > 0 &&
    policy.subjects.every(isKnownRateLimitSubject) &&
    policy.windows.length > 0 &&
    policy.windows.every(validateRateLimitWindow) &&
    policy.enforcement === "disabled_scaffold" &&
    policy.failMode === "allow_with_observation" &&
    policy.piiAllowedInKey === false &&
    policy.rawPayloadAllowedInKey === false
  );
}

export function containsUnsafeRateLimitKeyPart(value: unknown): boolean {
  if (typeof value !== "string") return true;
  const trimmed = value.trim();
  if (!trimmed) return true;
  if (JSON_LIKE_PAYLOAD_PATTERN.test(trimmed)) return true;
  if (trimmed !== redactBffText(trimmed)) return true;
  return RAW_ID_OR_PII_HINT_PATTERN.test(trimmed);
}

export function validateRateLimitKeyParts(parts: RateLimitKeyParts): boolean {
  return (
    isKnownRateLimitedOperation(parts.operation) &&
    isKnownRateLimitSubject(parts.subject) &&
    parts.containsPii === false &&
    parts.containsRawPayload === false &&
    !containsUnsafeRateLimitKeyPart(parts.opaqueSubjectKey)
  );
}

export function compareStrictness(left: RateLimitWindow, right: RateLimitWindow): number {
  const leftPerMinute = left.maxRequests / (left.windowSeconds / 60);
  const rightPerMinute = right.maxRequests / (right.windowSeconds / 60);
  return leftPerMinute - rightPerMinute;
}
