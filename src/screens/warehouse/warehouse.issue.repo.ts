import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../lib/database.types";
import { ensureRequestExists } from "../../lib/api/integrity.guards";

const isMissingRpcFunctionError = (error: unknown): boolean => {
  const message = String((error as { message?: string } | null)?.message ?? error ?? "")
    .trim()
    .toLowerCase();
  return message.includes("could not find the function") || message.includes("schema cache");
};

export async function createWarehouseIssue(
  supabase: SupabaseClient<Database>,
  payload: {
    p_who: string;
    p_note: string;
    p_request_id: string | null;
    p_object_name: string | null;
    p_work_name: string | null;
  },
) {
  const requestId = String(payload.p_request_id ?? "").trim();
  if (requestId) {
    await ensureRequestExists(supabase, requestId, {
      screen: "warehouse",
      surface: "create_warehouse_issue",
      sourceKind: "mutation:warehouse_issue_repo",
    });
  }
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

export async function addWarehouseIssueItems(
  supabase: SupabaseClient,
  payload: {
    p_issue_id: number;
    p_lines: {
      rik_code: string;
      uom_id: string;
      qty: number;
      request_item_id: string | null;
    }[];
  },
) {
  const batch = await supabase.rpc("issue_add_items_via_ui", payload);
  if (!batch.error || !isMissingRpcFunctionError(batch.error)) {
    return batch;
  }

  for (const line of payload.p_lines || []) {
    const single = await addWarehouseIssueItem(supabase, {
      p_issue_id: payload.p_issue_id,
      p_rik_code: line.rik_code,
      p_uom_id: line.uom_id,
      p_qty: line.qty,
      p_request_item_id: line.request_item_id,
    });
    if (single.error) return single;
  }

  return { data: null, error: null };
}

export async function commitWarehouseIssue(
  supabase: SupabaseClient,
  issueId: number,
) {
  return await supabase.rpc("acc_issue_commit_ledger", { p_issue_id: issueId });
}

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
