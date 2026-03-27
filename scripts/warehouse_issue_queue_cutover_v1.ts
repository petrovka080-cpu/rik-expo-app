import fs from "node:fs";
import path from "node:path";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config as loadDotenv } from "dotenv";

import { normalizeRuText } from "../src/lib/text/encoding";

type UnknownRow = Record<string, unknown>;

type ReqHeadRow = {
  request_id: string;
  display_no: string | null;
  object_name: string | null;
  level_code: string | null;
  system_code: string | null;
  zone_code: string | null;
  level_name?: string | null;
  system_name?: string | null;
  zone_name?: string | null;
  contractor_name?: string | null;
  contractor_phone?: string | null;
  planned_volume?: string | null;
  note?: string | null;
  comment?: string | null;
  submitted_at: string | null;
  items_cnt: number;
  ready_cnt: number;
  done_cnt: number;
  qty_limit_sum: number;
  qty_issued_sum: number;
  qty_left_sum: number;
  qty_can_issue_now_sum?: number;
  issuable_now_cnt?: number;
  issue_status: "READY" | "WAITING_STOCK" | "PARTIAL" | "DONE" | string;
  visible_in_expense_queue?: boolean;
  can_issue_now?: boolean;
  waiting_stock?: boolean;
  all_done?: boolean;
};

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

type StockAvailabilityMap = {
  byCode: Record<string, number>;
  byCodeUom: Record<string, number>;
};

const projectRoot = process.cwd();
for (const file of [".env.local", ".env"]) {
  const full = path.join(projectRoot, file);
  if (fs.existsSync(full)) loadDotenv({ path: full, override: false });
}

const supabaseUrl = String(process.env.EXPO_PUBLIC_SUPABASE_URL ?? "").trim();
const supabaseKey = String(
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "",
).trim();
if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY/EXPO_PUBLIC_SUPABASE_ANON_KEY");
}

const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { headers: { "x-client-info": "warehouse-issue-queue-cutover-v1" } },
});

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

const writeArtifact = (relativePath: string, payload: unknown) => {
  const full = path.join(projectRoot, relativePath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, `${JSON.stringify(payload, null, 2)}\n`);
};

const readArtifactIfExists = (relativePath: string): Record<string, unknown> | null => {
  const full = path.join(projectRoot, relativePath);
  if (!fs.existsSync(full)) return null;
  return JSON.parse(fs.readFileSync(full, "utf8")) as Record<string, unknown>;
};

const toTextOrNull = (value: unknown): string | null => {
  const text = String(value ?? "").trim();
  return text || null;
};

