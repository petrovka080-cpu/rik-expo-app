import { supabase } from "../supabaseClient";
import { client, parseErr, normalizeUuid, toFilterId } from "./_core";
import type { ReqItemRow, RequestMeta, RequestRecord } from "./types";

const logRequestsDebug = (...args: unknown[]) => {
  if (__DEV__) {
    console.warn(...args);
  }
};

// cache id черновика на сессию (uuid или int)
let _draftRequestIdAny: string | number | null = null;
let _requestsSubmittedAtSupportedCache: boolean | null = null;
let _requestsReadableColumnsCache: Set<string> | null = null;
let _requestsReadableColumnsInFlight: Promise<Set<string>> | null = null;

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
    const msg = String((e as any)?.message ?? "").toLowerCase();
    if (msg.includes("submitted_at") || msg.includes("column") || msg.includes("does not exist")) {
      _requestsSubmittedAtSupportedCache = false;
      return false;
    }
    // On unknown errors keep canonical path; do not silently degrade.
    _requestsSubmittedAtSupportedCache = true;
    return true;
  }
}

function mapRequestRow(raw: any): RequestRecord | null {
  const idRaw = raw?.id ?? raw?.request_id ?? null;
  if (!idRaw) return null;

  const id = String(idRaw);

  const norm = (v: any) => (v == null ? null : String(v).trim());

  const asNumber = (v: any) => {
    if (typeof v === "number" && Number.isFinite(v)) return v;
    const parsed = Number(v);
    return Number.isFinite(parsed) ? parsed : null;
  };

  return {
    id,
    status: raw?.status ?? null,
    display_no: norm(raw?.display_no ?? raw?.number ?? raw?.label ?? raw?.display) || null,
    year: asNumber(raw?.year),
    seq: asNumber(raw?.seq),
    foreman_name: norm(raw?.foreman_name),
    need_by: norm(raw?.need_by),
    comment: norm(raw?.comment),
    object_type_code: norm(raw?.object_type_code),
    level_code: norm(raw?.level_code),
    system_code: norm(raw?.system_code),
    zone_code: norm(raw?.zone_code),
    created_at: norm(raw?.created_at),
  };
}

// ============================== Requests / Items ==============================
export async function listRequestItems(requestId: number | string): Promise<ReqItemRow[]> {
  try {
    const raw = String(requestId ?? "").trim();
    if (!raw) return [];

    const { data, error } = await client.rpc("request_items_by_request", { p_request_id: raw } as any);
    if (error) throw error;

    const rows = Array.isArray(data) ? data : [];
    return rows.map((r: any) => ({
      id: r.id,
      request_id: r.request_id,
      name_human: r.name_human ?? "—",
      qty: Number(r.qty ?? 0),
      uom: r.uom ?? null,
      status: r.status ?? null,
      supplier_hint: r.supplier_hint ?? null,
      app_code: r.app_code ?? null,
      note: r.note ?? null,
    })) as ReqItemRow[];
  } catch (e) {
    logRequestsDebug("[listRequestItems]", (e as any)?.message ?? e);
    return [];
  }
}

