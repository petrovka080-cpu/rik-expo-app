import type {
  AppSupabaseClient,
  PublicFunctionArgs,
} from "../../types/contracts/shared";

export type ContractorCatalogSearchRpcArgs = PublicFunctionArgs<"catalog_search">;

export const callContractorCatalogSearchRpc = async (
  supabaseClient: AppSupabaseClient,
  args: ContractorCatalogSearchRpcArgs,
) => supabaseClient.rpc("catalog_search", args);
