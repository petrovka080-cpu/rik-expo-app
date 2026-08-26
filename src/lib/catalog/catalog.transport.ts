import type {
  CatalogItemsSearchKind,
  CatalogItemsSearchPreviewRow,
  CatalogGroup,
  CatalogSearchFallbackRow,
  ContractorCounterpartyRow,
  CatalogSearchRpcArgs,
  CatalogSearchRpcName,
  IncomingItem,
  ProfileContractorCompatRow,
  RikQuickSearchFallbackRow,
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

type CatalogQueryResult<T> = {
  data: T[] | null;
  error: { message?: string } | null;
};

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
): Promise<CatalogQueryResult<T>> => {
  const bffResult = await callCatalogTransportBffRead(request);
  if (bffResult.status === "ok") {
    return bffResultToCatalogQueryResult<T>(bffResult.response.result);
  }
  if (bffResult.status === "error") {
    return { data: null, error: bffErrorToCatalogError(bffResult.error) };
  }
  return {
    data: null,
    error: {
      message: `Canonical catalog backend unavailable: ${bffResult.reason}`,
    },
  };
};

export const loadSupplierCounterpartyRows = async (searchTerm: string) =>
  await loadCatalogRowsViaBff<SupplierCounterpartyRow>(
    {
      operation: "catalog.supplier_counterparty.list",
      args: { searchTerm },
    },
  );

export const loadSubcontractCounterpartyRows = async () =>
  await loadCatalogRowsViaBff<SubcontractCounterpartyRow>(
    {
      operation: "catalog.subcontract_counterparty.list",
      args: {},
    },
  );

export const loadContractorCounterpartyRows = async () =>
  await loadCatalogRowsViaBff<ContractorCounterpartyRow>(
    {
      operation: "catalog.contractor_counterparty.list",
      args: {},
    },
  );

export const loadContractorProfileRows = async (withFilter: boolean) =>
  await loadCatalogRowsViaBff<ProfileContractorCompatRow>(
    {
      operation: "catalog.contractor_profile.list",
      args: { withFilter },
    },
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
  return {
    data: null,
    error: {
      message: `Canonical catalog backend unavailable: ${bffResult.reason}`,
    },
  };
};

export const loadCatalogSearchFallbackRows = async (
  searchTerm: string,
  tokens: string[],
  limit: number,
) =>
  await loadCatalogRowsViaBff<CatalogSearchFallbackRow>(
    {
      operation: "catalog.search.fallback",
      args: { searchTerm, tokens, limit },
    },
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
  return {
    data: null,
    error: {
      message: `Canonical catalog backend unavailable: ${bffResult.reason}`,
    },
  };
};

export const loadSuppliersTableRows = async (searchTerm: string) =>
  await loadCatalogRowsViaBff<SupplierTableRow>(
    {
      operation: "catalog.suppliers.table",
      args: { searchTerm },
    },
  );

export const loadRikQuickSearchFallbackRows = async (
  searchTerm: string,
  tokens: string[],
  limit: number,
) =>
  await loadCatalogRowsViaBff<RikQuickSearchFallbackRow>(
    {
      operation: "catalog.rik_quick_search.fallback",
      args: { searchTerm, tokens, limit },
    },
  );

export const loadCatalogItemsSearchPreviewRows = async (
  searchTerm: string,
  kind: CatalogItemsSearchKind,
  pageSize?: number | null,
): Promise<CatalogQueryResult<CatalogItemsSearchPreviewRow>> =>
  await loadCatalogRowsViaBff<CatalogItemsSearchPreviewRow>(
    {
      operation: "catalog.items.search.preview",
      args: { searchTerm, kind, pageSize },
    },
  );
