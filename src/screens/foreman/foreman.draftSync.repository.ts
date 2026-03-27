import { type ReqItemRow } from "../../lib/catalog_api";
import {
  syncRequestDraftViaRpc,
  type RequestDraftSyncLineInput,
  type RequestDraftSyncResult,
} from "../../lib/api/requestDraftSync.service";
import type { RequestMeta } from "../../lib/api/types";

export type ForemanDraftSyncMutationKind =
  | "catalog_add"
  | "calc_add"
  | "ai_local_add"
  | "qty_update"
  | "row_remove"
  | "whole_cancel"
  | "submit"
  | "background_sync";

type ForemanDraftSyncSourcePath = "foreman_materials" | "foreman_subcontract";

export type { RequestDraftSyncLineInput };

export type ForemanAtomicDraftSyncCommand = {
  mutationKind: ForemanDraftSyncMutationKind;
  sourcePath: ForemanDraftSyncSourcePath;
  draftScopeKey?: string | null;
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
  beforeLineCount?: number | null;
  afterLocalSnapshotLineCount?: number | null;
};

const trim = (value: unknown) => String(value ?? "").trim();

const countSyncLines = (lines: RequestDraftSyncLineInput[]): number =>
  (lines || []).filter((line) => Number.isFinite(Number(line.qty ?? 0)) && Number(line.qty ?? 0) > 0).length;

const toRemoteRequestItemId = (value: unknown): string | null => {
  const id = trim(value);
  if (!id || id.startsWith("local:")) return null;
  return id;
};

const logForemanDraftRepository = (payload: Record<string, unknown>) => {
  if (!__DEV__) return;
  console.info("[foreman.draft.repository]", payload);
};

const toRequestSyncErrorCategory = (error: unknown): string => {
  const message = trim(error instanceof Error ? error.message : error).toLowerCase();
  if (!message) return "unknown";
  if (message.includes("invalid")) return "invalid_payload";
  if (message.includes("not found") || message.includes("404")) return "rpc_missing";
  return "rpc_error";
};

export const mapReqItemsToDraftSyncLines = (items: ReqItemRow[]): RequestDraftSyncLineInput[] =>
  (items || []).flatMap((item) => {
    const qty = Number(item.qty ?? 0);
    if (!Number.isFinite(qty) || qty <= 0) return [];
    return [
      {
        request_item_id: toRemoteRequestItemId(item.id),
        rik_code: trim(item.rik_code) || null,
        qty,
        note: item.note ?? null,
        app_code: item.app_code ?? null,
        kind: null,
        name_human: trim(item.name_human) || null,
        uom: trim(item.uom) || null,
      },
    ];
  });

export async function syncForemanAtomicDraft(
  command: ForemanAtomicDraftSyncCommand,
): Promise<RequestDraftSyncResult> {
  const syncPayloadLineCount = countSyncLines(command.lines);

  logForemanDraftRepository({
    phase: "request",
    mutationKind: command.mutationKind,
    sourcePath: command.sourcePath,
    requestId: trim(command.requestId) || null,
    draftScopeKey: trim(command.draftScopeKey) || null,
    beforeLineCount: command.beforeLineCount ?? null,
    afterLocalSnapshotLineCount: command.afterLocalSnapshotLineCount ?? null,
    syncPayloadLineCount,
    submitPayloadLineCount: command.submit === true ? syncPayloadLineCount : null,
    submit: command.submit === true,
  });

  try {
    const result = await syncRequestDraftViaRpc({
      requestId: command.requestId,
      meta: command.meta,
      lines: command.lines,
      pendingDeleteIds: command.pendingDeleteIds,
      submit: command.submit,
      subcontractId: command.subcontractId,
      contractorJobId: command.contractorJobId,
      objectName: command.objectName,
      levelName: command.levelName,
      systemName: command.systemName,
      zoneName: command.zoneName,
    });

    const resolvedRequestId = trim(result.request.id);

    logForemanDraftRepository({
      phase: "result",
      mutationKind: command.mutationKind,
      sourcePath: command.sourcePath,
      requestId: resolvedRequestId || trim(command.requestId) || null,
      draftScopeKey: trim(command.draftScopeKey) || null,
      beforeLineCount: command.beforeLineCount ?? null,
      afterLocalSnapshotLineCount: command.afterLocalSnapshotLineCount ?? null,
      syncPayloadLineCount,
      syncResultLineCount: result.items.length,
      submitPayloadLineCount: command.submit === true ? syncPayloadLineCount : null,
      serverAcceptedLineCount: command.submit === true ? result.items.length : null,
      submit: command.submit === true,
      submitted: result.submitted,
      fallbackUsed: false,
      rpcVersion: result.branchMeta.rpcVersion ?? null,
    });

    return result;
  } catch (error) {
    logForemanDraftRepository({
      phase: "error",
      mutationKind: command.mutationKind,
      sourcePath: command.sourcePath,
      requestId: trim(command.requestId) || null,
      draftScopeKey: trim(command.draftScopeKey) || null,
      beforeLineCount: command.beforeLineCount ?? null,
      afterLocalSnapshotLineCount: command.afterLocalSnapshotLineCount ?? null,
      syncPayloadLineCount,
      submitPayloadLineCount: command.submit === true ? syncPayloadLineCount : null,
      submit: command.submit === true,
      fallbackUsed: false,
      errorCategory: toRequestSyncErrorCategory(error),
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
