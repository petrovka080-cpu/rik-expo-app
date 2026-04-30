import { supabase } from "../supabaseClient";
import { loadPagedRowsWithCeiling, type PagedQuery } from "../api/_core";
import {
  isRequestItemUpdateQtyResponse,
  validateRpcResponse,
} from "../api/queryBoundary";
import {
  clearCachedDraftRequestId,
  getOrCreateDraftRequestId as getOrCreateLowLevelDraftRequestId,
} from "../api/requests";
import { filterRequestLinkedRowsByExistingRequestLinks } from "../api/integrity.guards";
import type {
  CatalogRequestDisplayNoArgs,
  CatalogRequestItemUpdate,
  CatalogRequestItemUpdateQtyArgs,
  CatalogRequestUpdate,
} from "../../types/contracts/catalog";
import { recordCatalogWarning } from "./catalog.observability";
import {
  asLooseRecord,
  asUnknownRecord,
  clamp,
  
  norm,
  parseNumberValue,
  pickFirstString,
  readRefName,
} from "./catalog.compat.shared";

export type RequestHeader = {
  id: string;
  display_no?: string | null;
  status?: string | null;
  created_at?: string | null;
};

export type RequestItem = {
  id?: string;
  request_id: string;
  line_no?: number | null;
  code?: string | null;
  name?: string | null;
  uom?: string | null;
  qty?: number | null;
  note?: string | null;
};

export type ReqItemRow = {
  id: string;
  request_id: string;
  name_human: string;
  qty: number;
  uom?: string | null;
  status?: string | null;
  supplier_hint?: string | null;
  app_code?: string | null;
  note?: string | null;
  rik_code?: string | null;
  line_no?: number | null;
  updated_at?: string | null;
};

export type ForemanRequestSummary = {
  id: string;
  display_no?: string | null;
  status?: string | null;
  created_at?: string | null;
  need_by?: string | null;
  object_name_ru?: string | null;
  level_name_ru?: string | null;
  system_name_ru?: string | null;
  zone_name_ru?: string | null;
  has_rejected?: boolean | null;
};

export type RequestDetails = {
  id: string;
  status?: string | null;
  display_no?: string | null;
  year?: number | null;
  seq?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
  need_by?: string | null;
  comment?: string | null;
  foreman_name?: string | null;
  object_type_code?: string | null;
  level_code?: string | null;
  system_code?: string | null;
  zone_code?: string | null;
  object_name_ru?: string | null;
  level_name_ru?: string | null;
  system_name_ru?: string | null;
  zone_name_ru?: string | null;
};

export type RequestMetaPatch = {
  need_by?: string | null;
  comment?: string | null;
  object_type_code?: string | null;
  level_code?: string | null;
  system_code?: string | null;
  zone_code?: string | null;
  foreman_name?: string | null;
  contractor_job_id?: string | null;
  subcontract_id?: string | null;
  contractor_org?: string | null;
  subcontractor_org?: string | null;
  contractor_phone?: string | null;
  subcontractor_phone?: string | null;
  planned_volume?: number | null;
  qty_plan?: number | null;
  volume?: number | null;
  object_name?: string | null;
  level_name?: string | null;
  system_name?: string | null;
  zone_name?: string | null;
};

type RequestListMergedRow = Record<string, unknown>;
type RequestItemStatusAggRow = {
  request_id?: unknown;
  status?: unknown;
};

type RequestsUpdate = CatalogRequestUpdate;
type RequestItemsUpdate = CatalogRequestItemUpdate;
type RequestItemUpdateQtyArgs = CatalogRequestItemUpdateQtyArgs;
type RequestDisplayRpcArgs = CatalogRequestDisplayNoArgs;
type RequestDisplayRpcName = "request_display_no" | "request_display" | "request_label";
type CatalogDynamicReadSource =
  | "request_display"
  | "vi_requests_display"
  | "vi_requests"
  | "v_requests_display"
  | "v_request_pdf_header"
  | "requests";
type CatalogDynamicReadLegacySource = "vi_requests_display" | "vi_requests";
type CatalogDynamicReadResponse = Promise<{ data: unknown; error: { message?: string } | null }>;
type RequestsExtendedMetaUpdate = RequestsUpdate & {
  planned_volume?: number | null;
  qty_plan?: number | null;
  volume?: number | null;
  level_name?: string | null;
  system_name?: string | null;
  zone_name?: string | null;
  contractor_org?: string | null;
  subcontractor_org?: string | null;
  contractor_phone?: string | null;
  subcontractor_phone?: string | null;
};
type CatalogCompatError = {
  message?: string;
  code?: string;
  details?: string | null;
  hint?: string | null;
} | null;

const BASE_REQUEST_PAYLOAD_KEYS = [
  "need_by",
  "comment",
  "object_type_code",
  "level_code",
  "system_code",
  "zone_code",
  "foreman_name",
] as const satisfies readonly (keyof RequestsUpdate)[];

type BaseRequestPayloadKey = (typeof BASE_REQUEST_PAYLOAD_KEYS)[number];

const basePayloadKeys = new Set<string>(BASE_REQUEST_PAYLOAD_KEYS);

function isBaseRequestPayloadKey(key: string): key is BaseRequestPayloadKey {
  return basePayloadKeys.has(key);
}

