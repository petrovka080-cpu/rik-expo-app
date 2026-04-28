import type {
  WarehouseIssueFreeLine,
  WarehouseIssueRequestLine,
  WarehouseSupabaseClient,
} from "../../types/contracts/warehouse";
import {
  isWarehouseIssueAtomicResponse,
  RpcValidationError,
  validateRpcResponse,
  type NullableRpcErrorLike,
} from "../../lib/api/queryBoundary";

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
  payload: {
    p_who: string;
    p_object_name: string | null;
    p_work_name: string | null;
    p_note: string | null;
    p_lines: WarehouseIssueFreeLine[];
    p_client_mutation_id: string;
  },
) {
  const result = await supabase.rpc("wh_issue_free_atomic_v5", payload);
  return validateWarehouseIssueAtomicResult(
    result,
    "wh_issue_free_atomic_v5",
    "src/screens/warehouse/warehouse.issue.repo.issueWarehouseFreeAtomic",
  );
}

export async function issueWarehouseRequestAtomic(
  supabase: WarehouseSupabaseClient,
  payload: {
    p_who: string;
    p_note: string;
    p_request_id: string;
    p_object_name: string | null;
    p_work_name: string | null;
    p_lines: WarehouseIssueRequestLine[];
    p_client_mutation_id: string;
  },
) {
  const result = await supabase.rpc("wh_issue_request_atomic_v1", payload);
  return validateWarehouseIssueAtomicResult(
    result,
    "wh_issue_request_atomic_v1",
    "src/screens/warehouse/warehouse.issue.repo.issueWarehouseRequestAtomic",
  );
}