export async function requestCreateDraft(meta?: RequestMeta): Promise<RequestRecord | null> {
  const payload: Record<string, any> = {
    status: "Черновик",
    foreman_name: meta?.foreman_name ?? null,
    need_by: meta?.need_by ?? null,
    comment: meta?.comment ?? null,
    object_type_code: meta?.object_type_code ?? null,
    level_code: meta?.level_code ?? null,
    system_code: meta?.system_code ?? null,
    zone_code: meta?.zone_code ?? null,
  };

  try {
    const { data, error } = await client
      .from("requests")
      .insert(payload)
      .select(
        "id,status,display_no,need_by,comment,foreman_name,object_type_code,level_code,system_code,zone_code,created_at"
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

  try {
    const found = await client
      .from("requests")
      .select("id")
      .eq("id", toFilterId(rid) as any)
      .limit(1)
      .maybeSingle();

    if (!found.error && found.data?.id != null) return found.data.id;
  } catch {}

  try {
    const up = await client
      .from("requests")
      .upsert({ id: rid, status: "Черновик" } as any, { onConflict: "id" })
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
  opts?: { note?: string; app_code?: string; kind?: string; name_human?: string; uom?: string | null }
): Promise<boolean> {
  if (!rik_code) throw new Error("rik_code required");

  const q = Number(qty);
  if (!Number.isFinite(q) || q <= 0) throw new Error("qty must be > 0");

  const rid = toFilterId(requestId);
  if (rid == null) throw new Error("request_id is empty");

  // 1) add-or-inc
  const { data: id, error } = await supabase.rpc("request_item_add_or_inc" as any, {
    p_request_id: rid,
    p_rik_code: rik_code,
    p_qty_add: q,
  } as any);

  if (error) throw error;

  const itemId = String(id ?? "").trim();
  if (!itemId) throw new Error("request_item_add_or_inc returned empty id");

  // 2) patch meta
  const patch: Record<string, any> = { status: "Черновик" };
  if (Object.prototype.hasOwnProperty.call(opts ?? {}, "note")) patch.note = opts?.note ?? null;
  if (Object.prototype.hasOwnProperty.call(opts ?? {}, "app_code")) patch.app_code = opts?.app_code ?? null;
  if (Object.prototype.hasOwnProperty.call(opts ?? {}, "kind")) patch.kind = opts?.kind ?? null;
  if (Object.prototype.hasOwnProperty.call(opts ?? {}, "name_human") && opts?.name_human) patch.name_human = opts.name_human;
  if (Object.prototype.hasOwnProperty.call(opts ?? {}, "uom")) patch.uom = opts?.uom ?? null;

  try {
    await supabase.from("request_items" as any).update(patch).eq("id", itemId);
  } catch {}

  return true;
}

const normalizeStatus = (raw: unknown): string =>
  String(raw ?? "").trim().toLowerCase().replace(/\s+/g, " ");

const isDraftOrPendingStatus = (raw: unknown): boolean => {
  const s = normalizeStatus(raw);
  if (!s) return true;
  return s === "draft" || s.includes("чернов") || s === "pending" || s.includes("на утверждении");
};

async function requestHasPostDraftItems(requestId: string): Promise<boolean> {
  try {
    const q = await client
      .from("request_items")
      .select("status")
      .eq("request_id", requestId)
      .limit(5000);
    if (q.error) throw q.error;
    const rows = Array.isArray(q.data) ? (q.data as Array<{ status?: string | null }>) : [];
    return rows.some((row) => !isDraftOrPendingStatus(row?.status ?? null));
  } catch (e) {
    logRequestsDebug("[requestSubmit/guard probe]", parseErr(e));
    return false;
  }
}

async function reconcileRequestHeadStatus(requestId: string): Promise<void> {
  const rid = normalizeUuid(requestId) ?? requestId;
  if (!rid) return;

  const plans = [
    () => client.rpc("request_recalc_status", { p_request_id: rid } as any),
    () => client.rpc("request_update_status_from_items", { p_request_id: rid } as any),
  ] as const;

  for (const run of plans) {
    try {
      const q = await run();
      if (!q.error) return;
    } catch {}
  }
}

export async function requestSubmit(requestId: number | string): Promise<RequestRecord | null> {
  const asStr = String(requestId ?? "").trim();
  const ridForRpc = normalizeUuid(asStr) ?? asStr;
  if (!ridForRpc) throw new Error("request_id is empty");

  const hasPostDraftRoute = await requestHasPostDraftItems(String(ridForRpc));
  const requestReadSelect = await buildRequestSelectSchemaSafe();
  if (hasPostDraftRoute) {
    await reconcileRequestHeadStatus(String(ridForRpc));
    const existing = await client
      .from("requests")
      .select(requestReadSelect)
      .eq("id", toFilterId(requestId) as any)
      .maybeSingle();
    if (existing.error) throw existing.error;
    return existing.data ? mapRequestRow(existing.data) : null;
  }

  try {
    const { data, error } = await client.rpc("request_submit", { p_request_id: ridForRpc as any });
    if (error) throw error;
    await reconcileRequestHeadStatus(String(ridForRpc));

    const row = mapRequestRow(data);
    if (row) {
      if (_draftRequestIdAny != null && String(_draftRequestIdAny) === String(ridForRpc)) {
        _draftRequestIdAny = null;
      }
      return row;
    }
  } catch (e) {
    logRequestsDebug("[requestSubmit/rpc]", parseErr(e));
  }

  // fallback update
  const canWriteSubmittedAt = await requestsSupportsSubmittedAt();
  const primaryPayload = canWriteSubmittedAt
    ? ({ status: "pending", submitted_at: new Date().toISOString() } as any)
    : ({ status: "pending" } as any);
  let upd = await client
    .from("requests")
    .update(primaryPayload)
    .eq("id", toFilterId(requestId) as any)
    .select(requestReadSelect)
    .maybeSingle();

  if (upd.error) {
    const msg = String((upd.error as any)?.message || "").toLowerCase();
    const submittedAtMismatch =
      msg.includes("submitted_at") ||
      msg.includes("column") ||
      msg.includes("does not exist");
    if (submittedAtMismatch) {
      _requestsSubmittedAtSupportedCache = false;
      upd = await client
        .from("requests")
        .update({ status: "pending" } as any)
        .eq("id", toFilterId(requestId) as any)
        .select(requestReadSelect)
        .maybeSingle();
    }
  }

  if (upd.error) throw upd.error;

  const fallback = upd.data ? mapRequestRow(upd.data) : null;

  if (fallback && _draftRequestIdAny != null && String(_draftRequestIdAny) === String(ridForRpc)) {
    _draftRequestIdAny = null;
  }

  const requestFilter = toFilterId(requestId) as any;
  const pendingPayload = { status: "На утверждении" } as any;

  try {
    await client
      .from("request_items")
      .update(pendingPayload)
      .eq("request_id", requestFilter)
      .not("status", "in", '("Утверждено","Отклонено","approved","rejected")');

    await client
      .from("request_items")
      .update(pendingPayload)
      .eq("request_id", requestFilter)
      .is("status", null);
  } catch (e) {
    logRequestsDebug("[requestSubmit/request_items fallback]", parseErr(e));
  }
  await reconcileRequestHeadStatus(String(ridForRpc));

  return fallback;
}
