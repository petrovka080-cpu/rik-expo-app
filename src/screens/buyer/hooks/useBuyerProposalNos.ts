import { supabase } from "../../../lib/supabaseClient";

type ProposalNoRow = {
  id?: string | number | null;
  proposal_no?: string | null;
};

export async function fetchBuyerProposalNos(proposalIds: string[]) {
  const { data, error } = await supabase
    .from("proposals")
    .select("id, proposal_no")
    .in("id", proposalIds);

  return {
    data: Array.isArray(data) ? (data as ProposalNoRow[]) : [],
    error,
  };
}
