import {
  isRequestItemUpdateQtyResponse,
  validateRpcResponse,
} from "../api/queryBoundary";
import {
  clearCachedDraftRequestId,
  getOrCreateDraftRequestId as getOrCreateLowLevelDraftRequestId,
} from "../api/requests";
import type {
  CatalogRequestItemUpdateQtyArgs,
} from "../../types/contracts/catalog";
import { recordCatalogWarning } from "./catalog.observability";
import {
  asUnknownRecord,
  clamp,
  norm,
  parseNumberValue,
} from "./catalog.compat.shared";
import {
  clearLocalDraftId as clearStoredLocalDraftId,
  getLocalDraftId as getStoredLocalDraftId,
  setLocalDraftId as setStoredLocalDraftId,
} from "./catalog.request.draftLocalState";
import {
  asRequestHeader,
  asRequestStatusRow,
  mapDetailsFromRow,
  mapRequestItemRow,
  mapSummaryFromRow,
  type ForemanRequestSummary,
  type ReqItemRow,
  type RequestDetails,
  type RequestHeader,
  type RequestMetaPatch,
} from "./catalog.request.mapping";
import {
  getCompatErrorInfo,
  isBaseRequestPayloadKey,
  pickBaseRequestPayload,
  type RequestsExtendedMetaUpdate,
} from "./catalog.request.metaPayload";
import {
  cancelCatalogRequestItemRow,
  filterCatalogRequestLinkedRowsByExistingRequestLinks,
  loadCatalogForemanRequestRowsByCreatedBy,
  loadCatalogForemanRequestRowsByName,
  loadCatalogRequestDetailsRowByDisplayNo,
  loadCatalogRequestDetailsRowById,
  loadCatalogRequestDisplayNoViaFallbacks,
  loadCatalogRequestDraftStatusRow,
  loadCatalogRequestExtendedMetaSampleRows,
  loadCatalogRequestItemRows,
  loadCatalogRequestItemStatusRows,
  selectCatalogDynamicReadSingle,
  updateCatalogRequestItemQtyRow,
  updateCatalogRequestItemQtyViaRpc,
  updateCatalogRequestRow,
  type CatalogRequestDisplayNoLookupWarning,
} from "./catalog.request.transport";

export type {
  ForemanRequestSummary,
  ReqItemRow,
  RequestDetails,
  RequestHeader,
  RequestItem,
  RequestMetaPatch,
} from "./catalog.request.mapping";

type RequestListMergedRow = Record<string, unknown>;
type RequestItemStatusAggRow = {
  request_id?: unknown;
  status?: unknown;
};

type RequestItemUpdateQtyArgs = CatalogRequestItemUpdateQtyArgs;

const warnFetchRequestDisplayNoLookup = (
  warning: CatalogRequestDisplayNoLookupWarning,
) => {
  const error = warning.error;
  const message = String((error as Error)?.message ?? "");

  if (warning.stage === "request_header") {
    const normalized = message.toLowerCase();
    if (
      !normalized.includes("permission denied") &&
      !normalized.includes("does not exist")
    ) {
      if (__DEV__)
        console.warn(
          "[catalog_api.fetchRequestDisplayNo] requests:",
          (error as Error)?.message ?? error,
        );
    }
    return;
  }

  if (warning.stage === "rpc") {
    if (!message.includes("function") && !message.includes("does not exist")) {
      if (__DEV__) {
        console.warn(
          `[catalog_api.fetchRequestDisplayNo] rpc ${warning.source}:`,
          (error as Error)?.message ?? error,
        );
      }
    }
    return;
  }

  const normalized = message.toLowerCase();
  if (
    !normalized.includes("permission denied") &&
    !normalized.includes("does not exist")
  ) {
    if (__DEV__)
      console.warn(
        `[catalog_api.fetchRequestDisplayNo] ${warning.source}:`,
        (error as Error)?.message ?? error,
      );
  }
};

const draftStatusKeys = new Set([
  "draft",
  "\u0447\u0435\u0440\u043d\u043e\u0432\u0438\u043a",
]);
const isDraftStatusValue = (value?: string | null) => {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();
  if (!normalized) return false;
  return draftStatusKeys.has(normalized);
};

async function isCachedDraftValid(id: string): Promise<boolean> {
  const rid = norm(id);
  if (!rid) return false;

  try {
    const { data, error } = await loadCatalogRequestDraftStatusRow(rid);
    if (error) throw error;
    const row = asRequestStatusRow(data);
    if (!row?.id) return false;
    return isDraftStatusValue(row.status);
  } catch (error: unknown) {
    const msg = String((error as Error)?.message ?? "").toLowerCase();
    if (!msg.includes("permission denied")) {
      if (__DEV__)
        console.warn(
          "[catalog_api.getOrCreateDraftRequestId] draft check:",
          (error as Error)?.message ?? error,
        );
    }
    return false;
  }
}

