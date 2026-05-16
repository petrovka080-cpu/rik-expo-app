import { supabase } from "../supabaseClient";

export async function callProposalItemsForWebRpc(proposalId: string) {
  // SCALE_BOUND_EXCEPTION: parent-scoped proposal item RPC is keyed by one proposal id; DB function pagination is a follow-up contract change.
  return await supabase.rpc("proposal_items_for_web", { p_id: proposalId });
}
