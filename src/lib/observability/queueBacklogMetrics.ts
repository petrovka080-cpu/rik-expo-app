import {
  recordPlatformObservability,
  type PlatformObservabilityEvent,
} from "./platformObservability";

export type QueueBacklogMetricInput = {
  queue: string;
  size: number;
  oldestAgeMs?: number | null;
  processingCount?: number | null;
  failedCount?: number | null;
  retryScheduledCount?: number | null;
  coalescedCount?: number | null;
  event?: string;
  extra?: Record<string, unknown>;
};

export type QueueBacklogSnapshotEntry = {
  queue: string;
  size: number;
  oldestAgeMs: number;
  processingCount: number;
  failedCount: number;
  retryScheduledCount: number;
  coalescedCount: number;
  updatedAt: number;
};

type QueueBacklogStore = Map<string, QueueBacklogSnapshotEntry>;

type QueueBacklogGlobal = typeof globalThis & {
  __RIK_QUEUE_BACKLOG_METRICS__?: QueueBacklogStore;
};

const getStore = (): QueueBacklogStore => {
  const root = globalThis as QueueBacklogGlobal;
  if (!root.__RIK_QUEUE_BACKLOG_METRICS__) {
    root.__RIK_QUEUE_BACKLOG_METRICS__ = new Map();
  }
  return root.__RIK_QUEUE_BACKLOG_METRICS__;
};

const toMetricNumber = (value: unknown) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0;
};

export function trackQueueBacklogMetric(input: QueueBacklogMetricInput): PlatformObservabilityEvent {
  const queue = String(input.queue || "").trim() || "unknown_queue";
  const snapshot: QueueBacklogSnapshotEntry = {
    queue,
    size: toMetricNumber(input.size),
    oldestAgeMs: toMetricNumber(input.oldestAgeMs),
    processingCount: toMetricNumber(input.processingCount),
    failedCount: toMetricNumber(input.failedCount),
    retryScheduledCount: toMetricNumber(input.retryScheduledCount),
    coalescedCount: toMetricNumber(input.coalescedCount),
    updatedAt: Date.now(),
  };
  getStore().set(queue, snapshot);

  return recordPlatformObservability({
    screen: "global_busy",
    surface: "queue_backlog",
    category: "reload",
    event: input.event ?? "queue_backlog_metric",
    result: "success",
    rowCount: snapshot.size,
    sourceKind: `queue:${queue}`,
    extra: {
      queue,
      oldestAgeMs: snapshot.oldestAgeMs,
      processingCount: snapshot.processingCount,
      failedCount: snapshot.failedCount,
      retryScheduledCount: snapshot.retryScheduledCount,
      coalescedCount: snapshot.coalescedCount,
      ...input.extra,
    },
  });
}

export function getQueueBacklogSnapshot(): QueueBacklogSnapshotEntry[] {
  return [...getStore().values()].sort((left, right) => right.size - left.size || left.queue.localeCompare(right.queue));
}

export function resetQueueBacklogMetrics() {
  getStore().clear();
}

export type ProjectionHealthSurface =
  | "director_report_issue_facts_v1"
  | "director_works_snapshot"
  | "warehouse_stock_summary_v1"
  | "buyer_inbox_search_projection"
  | "finance_supplier_rollup_v1"
  | "finance_object_rollup_v1"
  | "finance_panel_spend_projection_v1";

export type ProjectionHealthArea = "director" | "warehouse" | "buyer" | "finance";

export type ProjectionHealthState =
  | "healthy"
  | "stale"
  | "critical"
  | "missing"
  | "building"
  | "failed"
  | "unknown";

export type ProjectionBuildStatus = "ready" | "building" | "failed" | "unknown";

export type ProjectionHealthReasonCode =
  | "within_freshness_sla"
  | "stale_age"
  | "critical_age"
  | "missing_last_built_at"
  | "missing_row_count"
  | "invalid_last_built_at"
  | "build_in_progress"
  | "build_failed"
  | "build_status_unknown"
  | "fallback_used";

