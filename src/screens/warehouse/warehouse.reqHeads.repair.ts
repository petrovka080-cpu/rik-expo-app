import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  ReqHeadRow,
  ReqItemUiRow,
  WarehouseReqHeadsFailureClass,
  WarehouseReqHeadsIntegrityState,
} from "./warehouse.types";
import {
  asUnknownRows,
  fetchWarehouseFallbackStockRows,
  fetchWarehouseReqHeadTruthRows,
  fetchWarehouseRequestFallbackRows,
  fetchWarehouseRequestItemsFallbackRows,
} from "./warehouse.api.repo";
import { createWarehouseTimedRowsFallbackCache } from "./warehouse.cache";
import { isUuid, normMatCode, normUomId, parseNum, parseReqHeaderContext } from "./warehouse.request.utils";
import { classifyWarehouseReqHeadsFailure } from "./warehouse.reqHeads.failure";
import {
  createHealthyWarehouseReqHeadsIntegrityState,
  createWarehouseReqHeadsIntegrityState,
} from "./warehouse.reqHeads.state";
import { normalizeRuText } from "../../lib/text/encoding";
import { isRequestVisibleInWarehouseIssueQueue } from "../../lib/requestStatus";
import { recordPlatformObservability } from "../../lib/observability/platformObservability";

type UnknownRow = Record<string, unknown>;

type RequestFallbackRow = {
  id: string | null;
  display_no: string | null;
  status: string | null;
  object_name: string | null;
  object_type_code: string | null;
  level_name: string | null;
  level_code: string | null;
  system_name: string | null;
  system_code: string | null;
  zone_name: string | null;
  zone_code: string | null;
  submitted_at: string | null;
  created_at: string | null;
  contractor_org: string | null;
  subcontractor_org: string | null;
  contractor_name: string | null;
  subcontractor_name: string | null;
  contractor_phone: string | null;
  subcontractor_phone: string | null;
  phone: string | null;
  phone_number: string | null;
  planned_volume: string | null;
  volume: string | null;
  qty_plan: string | null;
  note: string | null;
  comment: string | null;
};

type RequestItemFallbackRow = {
  request_id: string;
  request_item_id: string;
  rik_code: string | null;
  name_human: string | null;
  uom: string | null;
  qty: number;
  status: string | null;
  note: string | null;
};

type StockAvailabilityMap = {
  byCode: Record<string, number>;
  byCodeUom: Record<string, number>;
};

type ReqHeadTruth = {
  items_cnt: number;
  ready_cnt: number;
  done_cnt: number;
  qty_limit_sum: number;
  qty_issued_sum: number;
  qty_left_sum: number;
  qty_can_issue_now_sum: number;
  issuable_now_cnt: number;
  issue_status: "READY" | "WAITING_STOCK" | "PARTIAL" | "DONE";
};

type WarehouseFallbackRequestLoadResult = {
  rows: RequestFallbackRow[];
  integrityState: WarehouseReqHeadsIntegrityState;
};

export type WarehouseReqHeadsRepairResult = {
  rows: ReqHeadRow[];
  fallbackMissingIdsCount: number;
  page0RequiredRepair: boolean;
  integrityState: WarehouseReqHeadsIntegrityState;
};

const REQUESTS_FALLBACK_FAIL_COOLDOWN_MS = 30_000;
const REQUESTS_FALLBACK_LAST_GOOD_TTL_MS = 5 * 60 * 1000;

const REQUESTS_FALLBACK_SELECT = [
  "id",
  "display_no",
  "status",
  "object_name",
  "object_type_code",
  "level_name",
  "level_code",
  "system_name",
  "system_code",
  "zone_name",
  "zone_code",
  "submitted_at",
  "created_at",
  "contractor_name",
  "contractor_org",
  "subcontractor_name",
  "subcontractor_org",
  "contractor_phone",
  "subcontractor_phone",
  "phone",
  "phone_number",
  "planned_volume",
  "volume",
  "qty_plan",
  "note",
  "comment",
].join(", ");

