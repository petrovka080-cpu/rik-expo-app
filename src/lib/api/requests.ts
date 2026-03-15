import { supabase } from "../supabaseClient";
import type { Database } from "../database.types";
import { client, normalizeUuid, parseErr, rpcCompat, toFilterId } from "./_core";
import type { ReqItemRow, RequestMeta, RequestRecord } from "./types";

const logRequestsDebug = (...args: unknown[]) => {
  if (__DEV__) {
    console.warn(...args);
  }
};

// cache id С‡РµСЂРЅРѕРІРёРєР° РЅР° СЃРµСЃСЃРёСЋ (uuid РёР»Рё int)
let _draftRequestIdAny: string | number | null = null;
let _requestsSubmittedAtSupportedCache: boolean | null = null;
let _requestsReadableColumnsCache: Set<string> | null = null;
let _requestsReadableColumnsInFlight: Promise<Set<string>> | null = null;

type RequestsTable = Database["public"]["Tables"]["requests"];
type RequestItemsTable = Database["public"]["Tables"]["request_items"];
type RequestStatusEnum = Database["public"]["Enums"]["request_status_enum"];
type RequestDraftInsertPayload = Pick<
  RequestsTable["Insert"],
  | "status"
  | "foreman_name"
  | "need_by"
  | "comment"
  | "object_type_code"
  | "level_code"
  | "system_code"
  | "zone_code"
>;
type RequestDraftUpsertPayload = Pick<RequestsTable["Insert"], "id" | "status">;
type RequestHeadStatusUpdatePayload = Pick<RequestsTable["Update"], "status" | "submitted_at">;
type RequestItemMetaPatch = Pick<
  RequestItemsTable["Update"],
  "status" | "note" | "app_code" | "kind" | "name_human" | "uom"
>;
type RequestItemStatusPatch = Pick<RequestItemsTable["Update"], "status">;
type RequestItemAddOrIncArgs = Database["public"]["Functions"]["request_item_add_or_inc"]["Args"];
type RequestItemAddOrIncResult = Database["public"]["Functions"]["request_item_add_or_inc"]["Returns"];
type RequestItemsByRequestArgs = Database["public"]["Functions"]["request_items_by_request"]["Args"];
type RequestItemsByRequestRow = Database["public"]["Functions"]["request_items_by_request"]["Returns"][number];
type RequestSubmitArgs = Database["public"]["Functions"]["request_submit"]["Args"];
type RequestSubmitResultRow = Database["public"]["Functions"]["request_submit"]["Returns"];
type RequestStatusRecalcArgsCompat = { p_request_id: number | string };

const REQUEST_DRAFT_STATUS: RequestStatusEnum = "╨з╨╡╤А╨╜╨╛╨▓╨╕╨║";
const REQUEST_PENDING_STATUS: RequestStatusEnum = "pending";
const REQUEST_PENDING_RU_STATUS: RequestStatusEnum = "╨Э╨░ ╤Г╤В╨▓╨╡╤А╨╢╨┤╨╡╨╜╨╕╨╕";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value != null && typeof value === "object" && !Array.isArray(value);

const getErrorMessage = (value: unknown): string => {
  if (isRecord(value) && typeof value.message === "string") return value.message;
  return String(value ?? "");
};