export type ProjectionHealthPolicy = {
  surface: ProjectionHealthSurface;
  area: ProjectionHealthArea;
  preparedLayer: true;
  freshnessSlaMs: number;
  staleAfterMs: number;
  criticalAfterMs: number;
  requiresLastBuiltAt: true;
  requiresRowCount: boolean;
  runtimeFallbackRisk: "low" | "medium" | "high";
  supportAction: string;
  defaultEnabled: false;
  liveDatabaseReadsEnabledByDefault: false;
  piiSafe: true;
};

export type ProjectionHealthSnapshot = {
  surface: ProjectionHealthSurface;
  lastBuiltAt?: string | null;
  lastBuiltAtMs?: number | null;
  rowCount?: number | null;
  buildStatus?: ProjectionBuildStatus | null;
  fallbackUsed?: boolean | null;
};

export type ProjectionHealthResult = {
  surface: ProjectionHealthSurface;
  area: ProjectionHealthArea;
  state: ProjectionHealthState;
  reasonCode: ProjectionHealthReasonCode;
  ageMs: number | null;
  rowCountKnown: boolean;
  fallbackUsed: boolean;
  supportAction: string;
  redacted: true;
  productionTouched: false;
  liveDatabaseRead: false;
};

export type ProjectionHealthSupportSummary = {
  total: number;
  states: Record<ProjectionHealthState, number>;
  requiresAttention: readonly {
    surface: ProjectionHealthSurface;
    state: ProjectionHealthState;
    reasonCode: ProjectionHealthReasonCode;
    supportAction: string;
  }[];
  redacted: true;
  rawRowsIncluded: false;
  piiIncluded: false;
  productionTouched: false;
};

const PROJECTION_HEALTH_MINUTE_MS = 60_000;

const projectionHealthPolicy = (
  input: Omit<
    ProjectionHealthPolicy,
    "preparedLayer" | "requiresLastBuiltAt" | "defaultEnabled" | "liveDatabaseReadsEnabledByDefault" | "piiSafe"
  >,
): ProjectionHealthPolicy =>
  Object.freeze({
    ...input,
    preparedLayer: true,
    requiresLastBuiltAt: true,
    defaultEnabled: false,
    liveDatabaseReadsEnabledByDefault: false,
    piiSafe: true,
  });

export const PROJECTION_HEALTH_POLICIES: readonly ProjectionHealthPolicy[] = Object.freeze([
  projectionHealthPolicy({
    surface: "director_report_issue_facts_v1",
    area: "director",
    freshnessSlaMs: PROJECTION_HEALTH_MINUTE_MS * 15,
    staleAfterMs: PROJECTION_HEALTH_MINUTE_MS * 30,
    criticalAfterMs: PROJECTION_HEALTH_MINUTE_MS * 90,
    requiresRowCount: true,
    runtimeFallbackRisk: "high",
    supportAction: "Verify report issue facts rebuild job before director report fallback is used.",
  }),
  projectionHealthPolicy({
    surface: "director_works_snapshot",
    area: "director",
    freshnessSlaMs: PROJECTION_HEALTH_MINUTE_MS * 30,
    staleAfterMs: PROJECTION_HEALTH_MINUTE_MS * 60,
    criticalAfterMs: PROJECTION_HEALTH_MINUTE_MS * 180,
    requiresRowCount: true,
    runtimeFallbackRisk: "medium",
    supportAction: "Check works snapshot age before running drift or fallback recompute.",
  }),
  projectionHealthPolicy({
    surface: "warehouse_stock_summary_v1",
    area: "warehouse",
    freshnessSlaMs: PROJECTION_HEALTH_MINUTE_MS * 5,
    staleAfterMs: PROJECTION_HEALTH_MINUTE_MS * 10,
    criticalAfterMs: PROJECTION_HEALTH_MINUTE_MS * 30,
    requiresRowCount: true,
    runtimeFallbackRisk: "high",
    supportAction: "Confirm stock summary freshness before trusting stock page or issue queue fallback.",
  }),
  projectionHealthPolicy({
    surface: "buyer_inbox_search_projection",
    area: "buyer",
    freshnessSlaMs: PROJECTION_HEALTH_MINUTE_MS * 10,
    staleAfterMs: PROJECTION_HEALTH_MINUTE_MS * 20,
    criticalAfterMs: PROJECTION_HEALTH_MINUTE_MS * 60,
    requiresRowCount: true,
    runtimeFallbackRisk: "medium",
    supportAction: "Check buyer inbox projection lag before opening support investigation on missing inbox rows.",
  }),
  projectionHealthPolicy({
    surface: "finance_supplier_rollup_v1",
    area: "finance",
    freshnessSlaMs: PROJECTION_HEALTH_MINUTE_MS * 30,
    staleAfterMs: PROJECTION_HEALTH_MINUTE_MS * 60,
    criticalAfterMs: PROJECTION_HEALTH_MINUTE_MS * 240,
    requiresRowCount: true,
    runtimeFallbackRisk: "high",
    supportAction: "Verify supplier rollup rebuild status before using finance supplier fallback paths.",
  }),
  projectionHealthPolicy({
    surface: "finance_object_rollup_v1",
    area: "finance",
    freshnessSlaMs: PROJECTION_HEALTH_MINUTE_MS * 30,
    staleAfterMs: PROJECTION_HEALTH_MINUTE_MS * 60,
    criticalAfterMs: PROJECTION_HEALTH_MINUTE_MS * 240,
    requiresRowCount: true,
    runtimeFallbackRisk: "high",
    supportAction: "Verify object rollup rebuild status before using finance object fallback paths.",
  }),
  projectionHealthPolicy({
    surface: "finance_panel_spend_projection_v1",
    area: "finance",
    freshnessSlaMs: PROJECTION_HEALTH_MINUTE_MS * 15,
    staleAfterMs: PROJECTION_HEALTH_MINUTE_MS * 30,
    criticalAfterMs: PROJECTION_HEALTH_MINUTE_MS * 120,
    requiresRowCount: true,
    runtimeFallbackRisk: "high",
    supportAction: "Check finance panel spend projection before director finance panel fallback is used.",
  }),
] as const);