function pickBaseRequestPayload(payload: RequestsExtendedMetaUpdate): RequestsUpdate {
  const basePayload: RequestsUpdate = {};
  if (Object.prototype.hasOwnProperty.call(payload, "need_by")) basePayload.need_by = payload.need_by;
  if (Object.prototype.hasOwnProperty.call(payload, "comment")) basePayload.comment = payload.comment;
  if (Object.prototype.hasOwnProperty.call(payload, "object_type_code")) {
    basePayload.object_type_code = payload.object_type_code;
  }
  if (Object.prototype.hasOwnProperty.call(payload, "level_code")) basePayload.level_code = payload.level_code;
  if (Object.prototype.hasOwnProperty.call(payload, "system_code")) basePayload.system_code = payload.system_code;
  if (Object.prototype.hasOwnProperty.call(payload, "zone_code")) basePayload.zone_code = payload.zone_code;
  if (Object.prototype.hasOwnProperty.call(payload, "foreman_name")) basePayload.foreman_name = payload.foreman_name;
  return basePayload;
}

const DRAFT_KEY = "foreman_draft_request_id";
const CATALOG_REQUEST_REFERENCE_PAGE_DEFAULTS = { pageSize: 100, maxPageSize: 100, maxRows: 5000 };

const asRequestHeader = (value: unknown): RequestHeader | null => {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const id = String(row.id ?? "").trim();
  if (!id) return null;
  return {
    id,
    display_no: row.display_no == null ? null : String(row.display_no),
    status: row.status == null ? null : String(row.status),
    created_at: row.created_at == null ? null : String(row.created_at),
  };
};

const asRequestStatusRow = (
  value: unknown,
): { id: string; status?: string | null; display_no?: string | null } | null => {
  const header = asRequestHeader(value);
  return header ? header : null;
};

const mapRequestItemRow = (raw: unknown, requestId: string): ReqItemRow | null => {
  const row = asLooseRecord(raw);
  const rawId = row.id ?? row.request_item_id ?? null;
  if (!rawId) return null;
  const qtyVal = Number(row.qty ?? row.quantity ?? row.total_qty ?? 0);
  const qty = Number.isFinite(qtyVal) ? qtyVal : 0;
  const lineNo =
    parseNumberValue(
      row.line_no,
      row.row_no,
      row.position_order,
      row.rowno,
      row.rowNo,
      row.positionOrder,
    ) ?? null;

  const nameHuman =
    pickFirstString(
      row.name_human_ru,
      row.name_human,
      row.name_ru,
      row.name,
      row.display_name,
      row.alias_ru,
      row.best_name_display,
    ) || "";

  return {
    id: String(rawId),
    request_id: String(row.request_id ?? requestId),
    name_human: nameHuman || "\u2014",
    qty,
    uom: pickFirstString(row.uom, row.uom_code),
    status: pickFirstString(row.status),
    supplier_hint: pickFirstString(row.supplier_hint, row.supplier),
    app_code: pickFirstString(row.app_code),
    note: pickFirstString(row.note, row.comment),
    rik_code: pickFirstString(row.rik_code, row.code),
    line_no: lineNo,
    updated_at: pickFirstString(row.updated_at, row.updatedAt),
  };
};

const runRequestDisplayRpc = async (
  fn: RequestDisplayRpcName,
  args: RequestDisplayRpcArgs,
): Promise<{ data: string | null; error: { message?: string } | null }> => {
  switch (fn) {
    case "request_display_no": {
      const { data, error } = await supabase.rpc("request_display_no", args);
      return { data: typeof data === "string" ? data : data == null ? null : String(data), error };
    }
    case "request_display": {
      const { data, error } = await supabase.rpc("request_display", args);
      return { data: typeof data === "string" ? data : data == null ? null : String(data), error };
    }
    case "request_label": {
      const { data, error } = await supabase.rpc("request_label", args);
      return { data: typeof data === "string" ? data : data == null ? null : String(data), error };
    }
  }
};

const readCatalogLegacyView = (relation: CatalogDynamicReadLegacySource) =>
  (supabase.from.bind(supabase) as (
    name: CatalogDynamicReadLegacySource,
  ) => {
    select(columns: string): {
      eq(column: "id" | "display_no", value: string): {
        maybeSingle(): CatalogDynamicReadResponse;
      };
    };
  })(relation);

const selectCatalogDynamicReadSingle = async (
  relation: CatalogDynamicReadSource,
  columns: string,
  id: string,
  matchColumn: "id" | "display_no" = "id",
): CatalogDynamicReadResponse => {
  switch (relation) {
    case "request_display":
      return await supabase.from("request_display").select(columns).eq(matchColumn, id).maybeSingle();
    case "vi_requests_display":
      return await readCatalogLegacyView("vi_requests_display").select(columns).eq(matchColumn, id).maybeSingle();
    case "vi_requests":
      return await readCatalogLegacyView("vi_requests").select(columns).eq(matchColumn, id).maybeSingle();
    case "v_requests_display":
      return await supabase.from("v_requests_display").select(columns).eq(matchColumn, id).maybeSingle();
    case "v_request_pdf_header":
      return await supabase.from("v_request_pdf_header").select(columns).eq(matchColumn, id).maybeSingle();
    case "requests":
      return await supabase.from("requests").select(columns).eq(matchColumn, id).maybeSingle();
  }
};

