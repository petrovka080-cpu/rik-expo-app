import { buildBffError } from "../../shared/scale/bffSafety";
import type { BffResponseEnvelope } from "../../shared/scale/bffContracts";
import {
  CATALOG_TRANSPORT_BFF_CONTRACT,
  CATALOG_TRANSPORT_BFF_OPERATION_CONTRACTS,
  type CatalogTransportBffOperation,
  type CatalogTransportBffReadResultDto,
  type CatalogTransportBffRequestDto,
  type CatalogTransportBffResponseDto,
} from "./catalog.bff.contract";
import type { CatalogSearchRpcName } from "./catalog.types";

export type CatalogTransportBffReadPort = {
  runCatalogTransportRead(
    input: CatalogTransportBffRequestDto,
  ): Promise<CatalogTransportBffReadResultDto>;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const operationSet = new Set<CatalogTransportBffOperation>(
  CATALOG_TRANSPORT_BFF_OPERATION_CONTRACTS.map((contract) => contract.operation),
);

const rpcSet = new Set<CatalogSearchRpcName>([
  "rik_quick_ru",
  "rik_quick_search_typed",
  "rik_quick_search",
]);

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

const hasSearchArgs = (args: unknown): args is { searchTerm: string } =>
  isRecord(args) && typeof args.searchTerm === "string";

const hasTokenSearchArgs = (
  args: unknown,
): args is { searchTerm: string; tokens: string[]; limit: number } =>
  isRecord(args) &&
  typeof args.searchTerm === "string" &&
  isStringArray(args.tokens) &&
  typeof args.limit === "number";

const hasSearchRpcArgs = (args: unknown): boolean =>
  isRecord(args) &&
  rpcSet.has(args.fn as CatalogSearchRpcName) &&
  isRecord(args.args) &&
  typeof args.args.p_q === "string" &&
  typeof args.args.p_limit === "number" &&
  (args.args.p_apps === undefined || args.args.p_apps === null || isStringArray(args.args.p_apps));

export const isCatalogTransportBffRequestDto = (
  value: unknown,
): value is CatalogTransportBffRequestDto => {
  if (!isRecord(value) || !operationSet.has(value.operation as CatalogTransportBffOperation)) {
    return false;
  }

  const args = value.args;
  switch (value.operation) {
    case "catalog.supplier_counterparty.list":
    case "catalog.suppliers.table":
      return hasSearchArgs(args);
    case "catalog.subcontract_counterparty.list":
    case "catalog.contractor_counterparty.list":
    case "catalog.groups.list":
    case "catalog.uoms.list":
      return isRecord(args);
    case "catalog.contractor_profile.list":
      return isRecord(args) && typeof args.withFilter === "boolean";
    case "catalog.search.rpc":
      return hasSearchRpcArgs(args);
    case "catalog.search.fallback":
    case "catalog.rik_quick_search.fallback":
      return hasTokenSearchArgs(args);
    case "catalog.incoming_items.list":
      return isRecord(args) && typeof args.incomingId === "string";
    case "catalog.suppliers.rpc":
      return isRecord(args) && (args.searchTerm === null || typeof args.searchTerm === "string");
  }
  return false;
};

const buildCatalogTransportBffFailure = (
  code:
    | "CATALOG_TRANSPORT_BFF_INVALID_OPERATION"
    | "CATALOG_TRANSPORT_BFF_UPSTREAM_ERROR"
    | "CATALOG_TRANSPORT_BFF_INVALID_RESPONSE",
  message: string,
): BffResponseEnvelope<CatalogTransportBffResponseDto> => ({
  ok: false,
  error: buildBffError(code, message),
});

const isCatalogTransportBffReadResultDto = (value: unknown): value is CatalogTransportBffReadResultDto =>
  isRecord(value) &&
  (Array.isArray(value.data) || value.data === null) &&
  (value.error === null || isRecord(value.error));

export async function handleCatalogTransportBffReadScope(
  port: CatalogTransportBffReadPort,
  input: unknown,
): Promise<BffResponseEnvelope<CatalogTransportBffResponseDto>> {
  if (!isCatalogTransportBffRequestDto(input)) {
    return buildCatalogTransportBffFailure(
      "CATALOG_TRANSPORT_BFF_INVALID_OPERATION",
      "Invalid catalog transport read operation",
    );
  }

  try {
    const result = await port.runCatalogTransportRead(input);
    if (!isCatalogTransportBffReadResultDto(result)) {
      return buildCatalogTransportBffFailure(
        "CATALOG_TRANSPORT_BFF_INVALID_RESPONSE",
        "Invalid catalog transport read response",
      );
    }

    return {
      ok: true,
      data: {
        contractId: CATALOG_TRANSPORT_BFF_CONTRACT.contractId,
        documentType: CATALOG_TRANSPORT_BFF_CONTRACT.documentType,
        operation: input.operation,
        result,
        source: CATALOG_TRANSPORT_BFF_CONTRACT.source,
      },
      serverTiming: { cacheHit: false },
    };
  } catch {
    return buildCatalogTransportBffFailure(
      "CATALOG_TRANSPORT_BFF_UPSTREAM_ERROR",
      "Catalog transport read upstream failed",
    );
  }
}
