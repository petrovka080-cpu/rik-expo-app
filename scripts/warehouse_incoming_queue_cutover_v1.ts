import fs from "node:fs";
import path from "node:path";

import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

import type { IncomingRow, ItemRow } from "../src/screens/warehouse/warehouse.types";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });
dotenv.config({ path: path.join(process.cwd(), ".env") });

const supabaseUrl = String(process.env.EXPO_PUBLIC_SUPABASE_URL ?? "").trim();
const supabaseKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { headers: { "x-client-info": "warehouse-incoming-queue-cutover-v1" } },
});

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

const artifactPath = path.join(process.cwd(), "artifacts/warehouse-incoming-queue-cutover-v1.json");
const summaryPath = path.join(process.cwd(), "artifacts/warehouse-incoming-queue-cutover-v1.summary.json");
const PAGE_SIZE = 30;

const writeJson = (fullPath: string, payload: unknown) => {
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `${JSON.stringify(payload, null, 2)}\n`);
};

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

const compareNumber = (left: unknown, right: unknown, epsilon = 0.001) =>
  Math.abs(Number(left ?? 0) - Number(right ?? 0)) <= epsilon;

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
    name: toText(row.name) || toText(row.code) || "-",
    uom: toOptionalText(row.uom),
    qty_expected: qtyExpected,
    qty_received: qtyReceived,
    qty_left: qtyLeft,
    sort_key: Math.max(1, toInt(row.sort_key, 1)),
  };
};

const sortIncomingQueueRows = (rows: IncomingRow[]) =>
  [...rows].sort((left, right) => {
    const leftIsPartial = left.qty_received_sum > 0 && left.qty_left_sum > 0;
    const rightIsPartial = right.qty_received_sum > 0 && right.qty_left_sum > 0;
    if (leftIsPartial !== rightIsPartial) {
      return Number(rightIsPartial) - Number(leftIsPartial);
    }

    const leftCreatedAt = left.purchase_created_at ? new Date(left.purchase_created_at).getTime() : 0;
    const rightCreatedAt = right.purchase_created_at ? new Date(right.purchase_created_at).getTime() : 0;
    if (leftCreatedAt !== rightCreatedAt) {
      return rightCreatedAt - leftCreatedAt;
    }

    return left.incoming_id.localeCompare(right.incoming_id);
  });

const sortIncomingItemRows = (rows: ItemRow[]) =>
  [...rows].sort((left, right) => {
    if (left.sort_key !== right.sort_key) return left.sort_key - right.sort_key;
    if (left.name !== right.name) return left.name.localeCompare(right.name);
    return left.purchase_item_id.localeCompare(right.purchase_item_id);
  });

const incomingRowSignature = (row: IncomingRow) =>
  [
    row.incoming_id,
    row.purchase_id,
    row.incoming_status,
    row.po_no ?? "",
    row.purchase_status ?? "",
    row.purchase_created_at ?? "",
    row.confirmed_at ?? "",
    Number(row.qty_expected_sum ?? 0).toFixed(3),
    Number(row.qty_received_sum ?? 0).toFixed(3),
    Number(row.qty_left_sum ?? 0).toFixed(3),
    String(row.items_cnt ?? 0),
    String(row.pending_cnt ?? 0),
    String(row.partial_cnt ?? 0),
  ].join("|");

const itemRowSignature = (row: ItemRow) =>
  [
    row.incoming_item_id ?? "",
    row.purchase_item_id,
    row.code ?? "",
    row.name,
    row.uom ?? "",
    Number(row.qty_expected ?? 0).toFixed(3),
    Number(row.qty_received ?? 0).toFixed(3),
    Number(row.qty_left ?? 0).toFixed(3),
    String(row.sort_key ?? 0),
  ].join("|");

async function fetchLegacyHeads(pageIndex: number, pageSize: number) {
  const { data, error } = await supabase
    .from("v_wh_incoming_heads_ui")
    .select("*")
    .order("purchase_created_at", { ascending: false })
    .range(pageIndex * pageSize, (pageIndex + 1) * pageSize - 1);

  if (error) throw error;

  const rowsRaw = (Array.isArray(data) ? data : []) as IncomingHeadRowDb[];
  const rows = sortIncomingQueueRows(
    rowsRaw
      .map(normalizeIncomingHeadRow)
      .filter((row) => row.incoming_id && row.purchase_id && row.qty_left_sum > 0),
  );

  return {
    rows,
    meta: {
      pageIndex,
      pageSize,
      pageOffset: pageIndex * pageSize,
      rawWindowRowCount: rowsRaw.length,
      returnedRowCount: rows.length,
      totalVisibleCount: null,
      hasMore: rowsRaw.length === pageSize,
      scopeKey: `warehouse_incoming_legacy:${pageIndex * pageSize}:${pageSize}`,
    },
    sourceMeta: {
      primaryOwner: "legacy_view_page",
      fallbackUsed: true,
    },
  };
}