const REQUESTS_FALLBACK_SELECT_MINIMAL = [
  "id",
  "display_no",
  "status",
  "object_name",
  "object_type_code",
  "level_code",
  "system_code",
  "zone_code",
  "submitted_at",
  "created_at",
  "note",
  "comment",
].join(", ");

const REQUESTS_FALLBACK_SELECT_PLANS = [
  REQUESTS_FALLBACK_SELECT,
  REQUESTS_FALLBACK_SELECT_MINIMAL,
  "*",
] as const;

const toTextOrNull = (value: unknown): string | null => {
  const normalized = String(value ?? "").trim();
  return normalized || null;
};

const cloneRequestFallbackRows = (rows: RequestFallbackRow[]): RequestFallbackRow[] =>
  rows.map((row) => ({ ...row }));

const requestsFallbackCache = createWarehouseTimedRowsFallbackCache<RequestFallbackRow>({
  failCooldownMs: REQUESTS_FALLBACK_FAIL_COOLDOWN_MS,
  lastGoodTtlMs: REQUESTS_FALLBACK_LAST_GOOD_TTL_MS,
  cloneRows: cloneRequestFallbackRows,
});
let requestsFallbackLastFailureClass: WarehouseReqHeadsFailureClass | null = null;

const normalizeRequestFallbackRow = (row: UnknownRow): RequestFallbackRow => ({
  id: toTextOrNull(row.id),
  display_no: toTextOrNull(row.display_no),
  status: toTextOrNull(row.status),
  object_name: toTextOrNull(row.object_name),
  object_type_code: toTextOrNull(row.object_type_code),
  level_name: toTextOrNull(row.level_name),
  level_code: toTextOrNull(row.level_code),
  system_name: toTextOrNull(row.system_name),
  system_code: toTextOrNull(row.system_code),
  zone_name: toTextOrNull(row.zone_name),
  zone_code: toTextOrNull(row.zone_code),
  submitted_at: toTextOrNull(row.submitted_at),
  created_at: toTextOrNull(row.created_at),
  contractor_name: toTextOrNull(row.contractor_name),
  contractor_org: toTextOrNull(row.contractor_org),
  subcontractor_name: toTextOrNull(row.subcontractor_name),
  subcontractor_org: toTextOrNull(row.subcontractor_org),
  contractor_phone: toTextOrNull(row.contractor_phone),
  subcontractor_phone: toTextOrNull(row.subcontractor_phone),
  phone: toTextOrNull(row.phone),
  phone_number: toTextOrNull(row.phone_number),
  planned_volume: toTextOrNull(row.planned_volume),
  volume: toTextOrNull(row.volume),
  qty_plan: toTextOrNull(row.qty_plan),
  note: toTextOrNull(row.note),
  comment: toTextOrNull(row.comment),
});

const normalizeRequestItemFallbackRow = (row: UnknownRow): RequestItemFallbackRow => ({
  request_id: String(row.request_id ?? "").trim(),
  request_item_id: String(row.id ?? row.request_item_id ?? "").trim(),
  rik_code: toTextOrNull(row.rik_code),
  name_human: toTextOrNull(row.name_human),
  uom: toTextOrNull(row.uom),
  qty: Math.max(0, parseNum(row.qty, 0)),
  status: toTextOrNull(row.status),
  note: toTextOrNull(row.note),
});

const parseDisplayNo = (raw: unknown): { year: number; seq: number } => {
  const normalized = String(raw ?? "").trim();
  const match = normalized.match(/(\d+)\s*\/\s*(\d{4})/);
  if (!match) return { year: 0, seq: 0 };
  return { seq: Number(match[1] ?? 0) || 0, year: Number(match[2] ?? 0) || 0 };
};

export const compareWarehouseReqHeads = (left: ReqHeadRow, right: ReqHeadRow): number => {
  const leftTime = left?.submitted_at ? new Date(left.submitted_at).getTime() : 0;
  const rightTime = right?.submitted_at ? new Date(right.submitted_at).getTime() : 0;
  if (rightTime !== leftTime) return rightTime - leftTime;

  const leftDisplay = parseDisplayNo(left.display_no);
  const rightDisplay = parseDisplayNo(right.display_no);
  if (rightDisplay.year !== leftDisplay.year) return rightDisplay.year - leftDisplay.year;
  if (rightDisplay.seq !== leftDisplay.seq) return rightDisplay.seq - leftDisplay.seq;

  return String(right?.request_id ?? "").localeCompare(String(left?.request_id ?? ""));
};

