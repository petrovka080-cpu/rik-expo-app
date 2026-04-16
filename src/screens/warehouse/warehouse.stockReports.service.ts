import type { SupabaseClient } from "@supabase/supabase-js";

import { normalizeRuText } from "../../lib/text/encoding";
import { trimMapSize } from "../../lib/cache/boundedCacheUtils";
import {
  beginPlatformObservability,
  recordPlatformObservability,
} from "../../lib/observability/platformObservability";
import { trackRpcLatency } from "../../lib/observability/rpcLatencyMetrics";
import {
  isAbortError,
  throwIfAborted,
} from "../../lib/requestCancellation";
import {
  asUnknownRows,
  fetchWarehouseIncomingLedgerRows,
  fetchWarehouseIncomingLineRows,
  fetchWarehouseIncomingReportRows,
  fetchWarehouseIssueLineRows,
  fetchWarehouseIssuedByObjectFastRows,
  fetchWarehouseIssuedMaterialsFastRows,
  fetchWarehouseReportsBundle,
} from "./warehouse.api.repo";
import type { StockRow } from "./warehouse.types";
import { nz } from "./warehouse.utils";

type UnknownRow = Record<string, unknown>;

type NameMapSource = "overrides" | "rik_ru" | "ledger_ui";
type NameMapCacheValue = {
  map: Record<string, string>;
};
type NameMapCacheEntry = {
  value: NameMapCacheValue | null;
  expiresAt: number;
  promise: Promise<NameMapCacheValue> | null;
};

const WAREHOUSE_STOCK_REFERENCE_TTL_MS = 5 * 60 * 1000;
const MAX_NAME_MAP_CACHE_SIZE = 200;
const warehouseNameMapCache = new Map<string, NameMapCacheEntry>();

const logWarehouseApiFallback = (scope: string, error: unknown) => {
  if (__DEV__) {
    const message = error instanceof Error ? error.message : String(error ?? "unknown");
    console.warn(`[warehouse.api] ${scope}:`, message);
  }
};

const normDateArg = (value?: string | null): string | null => {
  const normalized = String(value ?? "").trim();
  return normalized || null;
};

const normalizeCodeList = (codesUpper: string[]): string[] =>
  Array.from(new Set((codesUpper || []).map((code) => String(code ?? "").trim().toUpperCase()).filter(Boolean)));

const cloneNameMapValue = (value: NameMapCacheValue): NameMapCacheValue => ({
  map: { ...value.map },
});

const getNameMapCacheEntry = (key: string): NameMapCacheEntry => {
  let entry = warehouseNameMapCache.get(key);
  if (!entry) {
    entry = { value: null, expiresAt: 0, promise: null };
    warehouseNameMapCache.set(key, entry);
    trimMapSize(warehouseNameMapCache, MAX_NAME_MAP_CACHE_SIZE);
  }
  return entry;
};

const now = () => Date.now();

async function readWarehouseNameMapCached(
  source: NameMapSource,
  codesUpper: string[],
  loader: () => Promise<{ value: NameMapCacheValue; cacheable: boolean }>,
): Promise<NameMapCacheValue> {
  const codes = normalizeCodeList(codesUpper);
  if (!codes.length) return { map: {} };

  const key = `${source}:${codes.join("|")}`;
  const entry = getNameMapCacheEntry(key);
  if (entry.value && entry.expiresAt > now()) return cloneNameMapValue(entry.value);
  if (entry.promise) return cloneNameMapValue(await entry.promise);

  entry.promise = (async () => {
    const { value, cacheable } = await loader();
    if (cacheable) {
      entry.value = cloneNameMapValue(value);
      entry.expiresAt = now() + WAREHOUSE_STOCK_REFERENCE_TTL_MS;
    } else {
      entry.value = null;
      entry.expiresAt = 0;
    }
    return value;
  })();

  try {
    return cloneNameMapValue(await entry.promise);
  } finally {
    entry.promise = null;
  }
}

