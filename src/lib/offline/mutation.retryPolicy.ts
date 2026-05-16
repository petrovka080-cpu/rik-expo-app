import type { OfflineMutationErrorKind, OfflineMutationLifecycleStatus } from "./mutation.types";
import { isOfflineMutationRetryLifecycleStatus } from "./mutation.types";
import type { OfflineReplayPolicy } from "./offlineReplayCoordinator";

export type OfflineMutationRetryPolicyName = "foreman_default" | "contractor_default";

export type OfflineMutationRetryPolicy = {
  name: OfflineMutationRetryPolicyName;
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
};

export type OfflineMutationFailureDecision =
  | {
      lifecycleStatus: "retry_scheduled";
      nextRetryAt: number;
      retryExhausted: false;
    }
  | {
      lifecycleStatus: "conflicted" | "failed_non_retryable";
      nextRetryAt: null;
      retryExhausted: boolean;
    };

const POLICIES: Record<OfflineMutationRetryPolicyName, OfflineMutationRetryPolicy> = {
  foreman_default: {
    name: "foreman_default",
    maxAttempts: 5,
    baseDelayMs: 5_000,
    maxDelayMs: 60_000,
  },
  contractor_default: {
    name: "contractor_default",
    maxAttempts: 5,
    baseDelayMs: 5_000,
    maxDelayMs: 60_000,
  },
};

export const getOfflineMutationRetryPolicy = (
  name: OfflineMutationRetryPolicyName,
): OfflineMutationRetryPolicy => POLICIES[name];

export const FOREMAN_RETRY_POLICY =
  getOfflineMutationRetryPolicy("foreman_default");

export const FOREMAN_DRAIN_BATCH_SIZE = 3;
export const FOREMAN_MUTATION_FLUSH_LOOP_CEILING = 1_000;
export const FOREMAN_MUTATION_REPLAY_POLICY = {
  queueKey: "foreman_draft",
  owner: "foreman_mutation_worker",
  concurrencyLimit: 1,
  ordering: "created_at_fifo",
  backpressure: "coalesce_triggers_and_rerun_once",
} as const satisfies OfflineReplayPolicy;

export const normalizeForemanMutationLoopIterationLimit = (
  value: number | null | undefined,
) => {
  const limit = Number(value);
  return Number.isInteger(limit) && limit > 0
    ? limit
    : FOREMAN_MUTATION_FLUSH_LOOP_CEILING;
};

export const computeOfflineMutationBackoffMs = (
  attemptCount: number,
  policy: OfflineMutationRetryPolicy,
) => Math.min(policy.maxDelayMs, policy.baseDelayMs * 2 ** Math.max(0, attemptCount - 1));

export const resolveOfflineMutationFailureDecision = (params: {
  policy: OfflineMutationRetryPolicy;
  attemptCount: number;
  retryable: boolean;
  conflicted: boolean;
  errorKind: OfflineMutationErrorKind;
  now?: number;
}): OfflineMutationFailureDecision => {
  if (params.conflicted) {
    return {
      lifecycleStatus: "conflicted",
      nextRetryAt: null,
      retryExhausted: false,
    };
  }

  if (!params.retryable) {
    return {
      lifecycleStatus: "failed_non_retryable",
      nextRetryAt: null,
      retryExhausted: false,
    };
  }

  if (params.attemptCount >= params.policy.maxAttempts) {
    return {
      lifecycleStatus: "failed_non_retryable",
      nextRetryAt: null,
      retryExhausted: true,
    };
  }

  const now = Number.isFinite(params.now ?? NaN) ? Number(params.now) : Date.now();
  const nextRetryAt = now + computeOfflineMutationBackoffMs(params.attemptCount, params.policy);
  return {
    lifecycleStatus: "retry_scheduled",
    nextRetryAt,
    retryExhausted: false,
  };
};

export const shouldProcessOfflineMutationNow = (params: {
  lifecycleStatus: OfflineMutationLifecycleStatus;
  nextRetryAt: number | null;
  triggerSource?: string | null;
  now?: number;
}) => {
  if (params.lifecycleStatus === "queued") return true;
  if (!isOfflineMutationRetryLifecycleStatus(params.lifecycleStatus)) return false;
  if (params.triggerSource === "manual_retry") return true;
  if (!Number.isFinite(params.nextRetryAt ?? NaN)) return true;
  const now = Number.isFinite(params.now ?? NaN) ? Number(params.now) : Date.now();
  return now >= Number(params.nextRetryAt);
};
