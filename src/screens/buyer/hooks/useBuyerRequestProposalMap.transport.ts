import { supabase } from "../../../lib/supabaseClient";
import type { PublicFunctionArgs } from "../../../types/contracts/shared";

export type BuyerRequestProposalMapRpcArgs = PublicFunctionArgs<"resolve_req_pr_map">;

export const callBuyerRequestProposalMapRpc = async (
  args: BuyerRequestProposalMapRpcArgs,
) => supabase.rpc("resolve_req_pr_map", args);
