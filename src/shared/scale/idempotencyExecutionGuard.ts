import type { IdempotencyAdapter, IdempotencyReserveState } from "./idempotencyAdapters";
import { NoopIdempotencyAdapter } from "./idempotencyAdapters";
import {
  buildSafeIdempotencyKey,
  type IdempotencyKeyInput,
  type IdempotencyKeySafetyError,
} from "./idempotencyKeySafety";
import type { IdempotencyPolicy } from "./idempotencyPolicies";

export type IdempotencyExecutionGuardResult<T> = {
  state: IdempotencyReserveState | "executed";
  executed: boolean;
  duplicate: boolean;
  keyStatus: "present_redacted" | "missing";
  value?: T;
  error?: {
    code: string;
    message: string;
    reason?: IdempotencyKeySafetyError;
  };
};

export type IdempotencyExecutionGuardInput<T> = {
  enabled: boolean;
  adapter?: IdempotencyAdapter | null;
  policy: IdempotencyPolicy;
  keyInput: IdempotencyKeyInput;
  failureMode?: "retryable" | "final";
  handler: () => Promise<T> | T;
};

const safeError = (
  code: string,
  message: string,
  reason?: IdempotencyKeySafetyError,
): IdempotencyExecutionGuardResult<never> => ({
  state: "failed_final",
  executed: false,
  duplicate: false,
  keyStatus: "missing",
  error: { code, message, reason },
});

export async function executeWithIdempotencyGuard<T>(
  input: IdempotencyExecutionGuardInput<T>,
): Promise<IdempotencyExecutionGuardResult<T>> {
  if (!input.enabled) {
    return {
      state: "executed",
      executed: true,
      duplicate: false,
      keyStatus: "missing",
      value: await input.handler(),
    };
  }

  const key = buildSafeIdempotencyKey(input.policy, input.keyInput);
  if (!key.ok) {
    return safeError("IDEMPOTENCY_KEY_INVALID", "Idempotency key metadata is invalid", key.reason);
  }

  const adapter = input.adapter ?? new NoopIdempotencyAdapter();
  const reserved = await adapter.reserve({
    key: key.key,
    operation: input.policy.operation,
    ttlMs: input.policy.ttlMs,
  });

  if (reserved.state === "disabled") {
    return {
      state: "disabled",
      executed: true,
      duplicate: false,
      keyStatus: "present_redacted",
      value: await input.handler(),
    };
  }

  if (reserved.state !== "reserved") {
    return {
      state: reserved.state,
      executed: false,
      duplicate: reserved.state === "duplicate_in_flight" || reserved.state === "duplicate_committed",
      keyStatus: "present_redacted",
    };
  }

  try {
    const value = await input.handler();
    if (input.policy.commitOnSuccess) {
      await adapter.commit(key.key);
    }
    return {
      state: "reserved",
      executed: true,
      duplicate: false,
      keyStatus: "present_redacted",
      value,
    };
  } catch {
    const retryable = input.failureMode === "retryable" && input.policy.allowRetry;
    const failed = await adapter.fail(key.key, retryable);
    return {
      state: failed.state,
      executed: true,
      duplicate: false,
      keyStatus: "present_redacted",
      error: {
        code: retryable ? "IDEMPOTENCY_RETRYABLE_FAILURE" : "IDEMPOTENCY_FINAL_FAILURE",
        message: "Handler failed inside the idempotency boundary",
      },
    };
  }
}
