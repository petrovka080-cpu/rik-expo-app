import { supabase } from "../../lib/supabaseClient";

type AccountantReturnRpcArgs = {
  p_proposal_id: string;
  p_comment?: string;
};

export const callAccReturnMinAutoRpc = async (args: AccountantReturnRpcArgs) =>
  supabase.rpc("acc_return_min_auto", args);

export const callProposalReturnToBuyerMinRpc = async (args: AccountantReturnRpcArgs) =>
  supabase.rpc("proposal_return_to_buyer_min", args);
