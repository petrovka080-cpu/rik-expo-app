import type { SupabaseClient } from "@supabase/supabase-js";

export async function setRequestItemsDirectorStatus(
  supabase: SupabaseClient,
  affectedIds: string[],
) {
  return await supabase.rpc("request_items_set_status", {
    p_request_item_ids: affectedIds,
    p_status: "У директора",
  });
}

export async function setRequestItemsDirectorStatusFallback(
  supabase: SupabaseClient,
  affectedIds: string[],
) {
  return await supabase.from("request_items").update({ status: "У директора" }).in("id", affectedIds);
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
  return await supabase.rpc("buyer_rfq_create_and_publish_v1", payload);
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
  return await supabase.rpc("proposal_send_to_accountant_min", payload);
}
