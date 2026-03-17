// src/screens/warehouse/warehouse.api.ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { StockRow, ReqHeadRow, ReqItemUiRow } from "./warehouse.types";
import { nz, parseNum } from "./warehouse.utils";
import { normalizeRuText } from "../../lib/text/encoding";
import { isRequestDirectorApproved } from "../../lib/requestStatus";
import { fetchWarehouseNameMapUi } from "./warehouse.nameMap.ui";
import {
  asUnknownRows,
  fetchWarehouseIncomingLedgerRows,
  fetchWarehouseIncomingLineRows,
  fetchWarehouseIncomingReportRows,
  fetchWarehouseIssueLineRows,
  fetchWarehouseIssuedByObjectFastRows,
  fetchWarehouseIssuedMaterialsFastRows,
  fetchWarehouseReportsBundle,
  fetchWarehouseRequestItemNoteRows,
  fetchWarehouseRequestMetaRows,
  fetchWarehouseStockViewRows,
} from "./warehouse.api.repo";

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
type NameMapSource = "projection" | "overrides" | "rik_ru" | "ledger_ui";
type NameMapCacheValue = {
  available?: boolean;
  map: Record<string, string>;
};
type NameMapCacheEntry = {
  value: NameMapCacheValue | null;
  expiresAt: number;
  promise: Promise<NameMapCacheValue> | null;
};

const WAREHOUSE_STOCK_REFERENCE_TTL_MS = 5 * 60 * 1000;
const warehouseNameMapCache = new Map<string, NameMapCacheEntry>();

const logWarehouseApiFallback = (scope: string, error: unknown) => {
  if (__DEV__) {
    const message = error instanceof Error ? error.message : String(error ?? "unknown");
    console.warn(`[warehouse.api] ${scope}:`, message);
  }
};

const pickUom = (v: unknown): string | null => {
  const s = v == null ? "" : String(v).trim();
  return s !== "" ? s : null;
};

const looksLikeCode = (s: unknown) => {
  const x = String(s ?? "").trim().toUpperCase();
  return (
    x.startsWith("MAT-") ||
    x.startsWith("TOOL-") ||
    x.startsWith("WT-") ||
    x.startsWith("WORK-") ||
    x.startsWith("SRV-") ||
    x.startsWith("SERV-") ||
    x.startsWith("KIT-")
  );
};

const normDateArg = (s?: string | null): string | null => {
  const t = String(s ?? "").trim();
  return t ? t : null;
};

const toTextOrNull = (v: unknown): string | null => {
  const s = String(v ?? "").trim();
  return s || null;
};

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

const now = () => Date.now();

const normalizeCodeList = (codesUpper: string[]): string[] =>
  Array.from(new Set((codesUpper || []).map((x) => String(x ?? "").trim().toUpperCase()).filter(Boolean)));

const cloneNameMapValue = (value: NameMapCacheValue): NameMapCacheValue => ({
  available: value.available,
  map: { ...value.map },
});

const getNameMapCacheEntry = (key: string): NameMapCacheEntry => {
  let entry = warehouseNameMapCache.get(key);
  if (!entry) {
    entry = { value: null, expiresAt: 0, promise: null };
    warehouseNameMapCache.set(key, entry);
  }
  return entry;
};

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

type ReqHeadQueueState = {
  visible_in_expense_queue: boolean;
  can_issue_now: boolean;
  waiting_stock: boolean;
  all_done: boolean;
};

let requestsFallbackLastHardFailAt = 0;
let requestsFallbackLastSkipLogAt = 0;
const REQUESTS_FALLBACK_FAIL_COOLDOWN_MS = 30000;

async function tryLoadRequestsFallbackRows(
  supabase: SupabaseClient,
  pageSize: number,
): Promise<RequestFallbackRow[]> {
  const now = Date.now();
  if (
    requestsFallbackLastHardFailAt > 0 &&
    now - requestsFallbackLastHardFailAt < REQUESTS_FALLBACK_FAIL_COOLDOWN_MS
  ) {
    if (now - requestsFallbackLastSkipLogAt > 5000) {
      requestsFallbackLastSkipLogAt = now;
      console.warn("[warehouse.api] requests fallback select skipped by cooldown after repeated 400 failures");
    }
    return [];
  }

  const fetchBySelect = async (selectCols: string) =>
    supabase
      .from("requests")
      .select(selectCols)
      .order("submitted_at", { ascending: false, nullsFirst: false })
      .order("display_no", { ascending: false })
      .limit(Math.max(pageSize * 6, 600));

  // Fallback path only consumes a narrow request-head surface; keep it explicit to reduce drift/overfetch.
  const narrow = await fetchBySelect(REQUESTS_FALLBACK_SELECT);
  if (!narrow.error && Array.isArray(narrow.data)) {
    return asUnknownRows(narrow.data).map(normalizeRequestFallbackRow);
  }
  requestsFallbackLastHardFailAt = Date.now();
  const msg = String((narrow.error as { message?: string } | null)?.message ?? narrow.error ?? "unknown");
  if (__DEV__) {
    console.warn("[warehouse.api] requests fallback select failed:", msg);
  }

  return [];
}

const parseDisplayNo = (raw: unknown): { year: number; seq: number } => {
  const s = String(raw ?? "").trim();
  const m = s.match(/(\d+)\s*\/\s*(\d{4})/);
  if (!m) return { year: 0, seq: 0 };
  return { seq: Number(m[1] ?? 0) || 0, year: Number(m[2] ?? 0) || 0 };
};