async function fetchRpcHeads(pageIndex: number, pageSize: number) {
  const { data, error } = await supabase.rpc("warehouse_incoming_queue_scope_v1" as never, {
    p_offset: pageIndex * pageSize,
    p_limit: pageSize,
  } as never);
  if (error) throw error;

  const root = asRecord(data);
  const rows = asArray(root.rows).map((rowValue) =>
    normalizeIncomingHeadRow(asRecord(rowValue) as IncomingHeadRowDb),
  );
  const meta = asRecord(root.meta);

  return {
    rows,
    meta: {
      pageIndex,
      pageSize,
      pageOffset: toInt(meta.offset, pageIndex * pageSize),
      rawWindowRowCount: toInt(meta.rawWindowRowCount, rows.length),
      returnedRowCount: toInt(meta.returnedRowCount, rows.length),
      totalVisibleCount:
        meta.totalVisibleCount == null ? null : Math.max(0, toInt(meta.totalVisibleCount, rows.length)),
      hasMore: meta.hasMore === true,
      scopeKey: toText(meta.scopeKey),
      contractVersion: toText(root.version ?? meta.version) || "v1",
    },
    sourceMeta: {
      primaryOwner: "rpc_scope_v1",
      fallbackUsed: false,
    },
  };
}

async function fetchLegacyItems(incomingId: string) {
  const { data, error } = await supabase
    .from("v_wh_incoming_items_ui")
    .select("*")
    .eq("incoming_id", incomingId)
    .order("sort_key", { ascending: true });
  if (error) throw error;

  const rowsRaw = (Array.isArray(data) ? data : []) as IncomingItemRowDb[];
  const rows = sortIncomingItemRows(
    rowsRaw
      .map(normalizeIncomingItemRow)
      .filter((row) => {
        const code = String(row.code ?? "").toUpperCase();
        return row.qty_left > 0 && (code.startsWith("MAT-") || code.startsWith("TOOL-"));
      }),
  );

  return {
    rows,
    meta: { rowCount: rows.length },
    sourceMeta: { primaryOwner: "legacy_view", fallbackUsed: true },
  };
}

async function fetchRpcItems(incomingId: string) {
  const { data, error } = await supabase.rpc("warehouse_incoming_items_scope_v1" as never, {
    p_incoming_id: incomingId,
  } as never);
  if (error) throw error;

  const root = asRecord(data);
  const rows = asArray(root.rows).map((rowValue) =>
    normalizeIncomingItemRow(asRecord(rowValue) as IncomingItemRowDb),
  );
  const meta = asRecord(root.meta);

  return {
    rows,
    meta: {
      rowCount: toInt(meta.rowCount, rows.length),
      contractVersion: toText(root.version ?? meta.version) || "v1",
    },
    sourceMeta: { primaryOwner: "rpc_scope_v1", fallbackUsed: false },
  };
}

