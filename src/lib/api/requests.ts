import type { Database } from "../database.types";
import { recordPlatformObservability } from "../observability/platformObservability";
import { client, normalizeUuid, parseErr, toFilterId } from "./_core";
import { ensureRequestExists } from "./integrity.guards";
import {
  addOrIncrementRequestItemFromTransport,
  updateRequestItemMetaFromTransport,
  type RequestItemAddOrIncTransportArgs,
  type RequestItemMetaPatchTransport,
} from "./requests.itemMutations.transport";
import { resolveCurrentRequestUserId } from "./requests.auth.transport";
import {
  mapRequestRow,
  parseRequestItemsByRequestRows,
  parseRequestSubmitAtomicResult,
} from "./requests.parsers";
import {
  buildRequestSelectSchemaSafe,
} from "./requests.read-capabilities";
import {
  selectRequestIdByFilterFromTransport,
  selectRequestRecordByIdFromTransport,
  type RequestIdLookupRow,
} from "./requests.read.transport";
import {
  REQUEST_DRAFT_EN,
  REQUEST_DRAFT_STATUS,
  normalizeStatus,
} from "./requests.status";
import { allSettledWithConcurrencyLimit } from "../async/mapWithConcurrencyLimit";
import {
  isRpcArrayResponse,
  isRpcNonEmptyStringResponse,
  isRpcNullableNonEmptyStringResponse,
  validateRpcResponse,
} from "./queryBoundary";
import type { ReqItemRow, RequestMeta, RequestRecord } from "./types";

