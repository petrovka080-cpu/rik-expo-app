import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../database.types";
import { callRateLimitedSupabaseRpc } from "./supabaseRpcAdapter";

export async function callProposalRequestItemIntegrityRpc(
  supabaseClient: SupabaseClient<Database>,
  proposalId: string,
) {
  return await callRateLimitedSupabaseRpc(supabaseClient, "proposal_request_item_integrity_v1", {
    p_proposal_id: proposalId,
  });
}
