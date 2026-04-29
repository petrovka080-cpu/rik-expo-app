export type RetryClass =
  | "network"
  | "rate_limit"
  | "server_error"
  | "external_timeout"
  | "validation"
  | "permission"
  | "business_rule"
  | "unknown";

export type RetryBackoff = "exponential" | "fixed" | "none";

export type RetryPolicy = {
  retryable: boolean;
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoff: RetryBackoff;
  jitter: boolean;
  deadLetterOnExhaustion: boolean;
};

export const RETRY_MAX_ATTEMPTS = 5;
export const RETRY_MAX_DELAY_MS = 60_000;

export const RETRY_POLICIES: Record<RetryClass, RetryPolicy> = {
  network: {
    retryable: true,
    maxAttempts: 3,
    initialDelayMs: 500,
    maxDelayMs: 10_000,
    backoff: "exponential",
    jitter: true,
    deadLetterOnExhaustion: true,
  },
  rate_limit: {
    retryable: true,
    maxAttempts: 5,
    initialDelayMs: 2_000,
    maxDelayMs: RETRY_MAX_DELAY_MS,
    backoff: "exponential",
    jitter: true,
    deadLetterOnExhaustion: true,
  },
  server_error: {
    retryable: true,
    maxAttempts: 3,
    initialDelayMs: 1_000,
    maxDelayMs: 30_000,
    backoff: "exponential",
    jitter: true,
    deadLetterOnExhaustion: true,
  },
  external_timeout: {
    retryable: true,
    maxAttempts: 3,
    initialDelayMs: 1_000,
    maxDelayMs: 30_000,
    backoff: "exponential",
    jitter: true,
    deadLetterOnExhaustion: true,
  },
  validation: {
    retryable: false,
    maxAttempts: 1,
    initialDelayMs: 0,
    maxDelayMs: 0,
    backoff: "none",
    jitter: false,
    deadLetterOnExhaustion: true,
  },
  permission: {
    retryable: false,
    maxAttempts: 1,
    initialDelayMs: 0,
    maxDelayMs: 0,
    backoff: "none",
    jitter: false,
    deadLetterOnExhaustion: true,
  },
  business_rule: {
    retryable: false,
    maxAttempts: 1,
    initialDelayMs: 0,
    maxDelayMs: 0,
    backoff: "none",
    jitter: false,
    deadLetterOnExhaustion: true,
  },
  unknown: {
    retryable: false,
    maxAttempts: 1,
    initialDelayMs: 0,
    maxDelayMs: 0,
    backoff: "none",
    jitter: false,
    deadLetterOnExhaustion: true,
  },
};

export function getRetryPolicy(retryClass: RetryClass): RetryPolicy {
  return RETRY_POLICIES[retryClass];
}

export function isRetryableClass(retryClass: RetryClass): boolean {
  return getRetryPolicy(retryClass).retryable;
}

export function clampRetryAttempts(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 1;
  return Math.min(Math.max(Math.trunc(parsed), 1), RETRY_MAX_ATTEMPTS);
}

export function calculateRetryDelayMs(policy: RetryPolicy, attempt: number): number {
  if (!policy.retryable) return 0;
  const safeAttempt = Math.max(1, Math.min(Math.trunc(Number(attempt) || 1), policy.maxAttempts));
  const base =
    policy.backoff === "exponential"
      ? policy.initialDelayMs * 2 ** (safeAttempt - 1)
      : policy.initialDelayMs;

  return Math.min(Math.max(base, 0), Math.min(policy.maxDelayMs, RETRY_MAX_DELAY_MS));
}
