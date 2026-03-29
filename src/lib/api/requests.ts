import { supabase } from "../supabaseClient";
import type { Database } from "../database.types";
import { recordPlatformObservability } from "../observability/platformObservability";
import { client, normalizeUuid, parseErr, rpcCompat, toFilterId } from "./_core";
import {
  mapRequestRow,
  parseRequestItemsByRequestRows,
  parseRequestSubmitResultRow,
} from "./requests.parsers";
import {
  buildRequestSelectSchemaSafe,
} from "./requests.read-capabilities";
import {
  deriveRequestHeadExpectationFromItemStatuses,
  matchesRequestHeadExpectation,
  REQUEST_DRAFT_STATUS,
  REQUEST_PENDING_STATUS,
  REQUEST_PENDING_EN,
  REQUEST_TERMINAL_ITEM_STATUS_FILTER,
  isDraftOrPendingStatus,
  normalizeStatus,
} from "./requests.status";
import type { ReqItemRow, RequestMeta, RequestRecord } from "./types";

const logRequestsDebug = (...args: unknown[]) => {
  if (__DEV__) {
    console.warn(...args);
  }
};

// cache id черновика на сессию (uuid или int)
let _draftRequestIdAny: string | number | null = null;

type RequestsTable = Database["public"]["Tables"]["requests"];
type RequestItemsTable = Database["public"]["Tables"]["request_items"];
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
type RequestItemRestorePatch = Pick<RequestItemsTable["Update"], "status" | "cancelled_at">;
type RequestItemAddOpts = {
  note?: string;
  app_code?: string;
  kind?: string;
  name_human?: string;
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
type RequestItemAddOrIncArgs = Database["public"]["Functions"]["request_item_add_or_inc"]["Args"];
type RequestItemAddOrIncResult = Database["public"]["Functions"]["request_item_add_or_inc"]["Returns"];
type RequestItemsByRequestArgs = Database["public"]["Functions"]["request_items_by_request"]["Args"];
type RequestFindReusableEmptyDraftArgs =
  Database["public"]["Functions"]["request_find_reusable_empty_draft_v1"]["Args"];
type RequestSubmitArgs = Database["public"]["Functions"]["request_submit"]["Args"];
type RequestStatusRecalcArgsCompat = { p_request_id: number | string };
type RequestIdLookupRow = Pick<RequestsTable["Row"], "id">;
export type RequestSubmitPath =
  | "post_draft_short_circuit"
  | "rpc_submit";
type RequestSubmitPreconditionsResolved = {
  request_id: string;
  request_filter_id: string;
  request_read_select: string;
  has_post_draft_items: boolean;
};
type RequestSubmitPrimaryStageResult = {
  path: RequestSubmitPath;
  record: RequestRecord | null;
  request_items_pending_sync_needed: boolean;
  cache_clear_candidate: boolean;
};
type RequestSubmitCompletionResult = {
  reconciled: boolean;
  request_items_pending_synced: boolean;
  record_override: RequestRecord | null;
};
export type RequestSubmitMutationResult = {
  request_id: string;
  path: RequestSubmitPath;
  has_post_draft_items: boolean;
  record: RequestRecord | null;
  reconciled: boolean;
  request_items_pending_synced: boolean;
};

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

function buildRequestItemsRestorePatch(): RequestItemRestorePatch {
  return { status: REQUEST_DRAFT_STATUS, cancelled_at: null };
}

export function clearCachedDraftRequestId() {
  _draftRequestIdAny = null;
}

async function resolveDraftOwnerUserId(): Promise<string | null> {
  try {
    const session = await supabase.auth.getSession();
    const userId = String(session.data.session?.user?.id ?? "").trim();
    return userId || null;
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

async function findReusableEmptyDraftRequestId(): Promise<string | null> {
  const userId = await resolveDraftOwnerUserId();
  if (!userId) return null;

  try {
    const args: RequestFindReusableEmptyDraftArgs = { p_user_id: userId };
    const { data, error } = await client.rpc("request_find_reusable_empty_draft_v1", args);
    if (error) throw error;

    const reusableId = normalizeRequestFilterId(String(data ?? ""));
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

// ============================== Low-level request helpers ==============================
async function selectRequestIdByFilter(requestFilterId: string): Promise<RequestIdLookupRow | null> {
  const found = await client
    .from("requests")
    .select("id")
    .eq("id", requestFilterId)
    .limit(1)
    .maybeSingle();

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
  const existing = await client
    .from("requests")
    .select(requestReadSelect)
    .eq("id", requestFilterId)
    .maybeSingle();

  if (existing.error) throw existing.error;
  return existing.data ? mapRequestRow(existing.data) : null;
}

async function updateRequestHeadStatus(
  requestFilterId: string,
  payload: RequestHeadStatusUpdatePayload,
  requestReadSelect: string,
): Promise<RequestRecord | null> {
  const upd = await client
    .from("requests")
    .update(payload)
    .eq("id", requestFilterId)
    .select(requestReadSelect)
    .maybeSingle();

  if (upd.error) throw upd.error;
  return upd.data ? mapRequestRow(upd.data) : null;
}

async function restoreCancelledRequestItems(requestFilterId: string): Promise<void> {
  const restorePayload = buildRequestItemsRestorePatch();
  const restored = await client
    .from("request_items")
    .update(restorePayload)
    .eq("request_id", requestFilterId)
    .in("status", ["cancelled", "canceled"]);
  if (restored.error) throw restored.error;
}

async function patchRequestItemMeta(itemId: string, patch: RequestItemMetaPatch): Promise<void> {
  const updateResult = await supabase.from("request_items").update(patch).eq("id", itemId);
  if (updateResult.error) throw updateResult.error;
}

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
      .select(REQUEST_DRAFT_SELECT)
      .single();

    if (error) throw error;
    const row = mapRequestRow(data as RequestDraftSelectRow | null);
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
  const reusableId = await findReusableEmptyDraftRequestId();
  if (reusableId) return reusableId;
  const created = await requestCreateDraft();
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

  const { data, error } = await supabase.rpc(
    "request_item_add_or_inc",
    buildRequestItemAddOrIncArgs(rid, rik_code, q),
  );

  if (error) throw error;

  const itemId = parseRequestItemAddOrIncResult(data);
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
    const results = await Promise.allSettled(
      pack.map((item) => addRequestItemFromRikDetailed(rid, item.rik_code, item.qty, item.opts)),
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

async function reconcileRequestHeadStatus(requestId: string): Promise<boolean> {
  const rid = normalizeUuid(requestId) ?? requestId;
  if (!rid) return false;

  let beforeHeadStatus: string | null = null;
  let expectation = deriveRequestHeadExpectationFromItemStatuses([]);
  try {
    beforeHeadStatus = await readRequestHeadStatus(rid);
    const itemStatuses = await listRequestSubmitItemStatuses(rid);
    expectation = deriveRequestHeadExpectationFromItemStatuses(
      itemStatuses.map((row) => row.status ?? null),
    );
  } catch (error) {
    recordPlatformObservability({
      screen: "request",
      surface: "reconcile_status",
      category: "reload",
      event: "reconcile_probe_failed",
      result: "error",
      sourceKind: "read_back",
      errorStage: "before_probe",
      errorClass: error instanceof Error ? error.name : undefined,
      errorMessage: parseErr(error),
    });
    return false;
  }

  const plans = [
    {
      name: "request_recalc_status" as const,
      run: () =>
      rpcCompat([
        {
          fn: "request_recalc_status",
          args: { p_request_id: rid } satisfies RequestStatusRecalcArgsCompat,
        },
      ]),
    },
    {
      name: "request_update_status_from_items" as const,
      run: () =>
      rpcCompat([
        {
          fn: "request_update_status_from_items",
          args: { p_request_id: rid } satisfies RequestStatusRecalcArgsCompat,
        },
      ]),
    },
  ] as const;

  for (const plan of plans) {
    try {
      await plan.run();
      const afterHeadStatus = await readRequestHeadStatus(rid);
      const verified = expectation.verifiable
        ? matchesRequestHeadExpectation(afterHeadStatus, expectation)
        : normalizeStatus(afterHeadStatus) !== normalizeStatus(beforeHeadStatus);

      recordPlatformObservability({
        screen: "request",
        surface: "reconcile_status",
        category: "reload",
        event: verified ? "reconcile_plan_verified" : "reconcile_plan_no_effect",
        result: verified ? "success" : "skipped",
        sourceKind: `rpc:${plan.name}`,
        extra: {
          plan: plan.name,
          beforeHeadStatus,
          afterHeadStatus,
          expectationMode: expectation.mode,
          allowedHeadStatuses: expectation.allowedHeadStatuses,
          expectationVerifiable: expectation.verifiable,
        },
      });

      if (verified) return true;
    } catch (e) {
      logRequestsDebug("[reconcileRequestHeadStatus]", parseErr(e));
      recordPlatformObservability({
        screen: "request",
        surface: "reconcile_status",
        category: "reload",
        event: "reconcile_plan_failed",
        result: "error",
        sourceKind: `rpc:${plan.name}`,
        errorStage: "plan_run",
        errorClass: e instanceof Error ? e.name : undefined,
        errorMessage: parseErr(e),
        extra: {
          plan: plan.name,
          beforeHeadStatus,
          expectationMode: expectation.mode,
          allowedHeadStatuses: expectation.allowedHeadStatuses,
        },
      });
    }
  }

  return false;
}

type RequestSubmitItemStatusRow = Pick<RequestItemsTable["Row"], "id" | "status">;
type RequestHeadStatusRow = Pick<RequestsTable["Row"], "status">;

const isPendingRequestStatus = (raw: unknown): boolean => {
  const normalized = normalizeStatus(raw);
  return normalized === REQUEST_PENDING_EN || normalized === normalizeStatus(REQUEST_PENDING_STATUS);
};

const isPendingOrTerminalItemStatus = (raw: unknown): boolean => {
  if (raw == null) return false;
  if (isPendingRequestStatus(raw)) return true;
  return !isDraftOrPendingStatus(raw);
};

async function listRequestSubmitItemStatuses(
  requestFilterId: string,
): Promise<RequestSubmitItemStatusRow[]> {
  const result = await client
    .from("request_items")
    .select("id, status")
    .eq("request_id", requestFilterId);

  if (result.error) throw result.error;
  return Array.isArray(result.data) ? result.data : [];
}

async function readRequestHeadStatus(requestFilterId: string): Promise<string | null> {
  const result = await client
    .from("requests")
    .select("status")
    .eq("id", requestFilterId)
    .maybeSingle<RequestHeadStatusRow>();

  if (result.error) throw result.error;
  return result.data?.status ?? null;
}

async function verifyAtomicRequestSubmitOutcome(
  preconditions: RequestSubmitPreconditionsResolved,
): Promise<RequestRecord | null> {
  const record = await selectRequestRecordById(
    preconditions.request_filter_id,
    preconditions.request_read_select,
  );
  if (!record) {
    throw new Error("[requestSubmit/rpc_submit] request record missing after submit");
  }
  if (!isPendingRequestStatus(record.status ?? null)) {
    throw new Error(
      `[requestSubmit/rpc_submit] request head status mismatch: expected pending, got ${String(record.status ?? "null")}`,
    );
  }

  const itemStatuses = await listRequestSubmitItemStatuses(preconditions.request_filter_id);
  const invalidItems = itemStatuses.filter(
    (row) => !isPendingOrTerminalItemStatus(row.status ?? null),
  );
  if (invalidItems.length > 0) {
    throw new Error(
      `[requestSubmit/rpc_submit] request items not transitioned from draft: ${invalidItems
        .map((row) => String(row.id))
        .join(",")}`,
    );
  }

  return record;
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
    has_post_draft_items: await requestHasPostDraftItems(request_id),
  };
}

async function runRequestSubmitPrimaryStage(
  preconditions: RequestSubmitPreconditionsResolved,
): Promise<RequestSubmitPrimaryStageResult> {
  if (preconditions.has_post_draft_items) {
    return {
      path: "post_draft_short_circuit",
      record: null,
      request_items_pending_sync_needed: false,
      cache_clear_candidate: false,
    };
  }

  try {
    const { data, error } = await client.rpc(
      "request_submit",
      buildRequestSubmitArgs(preconditions.request_id),
    );
    if (error) throw error;

    const row = parseRequestSubmitResultRow(data);
    if (row) {
      return {
        path: "rpc_submit",
        record: row,
        request_items_pending_sync_needed: false,
        cache_clear_candidate: true,
      };
    }
  } catch (e) {
    logRequestsDebug("[requestSubmit/rpc]", parseErr(e));
    throw e;
  }
  throw new Error("[requestSubmit] request_submit returned empty payload");
}

async function completeRequestSubmitStage(
  preconditions: RequestSubmitPreconditionsResolved,
  primary: RequestSubmitPrimaryStageResult,
): Promise<RequestSubmitCompletionResult> {
  let request_items_pending_synced = false;
  let reconciled = false;
  if (primary.path === "rpc_submit") {
    await verifyAtomicRequestSubmitOutcome(preconditions);
    reconciled = true;
  } else {
    reconciled = await reconcileRequestHeadStatus(preconditions.request_id);
    if (!reconciled) {
      throw new Error("[requestSubmit/post_draft_short_circuit] reconcile failed");
    }
  }

  const record_override =
    primary.path === "rpc_submit"
      ? await selectRequestRecordById(
          preconditions.request_filter_id,
          preconditions.request_read_select,
        )
      : reconciled && primary.path === "post_draft_short_circuit"
      ? await selectRequestRecordById(
          preconditions.request_filter_id,
          preconditions.request_read_select,
        )
      : null;
  return {
    reconciled,
    request_items_pending_synced,
    record_override,
  };
}

function finalizeRequestSubmitMutationResult(
  preconditions: RequestSubmitPreconditionsResolved,
  primary: RequestSubmitPrimaryStageResult,
  completion: RequestSubmitCompletionResult,
): RequestSubmitMutationResult {
  if (
    primary.cache_clear_candidate &&
    _draftRequestIdAny != null &&
    String(_draftRequestIdAny) === String(preconditions.request_id)
  ) {
    _draftRequestIdAny = null;
  }

  return {
    request_id: preconditions.request_id,
    path: primary.path,
    has_post_draft_items: preconditions.has_post_draft_items,
    record: completion.record_override ?? primary.record,
    reconciled: completion.reconciled,
    request_items_pending_synced: completion.request_items_pending_synced,
  };
}

function mapRequestSubmitMutationResult(result: RequestSubmitMutationResult): RequestRecord | null {
  return result.record;
}

export async function requestSubmitMutation(
  requestId: number | string,
): Promise<RequestSubmitMutationResult> {
  const preconditions = await resolveRequestSubmitPreconditions(requestId);
  const primary = await runRequestSubmitPrimaryStage(preconditions);
  const completion = await completeRequestSubmitStage(preconditions, primary);
  return finalizeRequestSubmitMutationResult(preconditions, primary, completion);
}

export async function requestSubmit(requestId: number | string): Promise<RequestRecord | null> {
  return mapRequestSubmitMutationResult(await requestSubmitMutation(requestId));
}

export async function requestReopen(requestId: number | string): Promise<RequestRecord | null> {
  const preconditions = await resolveRequestSubmitPreconditions(requestId);

  try {
    await restoreCancelledRequestItems(preconditions.request_filter_id);
  } catch (e) {
    logRequestsDebug("[requestReopen/request_items restore]", parseErr(e));
    throw e;
  }

  try {
    return await updateRequestHeadStatus(
      preconditions.request_filter_id,
      { status: REQUEST_DRAFT_STATUS },
      preconditions.request_read_select,
    );
  } catch (e) {
    logRequestsDebug("[requestReopen/request head restore]", parseErr(e));
    throw e;
  }
}