async function loadNameMapOverrides(
  supabase: SupabaseClient,
  codesUpper: string[],
): Promise<Record<string, string>> {
  const cached = await readWarehouseNameMapCached("overrides", codesUpper, async () => {
    const out: Record<string, string> = {};
    const codes = normalizeCodeList(codesUpper);
    if (!codes.length) return { value: { map: out }, cacheable: true };

    const q = await supabase
      .from("catalog_name_overrides")
      .select("code, name_ru")
      .in("code", codes.slice(0, 5000));

    if (q.error || !Array.isArray(q.data)) return { value: { map: out }, cacheable: false };

    for (const row of q.data as UnknownRow[]) {
      const code = String(row.code ?? "").trim().toUpperCase();
      const name = String(normalizeRuText(String(row.name_ru ?? ""))).trim();
      if (code && name && !out[code]) out[code] = name;
    }
    return { value: { map: out }, cacheable: true };
  });
  return cached.map;
}

async function loadNameMapRikRu(
  supabase: SupabaseClient,
  codesUpper: string[],
): Promise<Record<string, string>> {
  const cached = await readWarehouseNameMapCached("rik_ru", codesUpper, async () => {
    const out: Record<string, string> = {};
    const codes = normalizeCodeList(codesUpper);
    if (!codes.length) return { value: { map: out }, cacheable: true };

    const q = await supabase
      .from("v_rik_names_ru")
      .select("code, name_ru")
      .in("code", codes.slice(0, 5000));

    if (q.error || !Array.isArray(q.data)) return { value: { map: out }, cacheable: false };

    for (const row of q.data as UnknownRow[]) {
      const code = String(row.code ?? "").trim().toUpperCase();
      const name = String(normalizeRuText(String(row.name_ru ?? ""))).trim();
      if (code && name && !out[code]) out[code] = name;
    }
    return { value: { map: out }, cacheable: true };
  });
  return cached.map;
}

async function loadNameMapLedgerUi(
  supabase: SupabaseClient,
  codesUpper: string[],
): Promise<Record<string, string>> {
  const cached = await readWarehouseNameMapCached("ledger_ui", codesUpper, async () => {
    const out: Record<string, string> = {};
    const codes = normalizeCodeList(codesUpper);
    if (!codes.length) return { value: { map: out }, cacheable: true };

    const q = await supabase
      .from("v_wh_balance_ledger_ui")
      .select("code, name")
      .in("code", codes.slice(0, 5000));

    if (q.error || !Array.isArray(q.data)) return { value: { map: out }, cacheable: false };

    for (const row of q.data as UnknownRow[]) {
      const code = String(row.code ?? "").trim().toUpperCase();
      const name = String(normalizeRuText(String(row.name ?? ""))).trim();
      if (code && name && !out[code]) out[code] = name;
    }
    return { value: { map: out }, cacheable: true };
  });
  return cached.map;
}

export type WarehouseStockSourceMeta = {
  primaryOwner: "rpc_scope_v2";
  fallbackUsed: boolean;
  sourceKind: "rpc:warehouse_stock_scope_v2";
};

export type WarehouseStockWindowMeta = {
  offset: number;
  limit: number;
  returnedRowCount: number;
  totalRowCount: number | null;
  hasMore: boolean;
};

export type WarehouseStockFetchResult = {
  supported: boolean;
  rows: StockRow[];
  rikDeferredCodes?: string[];
  overrideCodes?: string[];
  missingProjectionCodes?: string[];
  projectionAvailable?: boolean;
  projectionHitCount?: number;
  projectionMissCount?: number;
  projectionReadMs?: number;
  fallbackReadMs?: number;
  meta: WarehouseStockWindowMeta;
  sourceMeta: WarehouseStockSourceMeta;
};

type WarehouseStockScopeEnvelope = {
  document_type: "warehouse_stock_scope";
  version: "v2";
  rows: StockRow[];
  meta: Record<string, unknown>;
};

class WarehouseStockScopeValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WarehouseStockScopeValidationError";
  }
}

const WAREHOUSE_STOCK_RPC_V2_SOURCE_KIND: WarehouseStockSourceMeta["sourceKind"] =
  "rpc:warehouse_stock_scope_v2";

