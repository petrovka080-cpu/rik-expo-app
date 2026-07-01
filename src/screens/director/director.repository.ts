import {
  REQUEST_DRAFT_EN,
  REQUEST_PENDING_EN,
  REQUEST_PENDING_STATUS,
  REQUEST_SUBMITTED_EN,
} from "../../lib/api/requests.status";
import { normalizeStatusToken } from "../../lib/requestStatus";
import {
  createGuardedPagedQuery,
  isRecordRow,
  normalizePage,
} from "../../lib/api/_core";
import type { DirectorSupabaseClient } from "../../types/contracts/director";
import type { PendingRow } from "./director.types";
import { callListDirectorItemsStableRpc } from "./director.repository.transport";

type DirectorRepositoryDeps = {
  supabase: DirectorSupabaseClient;
};

export type DirectorPendingRowsLoadResult = {
  rows: PendingRow[];
  sourcePath:
    | "director_pending_rows_initial_window"
    | "list_director_items_stable"
    | "list_director_items_stable_fallback";
  fallbackUsed: boolean;
  primaryRowCount: number;
  initialRequestLimit?: number;
  initialPositionPreviewLimit?: number;
};

const DIRECTOR_PENDING_ITEM_STATUSES = new Set([
  REQUEST_DRAFT_EN,
  REQUEST_PENDING_STATUS,
  "У директора",
  REQUEST_PENDING_EN,
  REQUEST_SUBMITTED_EN,
]);

const DIRECTOR_EXPECTED_REQUEST_STATUSES = [
  REQUEST_PENDING_STATUS,
  REQUEST_PENDING_EN,
  REQUEST_SUBMITTED_EN,
] as const;
const DIRECTOR_FALLBACK_PAGE_DEFAULTS = { pageSize: 100, maxPageSize: 100 };
export const DIRECTOR_INITIAL_REQUEST_LIMIT = 12;
export const DIRECTOR_INITIAL_POSITION_PREVIEW_LIMIT = 96;
const DIRECTOR_INITIAL_POSITION_PAGE_DEFAULTS = {
  pageSize: DIRECTOR_INITIAL_POSITION_PREVIEW_LIMIT,
  maxPageSize: DIRECTOR_INITIAL_POSITION_PREVIEW_LIMIT,
};

const DIRECTOR_PENDING_STATUS_TOKEN = normalizeStatusToken(REQUEST_PENDING_STATUS);
const DIRECTOR_EXPECTED_REQUEST_STATUS_TOKENS = new Set(
  DIRECTOR_EXPECTED_REQUEST_STATUSES.map(normalizeStatusToken),
);

function isDirectorVisibleRequestStatus(raw: unknown): boolean {
  const normalized = normalizeStatusToken(raw);
  if (!normalized) return false;
  return (
    DIRECTOR_EXPECTED_REQUEST_STATUS_TOKENS.has(normalized) ||
    normalized.includes("на утверж") ||
    normalized.includes("у директор") ||
    normalized.includes("director")
  );
}

export function isDirectorPendingItemStatus(raw: unknown): boolean {
  const normalized = normalizeStatusToken(raw);
  if (!normalized) return false;
  if (
    normalized === REQUEST_DRAFT_EN ||
    normalized === REQUEST_PENDING_EN ||
    normalized === REQUEST_SUBMITTED_EN ||
    normalized === DIRECTOR_PENDING_STATUS_TOKEN
  ) {
    return true;
  }
  return (
    normalized.includes("\u043d\u0430 \u0443\u0442\u0432\u0435\u0440\u0436") ||
    normalized.includes("\u0443 \u0434\u0438\u0440\u0435\u043a\u0442") ||
    normalized.includes("director")
  );
}

const isDirectorPendingItemRow = (row: Record<string, unknown>): boolean =>
  isDirectorPendingItemStatus(row.status);

