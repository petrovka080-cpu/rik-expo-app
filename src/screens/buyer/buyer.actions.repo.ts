import type { SupabaseClient } from "@supabase/supabase-js";
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
  const result = await supabase.rpc("request_items_set_status", {
    p_request_item_ids: affectedIds,
    p_status: "У директора",
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
  return await supabase
    .from("request_items")
    .update({ director_reject_note: null, director_reject_at: null })
    .in("id", affectedIds);
}

export async function publishRfq(
  supabase: SupabaseClient,
  payload: {
    p_request_item_ids: string[];
    p_deadline_at: string;
    p_contact_phone: string | null;
    p_contact_email: string | null;
    p_contact_whatsapp: null;
    p_delivery_days: number;
    p_radius_km: null;
    p_visibility: "invited" | "open";
    p_city: string | null;
    p_lat: null;
    p_lng: null;
    p_address_text: string | null;
    p_address_place_id: null;
    p_note: string | null;
  },
) {
  const result = await supabase.rpc("buyer_rfq_create_and_publish_v1", payload);
  return validateBuyerRpcResult(result, isRpcNonEmptyStringResponse, {
    rpcName: "buyer_rfq_create_and_publish_v1",
    caller: "src/screens/buyer/buyer.actions.repo.publishRfq",
  });
}

export async function sendProposalToAccountingMin(
  supabase: SupabaseClient,
  payload: {
    p_proposal_id: string;
    p_invoice_number: string;
    p_invoice_date: string;
    p_invoice_amount: number;
    p_invoice_currency: string;
  },
) {
  const result = await supabase.rpc("proposal_send_to_accountant_min", payload);
  return validateBuyerRpcResult(result, isRpcVoidResponse, {
    rpcName: "proposal_send_to_accountant_min",
    caller: "src/screens/buyer/buyer.actions.repo.sendProposalToAccountingMin",
  });
}