const requireWarehouseRecord = (value: unknown, scope: string): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new WarehouseStockScopeValidationError(`${scope} must be an object`);
  }
  return value as Record<string, unknown>;
};

const requireWarehouseArray = (value: unknown, field: string, scope: string): unknown[] => {
  if (!Array.isArray(value)) {
    throw new WarehouseStockScopeValidationError(`${scope}.${field} must be an array`);
  }
  return value;
};

const requireWarehouseString = (value: unknown, field: string, scope: string): string => {
  const normalized = String(value ?? "").trim();
  if (!normalized) {
    throw new WarehouseStockScopeValidationError(`${scope}.${field} must be a non-empty string`);
  }
  return normalized;
};

const toWarehouseNullableString = (value: unknown): string | null => {
  const normalized = String(value ?? "").trim();
  return normalized || null;
};

function adaptWarehouseStockScopeEnvelope(value: unknown): WarehouseStockScopeEnvelope {
  const root = requireWarehouseRecord(value, "warehouse_stock_scope");
  const documentType = requireWarehouseString(root.document_type, "document_type", "warehouse_stock_scope");
  if (documentType !== "warehouse_stock_scope") {
    throw new WarehouseStockScopeValidationError(
      `warehouse_stock_scope invalid document_type: ${documentType}`,
    );
  }
  const version = requireWarehouseString(root.version, "version", "warehouse_stock_scope");
  if (version !== "v2") {
    throw new WarehouseStockScopeValidationError(`warehouse_stock_scope invalid version: ${version}`);
  }

  const rows = requireWarehouseArray(root.rows, "rows", "warehouse_stock_scope").map((rowValue) => {
    const row = requireWarehouseRecord(rowValue, "warehouse_stock_scope.rows[]");
    const code = toWarehouseNullableString(row.code);
    const uomId = toWarehouseNullableString(row.uom_id);
    return {
      material_id: requireWarehouseString(
        row.material_id ?? `${code ?? ""}::${uomId ?? ""}`,
        "material_id",
        "warehouse_stock_scope.rows[]",
      ),
      code,
      name: toWarehouseNullableString(row.name),
      uom_id: uomId,
      qty_on_hand: nz(row.qty_on_hand, 0),
      qty_reserved: nz(row.qty_reserved, 0),
      qty_available: nz(row.qty_available, 0),
      object_name: toWarehouseNullableString(row.object_name),
      warehouse_name: toWarehouseNullableString(row.warehouse_name),
      updated_at: toWarehouseNullableString(row.updated_at),
    } satisfies StockRow;
  });

  return {
    document_type: "warehouse_stock_scope",
    version: "v2",
    rows,
    meta: requireWarehouseRecord(root.meta ?? {}, "warehouse_stock_scope.meta"),
  };
}

const adaptWarehouseStockWindowMeta = (
  meta: Record<string, unknown>,
  offset: number,
  limit: number,
): WarehouseStockWindowMeta => {
  const returnedRowCount = Math.max(0, nz(meta.returned_row_count ?? meta.row_count, 0));
  const totalRaw = meta.total_row_count ?? meta.total;
  const totalRowCount = totalRaw == null ? null : Math.max(0, nz(totalRaw, 0));
  const hasMore =
    typeof meta.has_more === "boolean"
      ? meta.has_more
      : totalRowCount == null
        ? returnedRowCount >= limit
        : offset + returnedRowCount < totalRowCount;

  return {
    offset,
    limit,
    returnedRowCount,
    totalRowCount,
    hasMore,
  };
};