export const PROJECTION_HEALTH_BOUNDARY_CONTRACT = Object.freeze({
  defaultEnabled: false,
  liveDatabaseReadsEnabledByDefault: false,
  productionTouchedByDefault: false,
  externalTelemetryEnabledByDefault: false,
  surfaces: PROJECTION_HEALTH_POLICIES.length,
});

const PROJECTION_HEALTH_ATTENTION_STATES: readonly ProjectionHealthState[] = Object.freeze([
  "stale",
  "critical",
  "missing",
  "failed",
  "unknown",
]);

export function getProjectionHealthPolicy(surface: ProjectionHealthSurface): ProjectionHealthPolicy | null {
  return PROJECTION_HEALTH_POLICIES.find((entry) => entry.surface === surface) ?? null;
}

function readProjectionLastBuiltAtMs(snapshot: ProjectionHealthSnapshot): number | null {
  if (typeof snapshot.lastBuiltAtMs === "number") {
    return Number.isFinite(snapshot.lastBuiltAtMs) ? snapshot.lastBuiltAtMs : null;
  }
  if (typeof snapshot.lastBuiltAt === "string" && snapshot.lastBuiltAt.trim().length > 0) {
    const parsed = Date.parse(snapshot.lastBuiltAt);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function projectionHealthResult(
  policyEntry: ProjectionHealthPolicy,
  input: Omit<
    ProjectionHealthResult,
    "surface" | "area" | "supportAction" | "redacted" | "productionTouched" | "liveDatabaseRead"
  >,
): ProjectionHealthResult {
  return {
    surface: policyEntry.surface,
    area: policyEntry.area,
    supportAction: policyEntry.supportAction,
    redacted: true,
    productionTouched: false,
    liveDatabaseRead: false,
    ...input,
  };
}

export function evaluateProjectionHealth(
  policyEntry: ProjectionHealthPolicy,
  snapshot: ProjectionHealthSnapshot,
  nowMs: number,
): ProjectionHealthResult {
  const buildStatus = snapshot.buildStatus ?? "ready";
  const fallbackUsed = snapshot.fallbackUsed === true;
  const rowCountKnown = typeof snapshot.rowCount === "number" && Number.isFinite(snapshot.rowCount) && snapshot.rowCount >= 0;
  const lastBuiltAtMs = readProjectionLastBuiltAtMs(snapshot);

  if (buildStatus === "failed") {
    return projectionHealthResult(policyEntry, {
      state: "failed",
      reasonCode: "build_failed",
      ageMs: lastBuiltAtMs === null ? null : Math.max(0, nowMs - lastBuiltAtMs),
      rowCountKnown,
      fallbackUsed,
    });
  }

  if (buildStatus === "building") {
    return projectionHealthResult(policyEntry, {
      state: "building",
      reasonCode: "build_in_progress",
      ageMs: lastBuiltAtMs === null ? null : Math.max(0, nowMs - lastBuiltAtMs),
      rowCountKnown,
      fallbackUsed,
    });
  }

  if (buildStatus === "unknown") {
    return projectionHealthResult(policyEntry, {
      state: "unknown",
      reasonCode: "build_status_unknown",
      ageMs: lastBuiltAtMs === null ? null : Math.max(0, nowMs - lastBuiltAtMs),
      rowCountKnown,
      fallbackUsed,
    });
  }

  if (snapshot.lastBuiltAt === null || snapshot.lastBuiltAtMs === null || lastBuiltAtMs === null) {
    return projectionHealthResult(policyEntry, {
      state: "missing",
      reasonCode: typeof snapshot.lastBuiltAt === "string" ? "invalid_last_built_at" : "missing_last_built_at",
      ageMs: null,
      rowCountKnown,
      fallbackUsed,
    });
  }

  if (policyEntry.requiresRowCount && !rowCountKnown) {
    return projectionHealthResult(policyEntry, {
      state: "missing",
      reasonCode: "missing_row_count",
      ageMs: Math.max(0, nowMs - lastBuiltAtMs),
      rowCountKnown,
      fallbackUsed,
    });
  }

  const ageMs = Math.max(0, nowMs - lastBuiltAtMs);
  if (fallbackUsed) {
    return projectionHealthResult(policyEntry, {
      state: ageMs > policyEntry.criticalAfterMs ? "critical" : "stale",
      reasonCode: "fallback_used",
      ageMs,
      rowCountKnown,
      fallbackUsed,
    });
  }

  if (ageMs <= policyEntry.staleAfterMs) {
    return projectionHealthResult(policyEntry, {
      state: "healthy",
      reasonCode: "within_freshness_sla",
      ageMs,
      rowCountKnown,
      fallbackUsed,
    });
  }

  if (ageMs <= policyEntry.criticalAfterMs) {
    return projectionHealthResult(policyEntry, {
      state: "stale",
      reasonCode: "stale_age",
      ageMs,
      rowCountKnown,
      fallbackUsed,
    });
  }

  return projectionHealthResult(policyEntry, {
    state: "critical",
    reasonCode: "critical_age",
    ageMs,
    rowCountKnown,
    fallbackUsed,
  });
}

export function evaluateProjectionHealthSnapshots(
  snapshots: readonly ProjectionHealthSnapshot[],
  nowMs: number,
): readonly ProjectionHealthResult[] {
  return snapshots.map((snapshot) => {
    const policyEntry = getProjectionHealthPolicy(snapshot.surface);
    if (!policyEntry) {
      throw new Error("Unknown projection health surface");
    }
    return evaluateProjectionHealth(policyEntry, snapshot, nowMs);
  });
}

export function buildProjectionHealthSupportSummary(
  results: readonly ProjectionHealthResult[],
): ProjectionHealthSupportSummary {
  const states = {
    healthy: 0,
    stale: 0,
    critical: 0,
    missing: 0,
    building: 0,
    failed: 0,
    unknown: 0,
  } satisfies Record<ProjectionHealthState, number>;

  for (const item of results) {
    states[item.state] += 1;
  }

  return {
    total: results.length,
    states,
    requiresAttention: results
      .filter((item) => PROJECTION_HEALTH_ATTENTION_STATES.includes(item.state))
      .map((item) => ({
        surface: item.surface,
        state: item.state,
        reasonCode: item.reasonCode,
        supportAction: item.supportAction,
      })),
    redacted: true,
    rawRowsIncluded: false,
    piiIncluded: false,
    productionTouched: false,
  };
}
