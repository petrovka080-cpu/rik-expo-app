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

export async function issueWarehouseFreeAtomic(
  supabase: WarehouseSupabaseClient,
  payload: WarehouseIssueFreeAtomicPayload,
) {
  const result = await issueWarehouseFreeAtomicTransport(supabase, payload);
  return validateWarehouseIssueAtomicResult(
    result,
    "wh_issue_free_atomic_v5",
    "src/screens/warehouse/warehouse.issue.repo.issueWarehouseFreeAtomic",
  );
}

export async function issueWarehouseRequestAtomic(
  supabase: WarehouseSupabaseClient,
  payload: WarehouseIssueRequestAtomicPayload,
) {
  const result = await issueWarehouseRequestAtomicTransport(supabase, payload);
  return validateWarehouseIssueAtomicResult(
    result,
    "wh_issue_request_atomic_v1",
    "src/screens/warehouse/warehouse.issue.repo.issueWarehouseRequestAtomic",
  );
}