const getCompatErrorInfo = (error: CatalogCompatError) => ({
  message: String(error?.message ?? ""),
  code: String(error?.code ?? ""),
  details: error?.details ?? null,
  hint: error?.hint ?? null,
});

let memDraftId: string | null = null;
const storage = {
  get(): string | null {
    try {
      if (typeof localStorage !== "undefined") return localStorage.getItem(DRAFT_KEY);
    } catch (error) {
      recordCatalogWarning({
        screen: "request",
        event: "draft_storage_get_failed",
        operation: "draftStorage.get",
        error,
        mode: "degraded",
        onceKey: "draft_storage_get_failed",
      });
    }
    return memDraftId;
  },
  set(value: string) {
    try {
      if (typeof localStorage !== "undefined") localStorage.setItem(DRAFT_KEY, value);
    } catch (error) {
      recordCatalogWarning({
        screen: "request",
        event: "draft_storage_set_failed",
        operation: "draftStorage.set",
        error,
        mode: "degraded",
        onceKey: "draft_storage_set_failed",
      });
    }
    memDraftId = value;
  },
  clear() {
    try {
      if (typeof localStorage !== "undefined") localStorage.removeItem(DRAFT_KEY);
    } catch (error) {
      recordCatalogWarning({
        screen: "request",
        event: "draft_storage_clear_failed",
        operation: "draftStorage.clear",
        error,
        mode: "degraded",
        onceKey: "draft_storage_clear_failed",
      });
    }
    memDraftId = null;
  },
};

const draftStatusKeys = new Set(["draft", "\u0447\u0435\u0440\u043d\u043e\u0432\u0438\u043a"]);
const isDraftStatusValue = (value?: string | null) => {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) return false;
  return draftStatusKeys.has(normalized);
};

const mapDetailsFromRow = (row: unknown): RequestDetails | null => {
  const source = asLooseRecord(row);
  const id = pickFirstString(source.id, source.request_id);
  if (!id) return null;

  const objectCode = pickFirstString(
    source.object_type_code,
    source.objectTypeCode,
    source.object_code,
    source.objectCode,
    source.objecttype_code,
    source.objecttypeCode,
    source.object,
  );
  const levelCode = pickFirstString(source.level_code, source.levelCode, source.level);
  const systemCode = pickFirstString(source.system_code, source.systemCode, source.system);
  const zoneCode = pickFirstString(
    source.zone_code,
    source.zoneCode,
    source.zone,
    source.zone_area,
    source.area,
  );

  const commentRaw = source.comment ?? source.request_comment ?? null;
  const comment =
    typeof commentRaw === "string" ? commentRaw : norm(commentRaw == null ? null : String(commentRaw));

  return {
    id,
    status: pickFirstString(source.status, source.request_status),
    display_no: pickFirstString(
      source.display_no,
      source.display,
      source.label,
      source.number,
      source.request_no,
    ),
    year: parseNumberValue(source.year, source.request_year, source.requestYear),
    seq: parseNumberValue(source.seq, source.request_seq, source.requestSeq),
    created_at: pickFirstString(source.created_at, source.created, source.createdAt),
    updated_at: pickFirstString(source.updated_at, source.updatedAt),
    need_by: pickFirstString(source.need_by, source.need_by_date, source.needBy),
    comment: comment ?? null,
    foreman_name: pickFirstString(source.foreman_name, source.foreman, source.foremanName),
    object_type_code: objectCode,
    level_code: levelCode,
    system_code: systemCode,
    zone_code: zoneCode,
    object_name_ru: readRefName(
      source,
      ["object", "object_type", "objecttype", "objectType", "object_ref"],
      objectCode,
    ),
    level_name_ru: readRefName(source, ["level", "level_ref", "levelRef"], levelCode),
    system_name_ru: readRefName(
      source,
      ["system", "system_type", "systemType", "system_ref"],
      systemCode,
    ),
    zone_name_ru: readRefName(
      source,
      ["zone", "zone_area", "area", "zoneRef", "zone_ref"],
      zoneCode,
    ),
  };
};

const mapSummaryFromRow = (row: unknown): ForemanRequestSummary | null => {
  const source = asLooseRecord(row);
  const details = mapDetailsFromRow(source);
  if (!details) return null;

  const rawHas = source.has_rejected ?? source.hasRejected ?? source.has_rej ?? null;
  return {
    id: details.id,
    status: details.status ?? null,
    created_at: details.created_at ?? null,
    need_by: details.need_by ?? null,
    display_no: details.display_no ?? null,
    object_name_ru: details.object_name_ru ?? null,
    level_name_ru: details.level_name_ru ?? null,
    system_name_ru: details.system_name_ru ?? null,
    zone_name_ru: details.zone_name_ru ?? null,
    has_rejected:
      typeof rawHas === "boolean" ? rawHas : rawHas == null ? null : Boolean(rawHas),
  };
};

async function isCachedDraftValid(id: string): Promise<boolean> {
  const rid = norm(id);
  if (!rid) return false;

  try {
    const { data, error } = await supabase.from("requests").select("id,status").eq("id", rid).maybeSingle();
    if (error) throw error;
    const row = asRequestStatusRow(data);
    if (!row?.id) return false;
    return isDraftStatusValue(row.status);
  } catch (error: unknown) {
    const msg = String((error as Error)?.message ?? "").toLowerCase();
    if (!msg.includes("permission denied")) {
      if (__DEV__) console.warn("[catalog_api.getOrCreateDraftRequestId] draft check:", (error as Error)?.message ?? error);
    }
    return false;
  }
}

