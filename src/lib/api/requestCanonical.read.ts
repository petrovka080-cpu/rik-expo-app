import type { SupabaseClient } from "@supabase/supabase-js";

import { recordPlatformObservability } from "../observability/platformObservability";
import { normalizeRuText } from "../text/encoding";
import {
  getFreshLookupValue,
  requestLookupCache,
  requestLookupInFlight,
  setLookupValue,
} from "./director_reports.cache";
import { filterRequestLinkedRowsByExistingRequestLinks } from "./integrity.guards";
import type { RequestLookupRow } from "./director_reports.shared";
import { normalizeRequestLookupRow } from "./director_reports.shared";
import {
  requestsSupportsSubmittedAt,
  resolveRequestsReadableColumns,
} from "./requests.read-capabilities";

type UnknownRow = Record<string, unknown>;

export type CanonicalRequestReadMeta = {
  sourcePath: "canonical";
  sourceKind: "table:requests";
  contractVersion: "request_lookup_v2";
  selectedColumns: string[];
  countsIncluded: boolean;
  generatedAt: string;
};

export type CanonicalRequestReadResult = {
  rows: RequestLookupRow[];
  meta: CanonicalRequestReadMeta;
};

export type CanonicalRequestWindowParams = {
  offset: number;
  limit: number;
  includeItemCounts?: boolean;
};

export type CanonicalRequestItemRow = {
  id: string;
  request_id: string;
  rik_code: string | null;
  name_human: string | null;
  uom: string | null;
  qty: number;
  status: string | null;
  note: string | null;
  app_code: string | null;
  item_kind: string | null;
  created_at: string | null;
};

export type CanonicalRequestItemCountRow = {
  request_id: string;
  item_count_total: number;
  item_count_active: number;
  item_qty_total: number;
  item_qty_active: number;
};

const CANONICAL_REQUEST_DESIRED_COLUMNS = [
  "id",
  "request_no",
  "display_no",
  "status",
  "object_id",
  "object_name",
  "object_type_code",
  "system_code",
  "level_code",
  "zone_code",
  "object",
  "submitted_at",
  "created_at",
  "note",
  "comment",
] as const;

const normalizeText = (value: unknown): string =>
  String(normalizeRuText(String(value ?? "")) ?? "")
    .trim()
    .toLowerCase();

const isRejectedRequestItemStatus = (value: unknown): boolean => {
  const normalized = normalizeText(value);
  return normalized.includes("отклон") || normalized.includes("reject");
};

const toPositiveNumber = (value: unknown): number => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
};

const toCanonicalRequestReadMeta = (
  selectedColumns: string[],
  countsIncluded: boolean,
): CanonicalRequestReadMeta => ({
  sourcePath: "canonical",
  sourceKind: "table:requests",
  contractVersion: "request_lookup_v2",
  selectedColumns,
  countsIncluded,
  generatedAt: new Date().toISOString(),
});

const hasCanonicalRequestFields = (value: RequestLookupRow | null | undefined): value is RequestLookupRow => {
  if (!value) return false;
  return (
    "display_no" in value &&
    "status" in value &&
    "submitted_at" in value &&
    "item_count_total" in value &&
    "item_count_active" in value
  );
};

const buildCanonicalRequestSelectColumns = async (): Promise<string[]> => {
  const readable = await resolveRequestsReadableColumns();
  const filtered = CANONICAL_REQUEST_DESIRED_COLUMNS.filter((column) => readable.has(column));
  return filtered.length ? [...filtered] : ["id", "status", "display_no", "created_at"];
};

const mergeCanonicalRequestCounts = (
  rows: RequestLookupRow[],
  countsByRequestId: Map<string, CanonicalRequestItemCountRow>,
): RequestLookupRow[] =>
  rows.map((row) => {
    const counts = countsByRequestId.get(row.id);
    return {
      ...row,
      item_count_total: counts?.item_count_total ?? 0,
      item_count_active: counts?.item_count_active ?? 0,
      item_qty_total: counts?.item_qty_total ?? 0,
      item_qty_active: counts?.item_qty_active ?? 0,
    };
  });

