import type { WarehouseRequestSourcePath } from "./warehouse.cache";
import type {
  ReqHeadRow,
  WarehouseReqHeadsCooldownReason,
  WarehouseReqHeadsFailureClass,
  WarehouseReqHeadsFreshness,
  WarehouseReqHeadsIntegrityState,
  WarehouseReqHeadsListState,
} from "./warehouse.types";
import { classifyWarehouseReqHeadsFailure } from "./warehouse.reqHeads.failure";

export type WarehouseReqHeadsStateTraceEntry = {
  timestamp: string;
  stage: "publish" | "cooldown_skip";
  publishState: WarehouseReqHeadsListState["publishState"];
  freshness: WarehouseReqHeadsFreshness;
  failureClass: WarehouseReqHeadsFailureClass | null;
  rowCount: number;
  lastKnownGoodUsed: boolean;
  cooldownActive: boolean;
  cooldownReason: WarehouseReqHeadsCooldownReason | null;
  reason: string | null;
  message: string | null;
  trigger: string | null;
};

export type WarehouseReqHeadsCooldownDecision = {
  active: boolean;
  retryAfterMs: number;
  remainingMs: number;
  cooldownReason: WarehouseReqHeadsCooldownReason | null;
};

export type WarehouseReqHeadsPrimaryPublishDecision = {
  rows: ReqHeadRow[];
  hasMore: boolean;
  integrityState: WarehouseReqHeadsIntegrityState;
  listState: WarehouseReqHeadsListState;
  usedLastKnownGood: boolean;
  falseEmptyPrevented: boolean;
};

const MAX_WAREHOUSE_REQ_HEADS_STATE_TRACES = 64;
const warehouseReqHeadsStateTrace: WarehouseReqHeadsStateTraceEntry[] = [];

export function recordWarehouseReqHeadsStateTrace(entry: WarehouseReqHeadsStateTraceEntry) {
  warehouseReqHeadsStateTrace.push(entry);
  while (warehouseReqHeadsStateTrace.length > MAX_WAREHOUSE_REQ_HEADS_STATE_TRACES) {
    warehouseReqHeadsStateTrace.shift();
  }
}

export function readWarehouseReqHeadsStateTrace(): WarehouseReqHeadsStateTraceEntry[] {
  return warehouseReqHeadsStateTrace.map((entry) => ({ ...entry }));
}

export function clearWarehouseReqHeadsStateTrace() {
  warehouseReqHeadsStateTrace.length = 0;
}

export function createWarehouseReqHeadsIntegrityState(params: {
  mode: WarehouseReqHeadsIntegrityState["mode"];
  failureClass?: WarehouseReqHeadsFailureClass | null;
  reason?: string | null;
  message?: string | null;
  cacheUsed?: boolean;
  freshness?: WarehouseReqHeadsFreshness;
  cooldownActive?: boolean;
  cooldownReason?: WarehouseReqHeadsCooldownReason | null;
}): WarehouseReqHeadsIntegrityState {
  return {
    mode: params.mode,
    failureClass: params.failureClass ?? null,
    freshness: params.freshness ?? (params.mode === "healthy" ? "fresh" : "stale"),
    reason: params.reason ?? null,
    message: params.message ?? null,
    cacheUsed: params.cacheUsed === true,
    cooldownActive: params.cooldownActive === true,
    cooldownReason: params.cooldownReason ?? null,
  };
}

export function createHealthyWarehouseReqHeadsIntegrityState(): WarehouseReqHeadsIntegrityState {
  return createWarehouseReqHeadsIntegrityState({
    mode: "healthy",
  });
}

