import type {
  DirectorPendingProposalsScopeV1Args,
  DirectorSupabaseClient,
} from "../../types/contracts/director";

export const callDirectorPendingProposalsScopeRpc = async (
  supabase: DirectorSupabaseClient,
  args: DirectorPendingProposalsScopeV1Args,
) => supabase.rpc("director_pending_proposals_scope_v1", args);
