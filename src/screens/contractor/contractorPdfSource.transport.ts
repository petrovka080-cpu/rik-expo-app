import type {
  AppSupabaseClient,
  PublicFunctionArgs,
} from "../../types/contracts/shared";

export type ContractorWorkPdfSourceRpcArgs =
  PublicFunctionArgs<"pdf_contractor_work_source_v1">;

export const callContractorWorkPdfSourceRpc = async (
  supabase: AppSupabaseClient,
  args: ContractorWorkPdfSourceRpcArgs,
) =>
  // SCALE_BOUND_EXCEPTION: contractor PDF source is keyed by one progress/log id pair, not a list screen read.
  supabase.rpc("pdf_contractor_work_source_v1", args);