const mergeDirectorItemRows = (
  exactRows: readonly Record<string, unknown>[],
  widenedRows: readonly Record<string, unknown>[],
): Record<string, unknown>[] => {
  const byId = new Map<string, Record<string, unknown>>();
  const append = (row: Record<string, unknown>) => {
    const id = String(row.request_item_id ?? row.id ?? "").trim();
    const key = id || `${String(row.request_id ?? "").trim()}:${byId.size}`;
    if (!byId.has(key)) byId.set(key, row);
  };
  exactRows.forEach(append);
  widenedRows.filter(isDirectorPendingItemRow).forEach(append);
  return Array.from(byId.values());
};

const mergeDirectorPendingRows = (
  primaryRows: readonly PendingRow[],
  fallbackRows: readonly PendingRow[],
): PendingRow[] => {
  const byKey = new Map<string, PendingRow>();
  const append = (row: PendingRow) => {
    const requestItemId = String(row.request_item_id ?? "").trim();
    const requestId = String(row.request_id ?? "").trim();
    const key = requestItemId || `${requestId}:${String(row.name_human ?? "").trim()}:${row.id}`;
    if (!key || byKey.has(key)) return;
    byKey.set(key, row);
  };
  fallbackRows.forEach(append);
  primaryRows.forEach(append);
  return Array.from(byKey.values()).map((row, id) => ({ ...row, id }));
};

type PagedDirectorResult<T> = {
  data: T[] | null;
  error?: unknown;
};

type PagedDirectorQuery<T> = {
  range: (from: number, to: number) => PromiseLike<PagedDirectorResult<T>>;
};

const loadPagedDirectorRows = async <T,>(
  queryFactory: () => PagedDirectorQuery<T>,
): Promise<PagedDirectorResult<T>> => {
  const rows: T[] = [];

  for (let pageIndex = 0; ; pageIndex += 1) {
    const page = normalizePage({ page: pageIndex }, DIRECTOR_FALLBACK_PAGE_DEFAULTS);
    const result = await queryFactory().range(page.from, page.to);
    if (result.error) return { data: null, error: result.error };

    const pageRows = Array.isArray(result.data) ? result.data : [];
    rows.push(...pageRows);
    if (pageRows.length < page.pageSize) return { data: rows, error: null };
  }
};

const errText = (error: unknown): string => {
  if (error instanceof Error && error.message.trim()) return error.message.trim();
  return String(error ?? "");
};

const warnDirectorRepository = (
  scope: "list_director_items_stable" | "list_director_items_stable_fallback",
  error: unknown,
  level: "warn" | "error" = "warn",
) => {
  if (!__DEV__) return;
  const message = errText(error);
  if (level === "error") {
    console.error(`[director.repository] ${scope}:`, message);
    return;
  }
  if (__DEV__) console.warn(`[director.repository] ${scope}:`, message);
};

const logDirectorRepository = (payload: Record<string, unknown>) => {
  if (!__DEV__ || process.env.EXPO_PUBLIC_RIK_DEBUG_FETCH_LOGS !== "1") return;
  console.info("[director.repository]", payload);
};

const normalizeDirectorPendingRows = (rows: Record<string, unknown>[]): PendingRow[] =>
  rows.map((r, idx: number) => ({
    id: idx,
    request_id: String(r.request_id ?? ""),
    request_item_id:
      r.request_item_id != null
        ? String(r.request_item_id)
        : r.id != null
          ? String(r.id)
          : null,
    name_human: String(r.name_human ?? ""),
    qty: Number(r.qty ?? 0),
    uom: r.uom != null ? String(r.uom) : null,
    rik_code: r.rik_code != null ? String(r.rik_code) : null,
    app_code: r.app_code != null ? String(r.app_code) : null,
    item_kind: r.item_kind != null ? String(r.item_kind) : null,
    note: r.note != null ? String(r.note) : null,
  }));

