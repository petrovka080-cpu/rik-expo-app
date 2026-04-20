import type {
  WarehouseIssueFreeLine,
  WarehouseIssueRequestLine,
  WarehouseSupabaseClient,
} from "../../types/contracts/warehouse";

export async function issueWarehouseFreeAtomic(
  supabase: WarehouseSupabaseClient,
  payload: {
    p_who: string;
    p_object_name: string | null;
    p_work_name: string | null;
    p_note: string | null;
    p_lines: WarehouseIssueFreeLine[];
    p_client_mutation_id: string;
  },
) {
  return await supabase.rpc("wh_issue_free_atomic_v5", payload);
}

export async function issueWarehouseRequestAtomic(
  supabase: WarehouseSupabaseClient,
  payload: {
    p_who: string;
    p_note: string;
    p_request_id: string;
    p_object_name: string | null;
    p_work_name: string | null;
    p_lines: WarehouseIssueRequestLine[];
    p_client_mutation_id: string;
  },
) {
  return await supabase.rpc("wh_issue_request_atomic_v1", payload);
}
