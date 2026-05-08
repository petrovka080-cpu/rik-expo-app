import type { ReqItemRow as CatalogReqItemRow } from "../catalog_api";
import { mapRequestRow } from "./requests.parsers";
import type { RequestMeta, RequestRecord } from "./types";
import { logger } from "../logger";
import {
  isRpcBoolean,
  isRpcRecord,
  validateRpcResponse,
} from "./queryBoundary";
import { resolveRequestDraftSyncAccessToken } from "./requestDraftSync.auth.transport";
import {
  createDirectorHandoffBroadcastChannel,
  insertDirectorRequestSubmittedNotification,
  invokeRequestDraftSyncRpcV2,
  removeDirectorHandoffBroadcastChannel,
  sendDirectorHandoffBroadcast,
  setRequestDraftSyncRealtimeAuth,
  type RequestDraftSyncArgsV2,
  type RequestDraftSyncReturns,
} from "./requestDraftSync.transport";

const REQUEST_DRAFT_SYNC_RPC_V2_ENABLED =
  String(process.env.EXPO_PUBLIC_REQUEST_DRAFT_SYNC_RPC_V2 ?? "1").trim() !== "0";


export type RequestDraftSyncLineInput = {
  request_item_id?: string | null;
  rik_code?: string | null;
  qty: number;
  note?: string | null;
  app_code?: string | null;
  kind?: string | null;
  name_human?: string | null;
  uom?: string | null;
};

export type RequestDraftSyncBranchMeta = {
  sourceBranch: "rpc_v2";
  rpcVersion: "v2";
};

type RequestDraftSyncEnvelope = {
  document_type: "request_draft_sync";
  version: "v2";
  request_payload: unknown;
  items_payload: unknown[];
  submitted: boolean;
  request_created: boolean;
};

export type RequestDraftSyncResult = {
  request: RequestRecord;
  items: CatalogReqItemRow[];
  submitted: boolean;
  requestCreated: boolean;
  branchMeta: RequestDraftSyncBranchMeta;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value != null && typeof value === "object" && !Array.isArray(value);

const asTrimmedString = (value: unknown): string => String(value ?? "").trim();
const redactedPresence = (value: unknown): "present_redacted" | "missing" =>
  asTrimmedString(value) ? "present_redacted" : "missing";

const ensureRealtimeAuth = async () => {
  const accessToken = await resolveRequestDraftSyncAccessToken();
  if (!accessToken) return false;
  await setRequestDraftSyncRealtimeAuth(accessToken);
  return true;
};

const signalDirectorRequestSubmitted = async (params: {
  requestId: string;
  displayNo?: string | null;
  sourcePath: string;
}) => {
  const requestId = asTrimmedString(params.requestId);
  if (!requestId) return;

  const displayNo = asTrimmedString(params.displayNo) || requestId;
  try {
    await ensureRealtimeAuth();
    const channel = createDirectorHandoffBroadcastChannel();
    const broadcastResult = await new Promise<string>((resolve, reject) => {
      let settled = false;
      try {
        channel.subscribe(async (status) => {
          if (settled) return;
          if (status === "SUBSCRIBED") {
            try {
              const sendResult = await sendDirectorHandoffBroadcast(channel, {
                requestId,
                displayNo,
                sourcePath: params.sourcePath,
              });
              settled = true;
              resolve(String(sendResult));
            } catch (error) {
              settled = true;
              reject(error);
            }
            return;
          }

          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
            settled = true;
            reject(new Error(`broadcast subscribe ${status.toLowerCase()}`));
          }
        });
      } catch (error) {
        if (!settled) {
          settled = true;
          reject(error);
        }
      }
    }).finally(() => {
      void removeDirectorHandoffBroadcastChannel(channel);
    });
    logger.info("request-draft-sync.signal", {
      kind: "broadcast",
      sourcePath: params.sourcePath,
      requestIdScope: redactedPresence(requestId),
      displayNoScope: redactedPresence(displayNo),
      result: broadcastResult,
    });
  } catch (error) {
    logger.warn("request-draft-sync.signal", {
      kind: "broadcast_error",
      sourcePath: params.sourcePath,
      requestIdScope: redactedPresence(requestId),
      displayNoScope: redactedPresence(displayNo),
      errorMessage: error instanceof Error ? error.message : String(error),
    });
  }

  try {
    const insertResult = await insertDirectorRequestSubmittedNotification({
      requestId,
      displayNo,
      sourcePath: params.sourcePath,
    });
    logger.info("request-draft-sync.signal", {
      kind: insertResult.error ? "notification_error" : "notification",
      sourcePath: params.sourcePath,
      requestIdScope: redactedPresence(requestId),
      displayNoScope: redactedPresence(displayNo),
      errorMessage: insertResult.error?.message ?? null,
    });
  } catch (error) {
    logger.warn("request-draft-sync.signal", {
      kind: "notification_error",
      sourcePath: params.sourcePath,
      requestIdScope: redactedPresence(requestId),
      displayNoScope: redactedPresence(displayNo),
      errorMessage: error instanceof Error ? error.message : String(error),
    });
  }
};