const normalizeRequestItemStatus = (value: unknown): string =>
  String(normalizeRuText(String(value ?? "")) ?? "")
    .trim()
    .toLowerCase();

const isRejectedRequestItemStatus = (value: unknown): boolean => {
  const status = normalizeRequestItemStatus(value);
  return status.includes("РѕС‚РєР»РѕРЅ") || status.includes("reject");
};

const isIssuedRequestItemStatus = (value: unknown): boolean => {
  const status = normalizeRequestItemStatus(value);
  return status.includes("РІС‹РґР°РЅ") || status === "done";
};

const buildStockAvailabilityCodeKey = (raw: unknown): string =>
  String(normMatCode(raw ?? "")).trim().toUpperCase();

const buildStockAvailabilityCodeUomKey = (rawCode: unknown, rawUom: unknown): string => {
  const code = buildStockAvailabilityCodeKey(rawCode);
  const uom = String(normUomId(rawUom ?? "") ?? "")
    .trim()
    .toLowerCase();
  return `${code}::${uom || "-"}`;
};

const finalizeReqHeadTruth = (agg: Omit<ReqHeadTruth, "issue_status">): ReqHeadTruth => {
  const qtyLeft = Math.max(0, agg.qty_left_sum);
  const qtyCanIssueNow = Math.max(0, agg.qty_can_issue_now_sum);
  let issueStatus: ReqHeadTruth["issue_status"] = "WAITING_STOCK";
  if (qtyLeft <= 0) issueStatus = "DONE";
  else if (qtyCanIssueNow > 0) issueStatus = "READY";
  else if (agg.qty_issued_sum > 0) issueStatus = "PARTIAL";
  return {
    ...agg,
    qty_left_sum: qtyLeft,
    qty_can_issue_now_sum: qtyCanIssueNow,
    issue_status: issueStatus,
  };
};

const deriveReqHeadQueueState = (
  row: Pick<ReqHeadRow, "qty_left_sum" | "qty_can_issue_now_sum" | "issue_status">,
) => {
  const qtyLeft = Math.max(0, parseNum(row.qty_left_sum, 0));
  const qtyCanIssueNow = Math.max(0, parseNum(row.qty_can_issue_now_sum, 0));
  const allDone = String(row.issue_status ?? "").trim().toUpperCase() === "DONE" || qtyLeft <= 0;
  const visibleInExpenseQueue = !allDone && qtyLeft > 0;
  const canIssueNow = visibleInExpenseQueue && qtyCanIssueNow > 0;
  const waitingStock = visibleInExpenseQueue && !canIssueNow;
  return {
    visible_in_expense_queue: visibleInExpenseQueue,
    can_issue_now: canIssueNow,
    waiting_stock: waitingStock,
    all_done: allDone,
  };
};

const applyReqHeadTruth = (row: ReqHeadRow, truth?: ReqHeadTruth): ReqHeadRow => {
  const next = truth
    ? {
        ...row,
        items_cnt: truth.items_cnt,
        ready_cnt: truth.ready_cnt,
        done_cnt: truth.done_cnt,
        qty_limit_sum: truth.qty_limit_sum,
        qty_issued_sum: truth.qty_issued_sum,
        qty_left_sum: truth.qty_left_sum,
        qty_can_issue_now_sum: truth.qty_can_issue_now_sum,
        issuable_now_cnt: truth.issuable_now_cnt,
        issue_status: truth.issue_status,
      }
    : row;
  return {
    ...next,
    ...deriveReqHeadQueueState(next),
  };
};

