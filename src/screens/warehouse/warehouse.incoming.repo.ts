import { supabase } from "../../lib/supabaseClient";
import { applySupabaseAbortSignal, throwIfAborted } from "../../lib/requestCancellation";
import {
  isRpcRowsEnvelope,
  validateRpcResponse,
} from "../../lib/api/queryBoundary";
import type { IncomingRow, ItemRow } from "./warehouse.types";

type UnknownRecord = Record<string, unknown>;

type IncomingHeadRowDb = {
  incoming_id?: string | null;
  purchase_id?: string | null;
  incoming_status?: string | null;
  po_no?: string | null;
  purchase_status?: string | null;
  purchase_created_at?: string | null;
  confirmed_at?: string | null;
  qty_expected_sum?: number | null;
  qty_received_sum?: number | null;
  qty_left_sum?: number | null;
  items_cnt?: number | null;
  pending_cnt?: number | null;
  partial_cnt?: number | null;
};

type IncomingItemRowDb = {
  incoming_item_id?: string | null;
  purchase_item_id?: string | null;
  code?: string | null;
  name?: string | null;
  uom?: string | null;
  qty_expected?: number | null;
  qty_received?: number | null;
  qty_left?: number | null;
  sort_key?: number | null;
};

export type WarehouseIncomingHeadsMeta = {
  pageIndex: number;
  pageSize: number;
  pageOffset: number;
  rawWindowRowCount: number;
  returnedRowCount: number;
  totalVisibleCount: number | null;
  hasMore: boolean;
  scopeKey: string;
  generatedAt: string | null;
  contractVersion: string;
};

export type WarehouseIncomingHeadsSourceMeta = {
  primaryOwner: "rpc_scope_v1";
  fallbackUsed: boolean;
  sourceKind: string;
  contractVersion: string;
};

export type WarehouseIncomingHeadsFetchResult = {
  rows: IncomingRow[];
  meta: WarehouseIncomingHeadsMeta;
  sourceMeta: WarehouseIncomingHeadsSourceMeta;
};

export type WarehouseIncomingItemsMeta = {
  incomingId: string;
  rowCount: number;
  scopeKey: string;
  generatedAt: string | null;
  contractVersion: string;
};

export type WarehouseIncomingItemsSourceMeta = {
  primaryOwner: "rpc_scope_v1";
  fallbackUsed: boolean;
  sourceKind: string;
  contractVersion: string;
};

export type WarehouseIncomingItemsFetchResult = {
  rows: ItemRow[];
  meta: WarehouseIncomingItemsMeta;
  sourceMeta: WarehouseIncomingItemsSourceMeta;
};

const WAREHOUSE_INCOMING_QUEUE_RPC_SOURCE_KIND = "rpc:warehouse_incoming_queue_scope_v1";
const WAREHOUSE_INCOMING_ITEMS_RPC_SOURCE_KIND = "rpc:warehouse_incoming_items_scope_v1";

const asRecord = (value: unknown): UnknownRecord =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as UnknownRecord) : {};

const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

const toText = (value: unknown): string => String(value ?? "").trim();

const toOptionalText = (value: unknown): string | null => {
  const text = toText(value);
  return text || null;
};

