import type {
  WarehouseIssueFreeLine,
  WarehouseIssueRequestLine,
  WarehouseSupabaseClient,
} from "../../types/contracts/warehouse";
import type { NullableRpcErrorLike } from "../../lib/api/queryBoundary";
import { callRateLimitedSupabaseRpc } from "../../lib/api/supabaseRpcAdapter";

export type WarehouseIssueFreeAtomicPayload = {
  p_who: string;
  p_object_name: string | null;
  p_work_name: string | null;
  p_note: string | null;
  p_lines: WarehouseIssueFreeLine[];
  p_client_mutation_id: string;
};

export type WarehouseIssueRequestAtomicPayload = {
  p_who: string;
  p_note: string;
  p_request_id: string;
  p_object_name: string | null;
  p_work_name: string | null;
  p_lines: WarehouseIssueRequestLine[];
  p_client_mutation_id: string;
};
type WarehouseIssueAtomicRpcResult = {
  data: unknown;
  error: NullableRpcErrorLike;
};

export async function issueWarehouseFreeAtomicTransport(
  supabase: WarehouseSupabaseClient,
  payload: WarehouseIssueFreeAtomicPayload,
) {
  return await callRateLimitedSupabaseRpc<WarehouseIssueAtomicRpcResult>(
    supabase,
    "wh_issue_free_atomic_v5",
    payload,
  );
}

export async function issueWarehouseRequestAtomicTransport(
  supabase: WarehouseSupabaseClient,
  payload: WarehouseIssueRequestAtomicPayload,
) {
  return await callRateLimitedSupabaseRpc<WarehouseIssueAtomicRpcResult>(
    supabase,
    "wh_issue_request_atomic_v1",
    payload,
  );
}