export async function apiFetchStockRpcV2(
  supabase: SupabaseClient,
  offset: number = 0,
  limit: number = 120,
): Promise<WarehouseStockFetchResult> {
  const observation = beginPlatformObservability({
    screen: "warehouse",
    surface: "stock_list",
    category: "fetch",
    event: "fetch_stock_rpc",
    sourceKind: WAREHOUSE_STOCK_RPC_V2_SOURCE_KIND,
  });

  try {
    const startedAt = Date.now();
    const { data, error } = await supabase.rpc("warehouse_stock_scope_v2", {
      p_limit: limit,
      p_offset: offset,
    });
    if (error) {
      trackRpcLatency({
        name: "warehouse_stock_scope_v2",
        screen: "warehouse",
        surface: "stock_list",
        durationMs: Date.now() - startedAt,
        status: "error",
        error,
        extra: { limit, offset },
      });
      throw error;
    }

    const envelope = adaptWarehouseStockScopeEnvelope(data);
    trackRpcLatency({
      name: "warehouse_stock_scope_v2",
      screen: "warehouse",
      surface: "stock_list",
      durationMs: Date.now() - startedAt,
      status: "success",
      rowCount: envelope.rows.length,
      extra: {
        limit,
        offset,
        totalRowCount: adaptWarehouseStockWindowMeta(envelope.meta, offset, limit).totalRowCount,
      },
    });
    const result: WarehouseStockFetchResult = {
      supported: true,
      rows: envelope.rows,
      rikDeferredCodes: [],
      overrideCodes: [],
      missingProjectionCodes: [],
      projectionAvailable: true,
      projectionHitCount: envelope.rows.length,
      projectionMissCount: 0,
      projectionReadMs: 0,
      fallbackReadMs: 0,
      meta: adaptWarehouseStockWindowMeta(envelope.meta, offset, limit),
      sourceMeta: {
        primaryOwner: "rpc_scope_v2",
        fallbackUsed: false,
        sourceKind: WAREHOUSE_STOCK_RPC_V2_SOURCE_KIND,
      },
    };
    observation.success({
      rowCount: result.rows.length,
      sourceKind: WAREHOUSE_STOCK_RPC_V2_SOURCE_KIND,
      fallbackUsed: false,
      extra: {
        primaryOwner: "rpc_scope_v2",
        totalRowCount: result.meta.totalRowCount,
        hasMore: result.meta.hasMore,
      },
    });
    return result;
  } catch (error) {
    observation.error(error, {
      rowCount: 0,
      errorStage: "fetch_stock_rpc_v2",
      sourceKind: WAREHOUSE_STOCK_RPC_V2_SOURCE_KIND,
    });
    throw error;
  }
}

export async function apiFetchStock(
  supabase: SupabaseClient,
  offset: number = 0,
  limit: number = 120,
): Promise<WarehouseStockFetchResult> {
  const observation = beginPlatformObservability({
    screen: "warehouse",
    surface: "stock_list",
    category: "fetch",
    event: "fetch_stock",
    sourceKind: WAREHOUSE_STOCK_RPC_V2_SOURCE_KIND,
  });

  try {
    const result = await apiFetchStockRpcV2(supabase, offset, limit);
    observation.success({
      rowCount: result.rows.length,
      sourceKind: result.sourceMeta.sourceKind,
      fallbackUsed: false,
      extra: {
        primaryOwner: result.sourceMeta.primaryOwner,
        totalRowCount: result.meta.totalRowCount,
        hasMore: result.meta.hasMore,
      },
    });
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error ?? "");
    recordPlatformObservability({
      screen: "warehouse",
      surface: "stock_list",
      category: "fetch",
      event: "fetch_stock_primary_rpc_v2",
      result: "error",
      sourceKind: WAREHOUSE_STOCK_RPC_V2_SOURCE_KIND,
      errorStage: "fetch_stock_rpc_v2",
      errorClass: error instanceof Error ? error.name : undefined,
      errorMessage: message || undefined,
      fallbackUsed: false,
    });
    observation.error(error, {
      rowCount: 0,
      errorStage: "fetch_stock_rpc_v2",
      sourceKind: WAREHOUSE_STOCK_RPC_V2_SOURCE_KIND,
    });
    throw error;
  }
}

