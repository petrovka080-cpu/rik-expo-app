import { rikQuickSearch as runCanonicalRikQuickSearch } from "../catalog/catalog.search.service";
import type { CatalogItem } from "./types";

// Keep the legacy entrypoint stable while routing active callers through the
// canonical catalog search service that already owns fallback observability.
export async function rikQuickSearch(
  q: string,
  limit = 50,
  apps?: string[],
): Promise<CatalogItem[]> {
  const pQuery = String(q ?? "").trim();
  if (!pQuery) return [];

  const pLimit = Math.max(1, Math.min(200, limit || 50));
  return await runCanonicalRikQuickSearch(pQuery, pLimit, apps);
}
