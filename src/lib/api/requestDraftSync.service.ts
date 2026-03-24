import type { Database } from "../database.types";
import type { ReqItemRow as CatalogReqItemRow } from "../catalog_api";
import { supabase } from "../supabaseClient";
import { parseErr } from "./_core";
import { mapRequestRow } from "./requests.parsers";
import type { RequestMeta, RequestRecord } from "./types";

type RequestDraftSyncArgs = Database["public"]["Functions"]["request_sync_draft_v1"]["Args"];
type RequestDraftSyncReturns = Database["public"]["Functions"]["request_sync_draft_v1"]["Returns"];
type RequestDraftSyncArgsV2 = Database["public"]["Functions"]["request_sync_draft_v2"]["Args"];
type RequestDraftSyncRpcVersion = "v1" | "v2";

const REQUEST_DRAFT_SYNC_RPC_V1_ENABLED =
  String(process.env.EXPO_PUBLIC_REQUEST_DRAFT_SYNC_RPC_V1 ?? "").trim() !== "0";

const REQUEST_DRAFT_SYNC_RPC_V2_ENABLED =
  String(process.env.EXPO_PUBLIC_REQUEST_DRAFT_SYNC_RPC_V2 ?? "1").trim() !== "0";
const DIRECTOR_HANDOFF_BROADCAST_CHANNEL = "director-handoff-rt";
const DIRECTOR_HANDOFF_BROADCAST_EVENT = "foreman_request_submitted";


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
  sourceBranch: "rpc_v2" | "rpc_v1" | "legacy_fallback";
  fallbackReason?: "disabled" | "rpc_error" | "invalid_payload";
  rpcVersion?: "v1" | "v2";
};