let requestsExtendedMetaWriteSupportedCache: boolean | null = null;
let requestsExtendedMetaWriteSupportInFlight: Promise<boolean> | null = null;

async function resolveRequestsExtendedMetaWriteSupport(): Promise<boolean> {
  if (requestsExtendedMetaWriteSupportedCache != null) return requestsExtendedMetaWriteSupportedCache;
  if (requestsExtendedMetaWriteSupportInFlight) return requestsExtendedMetaWriteSupportInFlight;

  requestsExtendedMetaWriteSupportInFlight = (async () => {
    try {
      const q = await supabase.from("requests").select("*").limit(1);
      if (q.error) throw q.error;
      const sample = Array.isArray(q.data) && q.data.length > 0 ? (q.data[0] as Record<string, unknown>) : null;
      if (!sample) {
        requestsExtendedMetaWriteSupportedCache = false;
        return false;
      }
      requestsExtendedMetaWriteSupportedCache = [
        "subcontract_id",
        "contractor_job_id",
        "contractor_org",
        "subcontractor_org",
        "contractor_phone",
        "subcontractor_phone",
        "planned_volume",
        "qty_plan",
        "volume",
        "object_name",
        "level_name",
        "system_name",
        "zone_name",
      ].every((key) => Object.prototype.hasOwnProperty.call(sample, key));
      return requestsExtendedMetaWriteSupportedCache;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message.toLowerCase() : String(error ?? "").toLowerCase();
      const schemaMismatch =
        msg.includes("column") || msg.includes("does not exist") || msg.includes("schema cache");
      requestsExtendedMetaWriteSupportedCache = schemaMismatch ? false : true;
      return requestsExtendedMetaWriteSupportedCache;
    } finally {
      requestsExtendedMetaWriteSupportInFlight = null;
    }
  })();

  return requestsExtendedMetaWriteSupportInFlight;
}

export function getLocalDraftId(): string | null {
  return storage.get();
}

export function setLocalDraftId(id: string) {
  storage.set(id);
}

export function clearLocalDraftId() {
  storage.clear();
}

export async function getOrCreateDraftRequestId(): Promise<string> {
  const cached = getLocalDraftId();
  if (cached) {
    const valid = await isCachedDraftValid(cached);
    if (valid) return cached;
    clearLocalDraftId();
    clearCachedDraftRequestId();
  }

  try {
    const resolved = await getOrCreateLowLevelDraftRequestId();
    const id = String(resolved ?? "").trim();
    if (id) {
      setLocalDraftId(id);
      return id;
    }
  } catch (error: unknown) {
    if (__DEV__) console.warn("[catalog_api.getOrCreateDraftRequestId]", error instanceof Error ? error.message : error);
    throw error;
  }

  throw new Error("\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0441\u043e\u0437\u0434\u0430\u0442\u044c \u0438\u043b\u0438 \u043f\u043e\u043b\u0443\u0447\u0438\u0442\u044c \u0447\u0435\u0440\u043d\u043e\u0432\u0438\u043a \u0437\u0430\u044f\u0432\u043a\u0438");
}

export async function getRequestHeader(requestId: string): Promise<RequestHeader | null> {
  const id = norm(requestId);
  if (!id) return null;

  const views = [
    { src: "request_display", cols: "id,display_no,status,created_at" },
    { src: "vi_requests_display", cols: "id,display_no,status,created_at" },
    { src: "vi_requests", cols: "id,display_no,status,created_at" },
    { src: "requests", cols: "id,display_no,status,created_at" },
  ] as const;

  for (const view of views) {
    try {
      const { data, error } = await selectCatalogDynamicReadSingle(view.src, view.cols, id);
      const row = asRequestHeader(data);
      if (!error && row) return row;
    } catch (error) {
      recordCatalogWarning({
        screen: "request",
        event: "request_header_lookup_view_failed",
        operation: "getRequestHeader.view_lookup",
        error,
        mode: "fallback",
        extra: {
          requestId: id,
          source: view.src,
        },
      });
    }
  }

  return { id };
}