const isDirectorFallbackRequestRow = (
  value: unknown,
): value is { id?: string | number | null; submitted_at?: string | null; status?: string | null } => {
  if (!isRecordRow(value)) return false;
  const id = value.id;
  const submittedAt = value.submitted_at;
  const status = value.status;
  return (
    (id == null || typeof id === "string" || typeof id === "number") &&
    (submittedAt == null || typeof submittedAt === "string") &&
    (status == null || typeof status === "string")
  );
};

const clampInitialWindowLimit = (value: unknown, max: number): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return max;
  return Math.max(1, Math.min(max, Math.trunc(parsed)));
};

async function loadDirectorRowsInitialWindow({
  supabase,
  requestLimit = DIRECTOR_INITIAL_REQUEST_LIMIT,
  positionPreviewLimit = DIRECTOR_INITIAL_POSITION_PREVIEW_LIMIT,
}: DirectorRepositoryDeps & {
  requestLimit?: number;
  positionPreviewLimit?: number;
}): Promise<DirectorPendingRowsLoadResult> {
  const safeRequestLimit = clampInitialWindowLimit(
    requestLimit,
    DIRECTOR_INITIAL_REQUEST_LIMIT,
  );
  const safePositionPreviewLimit = clampInitialWindowLimit(
    positionPreviewLimit,
    DIRECTOR_INITIAL_POSITION_PREVIEW_LIMIT,
  );
  const itemPage = normalizePage(
    { pageSize: safePositionPreviewLimit },
    DIRECTOR_INITIAL_POSITION_PAGE_DEFAULTS,
  );
  const initialItems = await createGuardedPagedQuery(
    supabase
      .from("request_items")
      .select("id,request_id,name_human,qty,uom,rik_code,app_code,item_kind,note,status")
      .in("status", Array.from(DIRECTOR_PENDING_ITEM_STATUSES))
      .order("created_at", { ascending: false })
      .order("id", { ascending: false }),
    isRecordRow,
    "director.repository.request_items_initial_window",
  ).range(itemPage.from, itemPage.to);

  if (initialItems.error) throw initialItems.error;

  const initialItemRows = (initialItems.data ?? []).filter(isDirectorPendingItemRow);
  const requestIds = Array.from(
    new Set(
      initialItemRows
        .map((row) => String(row.request_id ?? "").trim())
        .filter(Boolean),
    ),
  ).slice(0, safeRequestLimit);

  if (!requestIds.length) {
    return {
      rows: [],
      sourcePath: "director_pending_rows_initial_window",
      fallbackUsed: false,
      primaryRowCount: 0,
      initialRequestLimit: safeRequestLimit,
      initialPositionPreviewLimit: safePositionPreviewLimit,
    };
  }

  const selectedItemRows = initialItemRows.filter((row) =>
    requestIds.includes(String(row.request_id ?? "").trim()),
  );
  const requestPage = normalizePage(
    { pageSize: requestIds.length },
    {
      pageSize: requestIds.length,
      maxPageSize: Math.max(1, requestIds.length),
    },
  );
  const requestResult = await createGuardedPagedQuery(
    supabase
      .from("requests")
      .select("id, submitted_at, status")
      .in("id", requestIds)
      .order("submitted_at", { ascending: false })
      .order("id", { ascending: false }),
    isDirectorFallbackRequestRow,
    "director.repository.requests_initial_window",
  ).range(requestPage.from, requestPage.to);

  const requestRows = (requestResult.error ? [] : requestResult.data ?? [])
    .map((row) => ({
      id: String(row.id ?? "").trim(),
      submitted_at: row.submitted_at ? String(row.submitted_at) : null,
      status: row.status ? String(row.status) : null,
    }))
    .filter((row) => row.id);

  const requestRank = new Map<string, number>(
    (requestRows.length > 0 ? requestRows.map((row) => row.id) : requestIds).map(
      (id, index) => [id, index],
    ),
  );
  const itemRows = mergeDirectorItemRows(selectedItemRows, []);
  const normalized = normalizeDirectorPendingRows(itemRows);
  normalized.sort((a, b) => {
    const aRank = requestRank.get(String(a.request_id ?? "").trim()) ?? Number.MAX_SAFE_INTEGER;
    const bRank = requestRank.get(String(b.request_id ?? "").trim()) ?? Number.MAX_SAFE_INTEGER;
    if (aRank !== bRank) return aRank - bRank;
    return a.id - b.id;
  });

  return {
    rows: normalized,
    sourcePath: "director_pending_rows_initial_window",
    fallbackUsed: false,
    primaryRowCount: normalized.length,
    initialRequestLimit: safeRequestLimit,
    initialPositionPreviewLimit: safePositionPreviewLimit,
  };
}