const aggregateReqItemTruthRows = (rows: UnknownRow[]): Record<string, ReqHeadTruth> => {
  const byRequest: Record<
    string,
    Record<
      string,
      {
        qty_limit: number;
        qty_issued: number;
        qty_left: number;
        qty_can_issue_now: number;
      }
    >
  > = {};

  for (const row of rows) {
    const requestId = String(row?.request_id ?? "").trim();
    const requestItemId = String(row?.request_item_id ?? "").trim();
    if (!requestId || !requestItemId) continue;
    if (!byRequest[requestId]) byRequest[requestId] = {};

    const previous = byRequest[requestId][requestItemId];
    const next = {
      qty_limit: parseNum(row?.qty_limit, 0),
      qty_issued: parseNum(row?.qty_issued, 0),
      qty_left: parseNum(row?.qty_left, 0),
      qty_can_issue_now: parseNum(row?.qty_can_issue_now, 0),
    };

    byRequest[requestId][requestItemId] = previous
      ? {
          qty_limit: Math.max(previous.qty_limit, next.qty_limit),
          qty_issued: Math.max(previous.qty_issued, next.qty_issued),
          qty_left: Math.max(previous.qty_left, next.qty_left),
          qty_can_issue_now: Math.max(previous.qty_can_issue_now, next.qty_can_issue_now),
        }
      : next;
  }

  const output: Record<string, ReqHeadTruth> = {};
  for (const [requestId, itemMap] of Object.entries(byRequest)) {
    const items = Object.values(itemMap);
    const aggregate = items.reduce(
      (acc, item) => {
        const left = Math.max(0, item.qty_left);
        const canIssueNow = Math.max(0, Math.min(left, item.qty_can_issue_now));
        acc.items_cnt += 1;
        acc.ready_cnt += left > 0 ? 1 : 0;
        acc.done_cnt += left <= 0 && item.qty_limit > 0 ? 1 : 0;
        acc.qty_limit_sum += Math.max(0, item.qty_limit);
        acc.qty_issued_sum += Math.max(0, item.qty_issued);
        acc.qty_left_sum += left;
        acc.qty_can_issue_now_sum += canIssueNow;
        acc.issuable_now_cnt += left > 0 && canIssueNow > 0 ? 1 : 0;
        return acc;
      },
      {
        items_cnt: 0,
        ready_cnt: 0,
        done_cnt: 0,
        qty_limit_sum: 0,
        qty_issued_sum: 0,
        qty_left_sum: 0,
        qty_can_issue_now_sum: 0,
        issuable_now_cnt: 0,
      },
    );
    output[requestId] = finalizeReqHeadTruth(aggregate);
  }

  return output;
};

const aggregateReqItemUiRows = (rows: ReqItemUiRow[]): Record<string, ReqHeadTruth> =>
  aggregateReqItemTruthRows(
    rows.map((row) => ({
      request_id: row.request_id,
      request_item_id: row.request_item_id,
      qty_limit: row.qty_limit,
      qty_issued: row.qty_issued,
      qty_left: row.qty_left,
      qty_can_issue_now: row.qty_can_issue_now,
    })),
  );

const normalizePhone = (value: string) => {
  const source = String(value || "").trim();
  if (!source) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(source)) return "";
  if (/^\d{4}[./]\d{2}[./]\d{2}$/.test(source)) return "";
  const match = source.match(/(\+?\d[\d\s()\-]{7,}\d)/);
  if (!match) return "";
  const candidate = String(match[1] || "").trim();
  const digits = candidate.replace(/[^\d]/g, "");
  if (digits.length < 9) return "";
  return candidate.replace(/\s+/g, "");
};

const getLastKnownGoodRows = (): RequestFallbackRow[] => {
  return requestsFallbackCache.getLastKnownGoodRows();
};

const recordRepairEvent = (
  event: string,
  integrityState: WarehouseReqHeadsIntegrityState,
  extra?: Record<string, unknown>,
) => {
  recordPlatformObservability({
    screen: "warehouse",
    surface: "req_heads",
    category: "fetch",
    event,
    result: integrityState.mode === "error" ? "error" : "success",
    fallbackUsed: integrityState.mode !== "healthy",
    errorStage: integrityState.reason ?? undefined,
    errorMessage: integrityState.message ?? undefined,
    extra: {
      cacheUsed: integrityState.cacheUsed,
      ...extra,
    },
  });
};

