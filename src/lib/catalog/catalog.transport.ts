import { supabase } from "../supabaseClient";
import type {
  CatalogGroup,
  CatalogSearchRpcArgs,
  CatalogSearchRpcName,
  IncomingItem,
  UomRef,
} from "./catalog.types";

const SUPPLIERS_TABLE_SELECT =
  "id,name,inn,bank_account,specialization,phone,email,website,address,contact_name,notes";
const SUPPLIERS_COUNTERPARTY_SELECT = "id,name,inn,phone";
const SUBCONTRACTS_COUNTERPARTY_SELECT =
  "id,status,contractor_org,contractor_inn,contractor_phone";
const CONTRACTORS_COUNTERPARTY_SELECT = "id,company_name,phone,inn";
const CATALOG_SEARCH_FALLBACK_SELECT =
  "rik_code,name_human,uom_code,sector_code,spec,kind,group_code";
const RIK_QUICK_SEARCH_FALLBACK_FIELDS =
  "rik_code,name_human,uom_code,kind,name_human_ru";

export const RIK_QUICK_SEARCH_RPCS: CatalogSearchRpcName[] = [
  "rik_quick_ru",
  "rik_quick_search_typed",
  "rik_quick_search",
];

export const loadSupplierCounterpartyRows = async (searchTerm: string) => {
  let query = supabase
    .from("suppliers")
    .select(SUPPLIERS_COUNTERPARTY_SELECT)
    .order("name", { ascending: true });
  if (searchTerm) {
    query = query.or(`name.ilike.%${searchTerm}%,inn.ilike.%${searchTerm}%`);
  }
  return await query;
};

export const loadSubcontractCounterpartyRows = async () =>
  await supabase
    .from("subcontracts")
    .select(SUBCONTRACTS_COUNTERPARTY_SELECT)
    .not("status", "eq", "draft");

export const loadContractorCounterpartyRows = async () =>
  await supabase.from("contractors").select(CONTRACTORS_COUNTERPARTY_SELECT);

export const loadContractorProfileRows = async (withFilter: boolean) => {
  let query = supabase.from("user_profiles").select("*");
  if (withFilter) {
    query = query.eq("is_contractor", true);
  }
  return await query.limit(5000);
};

export const runCatalogSearchRpcRaw = async (
  fn: CatalogSearchRpcName,
  args: CatalogSearchRpcArgs,
): Promise<{ data: unknown; error: { message?: string } | null }> => {
  switch (fn) {
    case "rik_quick_ru":
      return await supabase.rpc("rik_quick_ru", {
        p_q: args.p_q,
        p_limit: args.p_limit,
      });
    case "rik_quick_search_typed":
      return await supabase.rpc("rik_quick_search_typed", {
        p_q: args.p_q,
        p_limit: args.p_limit,
        p_apps: args.p_apps ?? undefined,
      });
    case "rik_quick_search":
      return await supabase.rpc("rik_quick_search", {
        p_q: args.p_q,
        p_limit: args.p_limit,
        p_apps: args.p_apps ?? undefined,
      });
  }
};

export const loadCatalogSearchFallbackRows = async (
  searchTerm: string,
  tokens: string[],
  limit: number,
) => {
  let queryBuilder = supabase.from("rik_items").select(CATALOG_SEARCH_FALLBACK_SELECT).limit(limit);
  if (tokens.length > 0) {
    tokens.forEach((token) => {
      queryBuilder = queryBuilder.or(`name_human.ilike.%${token}%,rik_code.ilike.%${token}%`);
    });
  } else {
    queryBuilder = queryBuilder.or(`name_human.ilike.%${searchTerm}%,rik_code.ilike.%${searchTerm}%`);
  }
  return await queryBuilder.order("rik_code", { ascending: true });
};

export const loadCatalogGroupsRows = async (): Promise<{
  data: CatalogGroup[] | null;
  error: { message?: string } | null;
}> =>
  await supabase
    .from("catalog_groups_clean")
    .select("code,name,parent_code")
    .order("code", { ascending: true });

export const loadUomRows = async (): Promise<{
  data: UomRef[] | null;
  error: { message?: string } | null;
}> =>
  await supabase.from("ref_uoms_clean").select("id,code,name").order("code", { ascending: true });

export const loadIncomingItemRows = async (
  incomingId: string,
): Promise<{ data: IncomingItem[] | null; error: { message?: string } | null }> =>
  await supabase
    .from("wh_incoming_items_clean")
    .select("incoming_id,incoming_item_id,purchase_item_id,code,name,uom,qty_expected,qty_received")
    .eq("incoming_id", incomingId)
    .order("incoming_item_id", { ascending: true });

export const runSuppliersListRpc = async (searchTerm: string | null) =>
  await supabase.rpc("suppliers_list", { p_search: searchTerm });

export const loadSuppliersTableRows = async (searchTerm: string) => {
  let query = supabase
    .from("suppliers")
    .select(SUPPLIERS_TABLE_SELECT)
    .order("name", { ascending: true });
  if (searchTerm) {
    query = query.or(
      `name.ilike.%${searchTerm}%,inn.ilike.%${searchTerm}%,specialization.ilike.%${searchTerm}%`,
    );
  }
  return await query;
};

export const loadRikQuickSearchFallbackRows = async (
  searchTerm: string,
  tokens: string[],
  limit: number,
) => {
  let builder = supabase.from("rik_items").select(RIK_QUICK_SEARCH_FALLBACK_FIELDS).limit(limit);
  if (tokens.length > 0) {
    const orFilters = tokens
      .flatMap((token) => [`name_human.ilike.%${token}%`, `rik_code.ilike.%${token}%`])
      .join(",");
    builder = builder.or(orFilters);
  } else {
    builder = builder.or(`name_human.ilike.%${searchTerm}%,rik_code.ilike.%${searchTerm}%`);
  }
  return await builder.order("rik_code", { ascending: true });
};
