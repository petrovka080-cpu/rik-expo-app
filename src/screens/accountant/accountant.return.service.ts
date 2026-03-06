import { supabase } from "../../lib/supabaseClient";
import { accountantReturnToBuyer } from "../../lib/catalog_api";

export async function runAccountantReturnToBuyerChain(params: {
  proposalId: string;
  comment: string | null;
}): Promise<void> {
  const pid = String(params.proposalId || "").trim();
  if (!pid) return;
  const comment = params.comment;

  try {
    await accountantReturnToBuyer({ proposalId: pid, comment });
    return;
  } catch {}

  try {
    const { error } = await supabase.rpc("acc_return_min_auto", {
      p_proposal_id: pid,
      p_comment: comment,
    });
    if (error) throw error;
    return;
  } catch {}

  const { error } = await supabase.rpc("proposal_return_to_buyer_min", {
    p_proposal_id: pid,
    p_comment: comment,
  });
  if (error) throw error;
}
