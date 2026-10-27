import type { AppSupabaseClient } from "../../lib/dbContract.types";
import { callRateLimitedSupabaseRpc } from "../../lib/api/supabaseRpcAdapter";

export type DirectorProposalItemDecision = {
  request_item_id: string;
  decision: "rejected";
  comment: string;
};

export type DirectorDecideProposalItemsRpcArgs = {
  p_proposal_id: string;
  p_decisions: DirectorProposalItemDecision[];
  p_finalize: boolean;
};

export function callDirectorDecideProposalItemsRpc(
  supabase: AppSupabaseClient,
  args: DirectorDecideProposalItemsRpcArgs,
) {
  return callRateLimitedSupabaseRpc(supabase, "director_decide_proposal_items", args);
}