async function loadDirectorRowsFallback({ supabase }: DirectorRepositoryDeps): Promise<PendingRow[]> {
  logDirectorRepository({
    phase: "request",
    sourcePath: "director.repository.loadPendingRowsFallback",
    requestSelector: "submitted_at:not_null",
    expectedRequestStatuses: Array.from(DIRECTOR_EXPECTED_REQUEST_STATUSES),
    visibleItemStatuses: Array.from(DIRECTOR_PENDING_ITEM_STATUSES),
  });

  const reqs = await loadPagedDirectorRows<{ id?: string | number | null; submitted_at?: string | null; status?: string | null }>(() =>
    createGuardedPagedQuery(
      supabase
        .from("requests")
        .select("id, submitted_at, status")
        .not("submitted_at", "is", null)
        .order("submitted_at", { ascending: false })
        .order("id", { ascending: false }),
      isDirectorFallbackRequestRow,
      "director.repository.requests_fallback",
    ),
  );
  if (reqs.error) throw reqs.error;

  const reqRows = (reqs.data ?? [])
    .map((r) => ({
      id: String(r.id ?? "").trim(),
      submitted_at: r.submitted_at ? String(r.submitted_at) : null,
      status: r.status ? String(r.status) : null,
    }))
    .filter((r) => r.id && isDirectorVisibleRequestStatus(r.status));
  reqRows.sort((a, b) => {
    const aTs = a.submitted_at ? Date.parse(a.submitted_at) : 0;
    const bTs = b.submitted_at ? Date.parse(b.submitted_at) : 0;
    return bTs - aTs;
  });

  const reqIds = reqRows.map((r) => r.id);
  if (!reqIds.length) return [];

  const reqRank = new Map<string, number>(reqRows.map((r, idx) => [r.id, idx]));
  const exactItems = await loadPagedDirectorRows<Record<string, unknown>>(() =>
    createGuardedPagedQuery(
      supabase
        .from("request_items")
        .select("id,request_id,name_human,qty,uom,rik_code,app_code,item_kind,note,status")
        .in("request_id", reqIds)
        .in("status", Array.from(DIRECTOR_PENDING_ITEM_STATUSES))
        .order("request_id", { ascending: true })
        .order("id", { ascending: true }),
      isRecordRow,
      "director.repository.request_items_fallback",
    ),
  );
  if (exactItems.error) throw exactItems.error;

  const widenedItems = await loadPagedDirectorRows<Record<string, unknown>>(() =>
    createGuardedPagedQuery(
      supabase
        .from("request_items")
        .select("id,request_id,name_human,qty,uom,rik_code,app_code,item_kind,note,status")
        .in("request_id", reqIds)
        .order("request_id", { ascending: true })
        .order("id", { ascending: true }),
      isRecordRow,
      "director.repository.request_items_fallback_widened",
    ),
  );
  if (widenedItems.error) throw widenedItems.error;

  const itemRows = mergeDirectorItemRows(
    exactItems.data ?? [],
    widenedItems.data ?? [],
  );

  const normalized = normalizeDirectorPendingRows(itemRows);
  normalized.sort((a, b) => {
    const aRank = reqRank.get(String(a.request_id ?? "").trim()) ?? Number.MAX_SAFE_INTEGER;
    const bRank = reqRank.get(String(b.request_id ?? "").trim()) ?? Number.MAX_SAFE_INTEGER;
    if (aRank !== bRank) return aRank - bRank;
    return a.id - b.id;
  });

  logDirectorRepository({
    phase: "result",
    sourcePath: "director.repository.loadPendingRowsFallback",
    requestCount: reqRows.length,
    requestStatusesSample: Array.from(
      new Set(reqRows.map((row) => String(row.status ?? "").trim()).filter(Boolean)),
    ).slice(0, 8),
    syncResultLineCount: normalized.length,
    fallbackUsed: true,
  });

  return normalized;
}

