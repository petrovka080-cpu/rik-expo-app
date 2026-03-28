import { recordCatalogWarning } from "./catalog.observability";
import {
  parseCatalogSearchRpcRows,
  parseRikQuickSearchFallbackRows,
  parseRikQuickSearchRpcRows,
} from "./catalog.parsers";
import {
  clamp,
  mapCatalogSearchRows,
  mapRikQuickSearchFallbackRows,
  mapRikQuickSearchRpcRows,
  norm,
  sanitizePostgrestOrTerm,
} from "./catalog.normalizers";
import {
  loadCatalogGroupsRows,
  loadCatalogSearchFallbackRows,
  loadIncomingItemRows,
  loadRikQuickSearchFallbackRows,
  loadUomRows,
  RIK_QUICK_SEARCH_RPCS,
  runCatalogSearchRpcRaw,
} from "./catalog.transport";
import type {
  CatalogGroup,
  CatalogItem,
  CatalogSearchRpcArgs,
  CatalogSearchRpcName,
  IncomingItem,
  RikQuickSearchItem,
  UomRef,
} from "./catalog.types";

export async function searchCatalogItems(
  q: string,
  limit = 50,
  apps?: string[],
): Promise<CatalogItem[]> {
  const normQ = norm(q);
  if (!normQ) return [];
  const pQuery = sanitizePostgrestOrTerm(normQ);
  const pLimit = clamp(limit || 50, 1, 200);

  const rpcArgs: CatalogSearchRpcArgs = {
    p_q: pQuery,
    p_limit: pLimit,
    p_apps: apps ?? null,
  };
  const rpcs: CatalogSearchRpcName[] = [
    "rik_quick_ru",
    "rik_quick_search_typed",
    "rik_quick_search",
  ];
  for (const fn of rpcs) {
    try {
      const { data, error } = await runCatalogSearchRpcRaw(fn, rpcArgs);
      if (!error) {
        const parsed = parseCatalogSearchRpcRows(data);
        if (parsed.length > 0) {
          return mapCatalogSearchRows(parsed.slice(0, pLimit));
        }
      }
    } catch (error) {
      recordCatalogWarning({
        screen: "market",
        event: "catalog_search_rpc_failed",
        operation: "searchCatalogItems.rpc",
        error,
        mode: "fallback",
        extra: {
          rpc: fn,
          limit: pLimit,
          queryLength: pQuery.length,
          appsCount: Array.isArray(apps) ? apps.length : 0,
        },
      });
    }
  }

  const tokens = pQuery.split(/\s+/).filter((token) => token.length >= 2);
  const { data, error } = await loadCatalogSearchFallbackRows(pQuery, tokens, pLimit);
  if (error || !Array.isArray(data)) {
    if (error) {
      recordCatalogWarning({
        screen: "market",
        event: "catalog_search_fallback_failed",
        operation: "searchCatalogItems.fallback",
        error,
        mode: "degraded",
        extra: {
          limit: pLimit,
          queryLength: pQuery.length,
          appsCount: Array.isArray(apps) ? apps.length : 0,
        },
      });
    }
    return [];
  }

  return mapCatalogSearchRows(data);
}

export async function listCatalogGroups(): Promise<CatalogGroup[]> {
  const { data, error } = await loadCatalogGroupsRows();
  if (error || !Array.isArray(data)) {
    if (error) {
      recordCatalogWarning({
        screen: "market",
        event: "catalog_groups_load_failed",
        operation: "listCatalogGroups",
        error,
        mode: "degraded",
      });
    }
    return [];
  }
  return data;
}

export async function listUoms(): Promise<UomRef[]> {
  const { data, error } = await loadUomRows();
  if (error || !Array.isArray(data)) {
    if (error) {
      recordCatalogWarning({
        screen: "market",
        event: "catalog_uoms_load_failed",
        operation: "listUoms",
        error,
        mode: "degraded",
      });
    }
    return [];
  }
  return data;
}

export async function listIncomingItems(incomingId: string): Promise<IncomingItem[]> {
  const id = norm(incomingId);
  if (!id) return [];
  const { data, error } = await loadIncomingItemRows(id);
  if (error || !Array.isArray(data)) {
    if (error) {
      recordCatalogWarning({
        screen: "request",
        event: "incoming_items_load_failed",
        operation: "listIncomingItems",
        error,
        mode: "degraded",
        extra: {
          incomingId: id,
        },
      });
    }
    return [];
  }
  return data;
}

export async function rikQuickSearch(q: string, limit = 60): Promise<RikQuickSearchItem[]> {
  const text = norm(q);
  if (text.length < 2) return [];

  const pQuery = sanitizePostgrestOrTerm(text);
  const pLimit = Math.min(limit, 100);

  for (const fn of RIK_QUICK_SEARCH_RPCS) {
    try {
      const rpcArgs: CatalogSearchRpcArgs = {
        p_q: pQuery,
        p_limit: pLimit,
        p_apps: null,
      };
      const { data, error } = await runCatalogSearchRpcRaw(fn, rpcArgs);
      if (!error) {
        const parsed = parseRikQuickSearchRpcRows(data);
        if (parsed.length > 0) {
          return mapRikQuickSearchRpcRows(parsed);
        }
      }
    } catch (error) {
      recordCatalogWarning({
        screen: "market",
        event: "rik_quick_search_rpc_failed",
        operation: "rikQuickSearch.rpc",
        error,
        mode: "fallback",
        extra: {
          rpc: fn,
          limit: pLimit,
          queryLength: pQuery.length,
        },
      });
    }
  }

  const tokens = pQuery.split(/\s+/).filter((token) => token.length >= 2);
  const { data, error } = await loadRikQuickSearchFallbackRows(pQuery, tokens, pLimit);
  if (error || !Array.isArray(data)) {
    if (error) {
      recordCatalogWarning({
        screen: "market",
        event: "rik_quick_search_fallback_failed",
        operation: "rikQuickSearch.fallback",
        error,
        mode: "degraded",
        extra: {
          limit: pLimit,
          queryLength: pQuery.length,
        },
      });
    }
    return [];
  }

  return mapRikQuickSearchFallbackRows(parseRikQuickSearchFallbackRows(data));
}
