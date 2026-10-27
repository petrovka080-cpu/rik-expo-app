import {
  addRequestItemsFromRikBatch,
  getOrCreateDraftRequestId,
  requestReopen,
  requestSubmitMutation,
  type RequestSubmitMutationResult,
} from "./requests";
import {
  DIRECTOR_HANDOFF_BROADCAST_CHANNEL_NAME,
  DIRECTOR_HANDOFF_BROADCAST_EVENT,
} from "../realtime/realtime.channels";
import type { RequestRecord } from "./types";
import { resolveRequestRepositoryAccessToken } from "./request.repository.auth.transport";
import {
  createDirectorHandoffBroadcastChannel,
  insertDirectorRequestSubmittedNotification,
  removeDirectorHandoffBroadcastChannel,
  sendDirectorHandoffBroadcast,
  setRequestDraftSyncRealtimeAuth,
} from "./requestDraftSync.transport";

export type SubmitRequestCommand = {
  requestId: number | string;
  sourcePath: string;
  draftScopeKey?: string | null;
};

export type ReopenRequestCommand = {
  requestId: number | string;
  sourcePath: string;
  draftScopeKey?: string | null;
};

export type AppendMarketplaceItemsCommand = {
  sourcePath: string;
  listingId: string;
  items: {
    rikCode: string;
    qty: number;
    kind?: string | null;
    nameHuman?: string | null;
    uom?: string | null;
    note?: string | null;
    appCode?: string | null;
  }[];
};

const trim = (value: unknown) => String(value ?? "").trim();
const trimOptional = (value: unknown): string | undefined => {
  const text = trim(value);
  return text || undefined;
};

const logRequestRepository = (payload: Record<string, unknown>) => {
  if (!__DEV__) return;
  console.info("[request.repository]", payload);
};

const ensureRealtimeAuth = async () => {
  const accessToken = await resolveRequestRepositoryAccessToken();
  if (!accessToken) return false;
  await setRequestDraftSyncRealtimeAuth(accessToken);
  return true;
};

const broadcastDirectorRequestSubmitted = async (
  command: SubmitRequestCommand,
  record: RequestRecord | null,
) => {
  const requestId = trim(record?.id) || trim(command.requestId);
  if (!requestId) return;

  try {
    await ensureRealtimeAuth();
    const displayNo = trim(record?.display_no) || requestId;
    const channel = createDirectorHandoffBroadcastChannel();
    const result = await sendDirectorHandoffBroadcast(channel, {
      requestId,
      displayNo,
      sourcePath: trim(command.sourcePath) || null,
    });
    logRequestRepository({
      phase: "broadcast",
      sourcePath: command.sourcePath,
      requestId,
      submit: true,
      broadcastChannel: DIRECTOR_HANDOFF_BROADCAST_CHANNEL_NAME,
      broadcastEvent: DIRECTOR_HANDOFF_BROADCAST_EVENT,
      broadcastResult: result,
    });
    void removeDirectorHandoffBroadcastChannel(channel);
  } catch (error) {
    logRequestRepository({
      phase: "warn",
      sourcePath: command.sourcePath,
      requestId,
      submit: true,
      broadcastChannel: DIRECTOR_HANDOFF_BROADCAST_CHANNEL_NAME,
      broadcastEvent: DIRECTOR_HANDOFF_BROADCAST_EVENT,
      broadcastError: error instanceof Error ? error.message : String(error),
    });
  }
};

const notifyDirectorRequestSubmitted = async (
  command: SubmitRequestCommand,
  record: RequestRecord | null,
) => {
  const requestId = trim(record?.id) || trim(command.requestId);
  if (!requestId) return;

  const displayNo = trim(record?.display_no) || requestId;
  const result = await insertDirectorRequestSubmittedNotification({
    requestId,
    displayNo,
    sourcePath: trim(command.sourcePath) || null,
  });
  if (!result.error) return;

  logRequestRepository({
    phase: "warn",
    sourcePath: command.sourcePath,
    requestId,
    submit: true,
    notifyRole: "director",
    notifyError: result.error.message,
  });
};

const toSubmitErrorCategory = (error: unknown): string => {
  const message = trim(error instanceof Error ? error.message : error).toLowerCase();
  if (!message) return "unknown";
  if (message.includes("not found") || message.includes("404")) return "request_missing";
  if (message.includes("permission") || message.includes("rls")) return "permission_denied";
  if (message.includes("invalid")) return "invalid_payload";
  return "submit_error";
};

