export type WarehouseRequestSourcePath = "canonical";
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