const reqHeadSort = (a: ReqHeadRow, b: ReqHeadRow): number => {
  const ta = a?.submitted_at ? new Date(a.submitted_at).getTime() : 0;
  const tb = b?.submitted_at ? new Date(b.submitted_at).getTime() : 0;
  if (tb !== ta) return tb - ta;

  const pa = parseDisplayNo(a.display_no);
  const pb = parseDisplayNo(b.display_no);
  if (pb.year !== pa.year) return pb.year - pa.year;
  if (pb.seq !== pa.seq) return pb.seq - pa.seq;

  const ra = String(a?.request_id ?? "");
  const rb = String(b?.request_id ?? "");
  return rb.localeCompare(ra);
};

function finalizeReqHeadTruth(agg: Omit<ReqHeadTruth, "issue_status">): ReqHeadTruth {
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
}

function deriveReqHeadQueueState(row: Pick<
  ReqHeadRow,
  "qty_left_sum" | "qty_can_issue_now_sum" | "issue_status"
>): ReqHeadQueueState {
  const qtyLeft = Math.max(0, parseNum(row.qty_left_sum, 0));
  const qtyCanIssueNow = Math.max(0, parseNum(row.qty_can_issue_now_sum, 0));
  const all_done = String(row.issue_status ?? "").trim().toUpperCase() === "DONE" || qtyLeft <= 0;
  const visible_in_expense_queue = !all_done && qtyLeft > 0;
  const can_issue_now = visible_in_expense_queue && qtyCanIssueNow > 0;
  const waiting_stock = visible_in_expense_queue && !can_issue_now;
  return {
    visible_in_expense_queue,
    can_issue_now,
    waiting_stock,
    all_done,
  };
}

function applyReqHeadQueueState(row: ReqHeadRow): ReqHeadRow {
  return {
    ...row,
    ...deriveReqHeadQueueState(row),
  };
}

function applyReqHeadTruth(row: ReqHeadRow, truth?: ReqHeadTruth): ReqHeadRow {
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
}

function aggregateReqItemTruthRows(rows: UnknownRow[]): Record<string, ReqHeadTruth> {
  const byReq: Record<
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
    if (!byReq[requestId]) byReq[requestId] = {};

    const prev = byReq[requestId][requestItemId];
    const next = {
      qty_limit: parseNum(row?.qty_limit, 0),
      qty_issued: parseNum(row?.qty_issued, 0),
      qty_left: parseNum(row?.qty_left, 0),
      qty_can_issue_now: parseNum(row?.qty_can_issue_now, 0),
    };

    if (!prev) {
      byReq[requestId][requestItemId] = next;
      continue;
    }

    byReq[requestId][requestItemId] = {
      qty_limit: Math.max(prev.qty_limit, next.qty_limit),
      qty_issued: Math.max(prev.qty_issued, next.qty_issued),
      qty_left: Math.max(prev.qty_left, next.qty_left),
      qty_can_issue_now: Math.max(prev.qty_can_issue_now, next.qty_can_issue_now),
    };
  }

  const out: Record<string, ReqHeadTruth> = {};
  for (const [requestId, itemMap] of Object.entries(byReq)) {
    const items = Object.values(itemMap);
    const agg = items.reduce(
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
    out[requestId] = finalizeReqHeadTruth(agg);
  }

  return out;
}

async function loadReqHeadTruthByRequestIds(
  supabase: SupabaseClient,
  requestIds: string[],
): Promise<Record<string, ReqHeadTruth>> {
  const ids = Array.from(new Set(requestIds.map((x) => String(x || "").trim()).filter(Boolean)));
  if (!ids.length) return {};

  const q = await supabase
    .from("v_wh_issue_req_items_ui")
    .select("request_id, request_item_id, qty_limit, qty_issued, qty_left, qty_can_issue_now")
    .in("request_id", ids);

  if (q.error || !Array.isArray(q.data) || q.data.length === 0) return {};
  return aggregateReqItemTruthRows(q.data as UnknownRow[]);
}

async function loadApprovedViewReqHeadsWindow(
  supabase: SupabaseClient,
  offset: number,
  limit: number,
): Promise<ReqHeadRow[]> {
  const q = await supabase
    .from("v_wh_issue_req_heads_ui")
    .select("*")
    .order("submitted_at", { ascending: false, nullsFirst: false })
    .order("display_no", { ascending: false })
    .order("request_id", { ascending: false })
    .range(offset, offset + limit - 1);

  if (q.error || !Array.isArray(q.data) || q.data.length === 0) return [];

  const rows: ReqHeadRow[] = (q.data as UnknownRow[]).map((x) => ({
    request_id: String(x.request_id),
    display_no: toTextOrNull(x.display_no),
    object_name: toTextOrNull(x.object_name),
    level_code: toTextOrNull(x.level_code),
    system_code: toTextOrNull(x.system_code),
    zone_code: toTextOrNull(x.zone_code),
    level_name: toTextOrNull(x.level_name),
    system_name: toTextOrNull(x.system_name),
    zone_name: toTextOrNull(x.zone_name),
    contractor_name: toTextOrNull(x.contractor_name ?? x.contractor_org ?? x.subcontractor_name),
    contractor_phone: toTextOrNull(x.contractor_phone ?? x.phone ?? x.phone_number),
    planned_volume: toTextOrNull(x.planned_volume ?? x.volume ?? x.qty_plan),
    note: toTextOrNull(x.note),
    comment: toTextOrNull(x.comment),
    submitted_at: toTextOrNull(x.submitted_at),
    items_cnt: Number(x.items_cnt ?? 0),
    ready_cnt: Number(x.ready_cnt ?? 0),
    done_cnt: Number(x.done_cnt ?? 0),
    qty_limit_sum: parseNum(x.qty_limit_sum, 0),
    qty_issued_sum: parseNum(x.qty_issued_sum, 0),
    qty_left_sum: parseNum(x.qty_left_sum, 0),
    qty_can_issue_now_sum: parseNum(x.qty_can_issue_now_sum, 0),
    issuable_now_cnt: parseNum(x.issuable_now_cnt, 0),
    issue_status: String(x.issue_status ?? "READY"),
  }));

  rows.sort(reqHeadSort);

  const requestIds = Array.from(
    new Set(rows.map((r) => String(r.request_id ?? "").trim()).filter(Boolean)),
  );
  if (!requestIds.length) return [];

  const approvalStatusRows = await supabase
    .from("requests")
    .select("id, status")
    .in("id", requestIds);
  if (approvalStatusRows.error || !Array.isArray(approvalStatusRows.data)) return [];

  const approvedById = new Map<string, string>();
  for (const row of approvalStatusRows.data as UnknownRow[]) {
    const id = String(row?.id ?? "").trim();
    if (!id) continue;
    approvedById.set(id, String(row?.status ?? ""));
  }

  const approvedRows = rows.filter((row) =>
    isRequestDirectorApproved(approvedById.get(String(row.request_id ?? "").trim()) || ""),
  );
  if (!approvedRows.length) return [];

  const truthByReq = await loadReqHeadTruthByRequestIds(
    supabase,
    approvedRows.map((row) => row.request_id),
  );

  return approvedRows
    .map((row) => applyReqHeadTruth(row, truthByReq[String(row.request_id ?? "").trim()]))
    .filter((row) => row.visible_in_expense_queue);
}