let requestsExtendedMetaWriteSupportedCache: boolean | null = null;
let requestsExtendedMetaWriteSupportInFlight: Promise<boolean> | null = null;

async function resolveRequestsExtendedMetaWriteSupport(): Promise<boolean> {
  if (requestsExtendedMetaWriteSupportedCache != null)
    return requestsExtendedMetaWriteSupportedCache;
  if (requestsExtendedMetaWriteSupportInFlight)
    return requestsExtendedMetaWriteSupportInFlight;

  requestsExtendedMetaWriteSupportInFlight = (async () => {
    try {
      const q = await loadCatalogRequestExtendedMetaSampleRows();
      if (q.error) throw q.error;
      const sample =
        Array.isArray(q.data) && q.data.length > 0
          ? (q.data[0] as Record<string, unknown>)
          : null;
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
      const msg =
        error instanceof Error
          ? error.message.toLowerCase()
          : String(error ?? "").toLowerCase();
      const schemaMismatch =
        msg.includes("column") ||
        msg.includes("does not exist") ||
        msg.includes("schema cache");
      requestsExtendedMetaWriteSupportedCache = schemaMismatch ? false : true;
      return requestsExtendedMetaWriteSupportedCache;
    } finally {
      requestsExtendedMetaWriteSupportInFlight = null;
    }
  })();

  return requestsExtendedMetaWriteSupportInFlight;
}

export function getLocalDraftId(): string | null {
  return getStoredLocalDraftId();
}

export function setLocalDraftId(id: string) {
  setStoredLocalDraftId(id);
}

export function clearLocalDraftId() {
  clearStoredLocalDraftId();
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
    if (__DEV__)
      console.warn(
        "[catalog_api.getOrCreateDraftRequestId]",
        error instanceof Error ? error.message : error,
      );
    throw error;
  }

  throw new Error(
    "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0441\u043e\u0437\u0434\u0430\u0442\u044c \u0438\u043b\u0438 \u043f\u043e\u043b\u0443\u0447\u0438\u0442\u044c \u0447\u0435\u0440\u043d\u043e\u0432\u0438\u043a \u0437\u0430\u044f\u0432\u043a\u0438",
  );
}

