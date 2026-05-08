import { supabase } from "./supabaseClient";
import type { Database } from "./database.types";

type PurchaseInsert = Database["public"]["Tables"]["purchases"]["Insert"];
type PurchaseItemInsert = Database["public"]["Tables"]["purchase_items"]["Insert"];
type PurchasesPendingInsert = Database["public"]["Tables"]["purchases_pending"]["Insert"];

export const STORE_SUPABASE_WRITE_RPC_NAMES = {
  sendRequestToDirector: "send_request_to_director",
  approveOrDeclineRequestPending: "approve_or_decline_request_pending",
} as const;

export async function sendStoreRequestToDirectorRpc(requestId: number) {
  return await supabase.rpc(STORE_SUPABASE_WRITE_RPC_NAMES.sendRequestToDirector, {
    p_request_id: requestId,
  });
}

export async function approveOrDeclineRequestPendingRpc(pendingId: string, verdict: string) {
  return await supabase.rpc(STORE_SUPABASE_WRITE_RPC_NAMES.approveOrDeclineRequestPending, {
    p_pending_id: pendingId,
    p_verdict: verdict,
  });
}

export async function insertStorePurchase(payload: PurchaseInsert) {
  return await supabase.from("purchases").insert(payload).select("*").single();
}

export async function insertStorePurchaseItems(payload: PurchaseItemInsert[]) {
  return await supabase.from("purchase_items").insert(payload);
}

export async function insertStorePurchasePending(payload: PurchasesPendingInsert[]) {
  return await supabase.from("purchases_pending").insert(payload);
}
