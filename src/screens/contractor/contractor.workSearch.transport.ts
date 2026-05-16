import type {
  AppSupabaseClient,
  PublicFunctionArgs,
} from "../../types/contracts/shared";

export type ContractorCatalogSearchRpcArgs = PublicFunctionArgs<"catalog_search">;

export const callContractorCatalogSearchRpc = async (
  supabaseClient: AppSupabaseClient,
  args: ContractorCatalogSearchRpcArgs,
) =>
  // SCALE_BOUND_EXCEPTION: catalog_search DB function has no limit arg; controller uses short search input and ignores stale responses.
  supabaseClient.rpc("catalog_search", args);