async function loadWarehouseFallbackRequestRows(
  supabase: SupabaseClient,
  pageSize: number,
): Promise<WarehouseFallbackRequestLoadResult> {
  const timestamp = Date.now();
  const limit = Math.max(pageSize * 6, 600);
  if (requestsFallbackCache.isCoolingDown(timestamp)) {
    const cached = getLastKnownGoodRows();
    if (__DEV__ && requestsFallbackCache.shouldEmitCooldownLog(timestamp)) {
      console.warn("[warehouse.reqHeads.repair] requests fallback select skipped by cooldown");
    }
    if (cached.length) {
      const integrityState = createWarehouseReqHeadsIntegrityState({
        mode: "stale_last_known_good",
        failureClass: requestsFallbackLastFailureClass ?? "server_failure",
        reason: "requests_fallback_cooldown",
        message: "requests fallback cooldown; using last known good rows",
        cacheUsed: true,
        cooldownActive: true,
        cooldownReason: "requests_fallback_backoff",
      });
      recordRepairEvent("req_heads_repair_fallback_cooldown_cache", integrityState, {
        rowCount: cached.length,
      });
      return { rows: cached, integrityState };
    }
    const integrityState = createWarehouseReqHeadsIntegrityState({
      mode: "error",
      failureClass: requestsFallbackLastFailureClass ?? "server_failure",
      reason: "requests_fallback_cooldown",
      message: "requests fallback cooldown without last known good rows",
      cacheUsed: false,
      cooldownActive: true,
      cooldownReason: "requests_fallback_backoff",
    });
    recordRepairEvent("req_heads_repair_fallback_cooldown_empty", integrityState);
    return { rows: [], integrityState };
  }

  let lastError: unknown = null;
  for (const selectCols of REQUESTS_FALLBACK_SELECT_PLANS) {
    const result = await fetchWarehouseRequestFallbackRows(supabase, selectCols, limit);
    if (!result.error && Array.isArray(result.data)) {
      const rows = asUnknownRows(result.data).map(normalizeRequestFallbackRow);
      requestsFallbackCache.recordLiveRows(rows, timestamp);
      requestsFallbackLastFailureClass = null;
      const integrityState = createHealthyWarehouseReqHeadsIntegrityState();
      recordRepairEvent("req_heads_repair_fallback_live", integrityState, {
        rowCount: rows.length,
      });
      return { rows, integrityState };
    }
    lastError = result.error ?? lastError;
  }

  requestsFallbackCache.recordHardFail(timestamp);
  const message = String((lastError as { message?: string } | null)?.message ?? lastError ?? "unknown");
  const failure = classifyWarehouseReqHeadsFailure(lastError);
  requestsFallbackLastFailureClass = failure.failureClass;
  const cached = getLastKnownGoodRows();
  if (cached.length) {
    const integrityState = createWarehouseReqHeadsIntegrityState({
      mode: "stale_last_known_good",
      failureClass: failure.failureClass,
      reason: "requests_fallback_failed",
      message,
      cacheUsed: true,
    });
    recordRepairEvent("req_heads_repair_fallback_failed_cache", integrityState, {
      rowCount: cached.length,
    });
    return { rows: cached, integrityState };
  }

  const integrityState = createWarehouseReqHeadsIntegrityState({
    mode: "error",
    failureClass: failure.failureClass,
    reason: "requests_fallback_failed",
    message,
    cacheUsed: false,
  });
  recordRepairEvent("req_heads_repair_fallback_failed_empty", integrityState);
  return { rows: [], integrityState };
}

