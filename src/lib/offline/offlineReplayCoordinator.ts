export type OfflineReplayOrdering = "created_at_fifo" | "claimed_at_fifo";

export type OfflineReplayBackpressure =
  "coalesce_triggers_and_rerun_once";

export type OfflineReplayPolicy = {
  queueKey: string;
  owner: string;
  concurrencyLimit: 1;
  ordering: OfflineReplayOrdering;
  backpressure: OfflineReplayBackpressure;
};

export type ReplayFailureWorker =
  | "mutation"
  | "warehouseReceive"
  | "contractorProgress";

export type ReplayFailureKind =
  | "rate_limit"
  | "server_error"
  | "network"
  | "unknown_transient";

export type ReplayFailureSignal = {
  worker: ReplayFailureWorker;
  kind: ReplayFailureKind;
  status?: number;
  now?: number;
};

export type ReplayFailureClassification = Pick<
  ReplayFailureSignal,
  "kind" | "status"
>;

export type ReplayDecision = {
  allow: boolean;
  reason: "ok" | "cooldown";
  retryAfterMs: number;
};

export const OFFLINE_REPLAY_CIRCUIT_BREAKER_CONFIG = {
  failureWindowMs: 60_000,
  failureThreshold: 5,
  cooldownInitialMs: 30_000,
  cooldownMaxMs: 5 * 60_000,
} as const;

type PendingReplay<TResult> = {
  triggerSource: string;
  run: (triggerSource: string) => Promise<TResult>;
};

type ReplayOwnerState = {
  activeDrain: Promise<void> | null;
  currentRun: Promise<unknown> | null;
  currentTriggerSource: string | null;
  pending: PendingReplay<unknown> | null;
  pendingTriggerSource: string | null;
  lastResult: unknown;
  lastError: unknown;
  runCount: number;
};

type ReplayFailureRecord = {
  worker: ReplayFailureWorker;
  kind: ReplayFailureKind;
  status?: number;
  at: number;
};

export type OfflineReplayOwnerSnapshot = {
  queueKey: string;
  active: boolean;
  running: boolean;
  pending: boolean;
  currentTriggerSource: string | null;
  pendingTriggerSource: string | null;
  runCount: number;
};

const states = new Map<string, ReplayOwnerState>();
const replayFailures: ReplayFailureRecord[] = [];
let replayCooldownUntil = 0;
let replayCooldownOpenCount = 0;

const normalizeTriggerSource = (value: unknown) =>
  String(value ?? "").trim() || "unknown";

const getNow = (now?: number) => {
  const parsed = Number(now);
  return Number.isFinite(parsed) ? parsed : Date.now();
};

const pruneReplayFailures = (now: number) => {
  const threshold = now - OFFLINE_REPLAY_CIRCUIT_BREAKER_CONFIG.failureWindowMs;
  for (let index = replayFailures.length - 1; index >= 0; index -= 1) {
    if (replayFailures[index].at < threshold) {
      replayFailures.splice(index, 1);
    }
  }
};

const getStatusFromUnknown = (error: unknown): number | undefined => {
  if (!error || typeof error !== "object") return undefined;
  const record = error as Record<string, unknown>;
  const responseStatus =
    record.response &&
    typeof record.response === "object" &&
    "status" in record.response
      ? (record.response as Record<string, unknown>).status
      : undefined;
  const candidates = [
    record.status,
    record.statusCode,
    record.httpStatus,
    responseStatus,
  ];
  for (const candidate of candidates) {
    const status = Number(candidate);
    if (Number.isInteger(status) && status >= 100 && status <= 599) {
      return status;
    }
  }
  return undefined;
};

const getMessageFromUnknown = (error: unknown) => {
  if (error instanceof Error) return error.message.toLowerCase();
  if (typeof error === "string") return error.toLowerCase();
  if (!error || typeof error !== "object") return "";
  const record = error as Record<string, unknown>;
  return [
    record.message,
    record.error,
    record.code,
    record.details,
    record.hint,
  ]
    .map((value) => String(value ?? "").toLowerCase())
    .join(" ");
};

export function classifyReplayFailure(
  error: unknown,
): ReplayFailureClassification | null {
  const status = getStatusFromUnknown(error);
  if (status === 429) return { kind: "rate_limit", status };
  if (status === 502 || status === 503 || (status != null && status >= 500)) {
    return { kind: "server_error", status };
  }
  if (
    status === 400 ||
    status === 401 ||
    status === 403 ||
    status === 404 ||
    status === 409 ||
    status === 412 ||
    status === 422
  ) {
    return null;
  }

  const message = getMessageFromUnknown(error);
  if (!message) return null;

  if (
    /validation|invalid|required|schema|permission|unauthorized|forbidden|conflict|stale|duplicate|already|closed|completed|cancelled/.test(
      message,
    )
  ) {
    return null;
  }
  if (/network|fetch failed|connection|offline|internet|transport/.test(message)) {
    return { kind: "network", status };
  }
  if (/timeout|timed out|temporary|try again|service unavailable|internal server/.test(message)) {
    return { kind: "unknown_transient", status };
  }

  return null;
}

const createState = (): ReplayOwnerState => ({
  activeDrain: null,
  currentRun: null,
  currentTriggerSource: null,
  pending: null,
  pendingTriggerSource: null,
  lastResult: undefined,
  lastError: null,
  runCount: 0,
});

