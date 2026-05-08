import type { AppSupabaseClient } from "../../lib/dbContract.types";

export type DirectorApprovePipelineRpcArgs = {
  p_proposal_id: string;
  p_comment: string | null;
  p_invoice_currency: string;
  p_client_mutation_id: string;
};

export function callDirectorApprovePipelineRpc(
  supabase: AppSupabaseClient,
  args: DirectorApprovePipelineRpcArgs,
) {
  return supabase.rpc("director_approve_pipeline_v1", args);
}