const asReqItemRow = (value: unknown): CatalogReqItemRow | null => {
  if (!isRecord(value)) return null;
  const id = asTrimmedString(value.id);
  const requestId = asTrimmedString(value.request_id);
  const qty = Number(value.qty ?? 0);
  if (!id || !requestId || !Number.isFinite(qty)) return null;
  return {
    id,
    request_id: requestId,
    rik_code: asTrimmedString(value.rik_code) || null,
    name_human: asTrimmedString(value.name_human) || "-",
    qty,
    uom: asTrimmedString(value.uom) || null,
    status: asTrimmedString(value.status) || null,
    supplier_hint: asTrimmedString(value.supplier_hint) || null,
    app_code: asTrimmedString(value.app_code) || null,
    note: asTrimmedString(value.note) || null,
    line_no: Number.isFinite(Number(value.line_no)) ? Number(value.line_no) : null,
    updated_at: asTrimmedString(value.updated_at) || null,
  };
};

const parseItemsPayload = (value: unknown): CatalogReqItemRow[] => {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const row = asReqItemRow(item);
    return row ? [row] : [];
  });
};

const parseEnvelope = (value: RequestDraftSyncReturns): RequestDraftSyncEnvelope => {
  if (!isRecord(value)) {
    throw new Error("request_sync_draft returned non-object payload");
  }

  const documentType = asTrimmedString(value.document_type);
  if (documentType !== "request_draft_sync") {
    throw new Error(`request_sync_draft invalid document_type: ${documentType || "<empty>"}`);
  }

  const version = asTrimmedString(value.version);
  if (version !== "v2") {
    throw new Error(`request_sync_draft invalid version: ${version || "<empty>"}`);
  }

  if (!Array.isArray(value.items_payload)) {
    throw new Error("request_sync_draft invalid items_payload");
  }

  return {
    document_type: "request_draft_sync",
    version: "v2",
    request_payload: value.request_payload,
    items_payload: value.items_payload,
    submitted: value.submitted === true,
    request_created: value.request_created === true,
  };
};

const isRequestDraftSyncRpcResponse = (value: unknown): value is RequestDraftSyncReturns =>
  isRpcRecord(value) &&
  value.document_type === "request_draft_sync" &&
  value.version === "v2" &&
  isRpcRecord(value.request_payload) &&
  Array.isArray(value.items_payload) &&
  isRpcBoolean(value.submitted) &&
  isRpcBoolean(value.request_created);

export const isRequestDraftSyncRpcEnabled = () => REQUEST_DRAFT_SYNC_RPC_V2_ENABLED;

