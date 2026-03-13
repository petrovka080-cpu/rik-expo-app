import type { SupabaseClient } from "@supabase/supabase-js";

export async function createWarehouseIssue(
  supabase: SupabaseClient,
  payload: {
    p_who: string;
    p_note: string;
    p_request_id: string | null;
    p_object_name: string | null;
    p_work_name: string | null;
  },
) {
  return await supabase.rpc("issue_via_ui", payload);
}

export async function addWarehouseIssueItem(
  supabase: SupabaseClient,
  payload: {
    p_issue_id: number;
    p_rik_code: string;
    p_uom_id: string;
    p_qty: number;
    p_request_item_id: string | null;
  },
) {
  return await supabase.rpc("issue_add_item_via_ui", payload);
}

export async function commitWarehouseIssue(
  supabase: SupabaseClient,
  issueId: number,
) {
  return await supabase.rpc("acc_issue_commit_ledger", { p_issue_id: issueId });
}

export async function issueWarehouseFreeAtomic(
  supabase: SupabaseClient,
  payload: {
    p_who: string;
    p_object_name: string | null;
    p_work_name: string | null;
    p_note: string | null;
    p_lines: Array<{ rik_code: string; uom_id: string | null; qty: number }>;
  },
) {
  return await supabase.rpc("wh_issue_free_atomic_v4", payload);
}
