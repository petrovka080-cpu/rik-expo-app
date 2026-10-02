import { supabase } from "../supabaseClient";
import {
  loadPagedRowsWithCeiling,
  normalizePage,
  type PagedQuery,
} from "../api/_core";
import { sanitizePostgrestOrTerm } from "./catalog.normalizers";
import {
  normalizeCatalogGroupRows,
  normalizeIncomingItemRows,
  normalizeSuppliersListRpcArgs,
  normalizeUomRows,
} from "./catalog.transport.normalize";
import type {
  CatalogGroup,
  CatalogItemsSearchKind,
  CatalogItemsSearchPreviewRow,
  CatalogSearchFallbackRow,
  CatalogSearchRpcArgs,
  CatalogSearchRpcName,
  ContractorCounterpartyRow,
  IncomingItem,
  ProfileContractorCompatRow,
  RikQuickSearchFallbackRow,
  SubcontractCounterpartyRow,
  SupplierCounterpartyRow,
  SupplierTableRow,
  UomRef,
} from "./catalog.types";

type CatalogQueryResult<T> = {
  data: T[] | null;
  error: { message?: string } | null;
};

type CatalogQueryFactory<T> = () => {
  range: (from: number, to: number) => PromiseLike<CatalogQueryResult<T>>;
};

type CatalogGroupTransportRow = {
  code?: string | null;
  name?: string | null;
  parent_code?: string | null;
};

type UomTransportRow = {
  id?: string | null;
  code?: string | null;
  name?: string | null;
};

type IncomingItemTransportRow = {
  incoming_id?: string | null;
  incoming_item_id?: string | null;
  purchase_item_id?: string | null;
  code?: string | null;
  name?: string | null;
  uom?: string | null;
  qty_expected?: number | null;
  qty_received?: number | null;
};

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
const CATALOG_ITEMS_PREVIEW_SELECT =
  "id,rik_code,kind,name_human,uom_code,tags,sector_code";
const CATALOG_SAFE_LIST_PAGE_DEFAULTS = {
  pageSize: 100,
  maxPageSize: 100,
  maxRows: 5000,
};
const CATALOG_RIK_ITEMS_SEARCH_PREVIEW_DEFAULTS = {
  pageSize: 50,
  maxPageSize: 100,
  maxRows: 100,
};
const CATALOG_ITEMS_SEARCH_PREVIEW_DEFAULTS = {
  pageSize: 60,
  maxPageSize: 100,
  maxRows: 100,
};

const toCatalogQueryError = (error: unknown): { message?: string } =>
  typeof error === "object" && error !== null && "message" in error
    ? (error as { message?: string })
    : { message: String(error) };

const normalizePreviewPage = (
  limit: number | null | undefined,
  defaults: typeof CATALOG_RIK_ITEMS_SEARCH_PREVIEW_DEFAULTS,
) => {
  const page = normalizePage({ pageSize: limit ?? defaults.pageSize }, defaults);
  return {
    from: page.from,
    to: Math.min(page.to, defaults.maxRows - 1),
  };
};

const loadPagedCatalogRows = async <T,>(
  queryFactory: CatalogQueryFactory<T>,
): Promise<CatalogQueryResult<T>> => {
  const result = await loadPagedRowsWithCeiling<T>(
    () => queryFactory() as unknown as PagedQuery<T>,
    CATALOG_SAFE_LIST_PAGE_DEFAULTS,
  );
  return result.error
    ? { data: null, error: toCatalogQueryError(result.error) }
    : { data: result.data ?? [], error: null };
};

export const loadSupplierCounterpartyRowsFromSupabase = async (searchTerm: string) => {
  const buildQuery = () => {
    let query = supabase
      .from("suppliers")
      .select(SUPPLIERS_COUNTERPARTY_SELECT)
      .order("name", { ascending: true })
      .order("id", { ascending: true });
    if (searchTerm) {
      query = query.or(`name.ilike.%${searchTerm}%,inn.ilike.%${searchTerm}%`);
    }
    return query;
  };
  return await loadPagedCatalogRows<SupplierCounterpartyRow>(buildQuery);
};