export async function fetchRequestDisplayNo(requestId: string): Promise<string | null> {
  const id = norm(requestId);
  if (!id) return null;

  try {
    const { data, error } = await supabase.from("requests").select("id,display_no").eq("id", id).maybeSingle();
    const row = asRequestHeader(data);
    if (!error && row?.display_no) return String(row.display_no);
  } catch (error: unknown) {
    const msg = String((error as Error)?.message ?? "").toLowerCase();
    if (!msg.includes("permission denied") && !msg.includes("does not exist")) {
      if (__DEV__) console.warn("[catalog_api.fetchRequestDisplayNo] requests:", (error as Error)?.message ?? error);
    }
  }

  const rpcVariants = ["request_display_no", "request_display", "request_label"] as const;
  for (const fn of rpcVariants) {
    try {
      const { data, error } = await runRequestDisplayRpc(fn, { p_request_id: id });
      if (!error && data != null) {
        if (typeof data === "string" || typeof data === "number") return String(data);
        const obj = asLooseRecord(data);
        const value = obj.display_no ?? obj.display ?? obj.label ?? null;
        if (value != null) return String(value);
      }
    } catch (error: unknown) {
      const msg = String((error as Error)?.message ?? "");
      if (!msg.includes("function") && !msg.includes("does not exist")) {
        if (__DEV__) console.warn(`[catalog_api.fetchRequestDisplayNo] rpc ${fn}:`, (error as Error)?.message ?? error);
      }
    }
  }

  const views = [
    { src: "request_display", col: "display_no" },
    { src: "vi_requests_display", col: "display_no" },
    { src: "v_requests_display", col: "display_no" },
    { src: "requests", col: "display_no" },
  ] as const;

  for (const { src, col } of views) {
    try {
      const { data, error } = await selectCatalogDynamicReadSingle(src, `id,${col}`, id);
      const row = asUnknownRecord(data);
      if (!error && row && row[col] != null) return String(row[col]);
    } catch (error: unknown) {
      const msg = String((error as Error)?.message ?? "").toLowerCase();
      if (!msg.includes("permission denied") && !msg.includes("does not exist")) {
        if (__DEV__) console.warn(`[catalog_api.fetchRequestDisplayNo] ${src}:`, (error as Error)?.message ?? error);
      }
    }
  }

  return null;
}

export async function fetchRequestDetails(requestId: string): Promise<RequestDetails | null> {
  const id = norm(requestId);
  if (!id) return null;
  const requestDetailsSelect =
    `id,status,display_no,year,seq,created_at,updated_at,need_by,comment,foreman_name,
     object_type_code,level_code,system_code,zone_code,
     object:ref_object_types(*),
     level:ref_levels(*),
     system:ref_systems(*),
     zone:ref_zones(*)`;

  try {
    const { data, error } = await supabase
      .from("requests")
      .select(requestDetailsSelect)
      .eq("id", id)
      .maybeSingle();
    if (!error && data) {
      const mapped = mapDetailsFromRow(data);
      if (mapped) return mapped;
    }
    if (error) {
      const msg = String(error.message || "").toLowerCase();
      if (!msg.includes("permission denied") && !msg.includes("does not exist")) {
        if (__DEV__) console.warn("[catalog_api.fetchRequestDetails] requests:", error.message);
      }
    }
  } catch (error: unknown) {
    const msg = String((error as Error)?.message ?? "").toLowerCase();
    if (!msg.includes("permission denied") && !msg.includes("does not exist")) {
      if (__DEV__) console.warn("[catalog_api.fetchRequestDetails] requests:", (error as Error)?.message ?? error);
    }
  }

  const views = ["v_requests_display", "v_request_pdf_header"] as const;
  for (const view of views) {
    try {
      const { data, error } = await selectCatalogDynamicReadSingle(view, "*", id);
      if (!error && data) {
        const mapped = mapDetailsFromRow(data);
        if (mapped) return mapped;
      }
      if (error) {
        const msg = String(error.message || "").toLowerCase();
        if (!msg.includes("permission denied") && !msg.includes("does not exist")) {
          if (__DEV__) console.warn(`[catalog_api.fetchRequestDetails] ${view}:`, error.message);
        }
      }
    } catch (error: unknown) {
      const msg = String((error as Error)?.message ?? "").toLowerCase();
      if (!msg.includes("permission denied") && !msg.includes("does not exist")) {
        if (__DEV__) console.warn(`[catalog_api.fetchRequestDetails] ${view}:`, (error as Error)?.message ?? error);
      }
    }
  }

  try {
    const { data, error } = await supabase
      .from("requests")
      .select(requestDetailsSelect)
      .eq("display_no", id)
      .maybeSingle();
    if (!error && data) {
      const mapped = mapDetailsFromRow(data);
      if (mapped) return mapped;
    }
    if (error) {
      const msg = String(error.message || "").toLowerCase();
      if (!msg.includes("permission denied") && !msg.includes("does not exist")) {
        if (__DEV__) console.warn("[catalog_api.fetchRequestDetails] requests.display_no:", error.message);
      }
    }
  } catch (error: unknown) {
    const msg = String((error as Error)?.message ?? "").toLowerCase();
    if (!msg.includes("permission denied") && !msg.includes("does not exist")) {
      if (__DEV__) console.warn("[catalog_api.fetchRequestDetails] requests.display_no:", (error as Error)?.message ?? error);
    }
  }

  for (const view of views) {
    try {
      const { data, error } = await selectCatalogDynamicReadSingle(view, "*", id, "display_no");
      if (!error && data) {
        const mapped = mapDetailsFromRow(data);
        if (mapped) return mapped;
      }
      if (error) {
        const msg = String(error.message || "").toLowerCase();
        if (!msg.includes("permission denied") && !msg.includes("does not exist")) {
          if (__DEV__) console.warn(`[catalog_api.fetchRequestDetails] ${view}.display_no:`, error.message);
        }
      }
    } catch (error: unknown) {
      const msg = String((error as Error)?.message ?? "").toLowerCase();
      if (!msg.includes("permission denied") && !msg.includes("does not exist")) {
        if (__DEV__) console.warn(`[catalog_api.fetchRequestDetails] ${view}.display_no:`, (error as Error)?.message ?? error);
      }
    }
  }

  return null;
}