export async function apiEnrichStockNamesFromRikRu(
  supabase: SupabaseClient,
  rows: StockRow[],
  options?: { rikDeferredCodes?: string[]; overrideCodes?: string[] },
): Promise<StockRow[]> {
  const baseRows = Array.isArray(rows) ? rows : [];
  if (!baseRows.length) return baseRows;

  const skipCodes = new Set(
    (options?.overrideCodes ?? []).map((value) => String(value || "").trim().toUpperCase()).filter(Boolean),
  );
  const codesUpper = Array.from(
    new Set(
      (options?.rikDeferredCodes ?? baseRows.map((row) => String(row.code ?? "").trim().toUpperCase()))
        .filter(Boolean)
        .filter((code) => !skipCodes.has(code)),
    ),
  );
  if (!codesUpper.length) return baseRows;

  const rikMap = await loadNameMapRikRu(supabase, codesUpper);
  if (!Object.keys(rikMap).length) return baseRows;

  return baseRows.map((row) => {
    const codeKey = String(row.code ?? "").trim().toUpperCase();
    if (!codeKey || skipCodes.has(codeKey)) return row;

    const rikName = String(normalizeRuText(String(rikMap[codeKey] ?? ""))).trim();
    if (!rikName) return row;

    return {
      ...row,
      name: rikName,
    };
  });
}

export async function apiFetchReports(
  supabase: SupabaseClient,
  periodFrom?: string,
  periodTo?: string,
  options?: { signal?: AbortSignal | null },
): Promise<{ supported: boolean; repStock: StockRow[]; repMov: UnknownRow[]; repIssues: UnknownRow[] }> {
  try {
    throwIfAborted(options?.signal);
    const { stock, movement, issues } = await fetchWarehouseReportsBundle(
      supabase,
      periodFrom,
      periodTo,
      { signal: options?.signal },
    );
    throwIfAborted(options?.signal);

    return {
      supported: true,
      repStock: !stock.error && Array.isArray(stock.data) ? (stock.data as StockRow[]) : [],
      repMov: !movement.error && Array.isArray(movement.data) ? (movement.data as UnknownRow[]) : [],
      repIssues: !issues.error && Array.isArray(issues.data) ? (issues.data as UnknownRow[]) : [],
    };
  } catch (error) {
    if (isAbortError(error)) throw error;
    logWarehouseApiFallback("apiFetchReports", error);
    return { supported: false, repStock: [], repMov: [], repIssues: [] };
  }
}

export async function apiEnsureIssueLines(
  supabase: SupabaseClient,
  issueId: number,
): Promise<UnknownRow[]> {
  const response = await fetchWarehouseIssueLineRows(supabase, issueId);
  if (!response.error && Array.isArray(response.data)) return response.data as UnknownRow[];
  return [];
}

export type IssuedMaterialsFastRow = {
  material_code: string;
  material_name: string;
  uom: string;
  sum_in_req: unknown;
  sum_free: unknown;
  sum_over: unknown;
  sum_total: unknown;
  docs_cnt: unknown;
  lines_cnt: unknown;
};

export type IssuedByObjectFastRow = {
  object_id: string | null;
  object_name: string;
  work_name: string;
  docs_cnt: unknown;
  req_cnt: unknown;
  active_days: unknown;
  uniq_materials: unknown;
  recipients_text: string | null;
  top3_materials: string | null;
};

export async function apiFetchIssuedMaterialsReportFast(
  supabase: SupabaseClient,
  params: { from?: string | null; to?: string | null; objectId?: string | null },
): Promise<IssuedMaterialsFastRow[]> {
  const response = await fetchWarehouseIssuedMaterialsFastRows(supabase, {
    from: normDateArg(params.from),
    to: normDateArg(params.to),
    objectId: params.objectId ?? null,
  });

  if (!response.error && Array.isArray(response.data)) return response.data as IssuedMaterialsFastRow[];
  return [];
}

export async function apiFetchIssuedByObjectReportFast(
  supabase: SupabaseClient,
  params: { from?: string | null; to?: string | null; objectId?: string | null },
): Promise<IssuedByObjectFastRow[]> {
  const response = await fetchWarehouseIssuedByObjectFastRows(supabase, {
    from: normDateArg(params.from),
    to: normDateArg(params.to),
    objectId: params.objectId ?? null,
  });

  if (!response.error && Array.isArray(response.data)) return response.data as IssuedByObjectFastRow[];
  return [];
}