function parseReqHeaderContext(rawParts: (string | null | undefined)[]) {
  const out: { contractor: string; phone: string; volume: string } = {
    contractor: "",
    phone: "",
    volume: "",
  };
  const cleanPhone = (v: string) => {
    const src = String(v || "").trim();
    if (!src) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(src)) return "";
    if (/^\d{4}[./]\d{2}[./]\d{2}$/.test(src)) return "";
    const m = src.match(/(\+?\d[\d\s()\-]{7,}\d)/);
    if (!m) return "";
    const candidate = String(m[1] || "").trim();
    const digits = candidate.replace(/[^\d]/g, "");
    if (digits.length < 9) return "";
    return candidate.replace(/\s+/g, "");
  };
  const put = (key: keyof typeof out, value: string) => {
    const v = String(value || "").trim();
    if (!v || out[key]) return;
    out[key] = v;
  };
  const contractorKeyRe =
    /(?:\u043f\u043e\u0434\u0440\u044f\u0434|\u043e\u0440\u0433\u0430\u043d\u0438\u0437\u0430\u0446|contractor|organization|supplier)/i;
  const phoneKeyRe = /(?:\u0442\u0435\u043b|phone|tel)/i;
  const volumeKeyRe = /(?:\u043e\u0431(?:\u044a|\u044c)?(?:\u0435|\u0451)?\u043c|volume)/i;
  for (const raw of rawParts) {
    const lines = String(raw || "")
      .split(/[\r\n;]+/)
      .map((x) => x.trim())
      .filter(Boolean);
    for (const ln of lines) {
      const m = ln.match(/^([^:]+)\s*:\s*(.+)$/);
      if (!m) continue;
      const k = String(m[1] || "").trim().toLowerCase();
      const v = String(m[2] || "").trim();
      if (!v) continue;
      if (!out.contractor && contractorKeyRe.test(k)) {
        put("contractor", v);
      } else if (!out.phone && phoneKeyRe.test(k)) {
        const ph = cleanPhone(v);
        if (ph) put("phone", ph);
      } else if (!out.volume && volumeKeyRe.test(k)) {
        put("volume", v);
      }
    }
  }
  return out;
}

async function enrichReqHeadsMeta(
  supabase: SupabaseClient,
  rows: ReqHeadRow[],
): Promise<ReqHeadRow[]> {
  const idsNeedMeta = rows
    .filter(
      (r) =>
        !String(r.contractor_name ?? "").trim() ||
        !String(r.contractor_phone ?? "").trim() ||
        !String(r.planned_volume ?? "").trim(),
    )
    .map((r) => String(r.request_id ?? "").trim())
    .filter(Boolean);

  if (!idsNeedMeta.length) return rows;

  const [reqQ, itemQ] = await Promise.all([
    fetchWarehouseRequestMetaRows(supabase, idsNeedMeta),
    fetchWarehouseRequestItemNoteRows(supabase, idsNeedMeta),
  ]);

  const reqById: Record<string, UnknownRow> = {};
  if (!reqQ.error && Array.isArray(reqQ.data)) {
    for (const r of reqQ.data as UnknownRow[]) {
      const id = String(r?.id ?? "").trim();
      if (id) reqById[id] = r;
    }
  }

  const itemNotesByReq: Record<string, string[]> = {};
  if (!itemQ.error && Array.isArray(itemQ.data)) {
    for (const it of itemQ.data as UnknownRow[]) {
      const rid = String(it?.request_id ?? "").trim();
      if (!rid) continue;
      const note = String(it?.note ?? "").trim();
      if (!note) continue;
      if (!itemNotesByReq[rid]) itemNotesByReq[rid] = [];
      itemNotesByReq[rid].push(note);
    }
  }

  const pickVal = (obj: UnknownRow | undefined, keys: string[]) => {
    for (const k of keys) {
      const v = String(obj?.[k] ?? "").trim();
      if (v) return v;
    }
    return "";
  };
  const normalizePhone = (v: string) => {
    const src = String(v || "").trim();
    if (!src) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(src)) return "";
    if (/^\d{4}[./]\d{2}[./]\d{2}$/.test(src)) return "";
    const m = src.match(/(\+?\d[\d\s()\-]{7,}\d)/);
    if (!m) return "";
    const candidate = String(m[1] || "").trim();
    const digits = candidate.replace(/[^\d]/g, "");
    if (digits.length < 9) return "";
    return candidate.replace(/\s+/g, "");
  };

  return rows.map((row) => {
    const rid = String(row.request_id ?? "").trim();
    const req = reqById[rid];
    if (!req) return row;

    const fromReqText = parseReqHeaderContext([
      String(req?.note ?? ""),
      String(req?.comment ?? ""),
    ]);
    const fromItemText = parseReqHeaderContext(itemNotesByReq[rid] ?? []);

    const contractor =
      pickVal(req, [
        "contractor_name",
        "contractor_org",
        "subcontractor_name",
        "subcontractor_org",
        "contractor",
        "supplier_name",
      ]) ||
      fromReqText.contractor ||
      fromItemText.contractor;
    const phone =
      pickVal(req, [
        "contractor_phone",
        "subcontractor_phone",
        "phone",
        "phone_number",
        "phone_no",
        "tel",
      ]) ||
      fromReqText.phone ||
      fromItemText.phone;
    const volume =
      pickVal(req, ["planned_volume", "qty_planned", "planned_qty", "volume", "qty_plan"]) ||
      fromReqText.volume ||
      fromItemText.volume;

    const rowPhone = normalizePhone(String(row.contractor_phone ?? ""));
    const derivedPhone = normalizePhone(phone);

    return {
      ...row,
      contractor_name: row.contractor_name ?? contractor ?? null,
      contractor_phone: rowPhone || derivedPhone || null,
      planned_volume: row.planned_volume ?? volume ?? null,
      note: row.note ?? toTextOrNull(req?.note),
      comment: row.comment ?? toTextOrNull(req?.comment),
    };
  });
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

    for (const r of q.data as UnknownRow[]) {
      const c = String(r.code ?? "").trim().toUpperCase();
      const nm = String(normalizeRuText(String(r.name_ru ?? ""))).trim();
      if (c && nm && !out[c]) out[c] = nm;
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

    for (const r of q.data as UnknownRow[]) {
      const c = String(r.code ?? "").trim().toUpperCase();
      const nm = String(normalizeRuText(String(r.name_ru ?? ""))).trim();
      if (c && nm && !out[c]) out[c] = nm;
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

    for (const r of q.data as UnknownRow[]) {
      const c = String(r.code ?? "").trim().toUpperCase();
      const nm = String(normalizeRuText(String(r.name ?? ""))).trim();
      if (c && nm && !out[c]) out[c] = nm;
    }
    return { value: { map: out }, cacheable: true };
  });
  return cached.map;
}

