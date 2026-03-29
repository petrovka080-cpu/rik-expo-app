export type WarehouseRequestSourcePath = "canonical" | "compatibility" | "degraded";
export type WarehouseRequestSourceTraceOperation = "req_heads_window" | "req_items";
export type WarehouseRequestSourceTraceResult = "success" | "error";

export type WarehouseRequestSourceTraceEntry = {
  timestamp: string;
  operation: WarehouseRequestSourceTraceOperation;
  result: WarehouseRequestSourceTraceResult;
  sourcePath: WarehouseRequestSourcePath;
  sourceKind: string;
  reason: string | null;
  requestId: string | null;
  page: number | null;
  pageSize: number | null;
  rowCount: number | null;
  contractVersion: string | null;
};

type TimedRowsFallbackCacheParams<TRow> = {
  failCooldownMs: number;
  lastGoodTtlMs: number;
  cloneRows: (rows: TRow[]) => TRow[];
};

type TimedRowsFallbackCache<TRow> = {
  getLastKnownGoodRows: (now?: number) => TRow[];
  recordLiveRows: (rows: TRow[], now?: number) => void;
  recordHardFail: (now?: number) => void;
  isCoolingDown: (now?: number) => boolean;
  shouldEmitCooldownLog: (now?: number, minIntervalMs?: number) => boolean;
  readState: () => {
    lastHardFailAt: number;
    lastSkipLogAt: number;
    lastKnownGoodAt: number;
    lastKnownGoodRowCount: number;
    failCooldownMs: number;
    lastGoodTtlMs: number;
  };
};

const MAX_WAREHOUSE_REQUEST_SOURCE_TRACES = 64;
const warehouseRequestSourceTrace: WarehouseRequestSourceTraceEntry[] = [];

export function recordWarehouseRequestSourceTrace(entry: WarehouseRequestSourceTraceEntry) {
  warehouseRequestSourceTrace.push(entry);
  while (warehouseRequestSourceTrace.length > MAX_WAREHOUSE_REQUEST_SOURCE_TRACES) {
    warehouseRequestSourceTrace.shift();
  }
}

export function readWarehouseRequestSourceTrace(): WarehouseRequestSourceTraceEntry[] {
  return warehouseRequestSourceTrace.map((entry) => ({ ...entry }));
}

export function clearWarehouseRequestSourceTrace() {
  warehouseRequestSourceTrace.length = 0;
}

export function createWarehouseTimedRowsFallbackCache<TRow>(
  params: TimedRowsFallbackCacheParams<TRow>,
): TimedRowsFallbackCache<TRow> {
  let lastHardFailAt = 0;
  let lastSkipLogAt = 0;
  let lastKnownGoodAt = 0;
  let lastKnownGoodRows: TRow[] = [];

  const nowMs = () => Date.now();

  return {
    getLastKnownGoodRows(now = nowMs()) {
      if (now - lastKnownGoodAt > params.lastGoodTtlMs) {
        return [];
      }
      return params.cloneRows(lastKnownGoodRows);
    },
    recordLiveRows(rows, now = nowMs()) {
      lastHardFailAt = 0;
      lastSkipLogAt = 0;
      lastKnownGoodAt = now;
      lastKnownGoodRows = params.cloneRows(rows);
    },
    recordHardFail(now = nowMs()) {
      lastHardFailAt = now;
    },
    isCoolingDown(now = nowMs()) {
      return lastHardFailAt > 0 && now - lastHardFailAt < params.failCooldownMs;
    },
    shouldEmitCooldownLog(now = nowMs(), minIntervalMs = 5000) {
      if (now - lastSkipLogAt <= minIntervalMs) return false;
      lastSkipLogAt = now;
      return true;
    },
    readState() {
      return {
        lastHardFailAt,
        lastSkipLogAt,
        lastKnownGoodAt,
        lastKnownGoodRowCount: lastKnownGoodRows.length,
        failCooldownMs: params.failCooldownMs,
        lastGoodTtlMs: params.lastGoodTtlMs,
      };
    },
  };
}