type RequestDraftSyncEnvelope = {
  document_type: "request_draft_sync";
  version: RequestDraftSyncRpcVersion;
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

const ensureRealtimeAuth = async () => {
  const session = await supabase.auth.getSession();
  const accessToken = session.data.session?.access_token ?? null;
  if (!accessToken) return false;
  await supabase.realtime.setAuth(accessToken);
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
    const channel = supabase.channel(DIRECTOR_HANDOFF_BROADCAST_CHANNEL, {
      config: {
        broadcast: {
          ack: false,
          self: false,
        },
      },
    });
    const broadcastResult = await new Promise<string>((resolve, reject) => {
      let settled = false;
      channel.subscribe(async (status) => {
        if (settled) return;
        if (status === "SUBSCRIBED") {
          try {
            const sendResult = await channel.send({
              type: "broadcast",
              event: DIRECTOR_HANDOFF_BROADCAST_EVENT,
              payload: {
                request_id: requestId,
                display_no: displayNo,
                source_path: params.sourcePath,
              },
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
    });
    console.info("[request-draft-sync.signal]", {
      kind: "broadcast",
      sourcePath: params.sourcePath,
      requestId,
      displayNo,
      result: broadcastResult,
    });
    void supabase.removeChannel(channel);
  } catch (error) {
    console.warn("[request-draft-sync.signal]", {
      kind: "broadcast_error",
      sourcePath: params.sourcePath,
      requestId,
      displayNo,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  try {
    const insertResult = await supabase.from("notifications").insert({
      role: "director",
      title: `Новая заявка ${displayNo}`,
      body: `Прораб отправил ${displayNo} на утверждение.`,
      payload: {
        request_id: requestId,
        display_no: displayNo,
        source_path: params.sourcePath,
      },
    });
    console.info("[request-draft-sync.signal]", {
      kind: insertResult.error ? "notification_error" : "notification",
      sourcePath: params.sourcePath,
      requestId,
      displayNo,
      error: insertResult.error?.message ?? null,
    });
  } catch (error) {
    console.warn("[request-draft-sync.signal]", {
      kind: "notification_error",
      sourcePath: params.sourcePath,
      requestId,
      displayNo,
      error: error instanceof Error ? error.message : String(error),
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
  };
};

const parseItemsPayload = (value: unknown): CatalogReqItemRow[] => {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const row = asReqItemRow(item);
    return row ? [row] : [];
  });
};

const getRpcName = (version: RequestDraftSyncRpcVersion) =>
  version === "v2" ? "request_sync_draft_v2" : "request_sync_draft_v1";

const isDraftSyncRpcMissingError = (error: unknown) => {
  const message = parseErr(error).toLowerCase();
  return (
    message.includes("could not find the function") ||
    message.includes("schema cache") ||
    message.includes("404") ||
    message.includes("not found")
  );
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
  if (version !== "v1" && version !== "v2") {
    throw new Error(`request_sync_draft invalid version: ${version || "<empty>"}`);
  }

  if (!Array.isArray(value.items_payload)) {
    throw new Error("request_sync_draft invalid items_payload");
  }

  return {
    document_type: "request_draft_sync",
    version,
    request_payload: value.request_payload,
    items_payload: value.items_payload,
    submitted: value.submitted === true,
    request_created: value.request_created === true,
  };
};

export const isRequestDraftSyncRpcEnabled = () => REQUEST_DRAFT_SYNC_RPC_V1_ENABLED || REQUEST_DRAFT_SYNC_RPC_V2_ENABLED;

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
  const argsV1: RequestDraftSyncArgs = {
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
  };

  const argsV2: RequestDraftSyncArgsV2 = {
    ...argsV1,
    p_subcontract_id: params.subcontractId ?? null,
    p_contractor_job_id: params.contractorJobId ?? null,
    p_object_name: params.objectName ?? null,
    p_level_name: params.levelName ?? null,
    p_system_name: params.systemName ?? null,
    p_zone_name: params.zoneName ?? null,
  };

  const versionsToTry: RequestDraftSyncRpcVersion[] =
    REQUEST_DRAFT_SYNC_RPC_V2_ENABLED && REQUEST_DRAFT_SYNC_RPC_V1_ENABLED
      ? ["v2", "v1"]
      : REQUEST_DRAFT_SYNC_RPC_V2_ENABLED
        ? ["v2"]
        : ["v1"];

  let lastError: Error | null = null;

  for (const version of versionsToTry) {
    const rpcName = getRpcName(version);
    const { data, error } =
      version === "v2"
        ? await supabase.rpc("request_sync_draft_v2", argsV2)
        : await supabase.rpc("request_sync_draft_v1", argsV1);

    if (error) {
      const rpcError = new Error(`${rpcName} failed: ${error.message}`);
      lastError = rpcError;

      if (version === "v2" && REQUEST_DRAFT_SYNC_RPC_V1_ENABLED && isDraftSyncRpcMissingError(rpcError)) {
        console.warn("[draft-sync] request_sync_draft_v2 unavailable -> retrying v1", error);
        continue;
      }

      throw rpcError;
    }

    const envelope = parseEnvelope(data);
    const request = mapRequestRow(envelope.request_payload);
    if (!request) {
      throw new Error("request_sync_draft invalid request_payload");
    }

    const items = parseItemsPayload(envelope.items_payload);
    console.log(`[draft-sync] source=rpc_${version}`);
    console.info("[request-draft-sync]", {
      sourceBranch: version === "v2" ? "rpc_v2" : "rpc_v1",
      requestId: request.id,
      submitted: envelope.submitted,
      requestCreated: envelope.request_created,
      lineCount: items.length,
      requestedRpcVersion: REQUEST_DRAFT_SYNC_RPC_V2_ENABLED ? "v2" : "v1",
      resolvedRpcVersion: version,
    });

    if (__DEV__ && params.submit === true) {
      console.info("[submit]", {
        requestId: request.id,
        displayNo: request.display_no ?? null,
        status: request.status ?? null,
        sourceBranch: version === "v2" ? "rpc_v2" : "rpc_v1",
        rpcVersion: version,
      });
    }

    if (params.submit === true && envelope.submitted) {
      await signalDirectorRequestSubmitted({
        requestId: String(request.id ?? ""),
        displayNo: request.display_no ?? null,
        sourcePath: version === "v2" ? "foreman.requestDraftSync.rpc_v2_submit" : "foreman.requestDraftSync.rpc_v1_submit",
      });
    }

    return {
      request,
      items,
      submitted: envelope.submitted,
      requestCreated: envelope.request_created,
      branchMeta: {
        sourceBranch: version === "v2" ? "rpc_v2" : "rpc_v1",
        rpcVersion: version,
      },
    };
  }

  throw lastError ?? new Error("request_sync_draft failed without details");
}

export const toRequestDraftSyncFallbackReason = (
  error: unknown,
): RequestDraftSyncBranchMeta["fallbackReason"] => {
  if (!isRequestDraftSyncRpcEnabled()) return "disabled";
  const message = parseErr(error).toLowerCase();
  if (message.includes("invalid")) return "invalid_payload";
  return "rpc_error";
};