const recordCanonicalRequestLoaderWarning = (
  event: string,
  error: unknown,
  extra?: Record<string, unknown>,
) => {
  recordPlatformObservability({
    screen: "request",
    surface: "canonical_loader",
    category: "fetch",
    event,
    result: "error",
    sourceKind: "table:requests",
    errorStage: event,
    errorClass: error instanceof Error ? error.name : undefined,
    errorMessage: error instanceof Error ? error.message : String(error ?? "unknown"),
    extra,
  });
};

export async function loadCanonicalRequestItemCountsByRequestIds(
  supabase: SupabaseClient,
  requestIds: string[],
): Promise<Map<string, CanonicalRequestItemCountRow>> {
  const ids = Array.from(new Set(requestIds.map((value) => String(value ?? "").trim()).filter(Boolean)));
  if (!ids.length) return new Map<string, CanonicalRequestItemCountRow>();

  const { data, error } = await supabase
    .from("request_items")
    .select("request_id, qty, status")
    .in("request_id", ids);

  if (error) {
    recordCanonicalRequestLoaderWarning("load_request_item_counts_failed", error, {
      requestIdCount: ids.length,
    });
    throw error;
  }

  const countsByRequestId = new Map<string, CanonicalRequestItemCountRow>();
  for (const requestId of ids) {
    countsByRequestId.set(requestId, {
      request_id: requestId,
      item_count_total: 0,
      item_count_active: 0,
      item_qty_total: 0,
      item_qty_active: 0,
    });
  }

  for (const value of Array.isArray(data) ? (data as UnknownRow[]) : []) {
    const requestId = String(value.request_id ?? "").trim();
    if (!requestId) continue;
    const counts = countsByRequestId.get(requestId) ?? {
      request_id: requestId,
      item_count_total: 0,
      item_count_active: 0,
      item_qty_total: 0,
      item_qty_active: 0,
    };
    const qty = toPositiveNumber(value.qty);
    counts.item_count_total += 1;
    counts.item_qty_total += qty;
    if (!isRejectedRequestItemStatus(value.status)) {
      counts.item_count_active += 1;
      counts.item_qty_active += qty;
    }
    countsByRequestId.set(requestId, counts);
  }

  return countsByRequestId;
}

export async function loadCanonicalRequestsByIds(
  supabase: SupabaseClient,
  requestIds: string[],
  options?: { includeItemCounts?: boolean },
): Promise<CanonicalRequestReadResult> {
  const ids = Array.from(new Set(requestIds.map((value) => String(value ?? "").trim()).filter(Boolean)));
  const includeItemCounts = options?.includeItemCounts !== false;
  const selectedColumns = await buildCanonicalRequestSelectColumns();
  const meta = toCanonicalRequestReadMeta(selectedColumns, includeItemCounts);
  if (!ids.length) {
    return { rows: [], meta };
  }

  const cachedRows: RequestLookupRow[] = [];
  const missingIds: string[] = [];
  for (const id of ids) {
    const cached = getFreshLookupValue(requestLookupCache, id);
    if (cached !== undefined && hasCanonicalRequestFields(cached)) {
      cachedRows.push(cached);
      continue;
    }
    missingIds.push(id);
  }

  if (!missingIds.length) {
    return {
      rows: includeItemCounts
        ? mergeCanonicalRequestCounts(cachedRows, await loadCanonicalRequestItemCountsByRequestIds(supabase, ids))
        : cachedRows,
      meta,
    };
  }

  const inFlightKey = missingIds.slice().sort().join("|");
  let pending = requestLookupInFlight.get(inFlightKey);
  if (!pending) {
    pending = (async () => {
      const { data, error } = await supabase
        .from("requests")
        .select(selectedColumns.join(","))
        .in("id", missingIds);

      if (error) {
        recordCanonicalRequestLoaderWarning("load_requests_by_ids_failed", error, {
          requestIdCount: missingIds.length,
          selectedColumns,
        });
        throw error;
      }

      const rows = Array.isArray(data)
        ? data.map(normalizeRequestLookupRow).filter((row): row is RequestLookupRow => !!row)
        : [];
      const seen = new Set(rows.map((row) => row.id));
      for (const row of rows) {
        setLookupValue(requestLookupCache, row.id, row);
      }
      for (const id of missingIds) {
        if (!seen.has(id)) setLookupValue(requestLookupCache, id, null);
      }
      return rows;
    })();
    requestLookupInFlight.set(inFlightKey, pending);
  }

  try {
    const loaded = await pending;
    const rows = [...cachedRows, ...loaded];
    return {
      rows: includeItemCounts
        ? mergeCanonicalRequestCounts(rows, await loadCanonicalRequestItemCountsByRequestIds(supabase, ids))
        : rows,
      meta,
    };
  } finally {
    requestLookupInFlight.delete(inFlightKey);
  }
}