export const loadSubcontractCounterpartyRowsFromSupabase = async () =>
  await loadPagedCatalogRows<SubcontractCounterpartyRow>(() =>
    supabase
      .from("subcontracts")
      .select(SUBCONTRACTS_COUNTERPARTY_SELECT)
      .not("status", "eq", "draft")
      .order("contractor_org", { ascending: true })
      .order("id", { ascending: true }),
  );

export const loadContractorCounterpartyRowsFromSupabase = async () =>
  await loadPagedCatalogRows<ContractorCounterpartyRow>(() =>
    supabase
      .from("contractors")
      .select(CONTRACTORS_COUNTERPARTY_SELECT)
      .order("company_name", { ascending: true })
      .order("id", { ascending: true }),
  );

export const loadContractorProfileRowsFromSupabase = async (withFilter: boolean) => {
  const buildQuery = () => {
    let query = supabase
      .from("user_profiles")
      .select("user_id,full_name,phone,is_contractor")
      .order("user_id", { ascending: true });
    if (withFilter) query = query.eq("is_contractor", true);
    return query;
  };
  return await loadPagedCatalogRows<ProfileContractorCompatRow>(buildQuery);
};

export const runCatalogSearchRpcRawFromSupabase = async (
  fn: CatalogSearchRpcName,
  args: CatalogSearchRpcArgs,
): Promise<{ data: unknown; error: { message?: string } | null }> => {
  if (fn === "rik_quick_ru") {
    return await supabase.rpc("rik_quick_ru", {
      p_q: args.p_q,
      p_limit: args.p_limit,
    });
  }
  if (fn === "rik_quick_search") {
    return await supabase.rpc("rik_quick_search", {
      p_q: args.p_q,
      p_limit: args.p_limit,
      p_apps: args.p_apps ?? undefined,
    });
  }
  return await supabase.rpc("rik_quick_search_typed", {
    p_q: args.p_q,
    p_limit: args.p_limit,
    p_apps: args.p_apps ?? undefined,
  });
};

export const loadCatalogSearchFallbackRowsFromSupabase = async (
  searchTerm: string,
  tokens: string[],
  limit: number,
) => {
  const page = normalizePreviewPage(limit, CATALOG_RIK_ITEMS_SEARCH_PREVIEW_DEFAULTS);
  let query = supabase.from("rik_items").select(CATALOG_SEARCH_FALLBACK_SELECT);
  if (tokens.length > 0) {
    for (const token of tokens) {
      query = query.or(`name_human.ilike.%${token}%,rik_code.ilike.%${token}%`);
    }
  } else {
    query = query.or(`name_human.ilike.%${searchTerm}%,rik_code.ilike.%${searchTerm}%`);
  }
  return await query
    .order("rik_code", { ascending: true })
    .order("name_human", { ascending: true })
    .order("id", { ascending: true })
    .range(page.from, page.to) as CatalogQueryResult<CatalogSearchFallbackRow>;
};

export const loadCatalogGroupsRowsFromSupabase = async (): Promise<{
  data: CatalogGroup[] | null;
  error: { message?: string } | null;
}> => {
  const result = await loadPagedCatalogRows<CatalogGroupTransportRow>(() =>
    supabase
      .from("catalog_groups_clean")
      .select("code,name,parent_code")
      .order("code", { ascending: true }),
  );
  return {
    data: result.data === null ? null : normalizeCatalogGroupRows(result.data),
    error: result.error,
  };
};

export const loadUomRowsFromSupabase = async (): Promise<{
  data: UomRef[] | null;
  error: { message?: string } | null;
}> => {
  const result = await loadPagedCatalogRows<UomTransportRow>(() =>
    supabase
      .from("ref_uoms_clean")
      .select("id,code,name")
      .order("code", { ascending: true })
      .order("id", { ascending: true }),
  );
  return {
    data: result.data === null ? null : normalizeUomRows(result.data),
    error: result.error,
  };
};

