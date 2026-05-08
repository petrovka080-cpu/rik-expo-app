import type { DirectorSupabaseClient } from "../../types/contracts/director";

export const callListDirectorItemsStableRpc = async (
  supabase: DirectorSupabaseClient,
) => supabase.rpc("list_director_items_stable");
