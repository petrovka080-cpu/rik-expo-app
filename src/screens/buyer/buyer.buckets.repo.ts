import type { SupabaseClient } from "@supabase/supabase-js";

const BUYER_STATUS_PENDING = "На утверждении";
const BUYER_STATUS_APPROVED = "Утверждено";
const BUYER_STATUS_REWORK = "На доработке";

export async function fetchBuyerProposalSummaryByStatus(
  supabase: SupabaseClient,
  status: string,
) {
  return await supabase
    .from("v_proposals_summary")
    .select("proposal_id,status,submitted_at,sent_to_accountant_at,total_sum,items_cnt")
    .eq("status", status)
    .gt("items_cnt", 0)
    .order("submitted_at", { ascending: false });
}

export async function fetchBuyerRejectedProposalRows(supabase: SupabaseClient) {
  return await supabase
    .from("proposals")
    .select("id, payment_status, submitted_at, created_at")
    .ilike("payment_status", `%${BUYER_STATUS_REWORK}%`)
    .order("submitted_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false, nullsFirst: false });
}

export async function fetchBuyerProposalItemIds(
  supabase: SupabaseClient,
  proposalIds: string[],
) {
  return await supabase.from("proposal_items").select("proposal_id").in("proposal_id", proposalIds);
}

export { BUYER_STATUS_APPROVED, BUYER_STATUS_PENDING, BUYER_STATUS_REWORK };