async function loadFallbackStockAvailability(
  supabase: SupabaseClient,
  rows: RequestItemFallbackRow[],
): Promise<StockAvailabilityMap> {
  const codes = Array.from(
    new Set(
      rows
        .map((row) => buildStockAvailabilityCodeKey(row.rik_code))
        .filter(Boolean),
    ),
  );
  const result = await fetchWarehouseFallbackStockRows(supabase, codes);
  if (result.error || !Array.isArray(result.data) || !result.data.length) {
    return { byCode: {}, byCodeUom: {} };
  }

  const byCode: Record<string, number> = {};
  const byCodeUom: Record<string, number> = {};
  for (const row of result.data as UnknownRow[]) {
    const codeKey = buildStockAvailabilityCodeKey(row.rik_code);
    if (!codeKey) continue;
    const qty = Math.max(0, parseNum(row.qty_available, 0));
    byCode[codeKey] = (byCode[codeKey] ?? 0) + qty;
    const codeUomKey = buildStockAvailabilityCodeUomKey(row.rik_code, row.uom_id);
    byCodeUom[codeUomKey] = (byCodeUom[codeUomKey] ?? 0) + qty;
  }

  return { byCode, byCodeUom };
}

function materializeFallbackReqItems(
  rows: RequestItemFallbackRow[],
  stockAvailability: StockAvailabilityMap,
): ReqItemUiRow[] {
  const remainingByCode = { ...stockAvailability.byCode };
  const remainingByCodeUom = { ...stockAvailability.byCodeUom };

  return rows
    .filter((row) => !isRejectedRequestItemStatus(row.status))
    .sort((left, right) => {
      const requestCompare = String(left.request_id ?? "").localeCompare(String(right.request_id ?? ""));
      if (requestCompare !== 0) return requestCompare;
      const nameCompare = String(left.name_human ?? "").localeCompare(String(right.name_human ?? ""));
      if (nameCompare !== 0) return nameCompare;
      return String(left.request_item_id ?? "").localeCompare(String(right.request_item_id ?? ""));
    })
    .map((row) => {
      const qtyLimit = Math.max(0, row.qty);
      const qtyIssued = isIssuedRequestItemStatus(row.status) ? qtyLimit : 0;
      const qtyLeft = Math.max(0, qtyLimit - qtyIssued);
      const codeKey = buildStockAvailabilityCodeKey(row.rik_code);
      const codeUomKey = buildStockAvailabilityCodeUomKey(row.rik_code, row.uom);
      const exactAvailable = stockAvailability.byCodeUom[codeUomKey];
      const totalAvailable = exactAvailable ?? stockAvailability.byCode[codeKey] ?? 0;
      const remainingAvailable =
        exactAvailable != null
          ? remainingByCodeUom[codeUomKey] ?? totalAvailable
          : remainingByCode[codeKey] ?? totalAvailable;
      const qtyCanIssueNow = Math.max(0, Math.min(qtyLeft, remainingAvailable));

      if (exactAvailable != null) {
        remainingByCodeUom[codeUomKey] = Math.max(0, remainingAvailable - qtyCanIssueNow);
      } else if (codeKey) {
        remainingByCode[codeKey] = Math.max(0, remainingAvailable - qtyCanIssueNow);
      }

      return {
        request_id: row.request_id,
        request_item_id: row.request_item_id,
        display_no: null,
        object_name: null,
        level_code: null,
        system_code: null,
        zone_code: null,
        rik_code: String(row.rik_code ?? ""),
        name_human: String(row.name_human ?? row.rik_code ?? ""),
        uom: row.uom,
        qty_limit: qtyLimit,
        qty_issued: qtyIssued,
        qty_left: qtyLeft,
        qty_available: Math.max(0, totalAvailable),
        qty_can_issue_now: qtyCanIssueNow,
      };
    });
}

async function loadReqHeadTruthByRequestIds(
  supabase: SupabaseClient,
  requestIds: string[],
): Promise<Record<string, ReqHeadTruth>> {
  const ids = Array.from(new Set(requestIds.map((value) => String(value || "").trim()).filter(isUuid)));
  const result = await fetchWarehouseReqHeadTruthRows(supabase, ids);
  if (result.error || !Array.isArray(result.data) || result.data.length === 0) {
    return {};
  }
  return aggregateReqItemTruthRows(result.data as UnknownRow[]);
}