export async function updateRequestMeta(
  requestId: string,
  patch: RequestMetaPatch,
): Promise<boolean> {
  const id = norm(requestId);
  if (!id) return false;

  const payload: RequestsExtendedMetaUpdate = {};
  if (Object.prototype.hasOwnProperty.call(patch, "need_by")) payload.need_by = norm(patch.need_by) || null;
  if (Object.prototype.hasOwnProperty.call(patch, "comment")) payload.comment = norm(patch.comment) || null;
  if (Object.prototype.hasOwnProperty.call(patch, "object_type_code")) payload.object_type_code = patch.object_type_code || null;
  if (Object.prototype.hasOwnProperty.call(patch, "level_code")) payload.level_code = patch.level_code || null;
  if (Object.prototype.hasOwnProperty.call(patch, "system_code")) payload.system_code = patch.system_code || null;
  if (Object.prototype.hasOwnProperty.call(patch, "zone_code")) payload.zone_code = patch.zone_code || null;
  if (Object.prototype.hasOwnProperty.call(patch, "foreman_name")) payload.foreman_name = norm(patch.foreman_name) || null;
  if (Object.prototype.hasOwnProperty.call(patch, "contractor_job_id")) payload.contractor_job_id = norm(patch.contractor_job_id) || null;
  if (Object.prototype.hasOwnProperty.call(patch, "subcontract_id")) payload.subcontract_id = norm(patch.subcontract_id) || null;
  if (Object.prototype.hasOwnProperty.call(patch, "contractor_org")) payload.contractor_org = norm(patch.contractor_org) || null;
  if (Object.prototype.hasOwnProperty.call(patch, "subcontractor_org")) payload.subcontractor_org = norm(patch.subcontractor_org) || null;
  if (Object.prototype.hasOwnProperty.call(patch, "contractor_phone")) payload.contractor_phone = norm(patch.contractor_phone) || null;
  if (Object.prototype.hasOwnProperty.call(patch, "subcontractor_phone")) payload.subcontractor_phone = norm(patch.subcontractor_phone) || null;
  if (Object.prototype.hasOwnProperty.call(patch, "planned_volume")) payload.planned_volume = parseNumberValue(patch.planned_volume);
  if (Object.prototype.hasOwnProperty.call(patch, "qty_plan")) payload.qty_plan = parseNumberValue(patch.qty_plan);
  if (Object.prototype.hasOwnProperty.call(patch, "volume")) payload.volume = parseNumberValue(patch.volume);
  if (Object.prototype.hasOwnProperty.call(patch, "object_name")) payload.object_name = norm(patch.object_name) || null;
  if (Object.prototype.hasOwnProperty.call(patch, "level_name")) payload.level_name = norm(patch.level_name) || null;
  if (Object.prototype.hasOwnProperty.call(patch, "system_name")) payload.system_name = norm(patch.system_name) || null;
  if (Object.prototype.hasOwnProperty.call(patch, "zone_name")) payload.zone_name = norm(patch.zone_name) || null;

  if (!Object.keys(payload).length) return true;

  const hasExtendedPayload = Object.keys(payload).some((key) => !isBaseRequestPayloadKey(key));

  try {
    const fullPayloadAllowed =
      !hasExtendedPayload ||
      requestsExtendedMetaWriteSupportedCache === true ||
      (requestsExtendedMetaWriteSupportedCache == null &&
        (await resolveRequestsExtendedMetaWriteSupport()));
    const primaryPayload = fullPayloadAllowed ? payload : pickBaseRequestPayload(payload);
    let { error } = await supabase.from("requests").update(primaryPayload).eq("id", id);

    if (!error && hasExtendedPayload && fullPayloadAllowed) {
      requestsExtendedMetaWriteSupportedCache = true;
    }

    if (error && hasExtendedPayload && fullPayloadAllowed) {
      const primaryErr = error;
      const fallbackPayload = pickBaseRequestPayload(payload);
      const msg = String(error?.message ?? "").toLowerCase();
      if (msg.includes("column") || msg.includes("does not exist") || msg.includes("schema cache")) {
        requestsExtendedMetaWriteSupportedCache = false;
      }
      if (Object.keys(fallbackPayload).length) {
        const fallbackRes = await supabase.from("requests").update(fallbackPayload).eq("id", id);
        if (fallbackRes.error) {
          if (__DEV__) console.warn("[catalog_api.updateRequestMeta][patch400.fallback]", {
            request_id: id,
            payload: fallbackPayload,
            error: getCompatErrorInfo(fallbackRes.error),
          });
        }
        if (primaryErr) {
          if (__DEV__) console.warn("[catalog_api.updateRequestMeta][patch400.primary]", {
            request_id: id,
            payload: primaryPayload,
            error: getCompatErrorInfo(primaryErr),
          });
        }
        error = fallbackRes.error ?? null;
      }
    }

    if (error) {
      if (__DEV__) console.warn("[catalog_api.updateRequestMeta] table requests:", error.message);
      return false;
    }

    return true;
  } catch (error: unknown) {
    if (__DEV__) console.warn(
      "[catalog_api.updateRequestMeta] table requests:",
      error instanceof Error ? error.message : error,
    );
    return false;
  }
}