const parseNum = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeStatusToken = (raw: unknown): string =>
  String(normalizeRuText(String(raw ?? "")) ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

const isRequestVisibleInWarehouseIssueQueue = (raw: unknown): boolean => {
  const s = normalizeStatusToken(raw);
  if (!s) return false;
  if (
    s.includes("на утверждении") ||
    s.includes("pending") ||
    s.includes("чернов") ||
    s.includes("draft") ||
    s.includes("отклон") ||
    s.includes("reject") ||
    s.includes("закрыт") ||
    s.includes("closed")
  ) {
    return false;
  }
  return true;
};

const normalizeRequestItemStatus = (value: unknown): string =>
  String(normalizeRuText(String(value ?? "")) ?? "")
    .trim()
    .toLowerCase();

const isRejectedRequestItemStatus = (value: unknown): boolean => {
  const status = normalizeRequestItemStatus(value);
  return status.includes("отклон") || status.includes("reject");
};

const isIssuedRequestItemStatus = (value: unknown): boolean => {
  const status = normalizeRequestItemStatus(value);
  return status.includes("выдан") || status === "done";
};

const parseDisplayNo = (raw: unknown): { year: number; seq: number } => {
  const text = String(raw ?? "").trim();
  const match = text.match(/(\d+)\s*\/\s*(\d{4})/);
  if (!match) return { year: 0, seq: 0 };
  return {
    seq: Number(match[1] ?? 0) || 0,
    year: Number(match[2] ?? 0) || 0,
  };
};

const reqHeadSort = (left: ReqHeadRow, right: ReqHeadRow): number => {
  const leftTime = left.submitted_at ? new Date(left.submitted_at).getTime() : 0;
  const rightTime = right.submitted_at ? new Date(right.submitted_at).getTime() : 0;
  if (rightTime !== leftTime) return rightTime - leftTime;

  const leftDisplay = parseDisplayNo(left.display_no);
  const rightDisplay = parseDisplayNo(right.display_no);
  if (rightDisplay.year !== leftDisplay.year) return rightDisplay.year - leftDisplay.year;
  if (rightDisplay.seq !== leftDisplay.seq) return rightDisplay.seq - leftDisplay.seq;
  return String(right.request_id ?? "").localeCompare(String(left.request_id ?? ""));
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

const applyReqHeadQueueState = (row: ReqHeadRow): ReqHeadRow => {
  const qtyLeft = Math.max(0, parseNum(row.qty_left_sum, 0));
  const qtyCanIssueNow = Math.max(0, parseNum(row.qty_can_issue_now_sum, 0));
  const allDone = String(row.issue_status ?? "").trim().toUpperCase() === "DONE" || qtyLeft <= 0;
  const visibleInExpenseQueue = !allDone && qtyLeft > 0;
  return {
    ...row,
    visible_in_expense_queue: visibleInExpenseQueue,
    can_issue_now: visibleInExpenseQueue && qtyCanIssueNow > 0,
    waiting_stock: visibleInExpenseQueue && qtyCanIssueNow <= 0,
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
  return applyReqHeadQueueState(next);
};

const aggregateReqItemTruthRows = (rows: UnknownRow[]): Record<string, ReqHeadTruth> => {
  const byRequest: Record<
    string,
    Record<string, { qty_limit: number; qty_issued: number; qty_left: number; qty_can_issue_now: number }>
  > = {};

  for (const row of rows) {
    const requestId = String(row.request_id ?? "").trim();
    const requestItemId = String(row.request_item_id ?? "").trim();
    if (!requestId || !requestItemId) continue;
    if (!byRequest[requestId]) byRequest[requestId] = {};

    const prev = byRequest[requestId][requestItemId];
    const next = {
      qty_limit: parseNum(row.qty_limit, 0),
      qty_issued: parseNum(row.qty_issued, 0),
      qty_left: parseNum(row.qty_left, 0),
      qty_can_issue_now: parseNum(row.qty_can_issue_now, 0),
    };

    byRequest[requestId][requestItemId] = prev
      ? {
          qty_limit: Math.max(prev.qty_limit, next.qty_limit),
          qty_issued: Math.max(prev.qty_issued, next.qty_issued),
          qty_left: Math.max(prev.qty_left, next.qty_left),
          qty_can_issue_now: Math.max(prev.qty_can_issue_now, next.qty_can_issue_now),
        }
      : next;
  }

  const out: Record<string, ReqHeadTruth> = {};
  for (const [requestId, itemMap] of Object.entries(byRequest)) {
    const agg = Object.values(itemMap).reduce(
      (acc, item) => {
        const qtyLeft = Math.max(0, item.qty_left);
        const qtyCanIssueNow = Math.max(0, Math.min(qtyLeft, item.qty_can_issue_now));
        acc.items_cnt += 1;
        acc.ready_cnt += qtyLeft > 0 ? 1 : 0;
        acc.done_cnt += qtyLeft <= 0 && item.qty_limit > 0 ? 1 : 0;
        acc.qty_limit_sum += Math.max(0, item.qty_limit);
        acc.qty_issued_sum += Math.max(0, item.qty_issued);
        acc.qty_left_sum += qtyLeft;
        acc.qty_can_issue_now_sum += qtyCanIssueNow;
        acc.issuable_now_cnt += qtyLeft > 0 && qtyCanIssueNow > 0 ? 1 : 0;
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
    out[requestId] = finalizeReqHeadTruth(agg);
  }
  return out;
};

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

const buildStockAvailabilityCodeKey = (raw: unknown) =>
  String(raw ?? "").trim().toUpperCase();

const buildStockAvailabilityCodeUomKey = (rawCode: unknown, rawUom: unknown) => {
  const code = buildStockAvailabilityCodeKey(rawCode);
  const uom = String(rawUom ?? "").trim().toLowerCase();
  return `${code}::${uom || "-"}`;
};

const measure = async <T>(fn: () => Promise<T>) => {
  const startedAt = Date.now();
  const result = await fn();
  return { result, durationMs: Date.now() - startedAt };
};

const parseReqHeaderContext = (rawParts: (string | null | undefined)[]) => {
  const out = { contractor: "", phone: "", volume: "" };
  const contractorKeyRe = /(?:подряд|организац|contractor|organization|supplier)/i;
  const phoneKeyRe = /(?:тел|phone|tel)/i;
  const volumeKeyRe = /(?:об(?:ъ|ь)?(?:е|ё)?м|volume)/i;

  const cleanPhone = (value: string) => {
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

  for (const raw of rawParts) {
    const lines = String(raw || "")
      .split(/[\r\n;]+/)
      .map((value) => value.trim())
      .filter(Boolean);
    for (const line of lines) {
      const match = line.match(/^([^:]+)\s*:\s*(.+)$/);
      if (!match) continue;
      const key = String(match[1] || "").trim().toLowerCase();
      const value = String(match[2] || "").trim();
      if (!value) continue;
      if (!out.contractor && contractorKeyRe.test(key)) out.contractor = value;
      else if (!out.phone && phoneKeyRe.test(key)) out.phone = cleanPhone(value);
      else if (!out.volume && volumeKeyRe.test(key)) out.volume = value;
    }
  }
  return out;
};

const loadFallbackStockAvailability = async (
  client: SupabaseClient,
  rows: RequestItemFallbackRow[],
): Promise<StockAvailabilityMap> => {
  const codes = Array.from(
    new Set(rows.map((row) => buildStockAvailabilityCodeKey(row.rik_code)).filter(Boolean)),
  );
  if (!codes.length) return { byCode: {}, byCodeUom: {} };

  const query = await client
    .from("v_warehouse_stock")
    .select("rik_code, uom_id, qty_available")
    .in("rik_code", codes);

  if (query.error || !Array.isArray(query.data)) return { byCode: {}, byCodeUom: {} };

  const byCode: Record<string, number> = {};
  const byCodeUom: Record<string, number> = {};
  for (const row of query.data as UnknownRow[]) {
    const codeKey = buildStockAvailabilityCodeKey(row.rik_code);
    if (!codeKey) continue;
    const qty = Math.max(0, parseNum(row.qty_available, 0));
    byCode[codeKey] = (byCode[codeKey] ?? 0) + qty;
    const codeUomKey = buildStockAvailabilityCodeUomKey(row.rik_code, row.uom_id);
    byCodeUom[codeUomKey] = (byCodeUom[codeUomKey] ?? 0) + qty;
  }
  return { byCode, byCodeUom };
};

const materializeFallbackReqItems = (
  rows: RequestItemFallbackRow[],
  stockAvailability: StockAvailabilityMap,
): UnknownRow[] => {
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
        qty_limit: qtyLimit,
        qty_issued: qtyIssued,
        qty_left: qtyLeft,
        qty_can_issue_now: qtyCanIssueNow,
      };
    });
};

const loadReqHeadTruthByRequestIds = async (client: SupabaseClient, requestIds: string[]) => {
  const ids = Array.from(new Set(requestIds.map((value) => String(value ?? "").trim()).filter(Boolean)));
  if (!ids.length) return {};
  const query = await client
    .from("v_wh_issue_req_items_ui")
    .select("request_id, request_item_id, qty_limit, qty_issued, qty_left, qty_can_issue_now")
    .in("request_id", ids);
  if (query.error || !Array.isArray(query.data)) return {};
  return aggregateReqItemTruthRows(query.data as UnknownRow[]);
};

const mapReqHeadViewRow = (row: UnknownRow): ReqHeadRow => ({
  request_id: String(row.request_id ?? "").trim(),
  display_no: toTextOrNull(row.display_no),
  object_name: toTextOrNull(row.object_name),
  level_code: toTextOrNull(row.level_code),
  system_code: toTextOrNull(row.system_code),
  zone_code: toTextOrNull(row.zone_code),
  level_name: toTextOrNull(row.level_name),
  system_name: toTextOrNull(row.system_name),
  zone_name: toTextOrNull(row.zone_name),
  contractor_name: toTextOrNull(row.contractor_name ?? row.contractor_org ?? row.subcontractor_name),
  contractor_phone: toTextOrNull(row.contractor_phone ?? row.phone ?? row.phone_number),
  planned_volume: toTextOrNull(row.planned_volume ?? row.volume ?? row.qty_plan),
  note: toTextOrNull(row.note),
  comment: toTextOrNull(row.comment),
  submitted_at: toTextOrNull(row.submitted_at),
  items_cnt: Number(row.items_cnt ?? 0),
  ready_cnt: Number(row.ready_cnt ?? 0),
  done_cnt: Number(row.done_cnt ?? 0),
  qty_limit_sum: parseNum(row.qty_limit_sum, 0),
  qty_issued_sum: parseNum(row.qty_issued_sum, 0),
  qty_left_sum: parseNum(row.qty_left_sum, 0),
  qty_can_issue_now_sum: parseNum(row.qty_can_issue_now_sum, 0),
  issuable_now_cnt: parseNum(row.issuable_now_cnt, 0),
  issue_status: String(row.issue_status ?? "READY"),
});

const loadApprovedViewReqHeadsWindow = async (
  client: SupabaseClient,
  offset: number,
  limit: number,
): Promise<ReqHeadRow[]> => {
  const headQuery = await client
    .from("v_wh_issue_req_heads_ui")
    .select("*")
    .order("submitted_at", { ascending: false, nullsFirst: false })
    .order("display_no", { ascending: false })
    .order("request_id", { ascending: false })
    .range(offset, offset + limit - 1);

  if (headQuery.error || !Array.isArray(headQuery.data)) return [];
  const rows = (headQuery.data as UnknownRow[]).map(mapReqHeadViewRow).sort(reqHeadSort);
  if (!rows.length) return [];

  const requestIds = Array.from(new Set(rows.map((row) => row.request_id).filter(Boolean)));
  const statusQuery = await client
    .from("requests")
    .select("id, status")
    .in("id", requestIds);
  if (statusQuery.error || !Array.isArray(statusQuery.data)) return [];

  const statusById = new Map<string, string>();
  for (const row of statusQuery.data as UnknownRow[]) {
    const id = String(row.id ?? "").trim();
    if (!id) continue;
    statusById.set(id, String(row.status ?? ""));
  }

  const truthByRequest = await loadReqHeadTruthByRequestIds(client, requestIds);
  return rows
    .filter((row) => isRequestVisibleInWarehouseIssueQueue(statusById.get(row.request_id) ?? ""))
    .map((row) => applyReqHeadTruth(row, truthByRequest[row.request_id]))
    .filter((row) => row.visible_in_expense_queue)
    .sort(reqHeadSort);
};

const tryLoadRequestsFallbackRows = async (
  client: SupabaseClient,
  pageSize: number,
): Promise<RequestFallbackRow[]> => {
  const fetchBySelect = async (selectCols: string) =>
    client
      .from("requests")
      .select(selectCols)
      .order("submitted_at", { ascending: false, nullsFirst: false })
      .order("display_no", { ascending: false })
      .limit(Math.max(pageSize * 6, 600));

  for (const selectCols of REQUESTS_FALLBACK_SELECT_PLANS) {
    const result = await fetchBySelect(selectCols);
    if (!result.error && Array.isArray(result.data)) {
      return (result.data as unknown as UnknownRow[]).map(normalizeRequestFallbackRow);
    }
  }
  return [];
};

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

const loadLegacyReqHeadPage = async (
  client: SupabaseClient,
  page: number,
  pageSize: number,
): Promise<ReqHeadRow[]> => {
  const targetVisibleCount = Math.max(0, (page + 1) * pageSize);
  const viewChunkSize = Math.max(pageSize, 50);
  const maxWindowScans = 8;
  const visibleViewRows: ReqHeadRow[] = [];
  const materializedRequestIds = new Set<string>();

  for (let scan = 0; scan < maxWindowScans && visibleViewRows.length < targetVisibleCount; scan += 1) {
    const offset = scan * viewChunkSize;
    const windowRows = await loadApprovedViewReqHeadsWindow(client, offset, viewChunkSize);
    if (!windowRows.length) break;
    for (const row of windowRows) {
      const requestId = String(row.request_id ?? "").trim();
      if (!requestId || materializedRequestIds.has(requestId)) continue;
      materializedRequestIds.add(requestId);
      visibleViewRows.push(row);
    }
    if (windowRows.length < viewChunkSize) break;
  }

  let mergedRows = [...visibleViewRows].sort(reqHeadSort);
  if (page === 0) {
    const requestRows = await tryLoadRequestsFallbackRows(client, pageSize);
    if (requestRows.length) {
      const approvedRequests = requestRows
        .filter((row) => isRequestVisibleInWarehouseIssueQueue(row.status))
        .map((row) => ({
          request_id: String(row.id ?? "").trim(),
          display_no: row.display_no,
          object_name: row.object_name ?? row.object_type_code,
          level_name: row.level_name ?? row.level_code,
          system_name: row.system_name ?? row.system_code,
          zone_name: row.zone_name ?? row.zone_code,
          level_code: row.level_code,
          system_code: row.system_code,
          zone_code: row.zone_code,
          submitted_at: row.submitted_at ?? row.created_at,
        }))
        .filter((row) => row.request_id);

      const missingRequestIds = approvedRequests
        .map((row) => row.request_id)
        .filter((requestId) => !materializedRequestIds.has(requestId));

      if (missingRequestIds.length) {
        const requestRowsById = new Map<string, RequestFallbackRow>();
        for (const row of requestRows) {
          const requestId = String(row.id ?? "").trim();
          if (requestId) requestRowsById.set(requestId, row);
        }

        const fallbackTruthByReq = await loadReqHeadTruthByRequestIds(client, missingRequestIds);
        const fallbackItemStatsQuery = await client
          .from("request_items")
          .select("id, request_id, rik_code, name_human, uom, status, qty, note")
          .in("request_id", missingRequestIds);

        const stat: Record<string, { items: number; qty: number; done: number; rejected: number }> = {};
        for (const requestId of missingRequestIds) {
          stat[requestId] = { items: 0, qty: 0, done: 0, rejected: 0 };
        }

        const fallbackItemRows = Array.isArray(fallbackItemStatsQuery.data)
          ? (fallbackItemStatsQuery.data as UnknownRow[])
          : [];

        for (const row of fallbackItemRows) {
          const requestId = String(row.request_id ?? "").trim();
          if (!requestId || !stat[requestId]) continue;
          if (isRejectedRequestItemStatus(row.status)) {
            stat[requestId].rejected += 1;
            continue;
          }
          stat[requestId].items += 1;
          stat[requestId].qty += Math.max(0, parseNum(row.qty, 0));
          if (isIssuedRequestItemStatus(row.status)) stat[requestId].done += 1;
        }

        let directFallbackTruthByReq: Record<string, ReqHeadTruth> = {};
        if (!fallbackItemStatsQuery.error && fallbackItemRows.length) {
          const normalizedFallbackRows = fallbackItemRows.map(normalizeRequestItemFallbackRow);
          const stockAvailability = await loadFallbackStockAvailability(client, normalizedFallbackRows);
          const directFallbackRows = materializeFallbackReqItems(normalizedFallbackRows, stockAvailability);
          directFallbackTruthByReq = aggregateReqItemTruthRows(directFallbackRows);
        }

        const fallbackRows = approvedRequests
          .filter((row) => !materializedRequestIds.has(row.request_id))
          .map((row) => {
            const requestRaw = requestRowsById.get(row.request_id) ?? null;
            const fromRequestText = parseReqHeaderContext([
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
              ).trim() ||
              fromRequestText.contractor ||
              null;
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
              normalizePhone(fromRequestText.phone) ||
              null;
            const plannedVolume =
              String(
                requestRaw?.planned_volume ??
                  requestRaw?.volume ??
                  requestRaw?.qty_plan ??
                  "",
              ).trim() ||
              fromRequestText.volume ||
              null;
            const truth =
              fallbackTruthByReq[row.request_id] ??
              directFallbackTruthByReq[row.request_id] ??
              (() => {
                const current = stat[row.request_id] ?? { items: 0, qty: 0, done: 0, rejected: 0 };
                const readyCount = Math.max(0, current.items - current.done - current.rejected);
                return finalizeReqHeadTruth({
                  items_cnt: current.items,
                  ready_cnt: readyCount,
                  done_cnt: current.done,
                  qty_limit_sum: current.qty,
                  qty_issued_sum: 0,
                  qty_left_sum: current.qty,
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

        if (fallbackRows.length) {
          mergedRows = [...mergedRows, ...fallbackRows].sort(reqHeadSort);
        }
      }
    }
  }

  return mergedRows.slice(page * pageSize, (page + 1) * pageSize);
};

const loadRpcReqHeadPage = async (
  client: SupabaseClient,
  page: number,
  pageSize: number,
): Promise<{ rows: ReqHeadRow[]; total: number | null; repairedMissingIdsCount: number }> => {
  const { data, error } = await client.rpc("warehouse_issue_queue_scope_v4", {
    p_offset: page * pageSize,
    p_limit: pageSize,
  });
  if (error) throw error;
  const root = data && typeof data === "object" && !Array.isArray(data) ? (data as UnknownRow) : {};
  const meta = root.meta && typeof root.meta === "object" ? (root.meta as UnknownRow) : {};
  const rows = Array.isArray(root.rows)
    ? (root.rows as UnknownRow[]).map(mapReqHeadViewRow).map(applyReqHeadQueueState)
    : [];
  return {
    rows,
    total: Number.isFinite(Number(meta.total)) ? Number(meta.total) : null,
    repairedMissingIdsCount: Number.isFinite(Number(meta.repaired_missing_ids_count))
      ? Number(meta.repaired_missing_ids_count)
      : 0,
  };
};

const buildReqHeadSignature = (row: ReqHeadRow) =>
  [
    row.request_id,
    row.display_no ?? "",
    row.object_name ?? "",
    row.level_code ?? "",
    row.system_code ?? "",
    row.zone_code ?? "",
    row.level_name ?? "",
    row.system_name ?? "",
    row.zone_name ?? "",
    row.contractor_name ?? "",
    row.contractor_phone ?? "",
    row.planned_volume ?? "",
    row.note ?? "",
    row.comment ?? "",
    row.submitted_at ?? "",
    row.items_cnt,
    row.ready_cnt,
    row.done_cnt,
    row.qty_limit_sum,
    row.qty_issued_sum,
    row.qty_left_sum,
    row.qty_can_issue_now_sum ?? 0,
    row.issuable_now_cnt ?? 0,
    row.issue_status,
    row.visible_in_expense_queue ? 1 : 0,
    row.can_issue_now ? 1 : 0,
    row.waiting_stock ? 1 : 0,
    row.all_done ? 1 : 0,
  ].join("|");

async function main() {
  const pageSize = 20;

  const legacyPage0 = await measure(() => loadLegacyReqHeadPage(supabase, 0, pageSize));
  const legacyPage1 = await measure(() => loadLegacyReqHeadPage(supabase, 1, pageSize));
  const rpcPage0 = await measure(() => loadRpcReqHeadPage(supabase, 0, pageSize));
  const rpcPage1 = await measure(() => loadRpcReqHeadPage(supabase, 1, pageSize));
  const primary = await measure(() => loadRpcReqHeadPage(supabase, 0, pageSize));

  const page0LegacySignatures = legacyPage0.result.map(buildReqHeadSignature);
  const page0RpcSignatures = rpcPage0.result.rows.map(buildReqHeadSignature);
  const page1LegacySignatures = legacyPage1.result.map(buildReqHeadSignature);
  const page1RpcSignatures = rpcPage1.result.rows.map(buildReqHeadSignature);
  const page0LegacyIds = legacyPage0.result.map((row) => row.request_id);
  const page0RpcIds = rpcPage0.result.rows.map((row) => row.request_id);
  const page1LegacyIds = legacyPage1.result.map((row) => row.request_id);
  const page1RpcIds = rpcPage1.result.rows.map((row) => row.request_id);

  const page0ParityOk =
    page0LegacySignatures.length === page0RpcSignatures.length &&
    page0LegacySignatures.every((signature, index) => signature === page0RpcSignatures[index]);
  const page1ParityOk =
    page1LegacySignatures.length === page1RpcSignatures.length &&
    page1LegacySignatures.every((signature, index) => signature === page1RpcSignatures[index]);

  const viewHeadQuery = await supabase
    .from("v_wh_issue_req_heads_ui")
    .select("request_id")
    .order("submitted_at", { ascending: false, nullsFirst: false })
    .order("display_no", { ascending: false })
    .order("request_id", { ascending: false })
    .limit(500);
  const headViewIds = new Set(
    (Array.isArray(viewHeadQuery.data) ? (viewHeadQuery.data as UnknownRow[]) : [])
      .map((row) => String(row.request_id ?? "").trim())
      .filter(Boolean),
  );
  const rpcMissingFromViewPage0 = rpcPage0.result.rows
    .filter((row) => !headViewIds.has(row.request_id))
    .map((row) => ({ request_id: row.request_id, display_no: row.display_no }));

  const rowParityOk =
    legacyPage0.result.length === rpcPage0.result.rows.length &&
    legacyPage1.result.length === rpcPage1.result.rows.length;
  const orderParityOk =
    page0LegacyIds.length === page0RpcIds.length &&
    page0LegacyIds.every((requestId, index) => requestId === page0RpcIds[index]) &&
    page1LegacyIds.length === page1RpcIds.length &&
    page1LegacyIds.every((requestId, index) => requestId === page1RpcIds[index]);
  const statusParityOk =
    legacyPage0.result.every(
      (row, index) => row.issue_status === rpcPage0.result.rows[index]?.issue_status,
    ) &&
    legacyPage1.result.every(
      (row, index) => row.issue_status === rpcPage1.result.rows[index]?.issue_status,
    );
  const qtyParityOk =
    legacyPage0.result.every(
      (row, index) =>
        row.qty_limit_sum === rpcPage0.result.rows[index]?.qty_limit_sum &&
        row.qty_issued_sum === rpcPage0.result.rows[index]?.qty_issued_sum &&
        row.qty_left_sum === rpcPage0.result.rows[index]?.qty_left_sum &&
        (row.qty_can_issue_now_sum ?? 0) === (rpcPage0.result.rows[index]?.qty_can_issue_now_sum ?? 0),
    ) &&
    legacyPage1.result.every(
      (row, index) =>
        row.qty_limit_sum === rpcPage1.result.rows[index]?.qty_limit_sum &&
        row.qty_issued_sum === rpcPage1.result.rows[index]?.qty_issued_sum &&
        row.qty_left_sum === rpcPage1.result.rows[index]?.qty_left_sum &&
        (row.qty_can_issue_now_sum ?? 0) === (rpcPage1.result.rows[index]?.qty_can_issue_now_sum ?? 0),
    );
  const runtimeSummary = readArtifactIfExists("artifacts/warehouse-issue-queue-runtime.summary.json");
  const webPassed = runtimeSummary?.webPassed === true;
  const androidPassed = runtimeSummary?.androidPassed === true;
  const iosPassed = runtimeSummary?.iosPassed === true;
  const runtimeVerified = runtimeSummary?.runtimeVerified === true;
  const platformSpecificIssues = Array.isArray(runtimeSummary?.platformSpecificIssues)
    ? (runtimeSummary?.platformSpecificIssues as unknown[]).map((value) => {
        if (value && typeof value === "object" && "issue" in (value as Record<string, unknown>)) {
          return String((value as Record<string, unknown>).issue ?? "");
        }
        return String(value ?? "");
      }).filter(Boolean)
    : [];
  const parityOk = page0ParityOk && page1ParityOk && rowParityOk && orderParityOk && statusParityOk && qtyParityOk;

  const artifact = {
    status: parityOk && runtimeVerified ? "passed" : "failed",
    gate: parityOk && runtimeVerified ? "GREEN" : "NOT_GREEN",
    primaryOwner: "rpc_scope_v4",
    fallbackUsed: false,
    legacyDurationMs: legacyPage0.durationMs,
    primaryDurationMs: primary.durationMs,
    rowParityOk,
    orderParityOk,
    statusParityOk,
    qtyParityOk,
    webPassed,
    androidPassed,
    iosPassed,
    runtimeVerified,
    windowReady: rpcPage0.result.total !== null,
    currentExpectedRowVolume: rpcPage0.result.total,
    platformSpecificIssues,
    legacy: {
      pageSize,
      sourceMeta: {
        primaryOwner: "legacy_converged",
        fallbackUsed: true,
        sourceKind: "converged:req_heads",
      },
      page0DurationMs: legacyPage0.durationMs,
      page1DurationMs: legacyPage1.durationMs,
      page0RowCount: legacyPage0.result.length,
      page1RowCount: legacyPage1.result.length,
      page0RequestIds: legacyPage0.result.map((row) => row.request_id),
      page1RequestIds: legacyPage1.result.map((row) => row.request_id),
      page0Rows: legacyPage0.result,
      page1Rows: legacyPage1.result,
    },
    rpc: {
      pageSize,
      sourceMeta: {
        primaryOwner: "rpc_scope_v4",
        fallbackUsed: false,
        sourceKind: "rpc:warehouse_issue_queue_scope_v4",
      },
      page0DurationMs: rpcPage0.durationMs,
      page1DurationMs: rpcPage1.durationMs,
      primaryDurationMs: primary.durationMs,
      page0RowCount: rpcPage0.result.rows.length,
      page1RowCount: rpcPage1.result.rows.length,
      totalRowCount: rpcPage0.result.total,
      repairedMissingIdsCount: rpcPage0.result.repairedMissingIdsCount,
      page0RequestIds: rpcPage0.result.rows.map((row) => row.request_id),
      page1RequestIds: rpcPage1.result.rows.map((row) => row.request_id),
      page0Rows: rpcPage0.result.rows,
      page1Rows: rpcPage1.result.rows,
      missingFromViewVisiblePage0: rpcMissingFromViewPage0,
    },
    parity: {
      page0ParityOk,
      page1ParityOk,
      rowParityOk,
      orderParityOk,
      statusParityOk,
      qtyParityOk,
      page0LegacyCount: legacyPage0.result.length,
      page0RpcCount: rpcPage0.result.rows.length,
      page1LegacyCount: legacyPage1.result.length,
      page1RpcCount: rpcPage1.result.rows.length,
    },
    runtime: runtimeSummary ?? {
      webPassed,
      androidPassed,
      iosPassed,
      runtimeVerified,
      platformSpecificIssues,
    },
  };

  writeArtifact("artifacts/warehouse-issue-queue-cutover-v1.json", artifact);
  writeArtifact("artifacts/warehouse-issue-queue-cutover-v1.summary.json", {
    status: artifact.status,
    gate: artifact.gate,
    primaryOwner: artifact.primaryOwner,
    fallbackUsed: artifact.fallbackUsed,
    legacyDurationMs: artifact.legacyDurationMs,
    primaryDurationMs: artifact.primaryDurationMs,
    rowParityOk: artifact.rowParityOk,
    orderParityOk: artifact.orderParityOk,
    statusParityOk: artifact.statusParityOk,
    qtyParityOk: artifact.qtyParityOk,
    webPassed: artifact.webPassed,
    androidPassed: artifact.androidPassed,
    iosPassed: artifact.iosPassed,
    runtimeVerified: artifact.runtimeVerified,
    windowReady: artifact.windowReady,
    currentExpectedRowVolume: artifact.currentExpectedRowVolume,
    platformSpecificIssues: artifact.platformSpecificIssues,
    legacy: artifact.legacy,
    rpc: artifact.rpc,
    parity: artifact.parity,
    runtime: artifact.runtime,
  });

  console.log(
    JSON.stringify(
      {
        status: artifact.status,
        gate: artifact.gate,
        primaryOwner: artifact.primaryOwner,
        fallbackUsed: artifact.fallbackUsed,
        legacyDurationMs: artifact.legacyDurationMs,
        primaryDurationMs: artifact.primaryDurationMs,
        rowParityOk,
        orderParityOk,
        statusParityOk,
        webPassed,
        androidPassed,
        iosPassed,
        runtimeVerified,
        repairedMissingIdsCount: artifact.rpc.repairedMissingIdsCount,
      },
      null,
      2,
    ),
  );
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
