import type {
  AppSupabaseClient,
  PublicFunctionArgs,
} from "../../types/contracts/shared";
import { callRateLimitedSupabaseRpc } from "../../lib/api/supabaseRpcAdapter";

export type ContractorCatalogSearchRpcArgs = PublicFunctionArgs<"catalog_search">;
type ContractorCatalogSearchRpcResult = {
  data: unknown;
  error: { message?: string | null } | null;
};

export const callContractorCatalogSearchRpc = async (
  supabaseClient: AppSupabaseClient,
  args: ContractorCatalogSearchRpcArgs,
) =>
  // SCALE_BOUND_EXCEPTION: catalog_search DB function has no limit arg; controller uses short search input and ignores stale responses.
  callRateLimitedSupabaseRpc<ContractorCatalogSearchRpcResult>(
    supabaseClient,
    "catalog_search",
    args,
  );