export async function apiFetchIncomingReports(
  supabase: SupabaseClient,
  params: { from?: string | null; to?: string | null },
  options?: { signal?: AbortSignal | null },
): Promise<UnknownRow[]> {
  throwIfAborted(options?.signal);
  const response = await fetchWarehouseIncomingReportRows(supabase, {
    from: normDateArg(params.from),
    to: normDateArg(params.to),
  }, { signal: options?.signal });
  throwIfAborted(options?.signal);

  if (!response.error && Array.isArray(response.data)) return response.data as UnknownRow[];
  return [];
}

export type IncomingMaterialsFastRow = {
  material_code: string;
  material_name: string;
  uom: string;
  sum_total: number;
  docs_cnt: number;
  lines_cnt: number;
};

export async function apiFetchIncomingMaterialsReportFast(
  supabase: SupabaseClient,
  params: { from?: string | null; to?: string | null },
): Promise<IncomingMaterialsFastRow[]> {
  if (__DEV__) {
    console.info("[apiFetchIncomingMaterialsReportFast] Fetching from ledger for", params);
  }

  const response = await fetchWarehouseIncomingLedgerRows(supabase, {
    from: normDateArg(params.from),
    to: normDateArg(params.to),
  });

  if (response.error || !response.data) {
    if (__DEV__ && response.error) {
      console.warn("[apiFetchIncomingMaterialsReportFast] fallback err:", response.error.message);
    }
    return [];
  }

  const groups: Record<string, IncomingMaterialsFastRow> = {};
  for (const row of response.data as UnknownRow[]) {
    const code = String(row.code || "").trim();
    if (!code) continue;

    const key = `${code}|${row.uom_id}`;
    if (!groups[key]) {
      groups[key] = {
        material_code: code,
        material_name: normalizeRuText(code),
        uom: String(row.uom_id ?? ""),
        sum_total: 0,
        docs_cnt: 0,
        lines_cnt: 0,
      };
    }
    const value = Number(row.qty || 0);
    groups[key].sum_total += value;
    groups[key].lines_cnt += 1;
  }
  return Object.values(groups);
}

export async function apiFetchIncomingLines(
  supabase: SupabaseClient,
  incomingId: string,
): Promise<UnknownRow[]> {
  if (__DEV__) {
    console.info("[apiFetchIncomingLines] Direct fetch for:", incomingId);
  }

  const response = await fetchWarehouseIncomingLineRows(supabase, incomingId);

  if (!response.error && Array.isArray(response.data)) {
    if (__DEV__) {
      console.info("[apiFetchIncomingLines] Success:", response.data.length, "lines");
    }
    const rows = asUnknownRows(response.data);
    const codesUpper = Array.from(
      new Set(rows.map((line) => String(line?.code ?? "").trim().toUpperCase()).filter(Boolean)),
    );

    const [overMap, rikMap, uiMap] = await Promise.all([
      loadNameMapOverrides(supabase, codesUpper),
      loadNameMapRikRu(supabase, codesUpper),
      loadNameMapLedgerUi(supabase, codesUpper),
    ]);

    return rows.map((line) => {
      const code = String(line?.code ?? "").trim();
      const key = code.toUpperCase();
      const overName = String(normalizeRuText(String(overMap[key] ?? ""))).trim();
      const rikName = String(normalizeRuText(String(rikMap[key] ?? ""))).trim();
      const uiName = String(normalizeRuText(String(uiMap[key] ?? ""))).trim();
      const nameRu = normalizeRuText(overName || rikName || uiName || code || "Позиция");

      return {
        ...line,
        name_ru: nameRu,
        material_name: nameRu,
        name: nameRu,
        uom: line.uom_id || "—",
        qty_received: line.qty,
      };
    });
  }

  if (__DEV__ && response.error) console.error("[apiFetchIncomingLines] Error:", response.error.message);
  return [];
}