export async function fetchDirectorPendingRows(
  deps: DirectorRepositoryDeps,
  opts: {
    mode?: "initial_window" | "full";
    requestLimit?: number;
    positionPreviewLimit?: number;
  } = {},
): Promise<DirectorPendingRowsLoadResult> {
  if (opts.mode === "initial_window") {
    return loadDirectorRowsInitialWindow({
      ...deps,
      requestLimit: opts.requestLimit,
      positionPreviewLimit: opts.positionPreviewLimit,
    });
  }

  let primaryRows: PendingRow[] = [];

  try {
    const { data, error } = await callListDirectorItemsStableRpc(deps.supabase);
    if (error) throw error;
    const primaryData = Array.isArray(data) ? data.filter(isRecordRow) : [];
    primaryRows = normalizeDirectorPendingRows(primaryData);
    logDirectorRepository({
      phase: "request",
      sourcePath: "director.repository.fetchPendingRows",
      primaryPath: "list_director_items_stable",
      primaryRowCount: primaryRows.length,
      expectedRequestStatuses: Array.from(DIRECTOR_EXPECTED_REQUEST_STATUSES),
      fallbackUsed: false,
    });
  } catch (error) {
    warnDirectorRepository("list_director_items_stable", error, "error");
    const fallbackRows = await loadDirectorRowsFallback(deps);
    return {
      rows: fallbackRows,
      sourcePath: "list_director_items_stable_fallback",
      fallbackUsed: true,
      primaryRowCount: 0,
    };
  }

  if (primaryRows.length > 0) {
    let fallbackRows: PendingRow[] = [];
    try {
      fallbackRows = await loadDirectorRowsFallback(deps);
    } catch (fallbackError) {
      logDirectorRepository({
        phase: "fallback_merge_skipped",
        sourcePath: "director.repository.fetchPendingRows",
        primaryPath: "list_director_items_stable",
        fallbackPath: "list_director_items_stable_fallback",
        fallbackError: errText(fallbackError),
        fallbackUsed: false,
      });
    }
    const mergedRows = fallbackRows.length
      ? mergeDirectorPendingRows(primaryRows, fallbackRows)
      : primaryRows;
    return {
      rows: mergedRows,
      sourcePath: fallbackRows.length
        ? "list_director_items_stable_fallback"
        : "list_director_items_stable",
      fallbackUsed: fallbackRows.length > 0,
      primaryRowCount: primaryRows.length,
    };
  }

  const fallbackRows = await loadDirectorRowsFallback(deps);
  logDirectorRepository({
    phase: "contract_mismatch",
    sourcePath: "director.repository.fetchPendingRows",
    primaryPath: "list_director_items_stable",
    primaryRowCount: 0,
    fallbackRowCount: fallbackRows.length,
    expectedRequestStatuses: Array.from(DIRECTOR_EXPECTED_REQUEST_STATUSES),
    visibleItemStatuses: Array.from(DIRECTOR_PENDING_ITEM_STATUSES),
    fallbackUsed: true,
  });
  return {
    rows: fallbackRows,
    sourcePath: "list_director_items_stable_fallback",
    fallbackUsed: true,
    primaryRowCount: 0,
  };
}
