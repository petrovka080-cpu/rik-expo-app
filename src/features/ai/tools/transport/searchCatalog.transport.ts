import { searchCatalogItems } from "../../../../lib/catalog/catalog.search.service";
import type { CatalogItem } from "../../../../lib/catalog/catalog.types";
import {
  clampAiToolTransportLimit,
  normalizeAiToolTransportText,
  type AiCatalogSearchTransportItem,
} from "./aiToolTransportTypes";

export const SEARCH_CATALOG_TRANSPORT_ROUTE_SCOPE = "marketplace.catalog.search" as const;
export const SEARCH_CATALOG_TRANSPORT_MAX_LIMIT = 20;

export type SearchCatalogTransportRequest = {
  query: string;
  limit: number;
  apps?: string[];
};

function toTransportItem(item: CatalogItem): AiCatalogSearchTransportItem {
  return {
    code: normalizeAiToolTransportText(item.code),
    name: normalizeAiToolTransportText(item.name),
    uom: normalizeAiToolTransportText(item.uom),
    kind: normalizeAiToolTransportText(item.kind),
  };
}

export async function readSearchCatalogTransport(
  request: SearchCatalogTransportRequest,
): Promise<readonly AiCatalogSearchTransportItem[]> {
  const limit = clampAiToolTransportLimit(
    request.limit,
    SEARCH_CATALOG_TRANSPORT_MAX_LIMIT,
    SEARCH_CATALOG_TRANSPORT_MAX_LIMIT,
  );
  const rows = await searchCatalogItems(request.query, limit, request.apps);
  return rows.slice(0, limit).map(toTransportItem);
}
