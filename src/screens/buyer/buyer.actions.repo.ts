import type { SupabaseClient } from "@supabase/supabase-js";
import {
  clearRequestItemsDirectorRejectStateUpdate,
  publishBuyerRfqRpc,
  sendProposalToAccountingMinRpc,
  setRequestItemsDirectorStatusRpc,
  type BuyerProposalAccountingPayload,
  type BuyerRfqPublishPayload,
} from "./buyer.actions.write.transport";
import {
  isRpcNonEmptyStringResponse,
  isRpcVoidResponse,
  RpcValidationError,
  validateRpcResponse,
} from "../../lib/api/queryBoundary";

const validateBuyerRpcResult = <T>(
  result: { data: unknown; error: unknown },
  validator: (value: unknown) => value is T,
  context: {
    rpcName: string;
    caller: string;
  },
): { data: T | null; error: unknown } => {
  if (result.error) return result as { data: T | null; error: unknown };

  try {
    return {
      data: validateRpcResponse(result.data, validator, {
        ...context,
        domain: "buyer",
      }),
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error:
        error instanceof RpcValidationError
          ? error
          : new RpcValidationError({ ...context, domain: "buyer" }),
    };
  }
};

export async function setRequestItemsDirectorStatus(
  supabase: SupabaseClient,
  affectedIds: string[],
) {
  const result = await setRequestItemsDirectorStatusRpc({
    supabase,
    affectedIds,
  });
  return validateBuyerRpcResult(result, isRpcVoidResponse, {
    rpcName: "request_items_set_status",
    caller: "src/screens/buyer/buyer.actions.repo.setRequestItemsDirectorStatus",
  });
}

export async function setRequestItemsDirectorStatusFallback(
  supabase: SupabaseClient,
  affectedIds: string[],
) {
  void supabase;
  void affectedIds;
  throw new Error(
    "request_items_set_status RPC is required; client-side request_items status fallback is disabled",
  );
}

export async function clearRequestItemsDirectorRejectState(
  supabase: SupabaseClient,
  affectedIds: string[],
) {
  return await clearRequestItemsDirectorRejectStateUpdate({
    supabase,
    affectedIds,
  });
}

export async function publishRfq(
  supabase: SupabaseClient,
  payload: BuyerRfqPublishPayload,
) {
  const result = await publishBuyerRfqRpc({ supabase, payload });
  return validateBuyerRpcResult(result, isRpcNonEmptyStringResponse, {
    rpcName: "buyer_rfq_create_and_publish_v1",
    caller: "src/screens/buyer/buyer.actions.repo.publishRfq",
  });
}

export async function sendProposalToAccountingMin(
  supabase: SupabaseClient,
  payload: BuyerProposalAccountingPayload,
) {
  const result = await sendProposalToAccountingMinRpc({ supabase, payload });
  return validateBuyerRpcResult(result, isRpcVoidResponse, {
    rpcName: "proposal_send_to_accountant_min",
    caller: "src/screens/buyer/buyer.actions.repo.sendProposalToAccountingMin",
  });
}
