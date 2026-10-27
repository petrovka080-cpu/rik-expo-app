import {
  isRpcRecordArray,
  validateRpcResponse,
} from "../../../lib/api/queryBoundary";
import { callBuyerRequestProposalMapRpc } from "./useBuyerRequestProposalMap.transport";

type RequestProposalMapRow = {
  request_id?: string | number | null;
  proposal_no?: string | null;
};

export const isBuyerRequestProposalMapRpcResponse = isRpcRecordArray;

export async function fetchBuyerRequestProposalMap(requestIds: string[]) {
  const { data, error } = await callBuyerRequestProposalMapRpc({
    p_request_ids: requestIds,
  });

  if (error) {
    return { data: [], error };
  }

  try {
    const validated = validateRpcResponse(data, isBuyerRequestProposalMapRpcResponse, {
      rpcName: "resolve_req_pr_map",
      caller: "src/screens/buyer/hooks/useBuyerRequestProposalMap.fetchBuyerRequestProposalMap",
      domain: "buyer",
    });
    return {
      data: validated as RequestProposalMapRow[],
      error: null,
    };
  } catch (validationError) {
    return {
      data: [],
      error: validationError,
    };
  }
}
