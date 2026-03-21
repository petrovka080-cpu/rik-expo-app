import type { PostgrestResponse, SupabaseClient } from "@supabase/supabase-js";
import {
  BUYER_PROPOSAL_ITEM_ID_SELECT,
  BUYER_PROPOSAL_SUMMARY_SELECT,
  BUYER_REJECTED_PROPOSAL_SELECT,
  type BuyerProposalItemIdRow,
  type BuyerProposalSummaryRow,
  type BuyerRejectedProposalRow,
} from "./buyer.buckets.repo.data";

const BUYER_STATUS_PENDING = "На утверждении";
const BUYER_STATUS_APPROVED = "Утверждено";
const BUYER_STATUS_REWORK = "На доработке";

export async function fetchBuyerProposalSummaryByStatus(
  supabase: SupabaseClient,
  status: string,
) : Promise<PostgrestResponse<BuyerProposalSummaryRow>> {
  return fetchBuyerProposalSummaryByStatuses(supabase, [status]);
}

export async function fetchBuyerProposalSummaryByStatuses(
  supabase: SupabaseClient,
  statuses: string[],
): Promise<PostgrestResponse<BuyerProposalSummaryRow>> {
  const query = supabase
    .from("v_proposals_summary")
    .select(BUYER_PROPOSAL_SUMMARY_SELECT)
    .in("status", statuses)
    .gt("items_cnt", 0)
    .order("submitted_at", { ascending: false });

  return (await query) as PostgrestResponse<BuyerProposalSummaryRow>;
}

export async function fetchBuyerRejectedProposalRows(
  supabase: SupabaseClient,
): Promise<PostgrestResponse<BuyerRejectedProposalRow>> {
  const query = supabase
    .from("proposals")
    .select(BUYER_REJECTED_PROPOSAL_SELECT)
    .ilike("payment_status", `%${BUYER_STATUS_REWORK}%`)
    .order("submitted_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false, nullsFirst: false });

  return (await query) as PostgrestResponse<BuyerRejectedProposalRow>;
}

export async function fetchBuyerProposalItemIds(
  supabase: SupabaseClient,
  proposalIds: string[],
) : Promise<PostgrestResponse<BuyerProposalItemIdRow>> {
  const query = supabase
    .from("proposal_items")
    .select(BUYER_PROPOSAL_ITEM_ID_SELECT)
    .in("proposal_id", proposalIds);

  return (await query) as PostgrestResponse<BuyerProposalItemIdRow>;
}

export { BUYER_STATUS_APPROVED, BUYER_STATUS_PENDING, BUYER_STATUS_REWORK };