const toNumber = (value: unknown, fallback = 0): number => {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toInt = (value: unknown, fallback = 0): number => Math.trunc(toNumber(value, fallback));

const normalizeIncomingHeadRow = (row: IncomingHeadRowDb): IncomingRow => {
  const qtyExpected = Math.max(0, toNumber(row.qty_expected_sum, 0));
  const qtyReceived = Math.max(0, toNumber(row.qty_received_sum, 0));
  const qtyLeft = Math.max(0, toNumber(row.qty_left_sum, qtyExpected - qtyReceived));

  return {
    incoming_id: toText(row.incoming_id),
    purchase_id: toText(row.purchase_id),
    incoming_status: toText(row.incoming_status) || "pending",
    po_no: toOptionalText(row.po_no),
    purchase_status: toOptionalText(row.purchase_status),
    purchase_created_at: toOptionalText(row.purchase_created_at),
    confirmed_at: toOptionalText(row.confirmed_at),
    qty_expected_sum: qtyExpected,
    qty_received_sum: qtyReceived,
    qty_left_sum: qtyLeft,
    items_cnt: Math.max(0, toInt(row.items_cnt, 0)),
    pending_cnt: Math.max(0, toInt(row.pending_cnt, 0)),
    partial_cnt: Math.max(0, toInt(row.partial_cnt, 0)),
  };
};

const normalizeIncomingItemRow = (row: IncomingItemRowDb): ItemRow => {
  const qtyExpected = Math.max(0, toNumber(row.qty_expected, 0));
  const qtyReceived = Math.max(0, toNumber(row.qty_received, 0));
  const qtyLeft = Math.max(0, toNumber(row.qty_left, qtyExpected - qtyReceived));

  return {
    incoming_item_id: toOptionalText(row.incoming_item_id),
    purchase_item_id: toText(row.purchase_item_id),
    code: toOptionalText(row.code)?.toUpperCase() ?? null,
    name: toText(row.name) || toText(row.code) || "—",
    uom: toOptionalText(row.uom),
    qty_expected: qtyExpected,
    qty_received: qtyReceived,
    qty_left: qtyLeft,
    sort_key: Math.max(1, toInt(row.sort_key, 1)),
  };
};

const toIncomingQueueMeta = (
  root: UnknownRecord,
  pageIndex: number,
  pageSize: number,
  returnedRowCount: number,
): WarehouseIncomingHeadsMeta => {
  const meta = asRecord(root.meta);
  const pageOffset = Math.max(0, toInt(meta.offset, pageIndex * pageSize));
  const limit = Math.max(1, toInt(meta.limit, pageSize));
  return {
    pageIndex,
    pageSize: limit,
    pageOffset,
    rawWindowRowCount: Math.max(0, toInt(meta.rawWindowRowCount, returnedRowCount)),
    returnedRowCount: Math.max(0, toInt(meta.returnedRowCount, returnedRowCount)),
    totalVisibleCount:
      meta.totalVisibleCount == null ? null : Math.max(0, toInt(meta.totalVisibleCount, returnedRowCount)),
    hasMore: meta.hasMore === true,
    scopeKey: toText(meta.scopeKey) || `warehouse_incoming_queue_scope_v1:${pageOffset}:${limit}`,
    generatedAt: toOptionalText(meta.generatedAt),
    contractVersion: toText(root.version ?? meta.version) || "v1",
  };
};

const toIncomingItemsMeta = (
  root: UnknownRecord,
  incomingId: string,
  rowCount: number,
): WarehouseIncomingItemsMeta => {
  const meta = asRecord(root.meta);
  return {
    incomingId,
    rowCount: Math.max(0, toInt(meta.rowCount, rowCount)),
    scopeKey: toText(meta.scopeKey) || `warehouse_incoming_items_scope_v1:${incomingId}`,
    generatedAt: toOptionalText(meta.generatedAt),
    contractVersion: toText(root.version ?? meta.version) || "v1",
  };
};

export async function fetchWarehouseIncomingHeadsWindow(
  pageIndex: number,
  pageSize: number,
): Promise<WarehouseIncomingHeadsFetchResult> {
  const pageOffset = Math.max(0, pageIndex * pageSize);
  const { data, error } = await supabase.rpc("warehouse_incoming_queue_scope_v1" as never, {
    p_offset: pageOffset,
    p_limit: pageSize,
  } as never);

  if (error) throw error;

  const root = validateRpcResponse(data, isRpcRowsEnvelope, {
    rpcName: "warehouse_incoming_queue_scope_v1",
    caller: "fetchWarehouseIncomingHeadsWindow",
    domain: "warehouse",
  });
  const rowsValue = asArray(root.rows);
  const rows = rowsValue.map((rowValue) =>
    normalizeIncomingHeadRow(asRecord(rowValue) as IncomingHeadRowDb),
  );
  const meta = toIncomingQueueMeta(root, pageIndex, pageSize, rows.length);

  return {
    rows,
    meta,
    sourceMeta: {
      primaryOwner: "rpc_scope_v1",
      fallbackUsed: false,
      sourceKind: WAREHOUSE_INCOMING_QUEUE_RPC_SOURCE_KIND,
      contractVersion: meta.contractVersion,
    },
  };
}

export async function fetchWarehouseIncomingItemsWindow(
  incomingId: string,
  options?: { signal?: AbortSignal | null },
): Promise<WarehouseIncomingItemsFetchResult> {
  const normalizedIncomingId = toText(incomingId);
  throwIfAborted(options?.signal);
  const { data, error } = await applySupabaseAbortSignal(
    supabase.rpc("warehouse_incoming_items_scope_v1" as never, {
      p_incoming_id: normalizedIncomingId,
    } as never),
    options?.signal,
  );
  throwIfAborted(options?.signal);

  if (error) throw error;

  const root = validateRpcResponse(data, isRpcRowsEnvelope, {
    rpcName: "warehouse_incoming_items_scope_v1",
    caller: "fetchWarehouseIncomingItemsWindow",
    domain: "warehouse",
  });
  const rowsValue = asArray(root.rows);
  const rows = rowsValue.map((rowValue) =>
    normalizeIncomingItemRow(asRecord(rowValue) as IncomingItemRowDb),
  );
  const meta = toIncomingItemsMeta(root, normalizedIncomingId, rows.length);

  return {
    rows,
    meta,
    sourceMeta: {
      primaryOwner: "rpc_scope_v1",
      fallbackUsed: false,
      sourceKind: WAREHOUSE_INCOMING_ITEMS_RPC_SOURCE_KIND,
      contractVersion: meta.contractVersion,
    },
  };
}
