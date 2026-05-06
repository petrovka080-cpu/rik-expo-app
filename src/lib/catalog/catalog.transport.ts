import type {
  CatalogGroup,
  ContractorCounterpartyRow,
  CatalogSearchRpcArgs,
  CatalogSearchRpcName,
  IncomingItem,
  ProfileContractorCompatRow,
  SubcontractCounterpartyRow,
  SupplierCounterpartyRow,
  SupplierTableRow,
  UomRef,
} from "./catalog.types";
import {
  normalizeCatalogGroupRows,
  normalizeIncomingItemRows,
  normalizeUomRows,
} from "./catalog.transport.normalize";
import { callCatalogTransportBffRead } from "./catalog.bff.client";
import type {
  CatalogTransportBffReadErrorDto,
  CatalogTransportBffReadResultDto,
  CatalogTransportBffRequestDto,
} from "./catalog.bff.contract";
import {
  loadCatalogGroupsRowsFromSupabase,
  loadCatalogSearchFallbackRowsFromSupabase,
  loadContractorCounterpartyRowsFromSupabase,
  loadContractorProfileRowsFromSupabase,
  loadIncomingItemRowsFromSupabase,
  loadRikQuickSearchFallbackRowsFromSupabase,
  loadSubcontractCounterpartyRowsFromSupabase,
  loadSupplierCounterpartyRowsFromSupabase,
  loadSuppliersTableRowsFromSupabase,
  loadUomRowsFromSupabase,
  runCatalogSearchRpcRawFromSupabase,
  runSuppliersListRpcFromSupabase,
} from "./catalog.transport.supabase";

type CatalogQueryResult<T> = {
  data: T[] | null;
  error: { message?: string } | null;
};

type CatalogTransportFallback<T> = () => Promise<CatalogQueryResult<T>>;

type CatalogRawRpcResult = {
  data: unknown;
  error: { message?: string } | null;
};

export const RIK_QUICK_SEARCH_RPCS: CatalogSearchRpcName[] = [
  "rik_quick_ru",
  "rik_quick_search_typed",
  "rik_quick_search",
];

const bffErrorToCatalogError = (
  error: CatalogTransportBffReadErrorDto | { message?: string },
): { message?: string } => ({
  message: error.message,
});

const bffResultToCatalogQueryResult = <T,>(
  result: CatalogTransportBffReadResultDto,
): CatalogQueryResult<T> => ({
  data: result.data === null ? null : (result.data as T[]),
  error: result.error ? bffErrorToCatalogError(result.error) : null,
});

const loadCatalogRowsViaBff = async <T,>(
  request: CatalogTransportBffRequestDto,
  fallback: CatalogTransportFallback<T>,
): Promise<CatalogQueryResult<T>> => {
  const bffResult = await callCatalogTransportBffRead(request);
  if (bffResult.status === "ok") {
    return bffResultToCatalogQueryResult<T>(bffResult.response.result);
  }
  if (bffResult.status === "error") {
    return { data: null, error: bffErrorToCatalogError(bffResult.error) };
  }
  return await fallback();
};

export const loadSupplierCounterpartyRows = async (searchTerm: string) =>
  await loadCatalogRowsViaBff<SupplierCounterpartyRow>(
    {
      operation: "catalog.supplier_counterparty.list",
      args: { searchTerm },
    },
    () => loadSupplierCounterpartyRowsFromSupabase(searchTerm),
  );

export const loadSubcontractCounterpartyRows = async () =>
  await loadCatalogRowsViaBff<SubcontractCounterpartyRow>(
    {
      operation: "catalog.subcontract_counterparty.list",
      args: {},
    },
    loadSubcontractCounterpartyRowsFromSupabase,
  );

export const loadContractorCounterpartyRows = async () =>
  await loadCatalogRowsViaBff<ContractorCounterpartyRow>(
    {
      operation: "catalog.contractor_counterparty.list",
      args: {},
    },
    loadContractorCounterpartyRowsFromSupabase,
  );

