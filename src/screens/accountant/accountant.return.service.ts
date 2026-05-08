import { accountantReturnToBuyer } from "../../lib/api/accountant";
import { isRpcVoidResponse, validateRpcResponse } from "../../lib/api/queryBoundary";
import { logger } from "../../lib/logger";
import {
  callAccReturnMinAutoRpc,
  callProposalReturnToBuyerMinRpc,
} from "./accountant.return.transport";

export async function runAccountantReturnToBuyerChain(params: {
  proposalId: string;
  comment: string | null;
}): Promise<void> {
  const pid = String(params.proposalId || "").trim();
  if (!pid) return;
  const comment = params.comment;
  const trimmedComment = comment?.trim() || undefined;

  try {
    await accountantReturnToBuyer({ proposalId: pid, comment: trimmedComment });
    return;
  } catch (e) {
    if (__DEV__) logger.info("log", "[AccountantReturn] Method 1 (Direct API) failed:", e);
  }

  try {
    const { data, error } = await callAccReturnMinAutoRpc({
      p_proposal_id: pid,
      p_comment: trimmedComment,
    });
    if (error) throw error;
    validateRpcResponse(data, isRpcVoidResponse, {
      rpcName: "acc_return_min_auto",
      caller: "runAccountantReturnToBuyerChain",
      domain: "accountant",
    });
    return;
  } catch (e) {
    if (__DEV__) logger.info("log", "[AccountantReturn] Method 2 (acc_return_min_auto) failed:", e);
  }

  const { data, error } = await callProposalReturnToBuyerMinRpc({
    p_proposal_id: pid,
    p_comment: trimmedComment,
  });
  if (error) {
    if (__DEV__) console.error("[AccountantReturn] Method 3 (proposal_return_to_buyer_min) failed:", error);
    throw error;
  }
  validateRpcResponse(data, isRpcVoidResponse, {
    rpcName: "proposal_return_to_buyer_min",
    caller: "runAccountantReturnToBuyerChain",
    domain: "accountant",
  });
}
