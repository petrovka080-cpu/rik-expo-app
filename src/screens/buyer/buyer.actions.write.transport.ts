import type { SupabaseClient } from "@supabase/supabase-js";

export type BuyerRfqPublishPayload = {
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
};

export type BuyerProposalAccountingPayload = {
  p_proposal_id: string;
  p_invoice_number: string;
  p_invoice_date: string;
  p_invoice_amount: number;
  p_invoice_currency: string;
};

export async function setRequestItemsDirectorStatusRpc(params: {
  supabase: SupabaseClient;
  affectedIds: string[];
}) {
  return await params.supabase.rpc("request_items_set_status", {
    p_request_item_ids: params.affectedIds,
    p_status: "У директора",
  });
}

export async function clearRequestItemsDirectorRejectStateUpdate(params: {
  supabase: SupabaseClient;
  affectedIds: string[];
}) {
  return await params.supabase
    .from("request_items")
    .update({ director_reject_note: null, director_reject_at: null })
    .in("id", params.affectedIds);
}

export async function publishBuyerRfqRpc(params: {
  supabase: SupabaseClient;
  payload: BuyerRfqPublishPayload;
}) {
  return await params.supabase.rpc(
    "buyer_rfq_create_and_publish_v1",
    params.payload,
  );
}

export async function sendProposalToAccountingMinRpc(params: {
  supabase: SupabaseClient;
  payload: BuyerProposalAccountingPayload;
}) {
  return await params.supabase.rpc(
    "proposal_send_to_accountant_min",
    params.payload,
  );
}
