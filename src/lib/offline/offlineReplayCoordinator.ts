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

const normalizeTriggerSource = (value: unknown) =>
  String(value ?? "").trim() || "unknown";

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
}

export function resetOfflineReplayCoordinatorForTests() {
  resetOfflineReplayCoordinator();
}