export async function repairWarehouseReqHeadsPage0(params: {
  supabase: SupabaseClient;
  pageSize: number;
  viewRows: ReqHeadRow[];
}): Promise<WarehouseReqHeadsRepairResult> {
  const { supabase, pageSize } = params;
  const sortedViewRows = [...params.viewRows].sort(compareWarehouseReqHeads);
  const fallbackLoad = await loadWarehouseFallbackRequestRows(supabase, pageSize);
  if (!fallbackLoad.rows.length) {
    return {
      rows: sortedViewRows,
      fallbackMissingIdsCount: 0,
      page0RequiredRepair: false,
      integrityState:
        sortedViewRows.length > 0 && fallbackLoad.integrityState.mode === "error"
          ? createWarehouseReqHeadsIntegrityState({
              mode: "stale_last_known_good",
              failureClass: fallbackLoad.integrityState.failureClass,
              reason: fallbackLoad.integrityState.reason,
              message: fallbackLoad.integrityState.message,
              cacheUsed: fallbackLoad.integrityState.cacheUsed,
              cooldownActive: fallbackLoad.integrityState.cooldownActive,
              cooldownReason: fallbackLoad.integrityState.cooldownReason,
            })
          : fallbackLoad.integrityState,
    };
  }

  const materializedRequestIds = new Set(
    sortedViewRows.map((row) => String(row.request_id ?? "").trim()).filter(Boolean),
  );

  const approvedRequests = fallbackLoad.rows
    .filter((row) => isRequestVisibleInWarehouseIssueQueue(row?.status))
    .map((row) => ({
      request_id: String(row.id ?? "").trim(),
      display_no: toTextOrNull(row.display_no),
      object_name: toTextOrNull(row.object_name ?? row.object_type_code),
      level_name: toTextOrNull(row.level_name ?? row.level_code),
      system_name: toTextOrNull(row.system_name ?? row.system_code),
      zone_name: toTextOrNull(row.zone_name ?? row.zone_code),
      level_code: toTextOrNull(row.level_code),
      system_code: toTextOrNull(row.system_code),
      zone_code: toTextOrNull(row.zone_code),
      submitted_at: toTextOrNull(row.submitted_at ?? row.created_at),
    }))
    .filter((row) => !!row.request_id);

  const missingRequestIds = approvedRequests
    .map((row) => row.request_id)
    .filter((requestId) => !materializedRequestIds.has(requestId));

  if (!missingRequestIds.length) {
    return {
      rows: sortedViewRows,
      fallbackMissingIdsCount: 0,
      page0RequiredRepair: false,
      integrityState: fallbackLoad.integrityState,
    };
  }

  const requestRowsById = new Map<string, RequestFallbackRow>();
  for (const row of fallbackLoad.rows) {
    const requestId = String(row?.id ?? "").trim();
    if (requestId) requestRowsById.set(requestId, row);
  }

  const fallbackTruthByRequest = await loadReqHeadTruthByRequestIds(supabase, missingRequestIds);
  const unresolvedRequestIds = missingRequestIds.filter((requestId) => !fallbackTruthByRequest[requestId]);
  const fallbackItemsResult = await fetchWarehouseRequestItemsFallbackRows(supabase, unresolvedRequestIds);
  const fallbackStats: Record<string, { items: number; qty: number; done: number; rejected: number }> = {};
  for (const requestId of unresolvedRequestIds) {
    fallbackStats[requestId] = { items: 0, qty: 0, done: 0, rejected: 0 };
  }

  if (!fallbackItemsResult.error && Array.isArray(fallbackItemsResult.data)) {
    for (const item of fallbackItemsResult.data as UnknownRow[]) {
      const requestId = String(item?.request_id ?? "").trim();
      if (!requestId || !fallbackStats[requestId]) continue;
      if (isRejectedRequestItemStatus(item?.status)) {
        fallbackStats[requestId].rejected += 1;
        continue;
      }
      fallbackStats[requestId].items += 1;
      fallbackStats[requestId].qty += Math.max(0, parseNum(item?.qty, 0));
      if (isIssuedRequestItemStatus(item?.status)) {
        fallbackStats[requestId].done += 1;
      }
    }
  }

  let directFallbackTruthByRequest: Record<string, ReqHeadTruth> = {};
  if (!fallbackItemsResult.error && Array.isArray(fallbackItemsResult.data) && fallbackItemsResult.data.length) {
    const normalizedFallbackRows = asUnknownRows(fallbackItemsResult.data).map(normalizeRequestItemFallbackRow);
    const stockAvailability = await loadFallbackStockAvailability(supabase, normalizedFallbackRows);
    const directFallbackRows = materializeFallbackReqItems(normalizedFallbackRows, stockAvailability);
    directFallbackTruthByRequest = aggregateReqItemUiRows(directFallbackRows);
  }

  const repairedRows = approvedRequests
    .filter((row) => !materializedRequestIds.has(row.request_id))
    .map((row) => {
      const requestRaw = requestRowsById.get(row.request_id) ?? null;
      const contextFromText = parseReqHeaderContext([
        String(requestRaw?.note ?? ""),
        String(requestRaw?.comment ?? ""),
      ]);
      const contractor =
        String(
          requestRaw?.contractor_name ??
            requestRaw?.contractor_org ??
            requestRaw?.subcontractor_name ??
            requestRaw?.subcontractor_org ??
            "",
        ).trim() || contextFromText.contractor || null;
      const phone =
        normalizePhone(
          String(
            requestRaw?.contractor_phone ??
              requestRaw?.subcontractor_phone ??
              requestRaw?.phone ??
              requestRaw?.phone_number ??
              "",
          ).trim(),
        ) ||
        normalizePhone(contextFromText.phone) ||
        null;
      const plannedVolume =
        String(
          requestRaw?.planned_volume ??
            requestRaw?.volume ??
            requestRaw?.qty_plan ??
            "",
        ).trim() || contextFromText.volume || null;
      const truth =
        fallbackTruthByRequest[row.request_id] ??
        directFallbackTruthByRequest[row.request_id] ??
        (() => {
          const stats = fallbackStats[row.request_id] ?? { items: 0, qty: 0, done: 0, rejected: 0 };
          const readyCount = Math.max(0, stats.items - stats.done - stats.rejected);
          return finalizeReqHeadTruth({
            items_cnt: stats.items,
            ready_cnt: readyCount,
            done_cnt: stats.done,
            qty_limit_sum: stats.qty,
            qty_issued_sum: 0,
            qty_left_sum: stats.qty,
            qty_can_issue_now_sum: 0,
            issuable_now_cnt: 0,
          });
        })();
      return applyReqHeadTruth(
        {
          request_id: row.request_id,
          display_no: row.display_no,
          object_name: row.object_name,
          level_code: row.level_code,
          system_code: row.system_code,
          zone_code: row.zone_code,
          level_name: row.level_name,
          system_name: row.system_name,
          zone_name: row.zone_name,
          contractor_name: contractor,
          contractor_phone: phone,
          planned_volume: plannedVolume,
          note: requestRaw?.note ?? null,
          comment: requestRaw?.comment ?? null,
          submitted_at: row.submitted_at,
          items_cnt: truth.items_cnt,
          ready_cnt: truth.ready_cnt,
          done_cnt: truth.done_cnt,
          qty_limit_sum: truth.qty_limit_sum,
          qty_issued_sum: truth.qty_issued_sum,
          qty_left_sum: truth.qty_left_sum,
          qty_can_issue_now_sum: truth.qty_can_issue_now_sum,
          issuable_now_cnt: truth.issuable_now_cnt,
          issue_status: truth.issue_status,
        },
        truth,
      );
    })
    .filter((row) => row.visible_in_expense_queue);

  const mergedRows = repairedRows.length
    ? [...sortedViewRows, ...repairedRows].sort(compareWarehouseReqHeads)
    : sortedViewRows;

  return {
    rows: mergedRows,
    fallbackMissingIdsCount: missingRequestIds.length,
    page0RequiredRepair: missingRequestIds.length > 0,
    integrityState: fallbackLoad.integrityState,
  };
}