export async function syncRequestDraftViaRpc(params: {
  requestId?: string | null;
  meta?: RequestMeta | null;
  lines: RequestDraftSyncLineInput[];
  pendingDeleteIds?: string[];
  submit?: boolean;
  subcontractId?: string | null;
  contractorJobId?: string | null;
  objectName?: string | null;
  levelName?: string | null;
  systemName?: string | null;
  zoneName?: string | null;
}): Promise<RequestDraftSyncResult> {
  if (!REQUEST_DRAFT_SYNC_RPC_V2_ENABLED) {
    throw new Error("request_sync_draft_v2 is disabled");
  }

  const argsV2: RequestDraftSyncArgsV2 = {
    p_request_id: asTrimmedString(params.requestId) || null,
    p_submit: params.submit === true,
    p_foreman_name: params.meta?.foreman_name ?? null,
    p_need_by: params.meta?.need_by ?? null,
    p_comment: params.meta?.comment ?? null,
    p_object_type_code: params.meta?.object_type_code ?? null,
    p_level_code: params.meta?.level_code ?? null,
    p_system_code: params.meta?.system_code ?? null,
    p_zone_code: params.meta?.zone_code ?? null,
    p_items: (params.lines || []).map((line) => ({
      request_item_id: asTrimmedString(line.request_item_id) || null,
      rik_code: asTrimmedString(line.rik_code) || null,
      qty: Number(line.qty ?? 0),
      note: line.note ?? null,
      app_code: line.app_code ?? null,
      kind: line.kind ?? null,
      name_human: line.name_human ?? null,
      uom: line.uom ?? null,
    })),
    p_pending_delete_ids: Array.from(
      new Set((params.pendingDeleteIds || []).map((id) => asTrimmedString(id)).filter(Boolean)),
    ),
    p_subcontract_id: params.subcontractId ?? null,
    p_contractor_job_id: params.contractorJobId ?? null,
    p_object_name: params.objectName ?? null,
    p_level_name: params.levelName ?? null,
    p_system_name: params.systemName ?? null,
    p_zone_name: params.zoneName ?? null,
  };

  const { data, error } = await invokeRequestDraftSyncRpcV2(argsV2);
  if (error) {
    throw new Error(`request_sync_draft_v2 failed: ${error.message}`);
  }

  const envelope = parseEnvelope(
    validateRpcResponse(data, isRequestDraftSyncRpcResponse, {
      rpcName: "request_sync_draft_v2",
      caller: "src/lib/api/requestDraftSync.service.syncRequestDraftViaRpc",
      domain: "catalog",
    }),
  );
  const request = mapRequestRow(envelope.request_payload);
  if (!request) {
    throw new Error("request_sync_draft invalid request_payload");
  }

  const items = parseItemsPayload(envelope.items_payload);
  if (__DEV__) logger.info("log", "[draft-sync] source=rpc_v2");
  logger.info("request-draft-sync", {
    sourceBranch: "rpc_v2",
    requestIdScope: redactedPresence(request.id),
    submitted: envelope.submitted,
    requestCreated: envelope.request_created,
    lineCount: items.length,
    requestedRpcVersion: "v2",
    resolvedRpcVersion: "v2",
  });

  if (__DEV__ && params.submit === true) {
    logger.info("request-draft-sync", "submit", {
      requestIdScope: redactedPresence(request.id),
      displayNoScope: redactedPresence(request.display_no),
      status: request.status ?? null,
      sourceBranch: "rpc_v2",
      rpcVersion: "v2",
    });
  }

  if (params.submit === true && envelope.submitted) {
    await signalDirectorRequestSubmitted({
      requestId: String(request.id ?? ""),
      displayNo: request.display_no ?? null,
      sourcePath: "foreman.requestDraftSync.rpc_v2_submit",
    });
  }

  return {
    request,
    items,
    submitted: envelope.submitted,
    requestCreated: envelope.request_created,
    branchMeta: {
      sourceBranch: "rpc_v2",
      rpcVersion: "v2",
    },
  };
}
