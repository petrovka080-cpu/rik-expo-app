import type { AppSupabaseClient } from "../../lib/dbContract.types";

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
  return supabase.rpc("director_decide_proposal_items", args);
}
