import type { RequestLookupRow } from "../../lib/api/director_reports.shared";
import { normalizeRuText } from "../../lib/text/encoding";
import type { ReqHeadRow, ReqItemUiRow } from "./warehouse.types";
import { normMatCode, normUomId, parseNum } from "./warehouse.request.utils";

export type UnknownRow = Record<string, unknown>;

export type RequestItemFallbackRow = {
  request_id: string;
  request_item_id: string;
  rik_code: string | null;
  name_human: string | null;
  uom: string | null;
  qty: number;
  status: string | null;
  note: string | null;
};

export type StockAvailabilityMap = {
  byCode: Record<string, number>;
  byCodeUom: Record<string, number>;
};

export type ReqHeadTruth = {
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

type ReqHeadQueueState = {
  visible_in_expense_queue: boolean;
  can_issue_now: boolean;
  waiting_stock: boolean;
  all_done: boolean;
};

const parseDisplayNo = (raw: unknown): { year: number; seq: number } => {
  const normalized = String(raw ?? "").trim();
  const match = normalized.match(/(\d+)\s*\/\s*(\d{4})/);
  if (!match) return { year: 0, seq: 0 };
  return {
    seq: Number(match[1] ?? 0) || 0,
    year: Number(match[2] ?? 0) || 0,
  };
};

export const toWarehouseTextOrNull = (value: unknown): string | null => {
  const normalized = String(value ?? "").trim();
  return normalized || null;
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

export const isWarehouseRejectedRequestItemStatus = (value: unknown): boolean => {
  const status = normalizeRequestItemStatus(value);
  return status.includes("отклон") || status.includes("reject");
};

export const isWarehouseIssuedRequestItemStatus = (value: unknown): boolean => {
  const status = normalizeRequestItemStatus(value);
  return status.includes("выдан") || status === "done";
};

export const normalizeWarehouseRequestItemFallbackRow = (row: UnknownRow): RequestItemFallbackRow => ({
  request_id: String(row.request_id ?? "").trim(),
  request_item_id: String(row.id ?? row.request_item_id ?? "").trim(),
  rik_code: toWarehouseTextOrNull(row.rik_code),
  name_human: toWarehouseTextOrNull(row.name_human),
  uom: toWarehouseTextOrNull(row.uom),
  qty: Math.max(0, parseNum(row.qty, 0)),
  status: toWarehouseTextOrNull(row.status),
  note: toWarehouseTextOrNull(row.note),
});

export const buildWarehouseStockAvailabilityCodeKey = (raw: unknown): string =>
  String(normMatCode(raw ?? "")).trim().toUpperCase();

export const buildWarehouseStockAvailabilityCodeUomKey = (
  rawCode: unknown,
  rawUom: unknown,
): string => {
  const code = buildWarehouseStockAvailabilityCodeKey(rawCode);
  const uom = String(normUomId(rawUom ?? "") ?? "")
    .trim()
    .toLowerCase();
  return `${code}::${uom || "-"}`;
};

export const finalizeWarehouseReqHeadTruth = (
  agg: Omit<ReqHeadTruth, "issue_status">,
): ReqHeadTruth => {
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

const deriveWarehouseReqHeadQueueState = (
  row: Pick<ReqHeadRow, "qty_left_sum" | "qty_can_issue_now_sum" | "issue_status">,
): ReqHeadQueueState => {
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

export const applyWarehouseReqHeadQueueState = (row: ReqHeadRow): ReqHeadRow => ({
  ...row,
  ...deriveWarehouseReqHeadQueueState(row),
});

export const applyWarehouseReqHeadTruth = (
  row: ReqHeadRow,
  truth?: ReqHeadTruth,
): ReqHeadRow => {
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
  return applyWarehouseReqHeadQueueState(next);
};

export const aggregateWarehouseReqItemTruthRows = (
  rows: UnknownRow[],
): Record<string, ReqHeadTruth> => {
  const byRequestId: Record<
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
    if (!byRequestId[requestId]) byRequestId[requestId] = {};

    const previous = byRequestId[requestId][requestItemId];
    const next = {
      qty_limit: parseNum(row?.qty_limit, 0),
      qty_issued: parseNum(row?.qty_issued, 0),
      qty_left: parseNum(row?.qty_left, 0),
      qty_can_issue_now: parseNum(row?.qty_can_issue_now, 0),
    };

    if (!previous) {
      byRequestId[requestId][requestItemId] = next;
      continue;
    }

    byRequestId[requestId][requestItemId] = {
      qty_limit: Math.max(previous.qty_limit, next.qty_limit),
      qty_issued: Math.max(previous.qty_issued, next.qty_issued),
      qty_left: Math.max(previous.qty_left, next.qty_left),
      qty_can_issue_now: Math.max(previous.qty_can_issue_now, next.qty_can_issue_now),
    };
  }

  const out: Record<string, ReqHeadTruth> = {};
  for (const [requestId, itemMap] of Object.entries(byRequestId)) {
    const agg = Object.values(itemMap).reduce(
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
    out[requestId] = finalizeWarehouseReqHeadTruth(agg);
  }

  return out;
};

export const aggregateWarehouseReqItemUiRows = (
  rows: ReqItemUiRow[],
): Record<string, ReqHeadTruth> =>
  aggregateWarehouseReqItemTruthRows(
    rows.map((row) => ({
      request_id: row.request_id,
      request_item_id: row.request_item_id,
      qty_limit: row.qty_limit,
      qty_issued: row.qty_issued,
      qty_left: row.qty_left,
      qty_can_issue_now: row.qty_can_issue_now,
    })),
  );

export const materializeWarehouseFallbackReqItems = (
  rows: RequestItemFallbackRow[],
  stockAvailability: StockAvailabilityMap,
): ReqItemUiRow[] => {
  const remainingByCode = { ...stockAvailability.byCode };
  const remainingByCodeUom = { ...stockAvailability.byCodeUom };

  return rows
    .filter((row) => !isWarehouseRejectedRequestItemStatus(row.status))
    .sort((left, right) => {
      const requestCompare = String(left.request_id ?? "").localeCompare(String(right.request_id ?? ""));
      if (requestCompare !== 0) return requestCompare;
      const nameCompare = String(left.name_human ?? "").localeCompare(String(right.name_human ?? ""));
      if (nameCompare !== 0) return nameCompare;
      return String(left.request_item_id ?? "").localeCompare(String(right.request_item_id ?? ""));
    })
    .map((row) => {
      const qtyLimit = Math.max(0, row.qty);
      const qtyIssued = isWarehouseIssuedRequestItemStatus(row.status) ? qtyLimit : 0;
      const qtyLeft = Math.max(0, qtyLimit - qtyIssued);
      const codeKey = buildWarehouseStockAvailabilityCodeKey(row.rik_code);
      const codeUomKey = buildWarehouseStockAvailabilityCodeUomKey(row.rik_code, row.uom);
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
};

export const toWarehouseBaseReqHeadTruth = (request: RequestLookupRow): ReqHeadTruth =>
  finalizeWarehouseReqHeadTruth({
    items_cnt: Math.max(0, Number(request.item_count_active ?? request.item_count_total ?? 0)),
    ready_cnt: Math.max(0, Number(request.item_count_active ?? request.item_count_total ?? 0)),
    done_cnt: 0,
    qty_limit_sum: Math.max(0, Number(request.item_qty_active ?? request.item_qty_total ?? 0)),
    qty_issued_sum: 0,
    qty_left_sum: Math.max(0, Number(request.item_qty_active ?? request.item_qty_total ?? 0)),
    qty_can_issue_now_sum: 0,
    issuable_now_cnt: 0,
  });

export const mapWarehouseCanonicalRequestToReqHeadRow = (
  request: RequestLookupRow,
): ReqHeadRow => {
  const baseTruth = toWarehouseBaseReqHeadTruth(request);
  return applyWarehouseReqHeadTruth(
    {
      request_id: request.id,
      request_no: toWarehouseTextOrNull(request.request_no),
      display_no: toWarehouseTextOrNull(request.request_no) ?? toWarehouseTextOrNull(request.display_no),
      request_status: toWarehouseTextOrNull(request.status),
      object_id: toWarehouseTextOrNull(request.object_id),
      object_name:
        toWarehouseTextOrNull(request.object_name) ??
        toWarehouseTextOrNull(request.object) ??
        toWarehouseTextOrNull(request.object_type_code),
      level_code: toWarehouseTextOrNull(request.level_code),
      system_code: toWarehouseTextOrNull(request.system_code),
      zone_code: toWarehouseTextOrNull(request.zone_code),
      level_name: null,
      system_name: null,
      zone_name: null,
      contractor_name: null,
      contractor_phone: null,
      planned_volume: null,
      note: toWarehouseTextOrNull(request.note),
      comment: toWarehouseTextOrNull(request.comment),
      submitted_at: toWarehouseTextOrNull(request.submitted_at) ?? toWarehouseTextOrNull(request.created_at),
      items_cnt: baseTruth.items_cnt,
      ready_cnt: baseTruth.ready_cnt,
      done_cnt: baseTruth.done_cnt,
      qty_limit_sum: baseTruth.qty_limit_sum,
      qty_issued_sum: baseTruth.qty_issued_sum,
      qty_left_sum: baseTruth.qty_left_sum,
      qty_can_issue_now_sum: baseTruth.qty_can_issue_now_sum,
      issuable_now_cnt: baseTruth.issuable_now_cnt,
      issue_status: baseTruth.issue_status,
    },
    baseTruth,
  );
};
