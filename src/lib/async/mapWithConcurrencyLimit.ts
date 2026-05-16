export type ConcurrencyLimitOptions = {
  label?: string;
};

const normalizeLimit = (limit: number, itemCount: number) => {
  const parsed = Math.floor(Number(limit));
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error("mapWithConcurrencyLimit limit must be a positive number");
  }
  return Math.max(1, Math.min(parsed, Math.max(1, itemCount)));
};

export async function mapWithConcurrencyLimit<T, R>(
  items: readonly T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
  _options?: ConcurrencyLimitOptions,
): Promise<R[]> {
  const source = Array.isArray(items) ? items : Array.from(items);
  if (!source.length) return [];

  const concurrency = normalizeLimit(limit, source.length);
  const results = new Array<R>(source.length);
  let nextIndex = 0;

  const run = async () => {
    while (nextIndex < source.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await worker(source[index], index);
    }
  };

  await Promise.all(Array.from({ length: concurrency }, () => run()));
  return results;
}

export async function allSettledWithConcurrencyLimit<T, R>(
  items: readonly T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
  options?: ConcurrencyLimitOptions,
): Promise<PromiseSettledResult<R>[]> {
  return mapWithConcurrencyLimit(
    items,
    limit,
    async (item, index): Promise<PromiseSettledResult<R>> => {
      try {
        return {
          status: "fulfilled",
          value: await worker(item, index),
        };
      } catch (reason) {
        return {
          status: "rejected",
          reason,
        };
      }
    },
    options,
  );
}

export const MIN_WORKER_LOOP_BACKOFF_MS = 1;

export type WorkerLoopClock = {
  sleep: (ms: number, signal?: AbortSignal | null) => Promise<void>;
};

export type WorkerLoopIterationContext = {
  label: string;
  iteration: number;
  signal: AbortSignal | null;
};

export type WorkerLoopStateContext = {
  label: string;
  iterations: number;
  errors: number;
  signal: AbortSignal | null;
};

export type WorkerLoopIterationResult =
  | void
  | {
      stop?: boolean;
      backoffMs?: number;
    };

export type WorkerLoopErrorDecision = "continue" | "stop" | "throw";

export type WorkerLoopErrorContext = WorkerLoopIterationContext & {
  errors: number;
};

export type WorkerLoopStopReason =
  | "aborted"
  | "error_stop"
  | "max_iterations"
  | "stop_condition"
  | "task_stop";

export type WorkerLoopSummary = {
  label: string;
  iterations: number;
  errors: number;
  stopReason: WorkerLoopStopReason;
};

export type CancellableWorkerLoopOptions = {
  label: string;
  runIteration: (
    context: WorkerLoopIterationContext,
  ) => Promise<WorkerLoopIterationResult>;
  backoffMs: number;
  errorBackoffMs?: number;
  signal?: AbortSignal | null;
  clock?: WorkerLoopClock;
  shouldStop?: (context: WorkerLoopStateContext) => boolean;
  onError?: (
    error: unknown,
    context: WorkerLoopErrorContext,
  ) => Promise<WorkerLoopErrorDecision> | WorkerLoopErrorDecision;
  testMode?: {
    maxIterations: number;
  };
};

export class WorkerLoopAbortError extends Error {
  constructor(label: string) {
    super(`${label} aborted`);
    this.name = "WorkerLoopAbortError";
  }
}

const normalizeBackoffMs = (
  value: number | undefined,
  fallback: number,
  fieldName: string,
) => {
  const candidate = value ?? fallback;
  const parsed = Math.floor(Number(candidate));
  if (!Number.isFinite(parsed)) {
    throw new Error(`${fieldName} must be a finite number`);
  }
  return Math.max(MIN_WORKER_LOOP_BACKOFF_MS, parsed);
};

const normalizeTestMaxIterations = (value: number | undefined) => {
  if (value == null) return null;
  const parsed = Math.floor(Number(value));
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error("testMode.maxIterations must be a non-negative number");
  }
  return parsed;
};

export const defaultWorkerLoopClock: WorkerLoopClock = {
  sleep: (ms, signal) =>
    new Promise<void>((resolve, reject) => {
      if (signal?.aborted) {
        reject(new WorkerLoopAbortError("worker loop"));
        return;
      }

      let settled = false;
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        signal?.removeEventListener("abort", onAbort);
        resolve();
      }, ms);

      const onAbort = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        signal?.removeEventListener("abort", onAbort);
        reject(new WorkerLoopAbortError("worker loop"));
      };

      signal?.addEventListener("abort", onAbort, { once: true });
    }),
};

export type CancellableDelayStatus = "elapsed" | "cancelled";

