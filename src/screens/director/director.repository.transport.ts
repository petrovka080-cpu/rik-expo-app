import type { DirectorSupabaseClient } from "../../types/contracts/director";
import { callRateLimitedSupabaseRpc } from "../../lib/api/supabaseRpcAdapter";

export const callListDirectorItemsStableRpc = async (
  supabase: DirectorSupabaseClient,
) =>
  // SCALE_BOUND_EXCEPTION: legacy stable director list RPC has no pagination args; fallback table path is page-through bounded.
  callRateLimitedSupabaseRpc(supabase, "list_director_items_stable");
