type DirectorRequestRpcResult = Promise<{ data: unknown; error: unknown }>;

type DirectorRequestRpcClient = {
  rpc: (name: string, args: Record<string, unknown>) => DirectorRequestRpcResult;
};

export function rejectDirectorRequestItemRpc(
  supabase: DirectorRequestRpcClient,
  requestItemId: string,
): DirectorRequestRpcResult {
  return supabase.rpc("reject_request_item", {
    request_item_id: requestItemId,
    reason: null,
  });
}

export function rejectDirectorRequestAllRpc(
  supabase: DirectorRequestRpcClient,
  requestId: string,
): DirectorRequestRpcResult {
  return supabase.rpc("reject_request_all", {
    p_request_id: requestId,
    p_reason: null,
  });
}

export function approveDirectorRequestRpc(
  supabase: DirectorRequestRpcClient,
  params: {
    requestId: string;
    clientMutationId: string;
  },
): DirectorRequestRpcResult {
  return supabase.rpc("director_approve_request_v1", {
    p_request_id: params.requestId,
    p_client_mutation_id: params.clientMutationId,
  });
}