const toAppendMarketplaceErrorCategory = (error: unknown): string => {
  const message = trim(error instanceof Error ? error.message : error).toLowerCase();
  if (!message) return "unknown";
  if (message.includes("offline") || message.includes("network")) return "offline";
  if (message.includes("permission") || message.includes("rls")) return "permission_denied";
  if (message.includes("rik_code") || message.includes("qty")) return "invalid_payload";
  return "append_error";
};

export async function appendMarketplaceItemsToDraft(
  command: AppendMarketplaceItemsCommand,
): Promise<{ requestId: string; addedCount: number }> {
  const preparedItems = (command.items ?? [])
    .map((item) => ({
      rik_code: trim(item.rikCode),
      qty: Number(item.qty),
      opts: {
        app_code: trimOptional(item.appCode),
        kind: trimOptional(item.kind),
        name_human: trimOptional(item.nameHuman),
        note: trimOptional(item.note),
        uom: trimOptional(item.uom),
      },
    }))
    .filter((item) => item.rik_code && Number.isFinite(item.qty) && item.qty > 0);

  logRequestRepository({
    phase: "request",
    sourcePath: command.sourcePath,
    appendMarketplace: true,
    listingId: trim(command.listingId) || null,
    requestedItemCount: preparedItems.length,
  });

  if (!preparedItems.length) {
    throw new Error("Marketplace payload has no ERP items to append.");
  }

  try {
    const requestId = trim(await getOrCreateDraftRequestId());
    if (!requestId) {
      throw new Error("Failed to resolve active draft request.");
    }
    const addedCount = await addRequestItemsFromRikBatch(requestId, preparedItems);
    logRequestRepository({
      phase: "result",
      sourcePath: command.sourcePath,
      appendMarketplace: true,
      listingId: trim(command.listingId) || null,
      requestId,
      addedCount,
    });
    return { requestId, addedCount };
  } catch (error) {
    logRequestRepository({
      phase: "error",
      sourcePath: command.sourcePath,
      appendMarketplace: true,
      listingId: trim(command.listingId) || null,
      requestedItemCount: preparedItems.length,
      errorCategory: toAppendMarketplaceErrorCategory(error),
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export async function submitRequestToDirector(
  command: SubmitRequestCommand,
): Promise<RequestRecord | null> {
  logRequestRepository({
    phase: "request",
    sourcePath: command.sourcePath,
    requestId: trim(command.requestId) || null,
    draftScopeKey: trim(command.draftScopeKey) || null,
    submit: true,
  });

  try {
    const mutation = await requestSubmitMutation(command.requestId);
    return mapSubmitMutationResult(command, mutation);
  } catch (error) {
    logRequestRepository({
      phase: "error",
      sourcePath: command.sourcePath,
      requestId: trim(command.requestId) || null,
      draftScopeKey: trim(command.draftScopeKey) || null,
      submit: true,
      errorCategory: toSubmitErrorCategory(error),
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export async function reopenRequestDraft(
  command: ReopenRequestCommand,
): Promise<RequestRecord | null> {
  logRequestRepository({
    phase: "request",
    sourcePath: command.sourcePath,
    requestId: trim(command.requestId) || null,
    draftScopeKey: trim(command.draftScopeKey) || null,
    reopen: true,
  });

  try {
    const record = await requestReopen(command.requestId);
    logRequestRepository({
      phase: "result",
      sourcePath: command.sourcePath,
      requestId: trim(record?.id) || trim(command.requestId) || null,
      draftScopeKey: trim(command.draftScopeKey) || null,
      reopen: true,
      status: record?.status ?? null,
      displayNo: record?.display_no ?? null,
    });
    return record;
  } catch (error) {
    logRequestRepository({
      phase: "error",
      sourcePath: command.sourcePath,
      requestId: trim(command.requestId) || null,
      draftScopeKey: trim(command.draftScopeKey) || null,
      reopen: true,
      errorCategory: toSubmitErrorCategory(error),
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

function mapSubmitMutationResult(
  command: SubmitRequestCommand,
  mutation: RequestSubmitMutationResult,
): RequestRecord | null {
  logRequestRepository({
    phase: "result",
    sourcePath: command.sourcePath,
    requestId: trim(mutation.record?.id) || trim(mutation.request_id) || null,
    draftScopeKey: trim(command.draftScopeKey) || null,
    submit: true,
    submitPath: mutation.path,
    reconciled: mutation.reconciled,
    requestItemsPendingSynced: mutation.request_items_pending_synced,
    hasPostDraftItems: mutation.has_post_draft_items,
    status: mutation.record?.status ?? null,
    displayNo: mutation.record?.display_no ?? null,
  });
  void broadcastDirectorRequestSubmitted(command, mutation.record);
  void notifyDirectorRequestSubmitted(command, mutation.record);
  return mutation.record;
}