export async function listRequestItems(requestId: string): Promise<ReqItemRow[]> {
  const id = norm(requestId);
  if (!id) return [];

  try {
    const { data, error } = await loadPagedRowsWithCeiling<Record<string, unknown>>(
      () =>
        supabase
          .from("request_items")
          .select(
            "id,request_id,rik_code,name_human,uom,qty,status,note,app_code,supplier_hint,row_no,position_order,updated_at",
          )
          .eq("request_id", id)
          .order("row_no", { ascending: true })
          .order("position_order", { ascending: true })
          .order("id", { ascending: true }) as unknown as PagedQuery<Record<string, unknown>>,
      CATALOG_REQUEST_REFERENCE_PAGE_DEFAULTS,
    );

    if (error) {
      if (__DEV__) console.warn("[catalog_api.listRequestItems] request_items:", (error as Error)?.message ?? error);
      return [];
    }

    if (!Array.isArray(data) || !data.length) return [];

    const rows = Array.isArray(data) ? (data as unknown[]) : [];
    const mapped = rows
      .map((row) => mapRequestItemRow(row, id))
      .filter((row): row is ReqItemRow => !!row);
    const guarded = await filterRequestLinkedRowsByExistingRequestLinks(supabase, mapped, {
      screen: "request",
      surface: "catalog_list_request_items",
      sourceKind: "table:request_items",
      relation: "request_items.request_id->requests.id",
    });

    return guarded.rows.sort((a, b) => (a.line_no ?? 0) - (b.line_no ?? 0));
  } catch (error: unknown) {
    if (__DEV__) console.warn("[catalog_api.listRequestItems] request_items:", (error as Error)?.message ?? error);
    return [];
  }
}

export async function requestItemUpdateQty(
  requestItemId: string,
  qty: number,
  requestIdHint?: string,
): Promise<ReqItemRow | null> {
  const id = norm(requestItemId);
  if (!id) throw new Error("\u041d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d \u0438\u0434\u0435\u043d\u0442\u0438\u0444\u0438\u043a\u0430\u0442\u043e\u0440 \u043f\u043e\u0437\u0438\u0446\u0438\u0438");

  const numericQty = Number(qty);
  if (!Number.isFinite(numericQty) || numericQty <= 0) {
    throw new Error("\u041a\u043e\u043b\u0438\u0447\u0435\u0441\u0442\u0432\u043e \u0434\u043e\u043b\u0436\u043d\u043e \u0431\u044b\u0442\u044c \u0431\u043e\u043b\u044c\u0448\u0435 \u043d\u0443\u043b\u044f");
  }

  const rid = requestIdHint ? norm(requestIdHint) : "";
  let lastErr: unknown = null;

  try {
    const args: RequestItemUpdateQtyArgs = {
      p_request_item_id: id,
      p_qty: numericQty,
    };
    const { data, error } = await supabase.rpc("request_item_update_qty", args);
    if (!error && data) {
      const validated = validateRpcResponse(data, isRequestItemUpdateQtyResponse, {
        rpcName: "request_item_update_qty",
        caller: "src/lib/catalog/catalog.request.service.requestItemUpdateQty",
        domain: "catalog",
      });
      const mapped = mapRequestItemRow(validated, rid || "");
      if (mapped) return mapped;
    } else if (error) {
      lastErr = error;
    }
  } catch (error: unknown) {
    lastErr = error;
  }

  try {
    const { data, error } = await supabase
      .from("request_items")
      .update({ qty: numericQty } satisfies RequestItemsUpdate)
      .eq("id", id)
      .select(
        "id,request_id,rik_code,name_human,uom,qty,status,note,app_code,supplier_hint,row_no,position_order,updated_at",
      )
      .maybeSingle();
    if (error) throw error;
    if (data) {
      const mapped = mapRequestItemRow(
        data,
        rid || String((data as { request_id?: unknown })?.request_id ?? ""),
      );
      if (mapped) return mapped;
    }
  } catch (error: unknown) {
    lastErr = error;
  }

  if (lastErr) throw lastErr;
  return null;
}

