import { supabase } from "../supabaseClient";

export async function callProposalItemsForWebRpc(proposalId: string) {
  return await supabase.rpc("proposal_items_for_web", { p_id: proposalId });
}
