import { supabase } from "../supabaseClient";

export type ProposalAtomicSubmitRpcBucket = {
  supplier?: string | null;
  request_item_ids: string[];
  meta?: {
    request_item_id: string;
    price?: string | null;
    supplier?: string | null;
    note?: string | null;
  }[];
};

export type ProposalAtomicSubmitRpcArgs = {
  p_client_mutation_id: string;
  p_buckets: ProposalAtomicSubmitRpcBucket[];
  p_buyer_fio?: string | null;
  p_submit?: boolean;
  p_request_item_status?: string | null;
  p_request_id?: string | null;
};

export type ExistingProposalRecoveryRow = {
  id?: string | null;
  proposal_no?: string | null;
  display_no?: string | null;
  status?: string | null;
  submitted_at?: string | null;
  sent_to_accountant_at?: string | null;
  supplier?: string | null;
};

export type ExistingProposalItemRecoveryRow = {
  request_item_id?: string | null;
};

export async function loadExistingProposalItemRecoveryRows(
  proposalId: string,
  requestItemIds: string[],
) {
  return await supabase
    .from("proposal_items")
    .select("request_item_id")
    .eq("proposal_id", proposalId)
    .in("request_item_id", requestItemIds)
    .limit(Math.max(1, requestItemIds.length));
}

export async function loadExistingProposalRecoveryRows(params: {
  requestId: string;
  supplier: string;
}) {
  let query = supabase
    .from("proposals")
    .select("id,proposal_no,display_no,status,submitted_at,sent_to_accountant_at,supplier")
    .eq("request_id", params.requestId);

  query = params.supplier ? query.eq("supplier", params.supplier) : query.is("supplier", null);
  return await query.order("updated_at", { ascending: false }).limit(10);
}

export async function callProposalAtomicSubmitRpc(args: ProposalAtomicSubmitRpcArgs) {
  return await supabase.rpc("rpc_proposal_submit_v3" as never, args as never);
}
