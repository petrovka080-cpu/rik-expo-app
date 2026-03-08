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
  } catch (e) {
    console.log("[AccountantReturn] Method 1 (Direct API) failed:", e);
  }

  try {
    const { error } = await supabase.rpc("acc_return_min_auto", {
      p_proposal_id: pid,
      p_comment: comment,
    });
    if (error) throw error;
    return;
  } catch (e) {
    console.log("[AccountantReturn] Method 2 (acc_return_min_auto) failed:", e);
  }

  const { error } = await supabase.rpc("proposal_return_to_buyer_min", {
    p_proposal_id: pid,
    p_comment: comment,
  });
  if (error) {
    console.error("[AccountantReturn] Method 3 (proposal_return_to_buyer_min) failed:", error);
    throw error;
  }
}
