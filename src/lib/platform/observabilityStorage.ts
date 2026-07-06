import { recordPlatformObservability } from "../observability/platformObservability";

export type PlatformStorageSoftFailure = {
  ok: false;
  softFailure: true;
  warningEmitted: boolean;
  errorClass: string;
  errorMessage: string;
};

export type PlatformStorageSuccess = {
  ok: true;
  softFailure: false;
};

export type PlatformStorageWriteResult = PlatformStorageSuccess | PlatformStorageSoftFailure;

const warningBuckets = new Map<string, number>();
const WARNING_RATE_LIMIT_MS = 60_000;

function errorSummary(error: unknown) {
  if (error instanceof Error) {
    return {
      errorClass: error.name || "Error",
      errorMessage: error.message || "unknown_error",
    };
  }
  const record = error && typeof error === "object" ? (error as Record<string, unknown>) : {};
  return {
    errorClass: String(record.name ?? "Error"),
    errorMessage: String(record.message ?? error ?? "unknown_error"),
  };
}

function shouldEmitWarning(bucket: string, nowMs = Date.now()): boolean {
  const previous = warningBuckets.get(bucket) ?? 0;
  if (nowMs - previous < WARNING_RATE_LIMIT_MS) return false;
  warningBuckets.set(bucket, nowMs);
  return true;
}

export function recordPlatformStorageSoftFailure(input: {
  scope: string;
  key?: string | null;
  error: unknown;
  surface?: string;
}): PlatformStorageSoftFailure {
  const summary = errorSummary(input.error);
  const bucket = `${input.scope}:${summary.errorClass}:${input.key ?? ""}`;
  const warningEmitted = shouldEmitWarning(bucket);
  if (warningEmitted && typeof console !== "undefined") {
    console.warn("[platform.storage.soft_failure]", {
      scope: input.scope,
      key: input.key ?? null,
      errorClass: summary.errorClass,
      errorMessage: summary.errorMessage,
    });
  }

  recordPlatformObservability({
    screen: "global_busy",
    surface: input.surface ?? "platform_storage",
    category: "fetch",
    event: "write_failed",
    result: "error",
    trigger: "catch",
    sourceKind: "soft_storage",
    errorStage: "write",
    errorClass: summary.errorClass,
    errorMessage: summary.errorMessage,
    fallbackUsed: true,
    extra: {
      scope: input.scope,
      key: input.key ?? null,
      softFailure: true,
      warningEmitted,
    },
  });

  return {
    ok: false,
    softFailure: true,
    warningEmitted,
    errorClass: summary.errorClass,
    errorMessage: summary.errorMessage,
  };
}

export function resetPlatformStorageWarningBucketsForTests(): void {
  warningBuckets.clear();
}
