import {
  isDirectorApproveRequestResponse,
  isRpcVoidResponse,
  validateRpcResponse,
} from "../../lib/api/queryBoundary";
import { buildCoreMutationIntentId } from "../../lib/api/coreMutationId";
import { recordPlatformObservability } from "../../lib/observability/platformObservability";
import {
  approveDirectorRequestRpc,
  rejectDirectorRequestAllRpc,
  rejectDirectorRequestItemRpc,
} from "./director.request.transport";

type DirectorRequestDecisionResult = Record<string, unknown>;
type DirectorRequestDecisionResultKind = "success" | "error";
type DirectorRequestBoundaryClient = Parameters<typeof approveDirectorRequestRpc>[0];

const toErrorText = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message.trim()) return error.message.trim();
  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    for (const key of ["message", "details", "hint", "code"] as const) {
      const value = String(record[key] ?? "").trim();
      if (value) return value;
    }
  }
  return String(error ?? "").trim() || fallback;
};

const recordDirectorRequestDecisionEvent = (
  event: string,
  result: DirectorRequestDecisionResultKind,
  extra: Record<string, unknown>,
  error?: unknown,
) => {
  recordPlatformObservability({
    screen: "director",
    surface: "director_request_decision",
    category: "ui",
    event,
    result,
    sourceKind: "mutation:director:request_decision",
    errorClass: error instanceof Error ? error.name : error ? "DirectorRequestDecisionError" : undefined,
    errorMessage: error ? toErrorText(error, "director request decision failed") : undefined,
    extra,
  });
};

export async function runDirectorRequestRejectItemAction(params: {
  supabase: DirectorRequestBoundaryClient;
  requestItemId: string;
}): Promise<void> {
  const requestItemId = String(params.requestItemId ?? "").trim();
  const eventBase = { requestItemId };
  recordDirectorRequestDecisionEvent("director_request_reject_item_started", "success", eventBase);

  try {
    if (!requestItemId) throw new Error("request_item_id is required");
    const { data, error } = await rejectDirectorRequestItemRpc(params.supabase, requestItemId);
    recordDirectorRequestDecisionEvent("director_request_reject_item_rpc_completed", "success", eventBase);
    if (error) throw error;
    validateRpcResponse(data, isRpcVoidResponse, {
      rpcName: "reject_request_item",
      caller: "src/screens/director/director.request.boundary.runDirectorRequestRejectItemAction",
      domain: "director",
    });
    recordDirectorRequestDecisionEvent("director_request_reject_item_terminal_success", "success", eventBase);
  } catch (error) {
    recordDirectorRequestDecisionEvent("director_request_reject_item_terminal_failure", "error", eventBase, error);
    throw error;
  }
}

export async function runDirectorRequestRejectAllAction(params: {
  supabase: DirectorRequestBoundaryClient;
  requestId: string;
}): Promise<void> {
  const requestId = String(params.requestId ?? "").trim();
  const eventBase = { requestId };
  recordDirectorRequestDecisionEvent("director_request_reject_all_started", "success", eventBase);

  try {
    if (!requestId) throw new Error("request_id is required");
    const { data, error } = await rejectDirectorRequestAllRpc(params.supabase, requestId);
    recordDirectorRequestDecisionEvent("director_request_reject_all_rpc_completed", "success", eventBase);
    if (error) throw error;
    validateRpcResponse(data, isRpcVoidResponse, {
      rpcName: "reject_request_all",
      caller: "src/screens/director/director.request.boundary.runDirectorRequestRejectAllAction",
      domain: "director",
    });
    recordDirectorRequestDecisionEvent("director_request_reject_all_terminal_success", "success", eventBase);
  } catch (error) {
    recordDirectorRequestDecisionEvent("director_request_reject_all_terminal_failure", "error", eventBase, error);
    throw error;
  }
}

export async function runDirectorRequestApproveAction(params: {
  supabase: DirectorRequestBoundaryClient;
  requestId: string;
  clientMutationId?: string | null;
}): Promise<DirectorRequestDecisionResult> {
  const requestId = String(params.requestId ?? "").trim();
  const clientMutationId =
    String(params.clientMutationId ?? "").trim() ||
    buildCoreMutationIntentId({
      scope: "director.approve.request",
      entityId: requestId,
    });
  const eventBase = { requestId, clientMutationId };
  recordDirectorRequestDecisionEvent("director_request_approve_started", "success", eventBase);

  try {
    if (!requestId) throw new Error("request_id is required");

    const { data, error } = await approveDirectorRequestRpc(params.supabase, {
      requestId,
      clientMutationId,
    });
    recordDirectorRequestDecisionEvent("director_request_approve_rpc_completed", "success", eventBase);
    if (error) throw error;

    const validated = validateRpcResponse(data, isDirectorApproveRequestResponse, {
      rpcName: "director_approve_request_v1",
      caller: "src/screens/director/director.request.boundary.runDirectorRequestApproveAction",
      domain: "director",
    }) as DirectorRequestDecisionResult;

    if (validated && validated.ok === false) {
      throw new Error(String(validated.failure_message ?? "Не удалось утвердить заявку"));
    }

    recordDirectorRequestDecisionEvent("director_request_approve_terminal_success", "success", {
      ...eventBase,
      ok: validated.ok ?? null,
    });
    return validated;
  } catch (error) {
    recordDirectorRequestDecisionEvent("director_request_approve_terminal_failure", "error", eventBase, error);
    throw error;
  }
}
