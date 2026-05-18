import {
  getSupabaseRpcRuntimePolicy,
  type SupabaseRpcRuntimePolicy,
} from "./rpcRateLimitPolicy";
import { registerTimeout } from "../lifecycle/timerRegistry";

export type RpcRateLimitedTransportResult = {
  data: unknown;
  error: unknown;
};

export type RpcCallableClient = {
  rpc: (fn: string, args?: unknown, options?: unknown) => unknown;
};

export type RpcRateLimitContext = {
  owner?: string;
  caller?: string;
  source?: "supabase_client_proxy" | "adapter" | "contained_rpc" | "compat_transport";
};

type RpcRateLimitQueueItem<T> = {
  run: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
};

export class RpcRuntimeRateLimitError extends Error {
  readonly rpcName: string;
  readonly reason: string;

  constructor(rpcName: string, reason: string) {
    super(`RPC runtime rate-limit policy rejected ${rpcName}: ${reason}`);
    this.name = "RpcRuntimeRateLimitError";
    this.rpcName = rpcName;
    this.reason = reason;
  }
}

export type RpcRateLimiterRuntimeOptions = {
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
};

const defaultNow = () => Date.now();
const defaultSleep = (ms: number) =>
  new Promise<void>((resolve) => {
    registerTimeout("rpc_rate_limiter:window_delay", resolve, Math.max(0, ms));
  });

const isThenable = (value: unknown): value is PromiseLike<unknown> =>
  value !== null &&
  (typeof value === "object" || typeof value === "function") &&
  typeof (value as { then?: unknown }).then === "function";

export class RpcRateLimiter {
  private readonly now: () => number;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly activeByKey = new Map<string, number>();
  private readonly queueByKey = new Map<string, RpcRateLimitQueueItem<unknown>[]>();
  private readonly timestampsByKey = new Map<string, number[]>();

  constructor(options?: RpcRateLimiterRuntimeOptions) {
    this.now = options?.now ?? defaultNow;
    this.sleep = options?.sleep ?? defaultSleep;
  }

  async schedule<T>(
    runtimePolicy: SupabaseRpcRuntimePolicy,
    run: () => Promise<T>,
  ): Promise<T> {
    if (runtimePolicy.blocked) {
      throw new RpcRuntimeRateLimitError(runtimePolicy.rpcName, runtimePolicy.reason);
    }

    const key = this.keyForPolicy(runtimePolicy);
    return new Promise<T>((resolve, reject) => {
      const queue = this.queueByKey.get(key) ?? [];
      queue.push({
        run: run as () => Promise<unknown>,
        resolve: resolve as (value: unknown) => void,
        reject,
      });
      this.queueByKey.set(key, queue);
      void this.drain(key, runtimePolicy);
    });
  }

  private keyForPolicy(runtimePolicy: SupabaseRpcRuntimePolicy): string {
    return [
      runtimePolicy.rateEnforcementOperation ?? runtimePolicy.runtimeClass,
      runtimePolicy.rpcName,
    ].join(":");
  }

  private async drain(
    key: string,
    runtimePolicy: SupabaseRpcRuntimePolicy,
  ): Promise<void> {
    const queue = this.queueByKey.get(key);
    if (!queue?.length) return;

    const active = this.activeByKey.get(key) ?? 0;
    if (active >= runtimePolicy.limit.concurrency) return;

    const delayMs = this.nextWindowDelayMs(key, runtimePolicy);
    if (delayMs > 0) {
      await this.sleep(delayMs);
    }

    const next = queue.shift();
    if (!next) return;
    this.activeByKey.set(key, active + 1);
    this.recordStart(key, runtimePolicy);

    next
      .run()
      .then(next.resolve, next.reject)
      .finally(() => {
        const currentActive = this.activeByKey.get(key) ?? 1;
        this.activeByKey.set(key, Math.max(0, currentActive - 1));
        if (queue.length === 0) {
          this.queueByKey.delete(key);
        }
        void this.drain(key, runtimePolicy);
      });

    void this.drain(key, runtimePolicy);
  }

