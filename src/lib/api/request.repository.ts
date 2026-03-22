import {
  requestReopen,
  requestSubmitMutation,
  type RequestSubmitMutationResult,
} from "./requests";
import type { RequestRecord } from "./types";

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

const trim = (value: unknown) => String(value ?? "").trim();

const logRequestRepository = (payload: Record<string, unknown>) => {
  if (!__DEV__) return;
  console.info("[request.repository]", payload);
};

const toSubmitErrorCategory = (error: unknown): string => {
  const message = trim(error instanceof Error ? error.message : error).toLowerCase();
  if (!message) return "unknown";
  if (message.includes("not found") || message.includes("404")) return "request_missing";
  if (message.includes("permission") || message.includes("rls")) return "permission_denied";
  if (message.includes("invalid")) return "invalid_payload";
  return "submit_error";
};

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
  return mutation.record;
}
