import { callWarehouseApiBffRead } from "../../../../screens/warehouse/warehouse.api.bff.client";
import {
  type AiWarehouseStatusTransportResult,
  type AiWarehouseStatusTransportRow,
} from "./aiToolTransportTypes";

export const WAREHOUSE_STATUS_TRANSPORT_ROUTE_OPERATION = "warehouse.api.stock.scope" as const;

type WarehouseStockScopePayload = {
  rows?: unknown;
  meta?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readMetaNumber(meta: unknown, key: string): number | null {
  if (!isRecord(meta)) return null;
  const parsed = Number(meta[key]);
  return Number.isFinite(parsed) ? parsed : null;
}

function readMetaBoolean(meta: unknown, key: string): boolean | null {
  if (!isRecord(meta)) return null;
  return typeof meta[key] === "boolean" ? meta[key] : null;
}

function toTransportRow(row: Record<string, unknown>): AiWarehouseStatusTransportRow {
  return {
    material_id: typeof row.material_id === "string" ? row.material_id : null,
    code: typeof row.code === "string" ? row.code : null,
    name: typeof row.name === "string" ? row.name : null,
    uom_id: typeof row.uom_id === "string" ? row.uom_id : null,
    qty_on_hand: typeof row.qty_on_hand === "number" || typeof row.qty_on_hand === "string" ? row.qty_on_hand : null,
    qty_reserved: typeof row.qty_reserved === "number" || typeof row.qty_reserved === "string" ? row.qty_reserved : null,
    qty_available: typeof row.qty_available === "number" || typeof row.qty_available === "string" ? row.qty_available : null,
    qty_incoming: typeof row.qty_incoming === "number" || typeof row.qty_incoming === "string" ? row.qty_incoming : null,
    incoming_quantity:
      typeof row.incoming_quantity === "number" || typeof row.incoming_quantity === "string"
        ? row.incoming_quantity
        : null,
    project_id: typeof row.project_id === "string" ? row.project_id : null,
    object_name: typeof row.object_name === "string" ? row.object_name : null,
    warehouse_name: typeof row.warehouse_name === "string" ? row.warehouse_name : null,
    source_timestamp: typeof row.source_timestamp === "string" ? row.source_timestamp : null,
    updated_at: typeof row.updated_at === "string" ? row.updated_at : null,
  };
}

function parseBffStockPayload(
  payload: unknown,
  offset: number,
  limit: number,
): AiWarehouseStatusTransportResult {
  const payloadRecord = isRecord(payload) ? (payload as WarehouseStockScopePayload) : {};
  const rows = Array.isArray(payloadRecord.rows)
    ? payloadRecord.rows.filter(isRecord).map(toTransportRow)
    : [];
  const totalRowCount = readMetaNumber(payloadRecord.meta, "total_row_count");
  const hasMore =
    readMetaBoolean(payloadRecord.meta, "has_more") ??
    (totalRowCount === null ? rows.length >= limit : offset + rows.length < totalRowCount);

  return {
    rows,
    totalRowCount,
    hasMore,
    dtoOnly: true,
    rawRowsExposed: false,
  };
}

export async function readWarehouseStatusTransport(params: {
  offset: number;
  limit: number;
}): Promise<AiWarehouseStatusTransportResult> {
  const response = await callWarehouseApiBffRead({
    operation: WAREHOUSE_STATUS_TRANSPORT_ROUTE_OPERATION,
    args: {
      p_offset: params.offset,
      p_limit: params.limit,
    },
  });

  if (response.status === "unavailable") {
    throw new Error(`warehouse status read unavailable: ${response.reason}`);
  }
  if (response.status === "error") {
    throw new Error(response.error.message);
  }
  if (response.response.payload.kind !== "single") {
    throw new Error("warehouse status read returned invalid payload");
  }

  const firstRow = Array.isArray(response.response.payload.result.data)
    ? response.response.payload.result.data[0]
    : null;
  const payload = isRecord(firstRow) && Object.prototype.hasOwnProperty.call(firstRow, "payload")
    ? firstRow.payload
    : firstRow;

  return parseBffStockPayload(payload, params.offset, params.limit);
}
