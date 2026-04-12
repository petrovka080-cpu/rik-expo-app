import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../lib/database.types";

export async function issueWarehouseFreeAtomic(
  supabase: SupabaseClient<Database>,
  payload: {
    p_who: string;
    p_object_name: string | null;
    p_work_name: string | null;
    p_note: string | null;
    p_lines: { rik_code: string; uom_id: string | null; qty: number }[];
    p_client_mutation_id: string;
  },
) {
  return await supabase.rpc("wh_issue_free_atomic_v5", payload);
}

export async function issueWarehouseRequestAtomic(
  supabase: SupabaseClient<Database>,
  payload: {
    p_who: string;
    p_note: string;
    p_request_id: string;
    p_object_name: string | null;
    p_work_name: string | null;
    p_lines: {
      rik_code: string;
      uom_id: string;
      qty: number;
      request_item_id: string | null;
    }[];
    p_client_mutation_id: string;
  },
) {
  return await supabase.rpc("wh_issue_request_atomic_v1", payload);
}
