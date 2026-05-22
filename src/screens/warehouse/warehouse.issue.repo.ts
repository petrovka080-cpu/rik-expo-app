import type {
  WarehouseSupabaseClient,
} from "../../types/contracts/warehouse";
import {
  isWarehouseIssueAtomicResponse,
  RpcValidationError,
  validateRpcResponse,
  type NullableRpcErrorLike,
} from "../../lib/api/queryBoundary";
import {
  issueWarehouseFreeAtomicTransport,
  issueWarehouseRequestAtomicTransport,
  type WarehouseIssueFreeAtomicPayload,
  type WarehouseIssueRequestAtomicPayload,
} from "./warehouse.issue.transport";
import { recordPlatformObservability } from "../../lib/observability/platformObservability";

const validateWarehouseIssueAtomicResult = (
  result: { data: unknown; error: NullableRpcErrorLike },
  rpcName: "wh_issue_free_atomic_v5" | "wh_issue_request_atomic_v1",
  caller: string,
) => {
  if (result.error) return result;

  try {
    return {
      data: validateRpcResponse(result.data, isWarehouseIssueAtomicResponse, {
        rpcName,
        caller,
        domain: "warehouse",
      }),
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error:
        error instanceof RpcValidationError
          ? error
          : new RpcValidationError({ rpcName, caller, domain: "warehouse" }),
    };
  }
};

const recordWarehouseIssueMutationEvent = (
  event: string,
  result: "success" | "error",
  extra: Record<string, unknown>,
  error?: unknown,
) => {
  recordPlatformObservability({
    screen: "warehouse",
    surface: "warehouse_issue_atomic",
    category: "ui",
    event,
    result,
    sourceKind: "mutation:warehouse_issue",
    errorClass: error instanceof Error ? error.name : error ? "WarehouseIssueMutationError" : undefined,
    errorMessage: error instanceof Error ? error.message : error ? String(error) : undefined,
    extra,
  });
};

export async function issueWarehouseFreeAtomic(
  supabase: WarehouseSupabaseClient,
  payload: WarehouseIssueFreeAtomicPayload,
) {
  recordWarehouseIssueMutationEvent("warehouse_issue_free_atomic_started", "success", {
    clientMutationId: payload.p_client_mutation_id ?? null,
  });
  const result = await issueWarehouseFreeAtomicTransport(supabase, payload);
  const validated = validateWarehouseIssueAtomicResult(
    result,
    "wh_issue_free_atomic_v5",
    "src/screens/warehouse/warehouse.issue.repo.issueWarehouseFreeAtomic",
  );
  recordWarehouseIssueMutationEvent(
    validated.error ? "warehouse_issue_free_atomic_terminal_failure" : "warehouse_issue_free_atomic_terminal_success",
    validated.error ? "error" : "success",
    { clientMutationId: payload.p_client_mutation_id ?? null },
    validated.error ?? undefined,
  );
  return validated;
}

export async function issueWarehouseRequestAtomic(
  supabase: WarehouseSupabaseClient,
  payload: WarehouseIssueRequestAtomicPayload,
) {
  recordWarehouseIssueMutationEvent("warehouse_issue_request_atomic_started", "success", {
    clientMutationId: payload.p_client_mutation_id ?? null,
  });
  const result = await issueWarehouseRequestAtomicTransport(supabase, payload);
  const validated = validateWarehouseIssueAtomicResult(
    result,
    "wh_issue_request_atomic_v1",
    "src/screens/warehouse/warehouse.issue.repo.issueWarehouseRequestAtomic",
  );
  recordWarehouseIssueMutationEvent(
    validated.error ? "warehouse_issue_request_atomic_terminal_failure" : "warehouse_issue_request_atomic_terminal_success",
    validated.error ? "error" : "success",
    { clientMutationId: payload.p_client_mutation_id ?? null },
    validated.error ?? undefined,
  );
  return validated;
}
