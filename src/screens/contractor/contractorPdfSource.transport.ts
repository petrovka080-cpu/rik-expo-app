import type {
  AppSupabaseClient,
  PublicFunctionArgs,
} from "../../types/contracts/shared";

export type ContractorWorkPdfSourceRpcArgs =
  PublicFunctionArgs<"pdf_contractor_work_source_v1">;

export const callContractorWorkPdfSourceRpc = async (
  supabase: AppSupabaseClient,
  args: ContractorWorkPdfSourceRpcArgs,
) => supabase.rpc("pdf_contractor_work_source_v1", args);