async function main() {
  const legacyPage0 = await fetchLegacyHeads(0, PAGE_SIZE);
  const legacyPage1 = await fetchLegacyHeads(1, PAGE_SIZE);
  const rpcPage0 = await fetchRpcHeads(0, PAGE_SIZE);
  const rpcPage1 = await fetchRpcHeads(1, PAGE_SIZE);

  const selectedIncomingId =
    rpcPage0.rows[0]?.incoming_id ??
    legacyPage0.rows[0]?.incoming_id ??
    "";

  const legacyItems = selectedIncomingId
    ? await fetchLegacyItems(selectedIncomingId)
    : { rows: [], meta: { rowCount: 0 }, sourceMeta: { primaryOwner: "legacy_view", fallbackUsed: true } };
  const rpcItems = selectedIncomingId
    ? await fetchRpcItems(selectedIncomingId)
    : { rows: [], meta: { rowCount: 0 }, sourceMeta: { primaryOwner: "rpc_scope_v1", fallbackUsed: false } };

  const page0LegacySignatures = legacyPage0.rows.map(incomingRowSignature);
  const page0RpcSignatures = rpcPage0.rows.map(incomingRowSignature);
  const page1LegacySignatures = legacyPage1.rows.map(incomingRowSignature);
  const page1RpcSignatures = rpcPage1.rows.map(incomingRowSignature);

  const itemLegacySignatures = legacyItems.rows.map(itemRowSignature);
  const itemRpcSignatures = rpcItems.rows.map(itemRowSignature);

  const artifact = {
    legacy: {
      page0Rows: legacyPage0.rows,
      page1Rows: legacyPage1.rows,
      page0Meta: legacyPage0.meta,
      page1Meta: legacyPage1.meta,
      items: legacyItems.rows,
      itemsMeta: legacyItems.meta,
    },
    rpc: {
      page0Rows: rpcPage0.rows,
      page1Rows: rpcPage1.rows,
      page0Meta: rpcPage0.meta,
      page1Meta: rpcPage1.meta,
      items: rpcItems.rows,
      itemsMeta: rpcItems.meta,
    },
    primaryOwner: rpcPage0.sourceMeta.primaryOwner,
    fallbackUsed: rpcPage0.sourceMeta.fallbackUsed || rpcItems.sourceMeta.fallbackUsed,
    selectedIncomingId,
    parity: {
      page0RowCountParityOk: legacyPage0.rows.length === rpcPage0.rows.length,
      page1RowCountParityOk: legacyPage1.rows.length === rpcPage1.rows.length,
      page0RowSignatureParityOk:
        page0LegacySignatures.length === page0RpcSignatures.length &&
        page0LegacySignatures.every((signature, index) => signature === page0RpcSignatures[index]),
      page1RowSignatureParityOk:
        page1LegacySignatures.length === page1RpcSignatures.length &&
        page1LegacySignatures.every((signature, index) => signature === page1RpcSignatures[index]),
      page0IdOrderParityOk:
        legacyPage0.rows.length === rpcPage0.rows.length &&
        legacyPage0.rows.every((row, index) => row.incoming_id === rpcPage0.rows[index]?.incoming_id),
      page1IdOrderParityOk:
        legacyPage1.rows.length === rpcPage1.rows.length &&
        legacyPage1.rows.every((row, index) => row.incoming_id === rpcPage1.rows[index]?.incoming_id),
      page0HasMoreParityOk: legacyPage0.meta.hasMore === rpcPage0.meta.hasMore,
      page1HasMoreParityOk: legacyPage1.meta.hasMore === rpcPage1.meta.hasMore,
      itemCountParityOk: legacyItems.rows.length === rpcItems.rows.length,
      itemSignatureParityOk:
        itemLegacySignatures.length === itemRpcSignatures.length &&
        itemLegacySignatures.every((signature, index) => signature === itemRpcSignatures[index]),
      itemQtyParityOk: legacyItems.rows.every((row, index) => {
        const next = rpcItems.rows[index];
        if (!next) return false;
        return (
          compareNumber(row.qty_expected, next.qty_expected) &&
          compareNumber(row.qty_received, next.qty_received) &&
          compareNumber(row.qty_left, next.qty_left)
        );
      }),
      stableIdsOk:
        rpcPage0.rows.concat(rpcPage1.rows).every((row) => row.incoming_id && row.purchase_id) &&
        new Set(rpcPage0.rows.concat(rpcPage1.rows).map((row) => row.incoming_id)).size ===
          rpcPage0.rows.length + rpcPage1.rows.length,
      totalVisibleCountTypedOk: typeof rpcPage0.meta.totalVisibleCount === "number" || rpcPage0.meta.totalVisibleCount === null,
    },
  };

  const summary = {
    status:
      artifact.primaryOwner === "rpc_scope_v1" &&
      artifact.fallbackUsed === false &&
      artifact.parity.page0RowCountParityOk &&
      artifact.parity.page1RowCountParityOk &&
      artifact.parity.page0RowSignatureParityOk &&
      artifact.parity.page1RowSignatureParityOk &&
      artifact.parity.page0IdOrderParityOk &&
      artifact.parity.page1IdOrderParityOk &&
      artifact.parity.page0HasMoreParityOk &&
      artifact.parity.page1HasMoreParityOk &&
      artifact.parity.itemCountParityOk &&
      artifact.parity.itemSignatureParityOk &&
      artifact.parity.itemQtyParityOk &&
      artifact.parity.stableIdsOk
        ? "passed"
        : "failed",
    primaryOwner: artifact.primaryOwner,
    fallbackUsed: artifact.fallbackUsed,
    page0RowCountParityOk: artifact.parity.page0RowCountParityOk,
    page1RowCountParityOk: artifact.parity.page1RowCountParityOk,
    page0RowSignatureParityOk: artifact.parity.page0RowSignatureParityOk,
    page1RowSignatureParityOk: artifact.parity.page1RowSignatureParityOk,
    page0IdOrderParityOk: artifact.parity.page0IdOrderParityOk,
    page1IdOrderParityOk: artifact.parity.page1IdOrderParityOk,
    page0HasMoreParityOk: artifact.parity.page0HasMoreParityOk,
    page1HasMoreParityOk: artifact.parity.page1HasMoreParityOk,
    itemCountParityOk: artifact.parity.itemCountParityOk,
    itemSignatureParityOk: artifact.parity.itemSignatureParityOk,
    itemQtyParityOk: artifact.parity.itemQtyParityOk,
    stableIdsOk: artifact.parity.stableIdsOk,
    totalVisibleCountTypedOk: artifact.parity.totalVisibleCountTypedOk,
    selectedIncomingId,
  };

  writeJson(artifactPath, artifact);
  writeJson(summaryPath, summary);

  console.log(JSON.stringify(summary, null, 2));
  if (summary.status !== "passed") {
    process.exitCode = 1;
  }
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
