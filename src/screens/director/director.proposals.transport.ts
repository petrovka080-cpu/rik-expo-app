import type {
  DirectorPendingProposalsScopeV1Args,
  DirectorSupabaseClient,
} from "../../types/contracts/director";
import { callRateLimitedSupabaseRpc } from "../../lib/api/supabaseRpcAdapter";

export const callDirectorPendingProposalsScopeRpc = async (
  supabase: DirectorSupabaseClient,
  args: DirectorPendingProposalsScopeV1Args,
) =>
  callRateLimitedSupabaseRpc(supabase, "director_pending_proposals_scope_v1", {
    p_offset_heads: args.p_offset_heads,
    p_limit_heads: args.p_limit_heads,
  });