export type CancellableDelay = {
  readonly promise: Promise<CancellableDelayStatus>;
  cancel: () => void;
  isActive: () => boolean;
};

export function createCancellableDelay(delayMs: number): CancellableDelay {
  const safeDelayMs = Number.isFinite(delayMs) ? Math.max(0, Math.floor(delayMs)) : 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let settled = false;
  let resolveDelay: (status: CancellableDelayStatus) => void = () => undefined;

  const settle = (status: CancellableDelayStatus) => {
    if (settled) return;
    settled = true;
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    resolveDelay(status);
  };

  const promise = new Promise<CancellableDelayStatus>((resolve) => {
    resolveDelay = resolve;
    if (safeDelayMs <= 0) {
      settled = true;
      resolve("elapsed");
      return;
    }

    timer = setTimeout(() => {
      timer = null;
      settle("elapsed");
    }, safeDelayMs);
  });

  return {
    promise,
    cancel: () => settle("cancelled"),
    isActive: () => timer !== null && !settled,
  };
}

const isAbortStop = (signal: AbortSignal | null) => signal?.aborted === true;

const buildStateContext = (
  label: string,
  signal: AbortSignal | null,
  iterations: number,
  errors: number,
): WorkerLoopStateContext => ({
  label,
  signal,
  iterations,
  errors,
});

const buildSummary = (
  label: string,
  iterations: number,
  errors: number,
  stopReason: WorkerLoopStopReason,
): WorkerLoopSummary => ({
  label,
  iterations,
  errors,
  stopReason,
});

export async function runCancellableWorkerLoop(
  options: CancellableWorkerLoopOptions,
): Promise<WorkerLoopSummary> {
  const label = options.label.trim() || "worker-loop";
  const signal = options.signal ?? null;
  const clock = options.clock ?? defaultWorkerLoopClock;
  const defaultBackoffMs = normalizeBackoffMs(
    options.backoffMs,
    MIN_WORKER_LOOP_BACKOFF_MS,
    "backoffMs",
  );
  const errorBackoffMs = normalizeBackoffMs(
    options.errorBackoffMs,
    defaultBackoffMs,
    "errorBackoffMs",
  );
  const maxIterations = normalizeTestMaxIterations(
    options.testMode?.maxIterations,
  );

  let iterations = 0;
  let errors = 0;

  while (!isAbortStop(signal)) {
    if (options.shouldStop?.(buildStateContext(label, signal, iterations, errors))) {
      return buildSummary(label, iterations, errors, "stop_condition");
    }

    if (maxIterations != null && iterations >= maxIterations) {
      return buildSummary(label, iterations, errors, "max_iterations");
    }

    const iteration = iterations + 1;
    let result: WorkerLoopIterationResult;
    try {
      result = await options.runIteration({ label, iteration, signal });
    } catch (error: unknown) {
      iterations += 1;

      if (isAbortStop(signal)) {
        return buildSummary(label, iterations, errors, "aborted");
      }

      errors += 1;
      if (!options.onError) {
        throw error;
      }

      const decision = await options.onError(error, {
        label,
        iteration,
        signal,
        errors,
      });

      if (decision === "throw") {
        throw error;
      }

      if (decision === "stop") {
        return buildSummary(label, iterations, errors, "error_stop");
      }

      if (maxIterations != null && iterations >= maxIterations) {
        return buildSummary(label, iterations, errors, "max_iterations");
      }

      try {
        await clock.sleep(errorBackoffMs, signal);
      } catch (sleepError: unknown) {
        if (isAbortStop(signal)) {
          return buildSummary(label, iterations, errors, "aborted");
        }
        throw sleepError;
      }
      continue;
    }

    iterations += 1;

    if (isAbortStop(signal)) {
      return buildSummary(label, iterations, errors, "aborted");
    }

    if (result?.stop === true) {
      return buildSummary(label, iterations, errors, "task_stop");
    }

    if (options.shouldStop?.(buildStateContext(label, signal, iterations, errors))) {
      return buildSummary(label, iterations, errors, "stop_condition");
    }

    if (maxIterations != null && iterations >= maxIterations) {
      return buildSummary(label, iterations, errors, "max_iterations");
    }

    const backoffMs = normalizeBackoffMs(
      result?.backoffMs,
      defaultBackoffMs,
      "iteration backoffMs",
    );
    try {
      await clock.sleep(backoffMs, signal);
    } catch (sleepError: unknown) {
      if (isAbortStop(signal)) {
        return buildSummary(label, iterations, errors, "aborted");
      }
      throw sleepError;
    }
  }

  return buildSummary(label, iterations, errors, "aborted");
}
