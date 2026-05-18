import type {
  AppSupabaseClient,
  PublicFunctionArgs,
} from "../../types/contracts/shared";
import { callRateLimitedSupabaseRpc } from "../../lib/api/supabaseRpcAdapter";

export type ContractorWorkPdfSourceRpcArgs =
  PublicFunctionArgs<"pdf_contractor_work_source_v1">;
type ContractorWorkPdfSourceRpcResult = {
  data: unknown;
  error: { message?: string | null } | null;
};

export const callContractorWorkPdfSourceRpc = async (
  supabase: AppSupabaseClient,
  args: ContractorWorkPdfSourceRpcArgs,
) =>
  // SCALE_BOUND_EXCEPTION: contractor PDF source is keyed by one progress/log id pair, not a list screen read.
  callRateLimitedSupabaseRpc<ContractorWorkPdfSourceRpcResult>(
    supabase,
    "pdf_contractor_work_source_v1",
    args,
  );