const getState = (policy: OfflineReplayPolicy) => {
  const existing = states.get(policy.queueKey);
  if (existing) return existing;
  const next = createState();
  states.set(policy.queueKey, next);
  return next;
};

const assertSerialPolicy = (policy: OfflineReplayPolicy) => {
  if (policy.concurrencyLimit !== 1) {
    throw new Error(
      `offline replay policy ${policy.queueKey} must be serial in this runtime`,
    );
  }
};

const startDrain = (policy: OfflineReplayPolicy, state: ReplayOwnerState) => {
  assertSerialPolicy(policy);

  const drain = (async () => {
    while (state.pending) {
      const current = state.pending;
      state.pending = null;
      state.pendingTriggerSource = null;
      state.currentTriggerSource = current.triggerSource;
      state.runCount += 1;

      const run = current.run(current.triggerSource);
      state.currentRun = run;
      try {
        state.lastResult = await run;
        state.lastError = null;
      } catch (error) {
        state.lastError = error;
        throw error;
      } finally {
        if (state.currentRun === run) {
          state.currentRun = null;
          state.currentTriggerSource = null;
        }
      }
    }
  })();

  const activeDrain = drain.finally(() => {
    if (state.activeDrain === activeDrain) {
      state.activeDrain = null;
    }
    if (state.pending && !state.activeDrain) {
      startDrain(policy, state);
    }
  });

  state.activeDrain = activeDrain;
  state.activeDrain.catch(() => undefined);
};

export function requestOfflineReplay<TResult>(
  policy: OfflineReplayPolicy,
  triggerSource: string,
  run: (triggerSource: string) => Promise<TResult>,
): Promise<TResult> {
  assertSerialPolicy(policy);
  const state = getState(policy);
  const normalizedTriggerSource = normalizeTriggerSource(triggerSource);

  state.pending = {
    triggerSource: normalizedTriggerSource,
    run: run as PendingReplay<unknown>["run"],
  };
  state.pendingTriggerSource = normalizedTriggerSource;

  if (state.currentRun) {
    return state.currentRun as Promise<TResult>;
  }

  if (!state.activeDrain) {
    startDrain(policy, state);
  }

  if (state.currentRun) {
    return state.currentRun as Promise<TResult>;
  }

  return (state.activeDrain ?? Promise.resolve()).then(() => {
    if (state.lastError) throw state.lastError;
    return state.lastResult as TResult;
  });
}

export function shouldAllowReplay(now?: number): ReplayDecision {
  const current = getNow(now);
  if (replayCooldownUntil > current) {
    return {
      allow: false,
      reason: "cooldown",
      retryAfterMs: replayCooldownUntil - current,
    };
  }

  replayCooldownUntil = 0;
  pruneReplayFailures(current);
  return {
    allow: true,
    reason: "ok",
    retryAfterMs: 0,
  };
}

export function recordReplayFailure(signal: ReplayFailureSignal): void {
  const current = getNow(signal.now);
  pruneReplayFailures(current);

  replayFailures.push({
    worker: signal.worker,
    kind: signal.kind,
    status: signal.status,
    at: current,
  });

  if (
    replayFailures.length <
    OFFLINE_REPLAY_CIRCUIT_BREAKER_CONFIG.failureThreshold
  ) {
    return;
  }

  const cooldownMs = Math.min(
    OFFLINE_REPLAY_CIRCUIT_BREAKER_CONFIG.cooldownInitialMs *
      2 ** replayCooldownOpenCount,
    OFFLINE_REPLAY_CIRCUIT_BREAKER_CONFIG.cooldownMaxMs,
  );
  replayCooldownOpenCount += 1;
  replayCooldownUntil = Math.max(replayCooldownUntil, current + cooldownMs);
  replayFailures.splice(0, replayFailures.length);
}

export function recordReplaySuccess(worker: ReplayFailureWorker): void {
  for (let index = replayFailures.length - 1; index >= 0; index -= 1) {
    if (replayFailures[index].worker === worker) {
      replayFailures.splice(index, 1);
    }
  }
  if (!replayFailures.length && replayCooldownUntil === 0) {
    replayCooldownOpenCount = 0;
  }
}

export function resetReplayCircuitBreakerForTests() {
  replayFailures.splice(0, replayFailures.length);
  replayCooldownUntil = 0;
  replayCooldownOpenCount = 0;
}

export function getOfflineReplayOwnerSnapshot(
  queueKey: string,
): OfflineReplayOwnerSnapshot {
  const key = String(queueKey ?? "").trim();
  const state = states.get(key);
  return {
    queueKey: key,
    active: Boolean(state?.activeDrain),
    running: Boolean(state?.currentRun),
    pending: Boolean(state?.pending),
    currentTriggerSource: state?.currentTriggerSource ?? null,
    pendingTriggerSource: state?.pendingTriggerSource ?? null,
    runCount: state?.runCount ?? 0,
  };
}

export function resetOfflineReplayCoordinator() {
  states.clear();
  resetReplayCircuitBreakerForTests();
}

export function resetOfflineReplayCoordinatorForTests() {
  resetOfflineReplayCoordinator();
}
