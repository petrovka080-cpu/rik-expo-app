import { supabase } from "../../lib/supabaseClient";
import { seedEnsureIncomingItems } from "./warehouse.seed";
import { withTimeout } from "./warehouse.utils";

type IncomingHeadFallbackRow = {
  incoming_id?: string | null;
  purchase_id?: string | null;
  po_no?: string | null;
  status?: string | null;
  total_expected?: number | null;
  total_received?: number | null;
  created_at?: string | null;
};

type IncomingItemFallbackRow = {
  incoming_item_id?: string | null;
  purchase_item_id?: string | null;
  name_human?: string | null;
  rik_code?: string | null;
  uom?: string | null;
  qty_expected?: number | null;
  qty_received?: number | null;
};

type QueryResultLike<T> = {
  data: T[] | null;
  error: { message: string } | null;
};

const INCOMING_REPAIR_RETRY_MS = 30000;
const incomingRepairAttemptAt = new Map<string, number>();

const asNumber = (value: unknown): number => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const asText = (value: unknown): string | null => {
  const text = String(value ?? "").trim();
  return text || null;
};

const shouldAttemptIncomingRepair = (incomingId: string): boolean => {
  const now = Date.now();
  const last = incomingRepairAttemptAt.get(incomingId) ?? 0;
  if (now - last < INCOMING_REPAIR_RETRY_MS) return false;
  incomingRepairAttemptAt.set(incomingId, now);
  return true;
};

async function repairMissingIncomingItems(rows: IncomingHeadFallbackRow[]): Promise<boolean> {
  const targets = rows
    .filter((row) => {
      const incomingId = String(row.incoming_id ?? "").trim();
      const status = String(row.status ?? "").trim().toLowerCase();
      const totalExpected = asNumber(row.total_expected);
      return incomingId && status === "pending" && totalExpected <= 0;
    })
    .map((row) => String(row.incoming_id ?? "").trim())
    .filter(shouldAttemptIncomingRepair);

  let repaired = false;
  for (const incomingId of targets) {
    try {
      const ok = await seedEnsureIncomingItems({ supabase, incomingId });
      repaired = repaired || ok;
    } catch {
      // no-op
    }
  }
  return repaired;
}

function mapIncomingHeadFallbackRow(row: IncomingHeadFallbackRow) {
  const expected = asNumber(row.total_expected);
  const received = asNumber(row.total_received);
  const left = Math.max(0, expected - received);
  const isPartial = received > 0 && left > 0;
  return {
    incoming_id: String(row.incoming_id ?? "").trim(),
    purchase_id: String(row.purchase_id ?? "").trim(),
    incoming_status: asText(row.status) ?? "pending",
    po_no: asText(row.po_no),
    purchase_status: null,
    purchase_created_at: asText(row.created_at),
    confirmed_at: null,
    qty_expected_sum: expected,
    qty_received_sum: received,
    qty_left_sum: left,
    items_cnt: expected > 0 ? 1 : 0,
    pending_cnt: left > 0 ? 1 : 0,
    partial_cnt: isPartial ? 1 : 0,
  };
}

async function fetchWarehouseIncomingHeadsFallback(pageIndex: number, pageSize: number): Promise<QueryResultLike<Record<string, unknown>>> {
  const fallback = await supabase.rpc("list_wh_incoming");
  if (fallback.error) {
    return { data: null, error: { message: fallback.error.message } };
  }

  let rows = Array.isArray(fallback.data) ? (fallback.data as IncomingHeadFallbackRow[]) : [];
  const repaired = await repairMissingIncomingItems(rows);
  if (repaired) {
    const refreshed = await supabase.rpc("list_wh_incoming");
    if (!refreshed.error && Array.isArray(refreshed.data)) {
      rows = refreshed.data as IncomingHeadFallbackRow[];
    }
  }

  rows.sort((a, b) => {
    const aTs = Date.parse(String(a.created_at ?? "")) || 0;
    const bTs = Date.parse(String(b.created_at ?? "")) || 0;
    return bTs - aTs;
  });

  const pageRows = rows
    .slice(pageIndex * pageSize, (pageIndex + 1) * pageSize)
    .map((row) => mapIncomingHeadFallbackRow(row));
  return { data: pageRows, error: null };
}

function mapIncomingItemFallbackRow(row: IncomingItemFallbackRow, index: number) {
  return {
    incoming_item_id: asText(row.incoming_item_id),
    purchase_item_id: String(row.purchase_item_id ?? "").trim(),
    code: asText(row.rik_code),
    name: asText(row.name_human),
    uom: asText(row.uom),
    qty_expected: asNumber(row.qty_expected),
    qty_received: asNumber(row.qty_received),
    sort_key: index + 1,
  };
}

export async function fetchWarehousePurchaseProposalLinks(purchaseIds: string[]) {
  return await withTimeout(
    supabase.from("purchases").select("id, proposal_id").in("id", purchaseIds),
    15000,
    "purchases->proposal_id",
  );
}

export async function fetchWarehouseProposalNos(proposalIds: string[]) {
  return await withTimeout(
    supabase.from("proposals").select("id, proposal_no").in("id", proposalIds),
    15000,
    "proposals->proposal_no",
  );
}

export async function fetchWarehouseIncomingHeadsPage(pageIndex: number, pageSize: number) {
  const primary = await supabase
    .from("v_wh_incoming_heads_ui")
    .select("*")
    .order("purchase_created_at", { ascending: false })
    .range(pageIndex * pageSize, (pageIndex + 1) * pageSize - 1);

  if (!primary.error && Array.isArray(primary.data) && primary.data.length > 0) {
    return primary;
  }

  return await fetchWarehouseIncomingHeadsFallback(pageIndex, pageSize);
}

export async function fetchWarehouseIncomingItems(incomingId: string) {
  const primary = await supabase
    .from("v_wh_incoming_items_ui")
    .select("*")
    .eq("incoming_id", incomingId)
    .order("sort_key", { ascending: true });

  if (!primary.error && Array.isArray(primary.data) && primary.data.length > 0) {
    return primary;
  }

  await seedEnsureIncomingItems({ supabase, incomingId });

  const fallback = await supabase.rpc("list_wh_items", { p_incoming_id: incomingId });
  if (fallback.error) {
    return { data: null, error: { message: fallback.error.message } };
  }

  const rows = Array.isArray(fallback.data)
    ? (fallback.data as IncomingItemFallbackRow[]).map((row, index) => mapIncomingItemFallbackRow(row, index))
    : [];

  return { data: rows, error: null };
}
