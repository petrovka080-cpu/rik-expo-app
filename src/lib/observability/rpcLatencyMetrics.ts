import {
  recordPlatformObservability,
  type PlatformObservabilityEvent,
} from "./platformObservability";

type RpcLatencyStatus = "success" | "error";

export type RpcLatencyMetricInput = {
  name: string;
  surface: string;
  screen: Parameters<typeof recordPlatformObservability>[0]["screen"];
  durationMs: number;
  status: RpcLatencyStatus;
  rowCount?: number;
  error?: unknown;
  extra?: Record<string, unknown>;
};

export type RpcLatencySnapshotEntry = {
  name: string;
  count: number;
  errorCount: number;
  errorRate: number;
  p50Ms: number;
  p95Ms: number;
  maxMs: number;
};

type RpcLatencyStore = Map<string, { durations: number[]; errorCount: number }>;

type RpcLatencyGlobal = typeof globalThis & {
  __RIK_RPC_LATENCY_METRICS__?: RpcLatencyStore;
};

const MAX_SAMPLES_PER_RPC = 200;

const getStore = (): RpcLatencyStore => {
  const root = globalThis as RpcLatencyGlobal;
  if (!root.__RIK_RPC_LATENCY_METRICS__) {
    root.__RIK_RPC_LATENCY_METRICS__ = new Map();
  }
  return root.__RIK_RPC_LATENCY_METRICS__;
};

const normalizeDuration = (value: number) =>
  Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;

const percentile = (values: number[], percentileValue: number) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((percentileValue / 100) * sorted.length) - 1),
  );
  return sorted[index];
};

const errorClass = (error: unknown) =>
  error instanceof Error ? error.name : undefined;

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : undefined;

export function trackRpcLatency(input: RpcLatencyMetricInput): PlatformObservabilityEvent {
  const name = String(input.name || "").trim() || "unknown_rpc";
  const durationMs = normalizeDuration(input.durationMs);
  const store = getStore();
  const bucket = store.get(name) ?? { durations: [], errorCount: 0 };
  bucket.durations.push(durationMs);
  if (bucket.durations.length > MAX_SAMPLES_PER_RPC) {
    bucket.durations.splice(0, bucket.durations.length - MAX_SAMPLES_PER_RPC);
  }
  if (input.status === "error") bucket.errorCount += 1;
  store.set(name, bucket);

  return recordPlatformObservability({
    screen: input.screen,
    surface: input.surface,
    category: "fetch",
    event: "rpc_latency",
    result: input.status,
    durationMs,
    rowCount: input.rowCount,
    sourceKind: `rpc:${name}`,
    errorClass: input.status === "error" ? errorClass(input.error) : undefined,
    errorMessage: input.status === "error" ? errorMessage(input.error) : undefined,
    extra: {
      rpcName: name,
      ...input.extra,
    },
  });
}

export function getRpcLatencySnapshot(): RpcLatencySnapshotEntry[] {
  return [...getStore().entries()]
    .map(([name, bucket]) => {
      const count = bucket.durations.length;
      return {
        name,
        count,
        errorCount: bucket.errorCount,
        errorRate: count ? Number((bucket.errorCount / count).toFixed(4)) : 0,
        p50Ms: percentile(bucket.durations, 50),
        p95Ms: percentile(bucket.durations, 95),
        maxMs: bucket.durations.length ? Math.max(...bucket.durations) : 0,
      };
    })
    .sort((left, right) => right.p95Ms - left.p95Ms || left.name.localeCompare(right.name));
}

export function resetRpcLatencyMetrics() {
  getStore().clear();
}