  private nextWindowDelayMs(
    key: string,
    runtimePolicy: SupabaseRpcRuntimePolicy,
  ): number {
    if (runtimePolicy.limit.maxRequests <= 0) return runtimePolicy.limit.cooldownMs;
    const now = this.now();
    const windowStart = now - runtimePolicy.limit.windowMs;
    const timestamps = (this.timestampsByKey.get(key) ?? []).filter(
      (timestamp) => timestamp > windowStart,
    );
    this.timestampsByKey.set(key, timestamps);
    if (timestamps.length < runtimePolicy.limit.maxRequests) return 0;
    const oldest = timestamps[0] ?? now;
    return Math.max(0, oldest + runtimePolicy.limit.windowMs - now);
  }

  private recordStart(key: string, runtimePolicy: SupabaseRpcRuntimePolicy): void {
    const now = this.now();
    const windowStart = now - runtimePolicy.limit.windowMs;
    const timestamps = (this.timestampsByKey.get(key) ?? []).filter(
      (timestamp) => timestamp > windowStart,
    );
    timestamps.push(now);
    this.timestampsByKey.set(key, timestamps);
  }
}

export const defaultRpcRateLimiter = new RpcRateLimiter();

function invokeRawRpc(
  rawRpc: (fn: string, args?: unknown, options?: unknown) => unknown,
  fn: string,
  args?: unknown,
  options?: unknown,
): unknown {
  if (options !== undefined) return rawRpc(fn, args, options);
  if (args !== undefined) return rawRpc(fn, args);
  return rawRpc(fn);
}

export function createRateLimitedRpcExecutor(
  rawRpc: (fn: string, args?: unknown, options?: unknown) => unknown,
  limiter = defaultRpcRateLimiter,
) {
  return (fn: string, args?: unknown, options?: unknown) => {
    const runtimePolicy = getSupabaseRpcRuntimePolicy(fn, args);
    const builder = invokeRawRpc(rawRpc, fn, args, options);
    return wrapRateLimitedRpcBuilder(builder, runtimePolicy, limiter);
  };
}

export function wrapRateLimitedRpcBuilder<T>(
  builder: T,
  runtimePolicy: SupabaseRpcRuntimePolicy,
  limiter = defaultRpcRateLimiter,
): T {
  if (!builder || (typeof builder !== "object" && typeof builder !== "function")) {
    return builder;
  }

  let scheduled: Promise<unknown> | null = null;
  const runOnce = () => {
    scheduled ??= limiter.schedule(runtimePolicy, async () => await builder);
    return scheduled;
  };

  return new Proxy(builder as object, {
    get(target, prop, receiver) {
      if (prop === "then") return runOnce().then.bind(runOnce());
      if (prop === "catch") return runOnce().catch.bind(runOnce());
      if (prop === "finally") return runOnce().finally.bind(runOnce());

      const value = Reflect.get(target, prop, receiver);
      if (typeof value !== "function") return value;

      return (...args: unknown[]) => {
        const next = value.apply(target, args);
        if (isThenable(next) || (next && typeof next === "object")) {
          return wrapRateLimitedRpcBuilder(next, runtimePolicy, limiter);
        }
        return next;
      };
    },
  }) as T;
}

export async function executeRateLimitedRpc(
  rawRpc: (fn: string, args?: unknown, options?: unknown) => unknown,
  fn: string,
  args?: unknown,
  options?: unknown,
  limiter = defaultRpcRateLimiter,
): Promise<RpcRateLimitedTransportResult> {
  const runtimePolicy = getSupabaseRpcRuntimePolicy(fn, args);
  return await limiter.schedule(runtimePolicy, async () => {
    const result = invokeRawRpc(rawRpc, fn, args, options);
    return (await result) as RpcRateLimitedTransportResult;
  });
}