async function loadWarehouseProjectionNameMapUi(
  supabase: SupabaseClient,
  codesUpper: string[],
): Promise<{ available: boolean; map: Record<string, string> }> {
  const cached = await readWarehouseNameMapCached("projection", codesUpper, async () => {
    const codes = normalizeCodeList(codesUpper);
    if (!codes.length) return { value: { available: true, map: {} }, cacheable: true };
    const result = await fetchWarehouseNameMapUi(supabase, codes);
    return {
      value: { available: result.available, map: result.map },
      cacheable: result.available,
    };
  });
  return { available: cached.available === true, map: cached.map };
}

function pickStockDisplayName(params: {
  codeKey: string;
  projectionMap?: Record<string, string>;
  overMap?: Record<string, string>;
  rikMap?: Record<string, string>;
  uiMap?: Record<string, string>;
}): string {
  const { codeKey, projectionMap = {}, overMap = {}, rikMap = {}, uiMap = {} } = params;
  const nProjection = String(normalizeRuText(String(projectionMap[codeKey] ?? ""))).trim();
  const nOver = String(normalizeRuText(String(overMap[codeKey] ?? ""))).trim();
  const nRik = String(normalizeRuText(String(rikMap[codeKey] ?? ""))).trim();
  const nUi = String(normalizeRuText(String(uiMap[codeKey] ?? ""))).trim();

  return (
    (nProjection && !looksLikeCode(nProjection) ? nProjection : nProjection) ||
    (nOver && !looksLikeCode(nOver) ? nOver : nOver) ||
    (nRik && !looksLikeCode(nRik) ? nRik : nRik) ||
    (nUi && !looksLikeCode(nUi) ? nUi : "") ||
    "РІР‚вЂќ"
  );
}

function mapTruthRowsToStockRows(
  truthRows: UnknownRow[],
  maps: {
    projectionMap?: Record<string, string>;
    overMap?: Record<string, string>;
    rikMap?: Record<string, string>;
    uiMap?: Record<string, string>;
  },
): StockRow[] {
  return truthRows.map((x) => {
    const code = String(x.code ?? "").trim();
    const codeKey = code.toUpperCase();
    const uom = String(x.uom_id ?? "").trim();
    const avail = nz(x.qty_available, 0);
    const picked = pickStockDisplayName({
      codeKey,
      projectionMap: maps.projectionMap,
      overMap: maps.overMap,
      rikMap: maps.rikMap,
      uiMap: maps.uiMap,
    });

    return {
      material_id: `${code}::${uom}`,
      code: code || null,
      name: normalizeRuText(picked || "РІР‚вЂќ"),
      uom_id: pickUom(x.uom_id) ?? null,
      qty_on_hand: avail,
      qty_reserved: 0,
      qty_available: avail,
      updated_at: x.updated_at ?? null,
    } as StockRow;
  });
}

/**
 * РІСљвЂ¦ PROD stock
 * - qty: v_wh_balance_ledger_truth_ui (Р С‘РЎРѓРЎвЂљР С‘Р Р…Р В°)
 * - name: overrides -> v_rik_names_ru -> v_wh_balance_ledger_ui
 */