const logRequestsDebug = (...args: unknown[]) => {
  if ((globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__ === true) {
    console.warn(...args);
  }
};

// cache id черновика на сессию (uuid или int)
let _draftRequestIdAny: string | number | null = null;

type RequestsTable = Database["public"]["Tables"]["requests"];
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
type RequestItemMetaPatch = RequestItemMetaPatchTransport;
type RequestItemAddOpts = {
  note?: string | null;
  app_code?: string | null;
  kind?: string | null;
  name_human?: string | null;
  uom?: string | null;
};
type RequestItemBatchInput = {
  rik_code: string;
  qty: number;
  opts?: RequestItemAddOpts;
};
type RequestItemAddResult = {
  item_id: string;
  rik_code: string;
};
type RequestDraftSelectRow = Pick<
  RequestsTable["Row"],
  | "id"
  | "status"
  | "display_no"
  | "need_by"
  | "comment"
  | "foreman_name"
  | "object_type_code"
  | "level_code"
  | "system_code"
  | "zone_code"
  | "created_at"
>;
type RequestItemAddOrIncArgs = RequestItemAddOrIncTransportArgs;
type RequestItemAddOrIncResult = Database["public"]["Functions"]["request_item_add_or_inc"]["Returns"];
type RequestItemsByRequestArgs = Database["public"]["Functions"]["request_items_by_request"]["Args"];
type RequestFindReusableEmptyDraftArgs =
  Database["public"]["Functions"]["request_find_reusable_empty_draft_v1"]["Args"];
type RequestSubmitAtomicArgs =
  Database["public"]["Functions"]["request_submit_atomic_v1"]["Args"];
type RequestDraftCacheProbeRow = Pick<RequestsTable["Row"], "id" | "status" | "created_by" | "submitted_at">;
export type RequestSubmitPath =
  | "rpc_submit"
  | "server_reconcile_existing";
type RequestSubmitPreconditionsResolved = {
  request_id: string;
  request_filter_id: string;
  request_read_select: string;
};
export type RequestSubmitMutationResult = {
  request_id: string;
  path: RequestSubmitPath;
  has_post_draft_items: boolean;
  record: RequestRecord | null;
  reconciled: boolean;
  request_items_pending_synced: boolean;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type RequestSubmitAtomicSuccess = {
  ok: true;
  requestId: string;
  submitPath: RequestSubmitPath;
  hasPostDraftItems: boolean;
  reconciled: boolean;
  record: RequestRecord | null;
  verification: Record<string, unknown> | null;
};

type RequestSubmitAtomicFailure = {
  ok: false;
  requestId: string;
  failureCode: string;
  failureMessage: string;
  validation: Record<string, unknown> | null;
  invalidItemIds: string[];
};

type RequestReopenAtomicSuccess = {
  ok: true;
  requestId: string;
  transitionPath: "rpc_reopen" | "already_draft";
  restoredItemCount: number;
  record: RequestRecord | null;
  verification: Record<string, unknown> | null;
};

type RequestReopenAtomicFailure = {
  ok: false;
  requestId: string;
  failureCode: string;
  failureMessage: string;
  verification: Record<string, unknown> | null;
};

class RequestSubmitAtomicError extends Error {
  readonly code: string;
  readonly requestId: string;
  readonly validation: Record<string, unknown> | null;
  readonly invalidItemIds: string[];

  constructor(result: RequestSubmitAtomicFailure) {
    super(result.failureMessage || result.failureCode || "request_submit_atomic_v1 failed");
    this.name = "RequestSubmitAtomicError";
    this.code = result.failureCode;
    this.requestId = result.requestId;
    this.validation = result.validation;
    this.invalidItemIds = result.invalidItemIds;
  }
}

class RequestReopenAtomicError extends Error {
  readonly code: string;
  readonly requestId: string;
  readonly verification: Record<string, unknown> | null;

  constructor(result: RequestReopenAtomicFailure) {
    super(result.failureMessage || result.failureCode || "request_reopen_atomic_v1 failed");
    this.name = "RequestReopenAtomicError";
    this.code = result.failureCode;
    this.requestId = result.requestId;
    this.verification = result.verification;
  }
}

const REQUEST_DRAFT_SELECT =
  "id,status,display_no,need_by,comment,foreman_name,object_type_code,level_code,system_code,zone_code,created_at";

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

// ============================== Boundary builders ==============================
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
  opts?: RequestItemAddOpts,
): RequestItemMetaPatch {
  const patch: RequestItemMetaPatch = { status: REQUEST_DRAFT_STATUS };
  if (Object.prototype.hasOwnProperty.call(opts ?? {}, "note")) patch.note = opts?.note ?? null;
  if (Object.prototype.hasOwnProperty.call(opts ?? {}, "app_code")) patch.app_code = opts?.app_code ?? null;
  if (Object.prototype.hasOwnProperty.call(opts ?? {}, "kind")) patch.kind = opts?.kind ?? null;
  if (Object.prototype.hasOwnProperty.call(opts ?? {}, "name_human") && opts?.name_human) patch.name_human = opts.name_human;
  if (Object.prototype.hasOwnProperty.call(opts ?? {}, "uom") && opts?.uom != null) {
    patch.uom = opts.uom;
  }
  return patch;
}

function buildRequestSubmitAtomicArgs(requestId: string): RequestSubmitAtomicArgs {
  return { p_request_id_text: requestId };
}

function buildRequestReopenAtomicArgs(requestId: string): { p_request_id_text: string } {
  return { p_request_id_text: requestId };
}

function parseRequestReopenAtomicResult(data: unknown): RequestReopenAtomicSuccess | RequestReopenAtomicFailure {
  const payload = isRecord(data) ? data : {};
  const ok = payload.ok === true;
  const requestId = String(payload.request_id ?? payload.requestId ?? "").trim();
  const verification = isRecord(payload.verification) ? payload.verification : null;

  if (!ok) {
    return {
      ok: false,
      requestId,
      failureCode: String(payload.failure_code ?? payload.failureCode ?? "request_reopen_failed"),
      failureMessage: String(
        payload.failure_message ?? payload.failureMessage ?? "Request reopen was rejected by server truth.",
      ),
      verification,
    };
  }

  const transitionPathRaw = String(payload.transition_path ?? payload.transitionPath ?? "rpc_reopen").trim();
  const transitionPath: RequestReopenAtomicSuccess["transitionPath"] =
    transitionPathRaw === "already_draft" ? "already_draft" : "rpc_reopen";

  return {
    ok: true,
    requestId,
    transitionPath,
    restoredItemCount: Number(payload.restored_item_count ?? payload.restoredItemCount ?? 0),
    record: mapRequestRow(payload.request),
    verification,
  };
}

const isRequestSubmitAtomicRpcResponse = (value: unknown): value is Record<string, unknown> => {
  if (!isRecord(value) || typeof value.ok !== "boolean") return false;

  if (value.ok === false) {
    return (
      String(value.failure_code ?? value.failureCode ?? "").trim().length > 0 ||
      String(value.failure_message ?? value.failureMessage ?? "").trim().length > 0
    );
  }

  return (
    (value.request == null || isRecord(value.request)) &&
    (value.verification == null || isRecord(value.verification))
  );
};

const isRequestReopenAtomicRpcResponse = (value: unknown): value is Record<string, unknown> => {
  if (!isRecord(value) || typeof value.ok !== "boolean") return false;

  if (value.ok === false) {
    return (
      String(value.failure_code ?? value.failureCode ?? "").trim().length > 0 ||
      String(value.failure_message ?? value.failureMessage ?? "").trim().length > 0
    );
  }

  const transitionPath = String(value.transition_path ?? value.transitionPath ?? "rpc_reopen").trim();
  return (
    (transitionPath === "rpc_reopen" || transitionPath === "already_draft") &&
    (value.request == null || isRecord(value.request)) &&
    (value.verification == null || isRecord(value.verification))
  );
};

export function clearCachedDraftRequestId() {
  _draftRequestIdAny = null;
}

const isDraftRequestStatusValue = (raw: unknown): boolean => {
  const normalized = normalizeStatus(raw);
  if (!normalized) return false;
  return normalized === REQUEST_DRAFT_EN || normalized === normalizeStatus(REQUEST_DRAFT_STATUS);
};

async function resolveDraftOwnerUserId(): Promise<string | null> {
  try {
    return await resolveCurrentRequestUserId();
  } catch (error) {
    recordPlatformObservability({
      screen: "request",
      surface: "draft",
      category: "reload",
      event: "draft_owner_resolve_failed",
      result: "error",
      sourceKind: "auth_session",
      errorStage: "session_lookup",
      errorClass: error instanceof Error ? error.name : undefined,
      errorMessage: parseErr(error),
    });
    return null;
  }
}

async function isCachedDraftRequestIdValid(requestId: number | string): Promise<boolean> {
  const requestFilterId = normalizeRequestFilterId(requestId);
  if (!requestFilterId) return false;

  const result = await client
    .from("requests")
    .select("id,status,created_by,submitted_at")
    .eq("id", requestFilterId)
    .maybeSingle<RequestDraftCacheProbeRow>();

  if (result.error) throw result.error;

  const row = result.data ?? null;
  if (!row?.id) return false;
  if (!isDraftRequestStatusValue(row.status ?? null)) return false;
  if (row.submitted_at != null) return false;

  const ownerUserId = await resolveDraftOwnerUserId();
  const createdBy = String(row.created_by ?? "").trim();
  if (ownerUserId && createdBy && createdBy !== ownerUserId) return false;

  return true;
}

async function findReusableEmptyDraftRequestId(): Promise<string | null> {
  const userId = await resolveDraftOwnerUserId();
  if (!userId) return null;

  try {
    const args: RequestFindReusableEmptyDraftArgs = { p_user_id: userId };
    const { data, error } = await client.rpc("request_find_reusable_empty_draft_v1", args);
    if (error) throw error;

    const reusableIdRaw = validateRpcResponse(data, isRpcNullableNonEmptyStringResponse, {
      rpcName: "request_find_reusable_empty_draft_v1",
      caller: "findReusableEmptyDraftRequestId",
      domain: "proposal",
    });
    const reusableId = normalizeRequestFilterId(String(reusableIdRaw ?? ""));
    if (!reusableId) return null;

    _draftRequestIdAny = reusableId;
    recordPlatformObservability({
      screen: "request",
      surface: "draft",
      category: "reload",
      event: "draft_reused_existing",
      result: "success",
      sourceKind: "rpc:request_find_reusable_empty_draft_v1",
      extra: {
        requestId: reusableId,
      },
    });
    return reusableId;
  } catch (error) {
    recordPlatformObservability({
      screen: "request",
      surface: "draft",
      category: "reload",
      event: "draft_reuse_probe_failed",
      result: "error",
      sourceKind: "rpc:request_find_reusable_empty_draft_v1",
      errorStage: "rpc_probe",
      errorClass: error instanceof Error ? error.name : undefined,
      errorMessage: parseErr(error),
    });
    return null;
  }
}

async function reuseExistingDraftRequest(
  requestId: number | string,
  meta?: RequestMeta,
): Promise<RequestRecord | null> {
  const requestFilterId = normalizeRequestFilterId(requestId);
  if (!requestFilterId) return null;

  const payload = buildRequestDraftInsert(meta);
  const result = await client
    .from("requests")
    .update(payload)
    .eq("id", requestFilterId)
    .select(REQUEST_DRAFT_SELECT)
    .maybeSingle();

  if (result.error) throw result.error;

  const row = mapRequestRow(result.data as RequestDraftSelectRow | null);
  if (!row?.id) return null;

  _draftRequestIdAny = row.id;
  return row;
}

async function insertDraftRequest(meta?: RequestMeta): Promise<RequestRecord | null> {
  const payload = buildRequestDraftInsert(meta);

  const { data, error } = await client
    .from("requests")
    .insert(payload)
    .select(REQUEST_DRAFT_SELECT)
    .single();

  if (error) throw error;

  const row = mapRequestRow(data as RequestDraftSelectRow | null);
  if (!row?.id) {
    throw new Error("requests.insert returned invalid payload");
  }

  _draftRequestIdAny = row.id;
  recordPlatformObservability({
    screen: "request",
    surface: "draft",
    category: "reload",
    event: "draft_created_new",
    result: "success",
    sourceKind: "table:requests.insert",
    extra: {
      requestId: row.id,
    },
  });
  return row;
}

// ============================== Low-level request helpers ==============================
async function selectRequestIdByFilter(requestFilterId: string): Promise<RequestIdLookupRow | null> {
  const found = await selectRequestIdByFilterFromTransport(requestFilterId);

  if (found.error) throw found.error;
  return found.data ?? null;
}

async function upsertDraftRequestId(requestId: number | string): Promise<RequestIdLookupRow | null> {
  const up = await client
    .from("requests")
    .upsert(buildRequestDraftUpsert(requestId), { onConflict: "id" })
    .select("id")
    .single();

  if (up.error) throw up.error;
  return up.data ?? null;
}

async function selectRequestRecordById(
  requestFilterId: string,
  requestReadSelect: string,
): Promise<RequestRecord | null> {
  const existing = await selectRequestRecordByIdFromTransport(requestFilterId, requestReadSelect);

  if (existing.error) throw existing.error;
  return existing.data ? mapRequestRow(existing.data) : null;
}

async function patchRequestItemMeta(itemId: string, patch: RequestItemMetaPatch): Promise<void> {
  const updateResult = await updateRequestItemMetaFromTransport(itemId, patch);
  if (updateResult.error) throw updateResult.error;
}

// ============================== Requests / Items ==============================
export async function listRequestItems(requestId: number | string): Promise<ReqItemRow[]> {
  try {
    const raw = String(requestId ?? "").trim();
    if (!raw) return [];
    await ensureRequestExists(client, raw, {
      screen: "request",
      surface: "list_request_items",
      sourceKind: "read:request_items_by_request",
    });

    const args: RequestItemsByRequestArgs = { p_request_id: raw };
    // SCALE_BOUND_EXCEPTION: parent-scoped request item RPC has no pagination args; replace with DB function pagination when the RPC contract changes.
    const { data, error } = await client.rpc("request_items_by_request", args);
    if (error) throw error;

    const validated = validateRpcResponse(data, isRpcArrayResponse, {
      rpcName: "request_items_by_request",
      caller: "listRequestItems",
      domain: "proposal",
    });
    return parseRequestItemsByRequestRows(validated);
  } catch (e) {
    logRequestsDebug("[listRequestItems]", getErrorMessage(e));
    return [];
  }
}

export async function requestCreateDraft(meta?: RequestMeta): Promise<RequestRecord | null> {
  try {
    const reusableId = await findReusableEmptyDraftRequestId();
    if (reusableId) {
      try {
        const reused = await reuseExistingDraftRequest(reusableId, meta);
        if (reused?.id) return reused;
      } catch (error) {
        recordPlatformObservability({
          screen: "request",
          surface: "draft",
          category: "reload",
          event: "draft_reuse_prepare_failed",
          result: "error",
          sourceKind: "table:requests.update",
          errorStage: "reuse_prepare",
          errorClass: error instanceof Error ? error.name : undefined,
          errorMessage: parseErr(error),
          extra: {
            requestId: reusableId,
          },
        });
      }
    }

    const created = await insertDraftRequest(meta);
    if (created?.id) {
      return created;
    }
  } catch (e) {
    logRequestsDebug("[requestCreateDraft]", parseErr(e));
    throw e;
  }

  throw new Error("requestCreateDraft returned invalid payload");
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
  if (_draftRequestIdAny != null) {
    try {
      const valid = await isCachedDraftRequestIdValid(_draftRequestIdAny);
      if (valid) return _draftRequestIdAny;
      recordPlatformObservability({
        screen: "request",
        surface: "draft",
        category: "reload",
        event: "draft_cached_id_invalidated",
        result: "success",
        sourceKind: "table:requests",
        extra: {
          requestId: String(_draftRequestIdAny),
        },
      });
    } catch (error) {
      recordPlatformObservability({
        screen: "request",
        surface: "draft",
        category: "reload",
        event: "draft_cached_id_validation_failed",
        result: "error",
        sourceKind: "table:requests",
        errorStage: "cached_id_probe",
        errorClass: error instanceof Error ? error.name : undefined,
        errorMessage: parseErr(error),
        extra: {
          requestId: String(_draftRequestIdAny),
        },
      });
    }
    _draftRequestIdAny = null;
  }
  const reusableId = await findReusableEmptyDraftRequestId();
  if (reusableId) return reusableId;
  const created = await insertDraftRequest();
  if (created?.id) return created.id;
  throw new Error("requestCreateDraft returned invalid id");
}

export async function ensureRequest(requestId: number | string): Promise<number | string> {
  const rid = requestId;
  const requestFilterId = normalizeRequestFilterId(rid);

  try {
    const found = await selectRequestIdByFilter(requestFilterId);
    if (found?.id != null) return found.id;
  } catch (e) {
    logRequestsDebug("[ensureRequest/select]", parseErr(e));
  }

  try {
    const up = await upsertDraftRequestId(rid);
    if (up?.id != null) return up.id;
  } catch (e) {
    logRequestsDebug("[ensureRequest/upsert]", parseErr(e));
  }

  return rid;
}

export async function addRequestItemFromRik(
  requestId: number | string,
  rik_code: string,
  qty: number,
  opts?: RequestItemAddOpts,
): Promise<boolean> {
  await addRequestItemFromRikDetailed(requestId, rik_code, qty, opts);
  return true;
}

export async function addRequestItemFromRikDetailed(
  requestId: number | string,
  rik_code: string,
  qty: number,
  opts?: RequestItemAddOpts,
): Promise<RequestItemAddResult> {
  if (!rik_code) throw new Error("rik_code required");

  const q = Number(qty);
  if (!Number.isFinite(q) || q <= 0) throw new Error("qty must be > 0");

  const rid = normalizeRequestFilterId(requestId);
  if (!rid) throw new Error("request_id is empty");
  await ensureRequestExists(client, rid, {
    screen: "request",
    surface: "add_request_item",
    sourceKind: "mutation:request_item_add_or_inc",
  });

  const { data, error } = await addOrIncrementRequestItemFromTransport(
    buildRequestItemAddOrIncArgs(rid, rik_code, q),
  );

  if (error) throw error;

  const validated = validateRpcResponse(data, isRpcNonEmptyStringResponse, {
    rpcName: "request_item_add_or_inc",
    caller: "addRequestItemFromRikDetailed",
    domain: "proposal",
  });
  const itemId = parseRequestItemAddOrIncResult(validated);
  if (!itemId) throw new Error("request_item_add_or_inc returned empty id");

  const patch = buildRequestItemMetaPatch(opts);

  try {
    await patchRequestItemMeta(itemId, patch);
  } catch (e) {
    logRequestsDebug("[addRequestItemFromRik/patch]", parseErr(e));
  }

  return {
    item_id: itemId,
    rik_code,
  };
}

export async function addRequestItemsFromRikBatch(
  requestId: number | string,
  items: RequestItemBatchInput[],
): Promise<number> {
  const results = await addRequestItemsFromRikBatchDetailed(requestId, items);
  return results.length;
}

export async function addRequestItemsFromRikBatchDetailed(
  requestId: number | string,
  items: RequestItemBatchInput[],
): Promise<RequestItemAddResult[]> {
  const rid = normalizeRequestFilterId(requestId);
  if (!rid) throw new Error("request_id is empty");

  const prepared = (items || []).map((item) => ({
    rik_code: String(item?.rik_code ?? "").trim(),
    qty: Number(item?.qty),
    opts: item?.opts,
  }));
  if (!prepared.length) return [];

  for (const item of prepared) {
    if (!item.rik_code) throw new Error("rik_code required");
    if (!Number.isFinite(item.qty) || item.qty <= 0) throw new Error("qty must be > 0");
  }

  const chunkSize = 8;
  const addedItems: RequestItemAddResult[] = [];

  for (let idx = 0; idx < prepared.length; idx += chunkSize) {
    const pack = prepared.slice(idx, idx + chunkSize);
    const results = await allSettledWithConcurrencyLimit(
      pack,
      3,
      async (item) => addRequestItemFromRikDetailed(rid, item.rik_code, item.qty, item.opts),
    );

    let firstError: unknown = null;
    for (const result of results) {
      if (result.status === "fulfilled") {
        addedItems.push(result.value);
        continue;
      }
      if (firstError == null) firstError = result.reason;
    }

    if (firstError != null) {
      logRequestsDebug("[addRequestItemsFromRikBatch]", {
        okCount: addedItems.length,
        total: prepared.length,
        failedAt: idx,
        error: parseErr(firstError),
      });
      throw firstError;
    }
  }

  return addedItems;
}

async function resolveRequestSubmitPreconditions(
  requestId: number | string,
): Promise<RequestSubmitPreconditionsResolved> {
  const asStr = String(requestId ?? "").trim();
  const request_id = normalizeUuid(asStr) ?? asStr;
  if (!request_id) throw new Error("request_id is empty");

  return {
    request_id,
    request_filter_id: normalizeRequestFilterId(requestId),
    request_read_select: await buildRequestSelectSchemaSafe(),
  };
}

async function runRequestSubmitAtomicStage(
  preconditions: RequestSubmitPreconditionsResolved,
): Promise<RequestSubmitMutationResult> {
  try {
    const { data, error } = await client.rpc(
      "request_submit_atomic_v1",
      buildRequestSubmitAtomicArgs(preconditions.request_id),
    );
    if (error) throw error;

    const validated = validateRpcResponse(data, isRequestSubmitAtomicRpcResponse, {
      rpcName: "request_submit_atomic_v1",
      caller: "runRequestSubmitAtomicStage",
      domain: "proposal",
    });
    const result = parseRequestSubmitAtomicResult(validated);
    if (result.ok === false) {
      recordPlatformObservability({
        screen: "request",
        surface: "submit",
        category: "reload",
        event: "request_submit_atomic_failed",
        result: "error",
        sourceKind: "rpc:request_submit_atomic_v1",
        errorStage: "controlled_failure",
        errorClass: "RequestSubmitAtomicError",
        errorMessage: result.failureMessage,
        extra: {
          requestId: result.requestId || preconditions.request_id,
          failureCode: result.failureCode,
          invalidItemIds: result.invalidItemIds,
          validation: result.validation,
        },
      });
      throw new RequestSubmitAtomicError(result);
    }

    const submitPath: RequestSubmitPath =
      result.submitPath === "server_reconcile_existing"
        ? "server_reconcile_existing"
        : "rpc_submit";

    const requestFilterId = normalizeRequestFilterId(result.requestId || preconditions.request_id);
    const hydratedRecord =
      (requestFilterId
        ? await selectRequestRecordById(requestFilterId, preconditions.request_read_select)
        : null) ?? result.record;

    if (!hydratedRecord) {
      throw new Error(`[requestSubmit/${result.submitPath}] request record missing after submit`);
    }

    if (
      _draftRequestIdAny != null &&
      String(_draftRequestIdAny) === String(preconditions.request_id)
    ) {
      _draftRequestIdAny = null;
    }

    recordPlatformObservability({
      screen: "request",
      surface: "submit",
      category: "reload",
      event: "request_submit_atomic_succeeded",
      result: "success",
      sourceKind: "rpc:request_submit_atomic_v1",
      extra: {
        requestId: result.requestId || preconditions.request_id,
        submitPath,
        hasPostDraftItems: result.hasPostDraftItems,
        reconciled: result.reconciled,
        verification: result.verification,
      },
    });

    return {
      request_id: result.requestId || preconditions.request_id,
      path: submitPath,
      has_post_draft_items: result.hasPostDraftItems,
      record: hydratedRecord,
      reconciled: result.reconciled,
      request_items_pending_synced: false,
    };
  } catch (e) {
    logRequestsDebug("[requestSubmit/rpc_atomic]", parseErr(e));
    recordPlatformObservability({
      screen: "request",
      surface: "submit",
      category: "reload",
      event: "request_submit_atomic_transport_failed",
      result: "error",
      sourceKind: "rpc:request_submit_atomic_v1",
      errorStage: "rpc_call",
      errorClass: e instanceof Error ? e.name : undefined,
      errorMessage: parseErr(e),
      extra: {
        requestId: preconditions.request_id,
      },
    });
    throw e;
  }
}

function mapRequestSubmitMutationResult(result: RequestSubmitMutationResult): RequestRecord | null {
  return result.record;
}

export async function requestSubmitMutation(
  requestId: number | string,
): Promise<RequestSubmitMutationResult> {
  const preconditions = await resolveRequestSubmitPreconditions(requestId);
  return runRequestSubmitAtomicStage(preconditions);
}

export async function requestSubmit(requestId: number | string): Promise<RequestRecord | null> {
  return mapRequestSubmitMutationResult(await requestSubmitMutation(requestId));
}

export async function requestReopen(requestId: number | string): Promise<RequestRecord | null> {
  const preconditions = await resolveRequestSubmitPreconditions(requestId);

  try {
    const rawClient = client as unknown as {
      rpc: (
        fn: "request_reopen_atomic_v1",
        args: { p_request_id_text: string },
      ) => Promise<{ data: unknown; error: { message?: string } | null }>;
    };
    const { data, error } = await rawClient.rpc(
      "request_reopen_atomic_v1",
      buildRequestReopenAtomicArgs(preconditions.request_id),
    );
    if (error) throw error;

    const validated = validateRpcResponse(data, isRequestReopenAtomicRpcResponse, {
      rpcName: "request_reopen_atomic_v1",
      caller: "requestReopen",
      domain: "proposal",
    });
    const result = parseRequestReopenAtomicResult(validated);
    if (result.ok === false) {
      throw new RequestReopenAtomicError(result);
    }

    const hydratedRecord =
      (preconditions.request_filter_id
        ? await selectRequestRecordById(preconditions.request_filter_id, preconditions.request_read_select)
        : null) ?? result.record;

    if (!hydratedRecord) {
      throw new Error("[requestReopen/rpc_atomic] request record missing after reopen");
    }

    _draftRequestIdAny = preconditions.request_filter_id;
    return hydratedRecord;
  } catch (e) {
    logRequestsDebug("[requestReopen/rpc_atomic]", parseErr(e));
    throw e;
  }
}