export const loadIncomingItemRowsFromSupabase = async (
  incomingId: string,
): Promise<{ data: IncomingItem[] | null; error: { message?: string } | null }> => {
  const result = await loadPagedCatalogRows<IncomingItemTransportRow>(() =>
    supabase
      .from("wh_incoming_items_clean")
      .select("incoming_id,incoming_item_id,purchase_item_id,code,name,uom,qty_expected,qty_received")
      .eq("incoming_id", incomingId)
      .order("incoming_item_id", { ascending: true }),
  );
  return {
    data: result.data === null ? null : normalizeIncomingItemRows(result.data),
    error: result.error,
  };
};

export const runSuppliersListRpcFromSupabase = async (searchTerm: string | null) => {
  const args = normalizeSuppliersListRpcArgs(searchTerm);
  return await supabase.rpc("suppliers_list", {
    p_q: args.p_q,
    p_limit: args.p_limit,
    p_offset: args.p_offset,
  });
};

export const loadSuppliersTableRowsFromSupabase = async (searchTerm: string) => {
  const buildQuery = () => {
    let query = supabase
      .from("suppliers")
      .select(SUPPLIERS_TABLE_SELECT)
      .order("name", { ascending: true })
      .order("id", { ascending: true });
    if (searchTerm) {
      query = query.or(
        `name.ilike.%${searchTerm}%,inn.ilike.%${searchTerm}%,specialization.ilike.%${searchTerm}%`,
      );
    }
    return query;
  };
  return await loadPagedCatalogRows<SupplierTableRow>(buildQuery);
};

export const loadRikQuickSearchFallbackRowsFromSupabase = async (
  searchTerm: string,
  tokens: string[],
  limit: number,
) => {
  const page = normalizePreviewPage(limit, CATALOG_RIK_ITEMS_SEARCH_PREVIEW_DEFAULTS);
  let query = supabase.from("rik_items").select(RIK_QUICK_SEARCH_FALLBACK_FIELDS);
  if (tokens.length > 0) {
    const filters = tokens
      .flatMap((token) => [`name_human.ilike.%${token}%`, `rik_code.ilike.%${token}%`])
      .join(",");
    query = query.or(filters);
  } else {
    query = query.or(`name_human.ilike.%${searchTerm}%,rik_code.ilike.%${searchTerm}%`);
  }
  return await query
    .order("rik_code", { ascending: true })
    .order("name_human", { ascending: true })
    .order("id", { ascending: true })
    .range(page.from, page.to) as CatalogQueryResult<RikQuickSearchFallbackRow>;
};

export const loadCatalogItemsSearchPreviewRowsFromSupabase = async (
  searchTerm: string,
  kind: CatalogItemsSearchKind,
  pageSize?: number | null,
): Promise<CatalogQueryResult<CatalogItemsSearchPreviewRow>> => {
  const page = normalizePreviewPage(pageSize, CATALOG_ITEMS_SEARCH_PREVIEW_DEFAULTS);
  const safeTerm = sanitizePostgrestOrTerm(searchTerm).toLowerCase();
  let query = supabase.from("catalog_items").select(CATALOG_ITEMS_PREVIEW_SELECT);
  if (safeTerm) {
    const like = `%${safeTerm}%`;
    query = query.or(
      `search_blob.ilike.${like},name_search.ilike.${like},name_human.ilike.${like},rik_code.ilike.${like}`,
    );
  }
  if (kind !== "all") query = query.eq("kind", kind);
  return await query
    .order("rik_code", { ascending: true })
    .order("id", { ascending: true })
    .range(page.from, page.to) as CatalogQueryResult<CatalogItemsSearchPreviewRow>;
};