export async function listForemanRequests(
  foremanName: string,
  limit = 50,
  userId?: string | null,
): Promise<ForemanRequestSummary[]> {
  const name = norm(foremanName);
  const uid = norm(userId);
  if (!name && !uid) return [];

  const take = clamp(limit, 1, 200);
  const requestSelect =
    `id,status,created_at,need_by,display_no,
     object_type_code,level_code,system_code,zone_code,
     object:ref_object_types(*),
     level:ref_levels(*),
     system:ref_systems(*),
     zone:ref_zones(*)`;

  const results: { data: unknown; error: { message?: string } | null }[] = [];
  if (name) {
    results.push(
      await supabase
        .from("requests")
        .select(requestSelect)
        .ilike("foreman_name", name)
        .not("display_no", "is", null)
        .order("created_at", { ascending: false })
        .limit(take),
    );
  }
  if (uid) {
    results.push(
      await supabase
        .from("requests")
        .select(requestSelect)
        .eq("created_by", uid)
        .not("display_no", "is", null)
        .order("created_at", { ascending: false })
        .limit(take),
    );
  }

  const mergedById = new Map<string, RequestListMergedRow>();
  for (const result of results) {
    if (result.error) {
      if (__DEV__) console.warn("[listForemanRequests]", result.error.message);
      continue;
    }
    if (!Array.isArray(result.data)) continue;
    const rows = Array.isArray(result.data) ? (result.data as unknown[]) : [];
    for (const rawRow of rows) {
      if (!asUnknownRecord(rawRow)) continue;
      const row = rawRow as RequestListMergedRow;
      const id = String(row.id ?? "").trim();
      if (!id || mergedById.has(id)) continue;
      mergedById.set(id, row);
    }
  }

  const data = Array.from(mergedById.values())
    .sort((a, b) => {
      const aTs = Date.parse(String(a?.created_at ?? "")) || 0;
      const bTs = Date.parse(String(b?.created_at ?? "")) || 0;
      return bTs - aTs;
    })
    .slice(0, take);
  if (!data.length) return [];

  const mapped = data
    .map((row) => mapSummaryFromRow(row))
    .filter((row): row is ForemanRequestSummary => !!row);

  const ids = mapped.map((row) => row.id).filter(Boolean);
  if (!ids.length) return mapped;

  const { data: itemRows, error: itemErr } = await loadPagedRowsWithCeiling<Record<string, unknown>>(
    () =>
      supabase
        .from("request_items")
        .select("request_id,status")
        .in("request_id", ids)
        .order("request_id", { ascending: true })
        .order("id", { ascending: true }) as unknown as PagedQuery<Record<string, unknown>>,
    CATALOG_REQUEST_REFERENCE_PAGE_DEFAULTS,
  );

  if (itemErr || !Array.isArray(itemRows)) {
    return mapped;
  }

  const normSt = (status: unknown) => String(status ?? "").trim().toLowerCase();
  const isApproved = (status: string) =>
    status === "\u0443\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u043e" ||
    status === "\u0443\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u0430" ||
    status === "approved" ||
    status === "\u043a \u0437\u0430\u043a\u0443\u043f\u043a\u0435";
  const isRejected = (status: string) =>
    status === "\u043e\u0442\u043a\u043b\u043e\u043d\u0435\u043d\u043e" ||
    status === "\u043e\u0442\u043a\u043b\u043e\u043d\u0435\u043d\u0430" ||
    status === "rejected";
  const isCancelled = (status: string) =>
    status === "\u043e\u0442\u043c\u0435\u043d\u0435\u043d\u0430" ||
    status === "\u043e\u0442\u043c\u0435\u043d\u0435\u043d\u043e" ||
    status === "cancelled" ||
    status === "canceled";
  const isPending = (status: string) =>
    status === "\u043d\u0430 \u0443\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u0438\u0438" ||
    status === "pending";

  const agg = new Map<
    string,
    { total: number; ok: number; bad: number; pend: number; cancelled: number }
  >();
  const statusRows = Array.isArray(itemRows) ? (itemRows as unknown[]) : [];
  for (const rawRow of statusRows) {
    const row = asUnknownRecord(rawRow);
    if (!row) continue;
    const requestId = String((row as RequestItemStatusAggRow).request_id ?? "");
    if (!requestId) continue;
    const status = normSt((row as RequestItemStatusAggRow).status);
    const cur = agg.get(requestId) ?? { total: 0, ok: 0, bad: 0, pend: 0, cancelled: 0 };
    cur.total += 1;
    if (isApproved(status)) cur.ok += 1;
    else if (isRejected(status)) cur.bad += 1;
    else if (isCancelled(status)) cur.cancelled += 1;
    else if (isPending(status)) cur.pend += 1;
    agg.set(requestId, cur);
  }

  return mapped.map((request) => {
    const counts = agg.get(String(request.id));
    if (!counts || counts.total === 0) return request;

    const hasRejected = counts.bad > 0;
    if (counts.cancelled === counts.total) {
      return { ...request, status: "\u041e\u0442\u043c\u0435\u043d\u0435\u043d\u0430", has_rejected: false };
    }
    if (counts.bad === counts.total) {
      return { ...request, status: "\u041e\u0442\u043a\u043b\u043e\u043d\u0435\u043d\u0430", has_rejected: true };
    }
    if (counts.ok === counts.total) {
      return { ...request, status: "\u041a \u0437\u0430\u043a\u0443\u043f\u043a\u0435", has_rejected: false };
    }
    if (counts.ok > 0 && counts.bad > 0) {
      return {
        ...request,
        status: "\u0427\u0430\u0441\u0442\u0438\u0447\u043d\u043e \u0443\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u0430",
        has_rejected: true,
      };
    }
    if (counts.pend > 0) {
      if (hasRejected) {
        return {
          ...request,
          status: "\u0427\u0430\u0441\u0442\u0438\u0447\u043d\u043e \u0443\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u0430",
          has_rejected: true,
        };
      }
      return {
        ...request,
        status: "\u041d\u0430 \u0443\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u0438\u0438",
        has_rejected: false,
      };
    }
    if (hasRejected) {
      return {
        ...request,
        status: "\u0427\u0430\u0441\u0442\u0438\u0447\u043d\u043e \u0443\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u0430",
        has_rejected: true,
      };
    }
    return { ...request, has_rejected: false };
  });
}

export async function requestItemCancel(requestItemId: string) {
  if (!requestItemId) {
    throw new Error("requestItemId is required");
  }

  const { error } = await supabase
    .from("request_items")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
    })
    .eq("id", requestItemId);

  if (error) {
    if (__DEV__) console.error("[requestItemCancel]", error);
    throw error;
  }

  return true;
}