export async function loadCanonicalRequestsWindow(
  supabase: SupabaseClient,
  params: CanonicalRequestWindowParams,
): Promise<CanonicalRequestReadResult> {
  const offset = Math.max(0, params.offset);
  const limit = Math.max(0, params.limit);
  const includeItemCounts = params.includeItemCounts !== false;
  const selectedColumns = await buildCanonicalRequestSelectColumns();
  const meta = toCanonicalRequestReadMeta(selectedColumns, includeItemCounts);
  if (!limit) {
    return { rows: [], meta };
  }

  const submittedAtSupported = await requestsSupportsSubmittedAt();
  const primaryOrderColumn = submittedAtSupported ? "submitted_at" : "created_at";
  const { data, error } = await supabase
    .from("requests")
    .select(selectedColumns.join(","))
    .order(primaryOrderColumn, { ascending: false, nullsFirst: false })
    .order("display_no", { ascending: false })
    .order("id", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    recordCanonicalRequestLoaderWarning("load_requests_window_failed", error, {
      offset,
      limit,
      selectedColumns,
      primaryOrderColumn,
    });
    throw error;
  }

  const rows = Array.isArray(data)
    ? data.map(normalizeRequestLookupRow).filter((row): row is RequestLookupRow => !!row)
    : [];

  for (const row of rows) {
    setLookupValue(requestLookupCache, row.id, row);
  }

  return {
    rows: includeItemCounts
      ? mergeCanonicalRequestCounts(
          rows,
          await loadCanonicalRequestItemCountsByRequestIds(
            supabase,
            rows.map((row) => row.id),
          ),
        )
      : rows,
    meta,
  };
}

export async function loadCanonicalRequestItemsByRequestId(
  supabase: SupabaseClient,
  requestId: string,
): Promise<CanonicalRequestItemRow[]> {
  const requestIdValue = String(requestId ?? "").trim();
  if (!requestIdValue) return [];

  const { data, error } = await supabase
    .from("request_items")
    .select("id, request_id, rik_code, name_human, uom, qty, status, note, app_code, item_kind, created_at")
    .eq("request_id", requestIdValue)
    .order("position_order", { ascending: true })
    .order("name_human", { ascending: true });

  if (error) {
    recordCanonicalRequestLoaderWarning("load_request_items_by_request_id_failed", error, {
      requestId: requestIdValue,
    });
    throw error;
  }

  const rows = Array.isArray(data)
    ? (data as UnknownRow[]).map((row) => ({
        id: String(row.id ?? "").trim(),
        request_id: String(row.request_id ?? "").trim(),
        rik_code: row.rik_code == null ? null : String(row.rik_code),
        name_human: row.name_human == null ? null : String(row.name_human),
        uom: row.uom == null ? null : String(row.uom),
        qty: toPositiveNumber(row.qty),
        status: row.status == null ? null : String(row.status),
        note: row.note == null ? null : String(row.note),
        app_code: row.app_code == null ? null : String(row.app_code),
        item_kind: row.item_kind == null ? null : String(row.item_kind),
        created_at: row.created_at == null ? null : String(row.created_at),
      }))
    : [];
  const guarded = await filterRequestLinkedRowsByExistingRequestLinks(supabase, rows, {
    screen: "request",
    surface: "canonical_request_items",
    sourceKind: "table:request_items",
    relation: "request_items.request_id->requests.id",
  });
  return guarded.rows;
}