const normalizeRequestFilterId = (value: number | string): string => {
  const normalized = toFilterId(value);
  if (normalized) return normalized;
  return String(value ?? "").trim().replace(/^#/, "");
};

function buildRequestDraftInsert(meta?: RequestMeta): RequestDraftInsertPayload {
  return {
    status: REQUEST_DRAFT_STATUS,
    foreman_name: meta?.foreman_name ?? null,
    need_by: meta?.need_by ?? null,
    comment: meta?.comment ?? null,
    object_type_code: meta?.object_type_code ?? null,
    level_code: meta?.level_code ?? null,
    system_code: meta?.system_code ?? null,
    zone_code: meta?.zone_code ?? null,
  };
}

function buildRequestDraftUpsert(requestId: number | string): RequestDraftUpsertPayload {
  return {
    id: normalizeRequestFilterId(requestId),
    status: REQUEST_DRAFT_STATUS,
  };
}

function buildRequestItemAddOrIncArgs(
  requestId: number | string,
  rikCode: string,
  qty: number,
): RequestItemAddOrIncArgs {
  return {
    p_request_id: normalizeRequestFilterId(requestId),
    p_rik_code: rikCode,
    p_qty_add: qty,
  };
}

function parseRequestItemAddOrIncResult(data: RequestItemAddOrIncResult): string | null {
  const id = typeof data === "string" ? data.trim() : "";
  return id || null;
}

function buildRequestItemMetaPatch(
  opts?: { note?: string; app_code?: string; kind?: string; name_human?: string; uom?: string | null },
): RequestItemMetaPatch {
  const patch: RequestItemMetaPatch = { status: REQUEST_DRAFT_STATUS };
  if (Object.prototype.hasOwnProperty.call(opts ?? {}, "note")) patch.note = opts?.note ?? null;
  if (Object.prototype.hasOwnProperty.call(opts ?? {}, "app_code")) patch.app_code = opts?.app_code ?? null;
  if (Object.prototype.hasOwnProperty.call(opts ?? {}, "kind")) patch.kind = opts?.kind ?? null;
  if (Object.prototype.hasOwnProperty.call(opts ?? {}, "name_human") && opts?.name_human) patch.name_human = opts.name_human;
  if (Object.prototype.hasOwnProperty.call(opts ?? {}, "uom")) patch.uom = opts?.uom ?? null;
  return patch;
}

function buildRequestSubmitArgs(requestId: string): RequestSubmitArgs {
  return { p_request_id: requestId };
}

function buildRequestSubmitFallbackUpdate(canWriteSubmittedAt: boolean): RequestHeadStatusUpdatePayload {
  if (canWriteSubmittedAt) {
    return { status: REQUEST_PENDING_STATUS, submitted_at: new Date().toISOString() };
  }
  return { status: REQUEST_PENDING_STATUS };
}

function buildRequestItemsPendingPatch(): RequestItemStatusPatch {
  return { status: REQUEST_PENDING_RU_STATUS };
}

function parseRequestItemRow(raw: unknown): ReqItemRow | null {
  if (!isRecord(raw)) return null;
  const id = typeof raw.id === "string" ? raw.id.trim() : "";
  const requestId = raw.request_id;
  if (!id || (typeof requestId !== "string" && typeof requestId !== "number")) return null;
  return {
    id,
    request_id: requestId,
    name_human: typeof raw.name_human === "string" && raw.name_human.trim() ? raw.name_human : "вЂ”",
    qty: Number(raw.qty ?? 0),
    uom: typeof raw.uom === "string" ? raw.uom : null,
    status: typeof raw.status === "string" ? raw.status : null,
    supplier_hint: typeof raw.supplier_hint === "string" ? raw.supplier_hint : null,
    app_code: typeof raw.app_code === "string" ? raw.app_code : null,
    note: typeof raw.note === "string" ? raw.note : null,
  };
}

function parseRequestItemsByRequestRows(data: unknown): ReqItemRow[] {
  if (!Array.isArray(data)) return [];
  return data.flatMap((row) => {
    const parsed = parseRequestItemRow(row);
    return parsed ? [parsed] : [];
  });
}

export function clearCachedDraftRequestId() {
  _draftRequestIdAny = null;
}

async function resolveRequestsReadableColumns(): Promise<Set<string>> {
  if (_requestsReadableColumnsCache) return _requestsReadableColumnsCache;
  if (_requestsReadableColumnsInFlight) return _requestsReadableColumnsInFlight;

  _requestsReadableColumnsInFlight = (async () => {
    try {
      const q = await client.from("requests").select("*").limit(1);
      if (q.error) throw q.error;
      const first =
        Array.isArray(q.data) && q.data.length ? (q.data[0] as Record<string, unknown>) : null;
      const cols = new Set<string>(first ? Object.keys(first) : ["id", "status", "display_no", "created_at"]);
      _requestsReadableColumnsCache = cols;
      return cols;
    } catch {
      const fallback = new Set<string>(["id", "status", "display_no", "created_at"]);
      _requestsReadableColumnsCache = fallback;
      return fallback;
    } finally {
      _requestsReadableColumnsInFlight = null;
    }
  })();

  return _requestsReadableColumnsInFlight;
}

async function buildRequestSelectSchemaSafe(): Promise<string> {
  const desired = [
    "id",
    "status",
    "display_no",
    "foreman_name",
    "need_by",
    "comment",
    "object_type_code",
    "level_code",
    "system_code",
    "zone_code",
    "created_at",
    "year",
    "seq",
  ];
  const cols = await resolveRequestsReadableColumns();
  const filtered = desired.filter((c) => cols.has(c));
  return filtered.length ? filtered.join(", ") : "id,status,created_at";
}

async function requestsSupportsSubmittedAt(): Promise<boolean> {
  if (_requestsSubmittedAtSupportedCache != null) return _requestsSubmittedAtSupportedCache;
  try {
    const q = await client.from("requests").select("submitted_at").limit(1);
    if (q.error) throw q.error;
    _requestsSubmittedAtSupportedCache = true;
    return true;
  } catch (e) {
    const msg = getErrorMessage(e).toLowerCase();
    if (msg.includes("submitted_at") || msg.includes("column") || msg.includes("does not exist")) {
      _requestsSubmittedAtSupportedCache = false;
      return false;
    }
    _requestsSubmittedAtSupportedCache = true;
    return true;
  }
}

function mapRequestRow(raw: unknown): RequestRecord | null {
  if (!isRecord(raw)) return null;
  const idRaw = raw.id ?? raw.request_id ?? null;
  if (!idRaw) return null;

  const id = String(idRaw);

  const norm = (v: unknown) => (v == null ? null : String(v).trim());

  const asNumber = (v: unknown) => {
    if (typeof v === "number" && Number.isFinite(v)) return v;
    const parsed = Number(v);
    return Number.isFinite(parsed) ? parsed : null;
  };

  return {
    id,
    status: typeof raw.status === "string" ? raw.status : null,
    display_no: norm(raw.display_no ?? raw.number ?? raw.label ?? raw.display) || null,
    year: asNumber(raw.year),
    seq: asNumber(raw.seq),
    foreman_name: norm(raw.foreman_name),
    need_by: norm(raw.need_by),
    comment: norm(raw.comment),
    object_type_code: norm(raw.object_type_code),
    level_code: norm(raw.level_code),
    system_code: norm(raw.system_code),
    zone_code: norm(raw.zone_code),
    created_at: norm(raw.created_at),
  };
}

const normalizeStatus = (raw: unknown): string =>
  String(raw ?? "").trim().toLowerCase().replace(/\s+/g, " ");

const isDraftOrPendingStatus = (raw: unknown): boolean => {
  const s = normalizeStatus(raw);
  if (!s) return true;
  return s === "draft" || s.includes("С‡РµСЂРЅРѕРІ") || s === "pending" || s.includes("РЅР° СѓС‚РІРµСЂР¶РґРµРЅРёРё");
};

// ============================== Requests / Items ==============================
export async function listRequestItems(requestId: number | string): Promise<ReqItemRow[]> {
  try {
    const raw = String(requestId ?? "").trim();
    if (!raw) return [];

    const args: RequestItemsByRequestArgs = { p_request_id: raw };
    const { data, error } = await client.rpc("request_items_by_request", args);
    if (error) throw error;

    return parseRequestItemsByRequestRows(data);
  } catch (e) {
    logRequestsDebug("[listRequestItems]", getErrorMessage(e));
    return [];
  }
}

export async function requestCreateDraft(meta?: RequestMeta): Promise<RequestRecord | null> {
  const payload = buildRequestDraftInsert(meta);

  try {
    const { data, error } = await client
      .from("requests")
      .insert(payload)
      .select(
        "id,status,display_no,need_by,comment,foreman_name,object_type_code,level_code,system_code,zone_code,created_at",
      )
      .single();

    if (error) throw error;
    const row = mapRequestRow(data);
    if (row) {
      _draftRequestIdAny = row.id;
      return row;
    }
  } catch (e) {
    logRequestsDebug("[requestCreateDraft]", parseErr(e));
    throw e;
  }

  throw new Error("requests.insert returned invalid payload");
}

export async function ensureRequestSmart(currentId?: number | string, meta?: RequestMeta): Promise<number | string> {
  if (currentId != null && String(currentId).trim()) return currentId;
  try {
    const created = await requestCreateDraft(meta);
    if (created?.id) return created.id;
  } catch (e) {
    logRequestsDebug("[ensureRequestSmart]", parseErr(e));
  }
  return currentId ?? "";
}

export async function getOrCreateDraftRequestId(): Promise<string | number> {
  if (_draftRequestIdAny != null) return _draftRequestIdAny;
  const created = await requestCreateDraft();
  if (created?.id) return created.id;
  throw new Error("requestCreateDraft returned invalid id");
}

export async function ensureRequest(requestId: number | string): Promise<number | string> {
  const rid = requestId;
  const requestFilterId = normalizeRequestFilterId(rid);

  try {
    const found = await client
      .from("requests")
      .select("id")
      .eq("id", requestFilterId)
      .limit(1)
      .maybeSingle();

    if (!found.error && found.data?.id != null) return found.data.id;
  } catch {}

  try {
    const up = await client
      .from("requests")
      .upsert(buildRequestDraftUpsert(rid), { onConflict: "id" })
      .select("id")
      .single();

    if (!up.error && up.data?.id != null) return up.data.id;
  } catch (e) {
    logRequestsDebug("[ensureRequest/upsert]", parseErr(e));
  }

  return rid;
}

export async function addRequestItemFromRik(
  requestId: number | string,
  rik_code: string,
  qty: number,
  opts?: { note?: string; app_code?: string; kind?: string; name_human?: string; uom?: string | null },
): Promise<boolean> {
  if (!rik_code) throw new Error("rik_code required");

  const q = Number(qty);
  if (!Number.isFinite(q) || q <= 0) throw new Error("qty must be > 0");

  const rid = normalizeRequestFilterId(requestId);
  if (!rid) throw new Error("request_id is empty");

  const { data, error } = await supabase.rpc(
    "request_item_add_or_inc",
    buildRequestItemAddOrIncArgs(rid, rik_code, q),
  );

  if (error) throw error;

  const itemId = parseRequestItemAddOrIncResult(data);
  if (!itemId) throw new Error("request_item_add_or_inc returned empty id");

  const patch = buildRequestItemMetaPatch(opts);

  try {
    await supabase.from("request_items").update(patch).eq("id", itemId);
  } catch {}

  return true;
}

async function requestHasPostDraftItems(requestId: string): Promise<boolean> {
  try {
    const q = await client
      .from("request_items")
      .select("status")
      .eq("request_id", requestId)
      .limit(5000);
    if (q.error) throw q.error;
    const rows = Array.isArray(q.data) ? q.data : [];
    return rows.some((row) => isRecord(row) && !isDraftOrPendingStatus(row.status ?? null));
  } catch (e) {
    logRequestsDebug("[requestSubmit/guard probe]", parseErr(e));
    return false;
  }
}

async function reconcileRequestHeadStatus(requestId: string): Promise<void> {
  const rid = normalizeUuid(requestId) ?? requestId;
  if (!rid) return;

  const plans = [
    () =>
      rpcCompat([
        {
          fn: "request_recalc_status",
          args: { p_request_id: rid } satisfies RequestStatusRecalcArgsCompat,
        },
      ]),
    () =>
      rpcCompat([
        {
          fn: "request_update_status_from_items",
          args: { p_request_id: rid } satisfies RequestStatusRecalcArgsCompat,
        },
      ]),
  ] as const;

  for (const run of plans) {
    try {
      await run();
      return;
    } catch {}
  }
}

export async function requestSubmit(requestId: number | string): Promise<RequestRecord | null> {
  const asStr = String(requestId ?? "").trim();
  const ridForRpc = normalizeUuid(asStr) ?? asStr;
  if (!ridForRpc) throw new Error("request_id is empty");

  const requestFilterId = normalizeRequestFilterId(requestId);
  const hasPostDraftRoute = await requestHasPostDraftItems(String(ridForRpc));
  const requestReadSelect = await buildRequestSelectSchemaSafe();
  if (hasPostDraftRoute) {
    await reconcileRequestHeadStatus(String(ridForRpc));
    const existing = await client
      .from("requests")
      .select(requestReadSelect)
      .eq("id", requestFilterId)
      .maybeSingle();
    if (existing.error) throw existing.error;
    return existing.data ? mapRequestRow(existing.data) : null;
  }

  try {
    const { data, error } = await client.rpc("request_submit", buildRequestSubmitArgs(ridForRpc));
    if (error) throw error;
    await reconcileRequestHeadStatus(String(ridForRpc));

    const row = mapRequestRow(data as RequestSubmitResultRow);
    if (row) {
      if (_draftRequestIdAny != null && String(_draftRequestIdAny) === String(ridForRpc)) {
        _draftRequestIdAny = null;
      }
      return row;
    }
  } catch (e) {
    logRequestsDebug("[requestSubmit/rpc]", parseErr(e));
  }

  const canWriteSubmittedAt = await requestsSupportsSubmittedAt();
  let upd = await client
    .from("requests")
    .update(buildRequestSubmitFallbackUpdate(canWriteSubmittedAt))
    .eq("id", requestFilterId)
    .select(requestReadSelect)
    .maybeSingle();

  if (upd.error) {
    const msg = getErrorMessage(upd.error).toLowerCase();
    const submittedAtMismatch =
      msg.includes("submitted_at") ||
      msg.includes("column") ||
      msg.includes("does not exist");
    if (submittedAtMismatch) {
      _requestsSubmittedAtSupportedCache = false;
      upd = await client
        .from("requests")
        .update(buildRequestSubmitFallbackUpdate(false))
        .eq("id", requestFilterId)
        .select(requestReadSelect)
        .maybeSingle();
    }
  }

  if (upd.error) throw upd.error;

  const fallback = upd.data ? mapRequestRow(upd.data) : null;

  if (fallback && _draftRequestIdAny != null && String(_draftRequestIdAny) === String(ridForRpc)) {
    _draftRequestIdAny = null;
  }

  const pendingPayload = buildRequestItemsPendingPatch();

  try {
    await client
      .from("request_items")
      .update(pendingPayload)
      .eq("request_id", requestFilterId)
      .not("status", "in", '("РЈС‚РІРµСЂР¶РґРµРЅРѕ","РћС‚РєР»РѕРЅРµРЅРѕ","approved","rejected")');

    await client
      .from("request_items")
      .update(pendingPayload)
      .eq("request_id", requestFilterId)
      .is("status", null);
  } catch (e) {
    logRequestsDebug("[requestSubmit/request_items fallback]", parseErr(e));
  }
  await reconcileRequestHeadStatus(String(ridForRpc));

  return fallback;
}