export const loadContractorProfileRows = async (withFilter: boolean) =>
  await loadCatalogRowsViaBff<ProfileContractorCompatRow>(
    {
      operation: "catalog.contractor_profile.list",
      args: { withFilter },
    },
    () => loadContractorProfileRowsFromSupabase(withFilter),
  );

export const runCatalogSearchRpcRaw = async (
  fn: CatalogSearchRpcName,
  args: CatalogSearchRpcArgs,
): Promise<CatalogRawRpcResult> => {
  const bffResult = await callCatalogTransportBffRead({
    operation: "catalog.search.rpc",
    args: { fn, args },
  });
  if (bffResult.status === "ok") {
    return bffResultToCatalogQueryResult<unknown>(bffResult.response.result);
  }
  if (bffResult.status === "error") {
    return { data: null, error: bffErrorToCatalogError(bffResult.error) };
  }
  return await runCatalogSearchRpcRawFromSupabase(fn, args);
};

export const loadCatalogSearchFallbackRows = async (
  searchTerm: string,
  tokens: string[],
  limit: number,
) =>
  await loadCatalogRowsViaBff(
    {
      operation: "catalog.search.fallback",
      args: { searchTerm, tokens, limit },
    },
    () => loadCatalogSearchFallbackRowsFromSupabase(searchTerm, tokens, limit),
  );

export const loadCatalogGroupsRows = async (): Promise<{
  data: CatalogGroup[] | null;
  error: { message?: string } | null;
}> => {
  const result = await loadCatalogRowsViaBff<Record<string, unknown>>(
    {
      operation: "catalog.groups.list",
      args: {},
    },
    loadCatalogGroupsRowsFromSupabase as CatalogTransportFallback<Record<string, unknown>>,
  );
  return {
    data: result.data === null ? null : normalizeCatalogGroupRows(result.data),
    error: result.error,
  };
};

export const loadUomRows = async (): Promise<{
  data: UomRef[] | null;
  error: { message?: string } | null;
}> => {
  const result = await loadCatalogRowsViaBff<Record<string, unknown>>(
    {
      operation: "catalog.uoms.list",
      args: {},
    },
    loadUomRowsFromSupabase as CatalogTransportFallback<Record<string, unknown>>,
  );
  return {
    data: result.data === null ? null : normalizeUomRows(result.data),
    error: result.error,
  };
};

export const loadIncomingItemRows = async (
  incomingId: string,
): Promise<{ data: IncomingItem[] | null; error: { message?: string } | null }> => {
  const result = await loadCatalogRowsViaBff<Record<string, unknown>>(
    {
      operation: "catalog.incoming_items.list",
      args: { incomingId },
    },
    () =>
      loadIncomingItemRowsFromSupabase(incomingId) as Promise<CatalogQueryResult<Record<string, unknown>>>,
  );
  return {
    data: result.data === null ? null : normalizeIncomingItemRows(result.data),
    error: result.error,
  };
};

export const runSuppliersListRpc = async (searchTerm: string | null) => {
  const bffResult = await callCatalogTransportBffRead({
    operation: "catalog.suppliers.rpc",
    args: { searchTerm },
  });
  if (bffResult.status === "ok") {
    return bffResultToCatalogQueryResult<unknown>(bffResult.response.result);
  }
  if (bffResult.status === "error") {
    return { data: null, error: bffErrorToCatalogError(bffResult.error) };
  }
  return await runSuppliersListRpcFromSupabase(searchTerm);
};

export const loadSuppliersTableRows = async (searchTerm: string) =>
  await loadCatalogRowsViaBff<SupplierTableRow>(
    {
      operation: "catalog.suppliers.table",
      args: { searchTerm },
    },
    () => loadSuppliersTableRowsFromSupabase(searchTerm),
  );

export const loadRikQuickSearchFallbackRows = async (
  searchTerm: string,
  tokens: string[],
  limit: number,
) =>
  await loadCatalogRowsViaBff(
    {
      operation: "catalog.rik_quick_search.fallback",
      args: { searchTerm, tokens, limit },
    },
    () => loadRikQuickSearchFallbackRowsFromSupabase(searchTerm, tokens, limit),
  );