export function deriveWarehouseReqHeadsListState(params: {
  rows: ReqHeadRow[];
  integrityState: WarehouseReqHeadsIntegrityState;
}): WarehouseReqHeadsListState {
  const rowCount = params.rows.length;
  if (params.integrityState.mode === "healthy") {
    return {
      publishState: rowCount > 0 ? "ready" : "empty",
      freshness: "fresh",
      failureClass: null,
      reason: null,
      message: null,
      rowCount,
      lastKnownGoodUsed: false,
      cooldownActive: params.integrityState.cooldownActive,
      cooldownReason: params.integrityState.cooldownReason,
    };
  }

  if (params.integrityState.mode === "stale_last_known_good") {
    return {
      publishState: "degraded",
      freshness: "stale",
      failureClass: params.integrityState.failureClass,
      reason: params.integrityState.reason,
      message: params.integrityState.message,
      rowCount,
      lastKnownGoodUsed: params.integrityState.cacheUsed,
      cooldownActive: params.integrityState.cooldownActive,
      cooldownReason: params.integrityState.cooldownReason,
    };
  }

  return {
    publishState: "error",
    freshness: "stale",
    failureClass: params.integrityState.failureClass,
    reason: params.integrityState.reason,
    message: params.integrityState.message,
    rowCount,
    lastKnownGoodUsed: false,
    cooldownActive: params.integrityState.cooldownActive,
    cooldownReason: params.integrityState.cooldownReason,
  };
}

export function evaluateWarehouseReqHeadsCooldown(params: {
  lastFailureAt: number;
  retryAfterMs: number;
  now?: number;
}): WarehouseReqHeadsCooldownDecision {
  if (params.lastFailureAt <= 0 || params.retryAfterMs <= 0) {
    return {
      active: false,
      retryAfterMs: Math.max(0, params.retryAfterMs),
      remainingMs: 0,
      cooldownReason: null,
    };
  }
  const now = params.now ?? Date.now();
  const remainingMs = Math.max(0, params.retryAfterMs - (now - params.lastFailureAt));
  return {
    active: remainingMs > 0,
    retryAfterMs: params.retryAfterMs,
    remainingMs,
    cooldownReason: remainingMs > 0 ? "failure_backoff" : null,
  };
}

export function resolveWarehouseReqHeadsPrimaryPublish(params: {
  rows: ReqHeadRow[];
  hasMore: boolean;
  integrityState: WarehouseReqHeadsIntegrityState;
  sourcePath: WarehouseRequestSourcePath;
  sourceReason?: string | null;
  lastKnownGood?: { rows: ReqHeadRow[]; hasMore: boolean } | null;
}): WarehouseReqHeadsPrimaryPublishDecision {
  if (
    params.integrityState.mode === "healthy" &&
    params.sourcePath !== "canonical" &&
    params.rows.length === 0
  ) {
    const failure = classifyWarehouseReqHeadsFailure(
      params.sourceReason ?? "compatibility_empty_not_primary",
    );
    if (params.lastKnownGood) {
      const integrityState = createWarehouseReqHeadsIntegrityState({
        mode: "stale_last_known_good",
        failureClass: failure.failureClass,
        reason: "non_primary_empty_not_publishable",
        message: params.sourceReason ?? "compatibility path returned empty after primary failure",
        cacheUsed: true,
      });
      return {
        rows: params.lastKnownGood.rows,
        hasMore: params.lastKnownGood.hasMore,
        integrityState,
        listState: deriveWarehouseReqHeadsListState({
          rows: params.lastKnownGood.rows,
          integrityState,
        }),
        usedLastKnownGood: true,
        falseEmptyPrevented: true,
      };
    }

    const integrityState = createWarehouseReqHeadsIntegrityState({
      mode: "error",
      failureClass: failure.failureClass,
      reason: "non_primary_empty_not_publishable",
      message: params.sourceReason ?? "compatibility path returned empty after primary failure",
      cacheUsed: false,
    });
    return {
      rows: [],
      hasMore: false,
      integrityState,
      listState: deriveWarehouseReqHeadsListState({
        rows: [],
        integrityState,
      }),
      usedLastKnownGood: false,
      falseEmptyPrevented: true,
    };
  }

  return {
    rows: params.rows,
    hasMore: params.hasMore,
    integrityState: params.integrityState,
    listState: deriveWarehouseReqHeadsListState({
      rows: params.rows,
      integrityState: params.integrityState,
    }),
    usedLastKnownGood: false,
    falseEmptyPrevented: false,
  };
}