export async function apiFetchStock(
  supabase: SupabaseClient,
  offset: number = 0,
  limit: number = 400
): Promise<{
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
}> {
  try {
    const truth = await supabase
      .from("v_wh_balance_ledger_truth_ui")
      .select("code, uom_id, qty_available, updated_at")
      .order("code", { ascending: true })
      .range(offset, offset + limit - 1);

    if (!truth.error && Array.isArray(truth.data)) {
      const truthRows = truth.data as UnknownRow[];

      const codesUpper = truthRows
        .map((x) => String(x.code ?? "").trim().toUpperCase())
        .filter(Boolean);

      const projectionStartedAt = Date.now();
      const projection = await loadWarehouseProjectionNameMapUi(supabase, codesUpper);
      const projectionReadMs = Date.now() - projectionStartedAt;

      if (projection.available) {
        const missingProjectionCodes = codesUpper.filter((code) => !projection.map[code]);
        const fallbackStartedAt = Date.now();
        const [overMap, uiMap] =
          missingProjectionCodes.length > 0
            ? await Promise.all([
                loadNameMapOverrides(supabase, missingProjectionCodes),
                loadNameMapLedgerUi(supabase, missingProjectionCodes),
              ])
            : [{}, {}];
        const fallbackReadMs = missingProjectionCodes.length > 0 ? Date.now() - fallbackStartedAt : 0;

        const rows = mapTruthRowsToStockRows(truthRows, {
          projectionMap: projection.map,
          overMap,
          uiMap,
        });

        return {
          supported: true,
          rows,
          missingProjectionCodes,
          projectionAvailable: true,
          projectionHitCount: codesUpper.length - missingProjectionCodes.length,
          projectionMissCount: missingProjectionCodes.length,
          projectionReadMs,
          fallbackReadMs,
        };
      }

      // Legacy compatibility path until warehouse_name_map_ui is migrated in DB.
      const fallbackStartedAt = Date.now();
      const [overMap, uiMap] = await Promise.all([
        loadNameMapOverrides(supabase, codesUpper),
        loadNameMapLedgerUi(supabase, codesUpper),
      ]);
      const fallbackReadMs = Date.now() - fallbackStartedAt;

      const rows = mapTruthRowsToStockRows(truthRows, { overMap, uiMap });
      const overrideCodes = Object.keys(overMap).filter(Boolean);
      const rikDeferredCodes = codesUpper.filter((code) => !overrideCodes.includes(code));

      return {
        supported: true,
        rows,
        rikDeferredCodes,
        overrideCodes,
        projectionAvailable: false,
        projectionHitCount: 0,
        projectionMissCount: codesUpper.length,
        projectionReadMs,
        fallbackReadMs,
      };
    }


    const v = await fetchWarehouseStockViewRows(supabase, offset, limit);
    if (!v.error && Array.isArray(v.data)) {
      const rows = (v.data || []).map(
        (x: UnknownRow) =>
        ({
          material_id: String(x.code ?? ""),
          code: x.code ?? null,
          name: x.name ?? null,
          uom_id:
            pickUom(x.uom_id) ??
            pickUom(x.uom) ??
            pickUom(x.uom_code) ??
            pickUom(x.unit) ??
            pickUom(x.unit_id) ??
            null,
          qty_on_hand: nz(x.qty_on_hand, 0),
          qty_reserved: nz(x.qty_reserved, 0),
          qty_available: nz(x.qty_available ?? nz(x.qty_on_hand) - nz(x.qty_reserved), 0),
          object_name: null,
          warehouse_name: null,
          updated_at: x.updated_at ?? null,
        } as StockRow),
      );
      return { supported: true, rows };
    }

    return { supported: false, rows: [] };
  } catch (error) {
    logWarehouseApiFallback("apiFetchStock", error);
    return { supported: false, rows: [] };
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
    (options?.overrideCodes ?? []).map((x) => String(x || "").trim().toUpperCase()).filter(Boolean),
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

export async function apiFetchReqHeads(
  supabase: SupabaseClient,
  page: number = 0,
  pageSize: number = 50
): Promise<ReqHeadRow[]> {
  const normalizePhone = (v: string) => {
    const src = String(v || "").trim();
    if (!src) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(src)) return "";
    if (/^\d{4}[./]\d{2}[./]\d{2}$/.test(src)) return "";
    const m = src.match(/(\+?\d[\d\s()\-]{7,}\d)/);
    if (!m) return "";
    const candidate = String(m[1] || "").trim();
    const digits = candidate.replace(/[^\d]/g, "");
    if (digits.length < 9) return "";
    return candidate.replace(/\s+/g, "");
  };
  const targetVisibleCount = Math.max(0, (page + 1) * pageSize);
  const viewChunkSize = Math.max(pageSize, 50);
  const maxWindowScans = 8;
  const visibleViewRows: ReqHeadRow[] = [];
  const materializedReqIds = new Set<string>();

  for (let scan = 0; scan < maxWindowScans && visibleViewRows.length < targetVisibleCount; scan += 1) {
    const offset = scan * viewChunkSize;
    const windowRows = await loadApprovedViewReqHeadsWindow(supabase, offset, viewChunkSize);
    if (!windowRows.length) break;
    for (const row of windowRows) {
      const requestId = String(row.request_id ?? "").trim();
      if (!requestId || materializedReqIds.has(requestId)) continue;
      materializedReqIds.add(requestId);
      visibleViewRows.push(row);
    }
    if (windowRows.length < viewChunkSize) break;
  }

  let viewRows = visibleViewRows
    .sort(reqHeadSort)
    .slice(page * pageSize, (page + 1) * pageSize);

  // Fallback only on first page:
  // include approved requests not yet materialized in warehouse view.
  // On next pages we rely on pure view pagination to avoid duplicate slices.
  if (page === 0 && viewRows.length < pageSize) {
    try {
      const reqRows = await tryLoadRequestsFallbackRows(supabase, pageSize);

    if (reqRows.length) {
      const approvedReqs = reqRows
        .filter((r) => isRequestDirectorApproved(r?.status))
        .map((r) => ({
          request_id: String(r.id ?? "").trim(),
          display_no: toTextOrNull(r.display_no),
          object_name: toTextOrNull(r.object_name ?? r.object_type_code),
          level_name: toTextOrNull(r.level_name ?? r.level_code),
          system_name: toTextOrNull(r.system_name ?? r.system_code),
          zone_name: toTextOrNull(r.zone_name ?? r.zone_code),
          level_code: toTextOrNull(r.level_code),
          system_code: toTextOrNull(r.system_code),
          zone_code: toTextOrNull(r.zone_code),
          submitted_at: toTextOrNull(r.submitted_at ?? r.created_at),
        }))
        .filter((r) => !!r.request_id);

      if (approvedReqs.length) {
        const missingReqIds = approvedReqs
          .map((r) => r.request_id)
          .filter((id) => !materializedReqIds.has(id));

        if (missingReqIds.length) {
          const reqRowsById = new Map<string, UnknownRow>();
          for (const row of reqRows) {
            const requestId = String(row?.id ?? "").trim();
            if (requestId) reqRowsById.set(requestId, row);
          }

          const fallbackTruthByReq = await loadReqHeadTruthByRequestIds(supabase, missingReqIds);

          const unresolvedStatReqIds = missingReqIds.filter((id) => !fallbackTruthByReq[id]);
          const fallbackItemStatsQ = unresolvedStatReqIds.length
            ? await supabase
                .from("request_items")
                .select("id, request_id, status, qty")
                .in("request_id", unresolvedStatReqIds)
            : { error: null, data: [] as UnknownRow[] };

          const stat: Record<
            string,
            { items: number; qty: number; done: number; rejected: number }
          > = {};
          for (const id of unresolvedStatReqIds) {
            stat[id] = { items: 0, qty: 0, done: 0, rejected: 0 };
          }

          if (!fallbackItemStatsQ.error && Array.isArray(fallbackItemStatsQ.data)) {
            for (const it of fallbackItemStatsQ.data as UnknownRow[]) {
              const rid = String(it?.request_id ?? "").trim();
              if (!rid || !stat[rid]) continue;
              const status = String(it?.status ?? "").trim().toLowerCase();
              stat[rid].items += 1;
              stat[rid].qty += parseNum(it?.qty, 0);
              if (status.includes("РІС‹РґР°РЅ") || status === "done") stat[rid].done += 1;
              if (status.includes("РѕС‚РєР»РѕРЅ")) stat[rid].rejected += 1;
            }
          }

          const fallbackRows: ReqHeadRow[] = approvedReqs
            .filter((r) => !materializedReqIds.has(r.request_id))
            .map((r) => {
              const reqRaw = reqRowsById.get(r.request_id) ?? null;
              const fromReqText = parseReqHeaderContext([
                String(reqRaw?.note ?? ""),
                String(reqRaw?.comment ?? ""),
              ]);
              const contractor =
                String(
                  reqRaw?.contractor_name ??
                    reqRaw?.contractor_org ??
                    reqRaw?.subcontractor_name ??
                    reqRaw?.subcontractor_org ??
                    "",
                ).trim() || fromReqText.contractor || null;
              const phone =
                normalizePhone(
                  String(
                    reqRaw?.contractor_phone ??
                      reqRaw?.subcontractor_phone ??
                      reqRaw?.phone ??
                      reqRaw?.phone_number ??
                      "",
                  ).trim(),
                ) || normalizePhone(fromReqText.phone) || null;
              const plannedVolume =
                String(
                  reqRaw?.planned_volume ??
                    reqRaw?.volume ??
                    reqRaw?.qty_plan ??
                    "",
                ).trim() || fromReqText.volume || null;
              const truth =
                fallbackTruthByReq[r.request_id] ??
                (() => {
                  const s = stat[r.request_id] ?? { items: 0, qty: 0, done: 0, rejected: 0 };
                  const readyCnt = Math.max(0, s.items - s.done - s.rejected);
                  return finalizeReqHeadTruth({
                    items_cnt: s.items,
                    ready_cnt: readyCnt,
                    done_cnt: s.done,
                    qty_limit_sum: s.qty,
                    qty_issued_sum: 0,
                    qty_left_sum: s.qty,
                    qty_can_issue_now_sum: s.qty,
                    issuable_now_cnt: readyCnt,
                  });
                })();
              return applyReqHeadTruth({
                request_id: r.request_id,
                display_no: r.display_no,
                object_name: r.object_name,
                level_code: r.level_code,
                system_code: r.system_code,
                zone_code: r.zone_code,
                level_name: r.level_name,
                system_name: r.system_name,
                zone_name: r.zone_name,
                contractor_name: contractor,
                contractor_phone: phone,
                planned_volume: plannedVolume,
                note: reqRaw?.note == null ? null : String(reqRaw.note),
                comment: reqRaw?.comment == null ? null : String(reqRaw.comment),
                submitted_at: r.submitted_at,
                items_cnt: truth.items_cnt,
                ready_cnt: truth.ready_cnt,
                done_cnt: truth.done_cnt,
                qty_limit_sum: truth.qty_limit_sum,
                qty_issued_sum: truth.qty_issued_sum,
                qty_left_sum: truth.qty_left_sum,
                qty_can_issue_now_sum: truth.qty_can_issue_now_sum,
                issuable_now_cnt: truth.issuable_now_cnt,
                issue_status: truth.issue_status,
              }, truth);
            })
            .filter((r) => r.visible_in_expense_queue);

          const merged = [...viewRows, ...fallbackRows]
            .sort(reqHeadSort)
            .slice(0, pageSize);
          try {
            return await enrichReqHeadsMeta(supabase, merged);
          } catch (error) {
            logWarehouseApiFallback("apiFetchReqHeads/fallback-enrich-merged", error);
            return merged;
          }
        }
      }
    }
    } catch (error) {
      logWarehouseApiFallback("apiFetchReqHeads/fallback-load", error);
      // keep view rows when fallback fails
    }
  }

  try {
    return await enrichReqHeadsMeta(supabase, viewRows);
  } catch (error) {
    logWarehouseApiFallback("apiFetchReqHeads/enrich-view", error);
    return viewRows;
  }
}
export async function apiFetchReqItems(
  supabase: SupabaseClient,
  requestId: string,
): Promise<ReqItemUiRow[]> {
  type ReqItemUiRowWithMeta = ReqItemUiRow & { note?: string | null; comment?: string | null };
  const rid = String(requestId || "").trim();
  if (!rid) return [];

  const q = await supabase
    .from("v_wh_issue_req_items_ui")
    .select("*")
    .eq("request_id", rid)
    .order("name_human", { ascending: true });

  if (q.error || !Array.isArray(q.data)) {
    return [];
  }

  let raw: ReqItemUiRowWithMeta[] = (q.data as UnknownRow[]).map((x) => ({
    request_id: String(x.request_id),
    request_item_id: String(x.request_item_id),

    display_no: toTextOrNull(x.display_no),
    object_name: toTextOrNull(x.object_name),
    level_code: toTextOrNull(x.level_code),
    system_code: toTextOrNull(x.system_code),
    zone_code: toTextOrNull(x.zone_code),

    rik_code: String(x.rik_code ?? ""),
    name_human: String(x.name_human ?? x.rik_code ?? ""),
    uom: toTextOrNull(x.uom),

    qty_limit: parseNum(x.qty_limit, 0),
    qty_issued: parseNum(x.qty_issued, 0),
    qty_left: parseNum(x.qty_left, 0),

    qty_available: parseNum(x.qty_available, 0),
    qty_can_issue_now: parseNum(x.qty_can_issue_now, 0),
    note: toTextOrNull(x.note),
    comment: toTextOrNull(x.comment),
  }));

  // Enrich notes from base request_items table (view may not expose note/comment).
  try {
    const ids = raw
      .map((x) => String(x.request_item_id ?? "").trim())
      .filter(Boolean);
    if (ids.length) {
      const nQ = await supabase
        .from("request_items")
        .select("id, note")
        .in("id", ids);
      if (!nQ.error && Array.isArray(nQ.data) && nQ.data.length) {
        const byId: Record<string, { note: string | null }> = {};
        for (const r of nQ.data as UnknownRow[]) {
          const id = String(r?.id ?? "").trim();
          if (!id) continue;
          byId[id] = {
            note: r?.note == null ? null : String(r.note),
          };
        }
        raw = raw.map((it) => {
          const id = String(it.request_item_id ?? "").trim();
          const p = byId[id];
          if (!p) return it;
          return {
            ...it,
            note: it.note ?? p.note ?? null,
            comment: it.comment ?? null,
          };
        });
      }
    }
  } catch (error) {
    logWarehouseApiFallback("apiFetchReqItems/enrich-notes", error);
    // keep base rows if enrichment fails
  }

  // РІСљвЂ¦ Р Т‘Р ВµР Т‘РЎС“Р С— Р С—Р С• request_item_id (Р В±Р ВµРЎР‚РЎвЂР С Р СР В°Р С”РЎРѓР С‘Р СР В°Р В»РЎРЉР Р…РЎвЂ№Р Вµ РЎвЂЎР С‘РЎРѓР В»Р В°)
  const byId: Record<string, ReqItemUiRowWithMeta> = {};
  for (const it of raw) {
    const id = String(it.request_item_id ?? "").trim();
    if (!id) continue;

    const prev = byId[id];
    if (!prev) {
      byId[id] = it;
      continue;
    }

    const merged: ReqItemUiRowWithMeta = { ...prev };
    const pickText = (a: unknown, b: unknown): string | null => {
      const sa = String(a ?? "").trim();
      if (sa) return sa;
      const sb = String(b ?? "").trim();
      return sb || null;
    };

    merged.name_human = pickText(prev.name_human, it.name_human) ?? "";
    merged.rik_code = pickText(prev.rik_code, it.rik_code) ?? "";
    merged.uom = pickText(prev.uom, it.uom);
    merged.note = pickText(prev.note, it.note);
    merged.comment = pickText(prev.comment, it.comment);

    merged.qty_limit = Math.max(parseNum(prev.qty_limit, 0), parseNum(it.qty_limit, 0));
    merged.qty_issued = Math.max(parseNum(prev.qty_issued, 0), parseNum(it.qty_issued, 0));
    merged.qty_left = Math.max(parseNum(prev.qty_left, 0), parseNum(it.qty_left, 0));
    merged.qty_available = Math.max(parseNum(prev.qty_available, 0), parseNum(it.qty_available, 0));
    merged.qty_can_issue_now = Math.max(
      parseNum(prev.qty_can_issue_now, 0),
      parseNum(it.qty_can_issue_now, 0),
    );

    byId[id] = merged;
  }

  const viewItems = Object.values(byId).sort((a, b) =>
    String(a.name_human ?? "").localeCompare(String(b.name_human ?? "")),
  );

  if (viewItems.length > 0) return viewItems;

  // Fallback for requests not yet materialized in warehouse view.
  try {
    const f = await supabase
      .from("request_items")
      .select("id, request_id, rik_code, name_human, uom, qty, status, note")
      .eq("request_id", rid)
      .order("name_human", { ascending: true });
    if (!f.error && Array.isArray(f.data) && f.data.length) {
      const direct = (f.data as UnknownRow[])
        .filter((x) => !String(x?.status ?? "").toLowerCase().includes("РѕС‚РєР»РѕРЅ"))
        .map((x) => {
          const qty = parseNum(x?.qty, 0);
          const available = qty; // unknown here; keep non-blocking until stock check in UI
          return {
            request_id: String(x.request_id ?? rid),
            request_item_id: String(x.id ?? ""),
            display_no: null,
            object_name: null,
            level_code: null,
            system_code: null,
            zone_code: null,
            rik_code: String(x.rik_code ?? ""),
            name_human: String(x.name_human ?? x.rik_code ?? ""),
            uom: x.uom ?? null,
            qty_limit: qty,
            qty_issued: 0,
            qty_left: qty,
            qty_available: available,
            qty_can_issue_now: Math.max(0, Math.min(qty, available)),
            note: x.note ?? null,
            comment: null,
          } as ReqItemUiRow;
        });
      return direct;
    }
  } catch (error) {
    logWarehouseApiFallback("apiFetchReqItems/fallback-direct", error);
  }

  return viewItems;
}
export async function apiFetchReports(
  supabase: SupabaseClient,
  periodFrom?: string,
  periodTo?: string,
): Promise<{ supported: boolean; repStock: StockRow[]; repMov: UnknownRow[]; repIssues: UnknownRow[] }> {
  try {
    const { stock: s, movement: m, issues: iss } = await fetchWarehouseReportsBundle(
      supabase,
      periodFrom,
      periodTo,
    );

    return {
      supported: true,
      repStock: !s.error && Array.isArray(s.data) ? (s.data as StockRow[]) : [],
      repMov: !m.error && Array.isArray(m.data) ? (m.data as UnknownRow[]) : [],
      repIssues: !iss.error && Array.isArray(iss.data) ? (iss.data as UnknownRow[]) : [],
    };
  } catch (error) {
    logWarehouseApiFallback("apiFetchReports", error);
    return { supported: false, repStock: [], repMov: [], repIssues: [] };
  }
}

export async function apiEnsureIssueLines(
  supabase: SupabaseClient,
  issueId: number,
): Promise<UnknownRow[]> {
  const r = await fetchWarehouseIssueLineRows(supabase, issueId);
  if (!r.error && Array.isArray(r.data)) return r.data as UnknownRow[];
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
  p: { from?: string | null; to?: string | null; objectId?: string | null },
): Promise<IssuedMaterialsFastRow[]> {
  const r = await fetchWarehouseIssuedMaterialsFastRows(supabase, {
    from: normDateArg(p.from),
    to: normDateArg(p.to),
    objectId: p.objectId ?? null,
  });

  if (!r.error && Array.isArray(r.data)) return r.data as IssuedMaterialsFastRow[];
  return [];
}

export async function apiFetchIssuedByObjectReportFast(
  supabase: SupabaseClient,
  p: { from?: string | null; to?: string | null; objectId?: string | null },
): Promise<IssuedByObjectFastRow[]> {
  const r = await fetchWarehouseIssuedByObjectFastRows(supabase, {
    from: normDateArg(p.from),
    to: normDateArg(p.to),
    objectId: p.objectId ?? null,
  });

  if (!r.error && Array.isArray(r.data)) return r.data as IssuedByObjectFastRow[];
  return [];
}

export async function apiFetchIncomingReports(
  supabase: SupabaseClient,
  p: { from?: string | null; to?: string | null },
): Promise<UnknownRow[]> {
  const r = await fetchWarehouseIncomingReportRows(supabase, {
    from: normDateArg(p.from),
    to: normDateArg(p.to),
  });

  if (!r.error && Array.isArray(r.data)) return r.data as UnknownRow[];
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
  p: { from?: string | null; to?: string | null },
): Promise<IncomingMaterialsFastRow[]> {
  // No RPC for this on server yet, use ledger directly for stability
  // and to avoid 404 errors in console
  if (__DEV__) {
    console.info("[apiFetchIncomingMaterialsReportFast] Fetching from ledger for", p);
  }

  const q = await fetchWarehouseIncomingLedgerRows(supabase, {
    from: normDateArg(p.from),
    to: normDateArg(p.to),
  });


  if (q.error || !q.data) {
    if (__DEV__ && q.error) console.warn("[apiFetchIncomingMaterialsReportFast] fallback err:", q.error.message);
    return [];
  }

  const groups: Record<string, IncomingMaterialsFastRow> = {};
  for (const row of q.data as UnknownRow[]) {
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
    const val = Number(row.qty || 0);
    groups[key].sum_total += val;
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

  const q = await fetchWarehouseIncomingLineRows(supabase, incomingId);

  if (!q.error && Array.isArray(q.data)) {
    if (__DEV__) {
      console.info("[apiFetchIncomingLines] Success:", q.data.length, "lines");
    }
    const rows = asUnknownRows(q.data);
    const codesUpper = Array.from(
      new Set(rows.map((ln) => String(ln?.code ?? "").trim().toUpperCase()).filter(Boolean))
    );

    const [overMap, rikMap, uiMap] = await Promise.all([
      loadNameMapOverrides(supabase, codesUpper),
      loadNameMapRikRu(supabase, codesUpper),
      loadNameMapLedgerUi(supabase, codesUpper),
    ]);

    return rows.map((ln) => {
      const code = String(ln?.code ?? "").trim();
      const key = code.toUpperCase();
      const nOver = String(normalizeRuText(String(overMap[key] ?? ""))).trim();
      const nRik = String(normalizeRuText(String(rikMap[key] ?? ""))).trim();
      const nUi = String(normalizeRuText(String(uiMap[key] ?? ""))).trim();
      const nameRu = normalizeRuText(nOver || nRik || nUi || code || "РџРѕР·РёС†РёСЏ");

      return {
        ...ln,
        name_ru: nameRu,
        material_name: nameRu,
        name: nameRu,
        uom: ln.uom_id || "вЂ”",
        qty_received: ln.qty,
      };
    });
  }

  if (__DEV__ && q.error) console.error("[apiFetchIncomingLines] Error:", q.error.message);
  return [];
}


