import { supabase } from "../../../lib/supabaseClient";

type RequestProposalMapRow = {
  request_id?: string | number | null;
  proposal_no?: string | null;
};

export async function fetchBuyerRequestProposalMap(requestIds: string[]) {
  const { data, error } = await supabase.rpc("resolve_req_pr_map", {
    p_request_ids: requestIds,
  });

  return {
    data: Array.isArray(data) ? (data as RequestProposalMapRow[]) : [],
    error,
  };
}