export async function getRequestHeader(
  requestId: string,
): Promise<RequestHeader | null> {
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
      const { data, error } = await selectCatalogDynamicReadSingle(
        view.src,
        view.cols,
        id,
      );
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

export async function fetchRequestDisplayNo(
  requestId: string,
): Promise<string | null> {
  const id = norm(requestId);
  if (!id) return null;

  const result = await loadCatalogRequestDisplayNoViaFallbacks(id);
  for (const warning of result.warnings)
    warnFetchRequestDisplayNoLookup(warning);
  return result.displayNo;
}

export async function fetchRequestDetails(
  requestId: string,
): Promise<RequestDetails | null> {
  const id = norm(requestId);
  if (!id) return null;
  const requestDetailsSelect = `id,status,display_no,year,seq,created_at,updated_at,need_by,comment,foreman_name,
     object_type_code,level_code,system_code,zone_code,
     object:ref_object_types(*),
     level:ref_levels(*),
     system:ref_systems(*),
     zone:ref_zones(*)`;

  try {
    const { data, error } = await loadCatalogRequestDetailsRowById(
      requestDetailsSelect,
      id,
    );
    if (!error && data) {
      const mapped = mapDetailsFromRow(data);
      if (mapped) return mapped;
    }
    if (error) {
      const msg = String(error.message || "").toLowerCase();
      if (
        !msg.includes("permission denied") &&
        !msg.includes("does not exist")
      ) {
        if (__DEV__)
          console.warn(
            "[catalog_api.fetchRequestDetails] requests:",
            error.message,
          );
      }
    }
  } catch (error: unknown) {
    const msg = String((error as Error)?.message ?? "").toLowerCase();
    if (!msg.includes("permission denied") && !msg.includes("does not exist")) {
      if (__DEV__)
        console.warn(
          "[catalog_api.fetchRequestDetails] requests:",
          (error as Error)?.message ?? error,
        );
    }
  }

  const views = ["v_requests_display", "v_request_pdf_header"] as const;
  for (const view of views) {
    try {
      const { data, error } = await selectCatalogDynamicReadSingle(
        view,
        "*",
        id,
      );
      if (!error && data) {
        const mapped = mapDetailsFromRow(data);
        if (mapped) return mapped;
      }
      if (error) {
        const msg = String(error.message || "").toLowerCase();
        if (
          !msg.includes("permission denied") &&
          !msg.includes("does not exist")
        ) {
          if (__DEV__)
            console.warn(
              `[catalog_api.fetchRequestDetails] ${view}:`,
              error.message,
            );
        }
      }
    } catch (error: unknown) {
      const msg = String((error as Error)?.message ?? "").toLowerCase();
      if (
        !msg.includes("permission denied") &&
        !msg.includes("does not exist")
      ) {
        if (__DEV__)
          console.warn(
            `[catalog_api.fetchRequestDetails] ${view}:`,
            (error as Error)?.message ?? error,
          );
      }
    }
  }

  try {
    const { data, error } = await loadCatalogRequestDetailsRowByDisplayNo(
      requestDetailsSelect,
      id,
    );
    if (!error && data) {
      const mapped = mapDetailsFromRow(data);
      if (mapped) return mapped;
    }
    if (error) {
      const msg = String(error.message || "").toLowerCase();
      if (
        !msg.includes("permission denied") &&
        !msg.includes("does not exist")
      ) {
        if (__DEV__)
          console.warn(
            "[catalog_api.fetchRequestDetails] requests.display_no:",
            error.message,
          );
      }
    }
  } catch (error: unknown) {
    const msg = String((error as Error)?.message ?? "").toLowerCase();
    if (!msg.includes("permission denied") && !msg.includes("does not exist")) {
      if (__DEV__)
        console.warn(
          "[catalog_api.fetchRequestDetails] requests.display_no:",
          (error as Error)?.message ?? error,
        );
    }
  }

  for (const view of views) {
    try {
      const { data, error } = await selectCatalogDynamicReadSingle(
        view,
        "*",
        id,
        "display_no",
      );
      if (!error && data) {
        const mapped = mapDetailsFromRow(data);
        if (mapped) return mapped;
      }
      if (error) {
        const msg = String(error.message || "").toLowerCase();
        if (
          !msg.includes("permission denied") &&
          !msg.includes("does not exist")
        ) {
          if (__DEV__)
            console.warn(
              `[catalog_api.fetchRequestDetails] ${view}.display_no:`,
              error.message,
            );
        }
      }
    } catch (error: unknown) {
      const msg = String((error as Error)?.message ?? "").toLowerCase();
      if (
        !msg.includes("permission denied") &&
        !msg.includes("does not exist")
      ) {
        if (__DEV__)
          console.warn(
            `[catalog_api.fetchRequestDetails] ${view}.display_no:`,
            (error as Error)?.message ?? error,
          );
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
  if (Object.prototype.hasOwnProperty.call(patch, "need_by"))
    payload.need_by = norm(patch.need_by) || null;
  if (Object.prototype.hasOwnProperty.call(patch, "comment"))
    payload.comment = norm(patch.comment) || null;
  if (Object.prototype.hasOwnProperty.call(patch, "object_type_code"))
    payload.object_type_code = patch.object_type_code || null;
  if (Object.prototype.hasOwnProperty.call(patch, "level_code"))
    payload.level_code = patch.level_code || null;
  if (Object.prototype.hasOwnProperty.call(patch, "system_code"))
    payload.system_code = patch.system_code || null;
  if (Object.prototype.hasOwnProperty.call(patch, "zone_code"))
    payload.zone_code = patch.zone_code || null;
  if (Object.prototype.hasOwnProperty.call(patch, "foreman_name"))
    payload.foreman_name = norm(patch.foreman_name) || null;
  if (Object.prototype.hasOwnProperty.call(patch, "contractor_job_id"))
    payload.contractor_job_id = norm(patch.contractor_job_id) || null;
  if (Object.prototype.hasOwnProperty.call(patch, "subcontract_id"))
    payload.subcontract_id = norm(patch.subcontract_id) || null;
  if (Object.prototype.hasOwnProperty.call(patch, "contractor_org"))
    payload.contractor_org = norm(patch.contractor_org) || null;
  if (Object.prototype.hasOwnProperty.call(patch, "subcontractor_org"))
    payload.subcontractor_org = norm(patch.subcontractor_org) || null;
  if (Object.prototype.hasOwnProperty.call(patch, "contractor_phone"))
    payload.contractor_phone = norm(patch.contractor_phone) || null;
  if (Object.prototype.hasOwnProperty.call(patch, "subcontractor_phone"))
    payload.subcontractor_phone = norm(patch.subcontractor_phone) || null;
  if (Object.prototype.hasOwnProperty.call(patch, "planned_volume"))
    payload.planned_volume = parseNumberValue(patch.planned_volume);
  if (Object.prototype.hasOwnProperty.call(patch, "qty_plan"))
    payload.qty_plan = parseNumberValue(patch.qty_plan);
  if (Object.prototype.hasOwnProperty.call(patch, "volume"))
    payload.volume = parseNumberValue(patch.volume);
  if (Object.prototype.hasOwnProperty.call(patch, "object_name"))
    payload.object_name = norm(patch.object_name) || null;
  if (Object.prototype.hasOwnProperty.call(patch, "level_name"))
    payload.level_name = norm(patch.level_name) || null;
  if (Object.prototype.hasOwnProperty.call(patch, "system_name"))
    payload.system_name = norm(patch.system_name) || null;
  if (Object.prototype.hasOwnProperty.call(patch, "zone_name"))
    payload.zone_name = norm(patch.zone_name) || null;

  if (!Object.keys(payload).length) return true;

  const hasExtendedPayload = Object.keys(payload).some(
    (key) => !isBaseRequestPayloadKey(key),
  );

  try {
    const fullPayloadAllowed =
      !hasExtendedPayload ||
      requestsExtendedMetaWriteSupportedCache === true ||
      (requestsExtendedMetaWriteSupportedCache == null &&
        (await resolveRequestsExtendedMetaWriteSupport()));
    const primaryPayload = fullPayloadAllowed
      ? payload
      : pickBaseRequestPayload(payload);
    let { error } = await updateCatalogRequestRow(id, primaryPayload);

    if (!error && hasExtendedPayload && fullPayloadAllowed) {
      requestsExtendedMetaWriteSupportedCache = true;
    }

    if (error && hasExtendedPayload && fullPayloadAllowed) {
      const primaryErr = error;
      const fallbackPayload = pickBaseRequestPayload(payload);
      const msg = String(error?.message ?? "").toLowerCase();
      if (
        msg.includes("column") ||
        msg.includes("does not exist") ||
        msg.includes("schema cache")
      ) {
        requestsExtendedMetaWriteSupportedCache = false;
      }
      if (Object.keys(fallbackPayload).length) {
        const fallbackRes = await updateCatalogRequestRow(id, fallbackPayload);
        if (fallbackRes.error) {
          if (__DEV__)
            console.warn("[catalog_api.updateRequestMeta][patch400.fallback]", {
              request_id: id,
              payload_keys: Object.keys(fallbackPayload).sort(),
              error: getCompatErrorInfo(fallbackRes.error),
            });
        }
        if (primaryErr) {
          if (__DEV__)
            console.warn("[catalog_api.updateRequestMeta][patch400.primary]", {
              request_id: id,
              payload_keys: Object.keys(primaryPayload).sort(),
              error: getCompatErrorInfo(primaryErr),
            });
        }
        error = fallbackRes.error ?? null;
      }
    }

    if (error) {
      if (__DEV__)
        console.warn(
          "[catalog_api.updateRequestMeta] table requests:",
          error.message,
        );
      return false;
    }

    return true;
  } catch (error: unknown) {
    if (__DEV__)
      console.warn(
        "[catalog_api.updateRequestMeta] table requests:",
        error instanceof Error ? error.message : error,
      );
    return false;
  }
}

export async function listRequestItems(
  requestId: string,
): Promise<ReqItemRow[]> {
  const id = norm(requestId);
  if (!id) return [];

  try {
    const { data, error } = await loadCatalogRequestItemRows(id);

    if (error) {
      if (__DEV__)
        console.warn(
          "[catalog_api.listRequestItems] request_items:",
          (error as Error)?.message ?? error,
        );
      return [];
    }

    if (!Array.isArray(data) || !data.length) return [];

    const rows = Array.isArray(data) ? (data as unknown[]) : [];
    const mapped = rows
      .map((row) => mapRequestItemRow(row, id))
      .filter((row): row is ReqItemRow => !!row);
    const guarded = await filterCatalogRequestLinkedRowsByExistingRequestLinks(
      mapped,
      {
        screen: "request",
        surface: "catalog_list_request_items",
        sourceKind: "table:request_items",
        relation: "request_items.request_id->requests.id",
      },
    );

    return guarded.rows.sort((a, b) => (a.line_no ?? 0) - (b.line_no ?? 0));
  } catch (error: unknown) {
    if (__DEV__)
      console.warn(
        "[catalog_api.listRequestItems] request_items:",
        (error as Error)?.message ?? error,
      );
    return [];
  }
}

export async function requestItemUpdateQty(
  requestItemId: string,
  qty: number,
  requestIdHint?: string,
): Promise<ReqItemRow | null> {
  const id = norm(requestItemId);
  if (!id)
    throw new Error(
      "\u041d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d \u0438\u0434\u0435\u043d\u0442\u0438\u0444\u0438\u043a\u0430\u0442\u043e\u0440 \u043f\u043e\u0437\u0438\u0446\u0438\u0438",
    );

  const numericQty = Number(qty);
  if (!Number.isFinite(numericQty) || numericQty <= 0) {
    throw new Error(
      "\u041a\u043e\u043b\u0438\u0447\u0435\u0441\u0442\u0432\u043e \u0434\u043e\u043b\u0436\u043d\u043e \u0431\u044b\u0442\u044c \u0431\u043e\u043b\u044c\u0448\u0435 \u043d\u0443\u043b\u044f",
    );
  }

  const rid = requestIdHint ? norm(requestIdHint) : "";
  let lastErr: unknown = null;

  try {
    const args: RequestItemUpdateQtyArgs = {
      p_request_item_id: id,
      p_qty: numericQty,
    };
    const { data, error } = await updateCatalogRequestItemQtyViaRpc(args);
    if (!error && data) {
      const validated = validateRpcResponse(
        data,
        isRequestItemUpdateQtyResponse,
        {
          rpcName: "request_item_update_qty",
          caller:
            "src/lib/catalog/catalog.request.service.requestItemUpdateQty",
          domain: "catalog",
        },
      );
      const mapped = mapRequestItemRow(validated, rid || "");
      if (mapped) return mapped;
    } else if (error) {
      lastErr = error;
    }
  } catch (error: unknown) {
    lastErr = error;
  }

  try {
    const { data, error } = await updateCatalogRequestItemQtyRow(
      id,
      numericQty,
    );
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
  const results: { data: unknown; error: { message?: string } | null }[] = [];
  if (name) {
    results.push(await loadCatalogForemanRequestRowsByName(name, take));
  }
  if (uid) {
    results.push(await loadCatalogForemanRequestRowsByCreatedBy(uid, take));
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

  const { data: itemRows, error: itemErr } =
    await loadCatalogRequestItemStatusRows(ids);

  if (itemErr || !Array.isArray(itemRows)) {
    return mapped;
  }

  const normSt = (status: unknown) =>
    String(status ?? "")
      .trim()
      .toLowerCase();
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
    status ===
      "\u043d\u0430 \u0443\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u0438\u0438" ||
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
    const cur = agg.get(requestId) ?? {
      total: 0,
      ok: 0,
      bad: 0,
      pend: 0,
      cancelled: 0,
    };
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
      return {
        ...request,
        status: "\u041e\u0442\u043c\u0435\u043d\u0435\u043d\u0430",
        has_rejected: false,
      };
    }
    if (counts.bad === counts.total) {
      return {
        ...request,
        status: "\u041e\u0442\u043a\u043b\u043e\u043d\u0435\u043d\u0430",
        has_rejected: true,
      };
    }
    if (counts.ok === counts.total) {
      return {
        ...request,
        status: "\u041a \u0437\u0430\u043a\u0443\u043f\u043a\u0435",
        has_rejected: false,
      };
    }
    if (counts.ok > 0 && counts.bad > 0) {
      return {
        ...request,
        status:
          "\u0427\u0430\u0441\u0442\u0438\u0447\u043d\u043e \u0443\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u0430",
        has_rejected: true,
      };
    }
    if (counts.pend > 0) {
      if (hasRejected) {
        return {
          ...request,
          status:
            "\u0427\u0430\u0441\u0442\u0438\u0447\u043d\u043e \u0443\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u0430",
          has_rejected: true,
        };
      }
      return {
        ...request,
        status:
          "\u041d\u0430 \u0443\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u0438\u0438",
        has_rejected: false,
      };
    }
    if (hasRejected) {
      return {
        ...request,
        status:
          "\u0427\u0430\u0441\u0442\u0438\u0447\u043d\u043e \u0443\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u0430",
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

  const { error } = await cancelCatalogRequestItemRow(
    requestItemId,
    new Date().toISOString(),
  );

  if (error) {
    if (__DEV__) console.error("[requestItemCancel]", error);
    throw error;
  }

  return true;
}
