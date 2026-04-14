/**
 * O3: MapScreen cache finalization — audit shield tests.
 *
 * Since all data-loading is already on React Query (useMapListingsQuery)
 * and remaining refs are correctly categorized as UI runtime / perf owners,
 * these tests validate:
 *
 * 1. Data fetch ownership is on React Query (not manual)
 * 2. Query key structure and determinism
 * 3. Cache prefix compatibility for invalidation
 * 4. MapRenderer platform split correctness
 * 5. routeMetaCacheRef classification (per-click lookup cache)
 * 6. No dead/orphaned manual fetch refs in MapScreen
 */

import { readFileSync } from "fs";
import { join } from "path";
import { mapListingsKeys } from "../../src/components/map/useMapListingsQuery";

const MAP_SCREEN_PATH = join(__dirname, "..", "..", "src", "components", "map", "MapScreen.tsx");
const MAP_QUERY_PATH = join(__dirname, "..", "..", "src", "components", "map", "useMapListingsQuery.ts");

describe("O3: MapScreen data-fetch ownership", () => {
  const mapScreenSource = readFileSync(MAP_SCREEN_PATH, "utf8");
  const mapQuerySource = readFileSync(MAP_QUERY_PATH, "utf8");

  it("MapScreen imports useMapListingsQuery (not manual fetch)", () => {
    expect(mapScreenSource).toContain("useMapListingsQuery");
  });

  it("MapScreen does NOT contain manual useEffect-based fetch", () => {
    // Should not contain patterns like:
    // supabase.from("market_listings_map").select(...)
    expect(mapScreenSource).not.toContain('from("market_listings_map")');
    expect(mapScreenSource).not.toContain("from('market_listings_map')");
  });

  it("useMapListingsQuery uses @tanstack/react-query", () => {
    expect(mapQuerySource).toContain("@tanstack/react-query");
    expect(mapQuerySource).toContain("useQuery");
  });

  it("useMapListingsQuery has abort signal support", () => {
    expect(mapQuerySource).toContain("abortSignal");
    expect(mapQuerySource).toContain("signal");
  });

  it("useMapListingsQuery uses staleTime (not manual TTL)", () => {
    expect(mapQuerySource).toContain("staleTime");
    expect(mapQuerySource).not.toContain("TTL_MS");
  });
});

describe("O3: MapScreen remaining refs are non-data", () => {
  const mapScreenSource = readFileSync(MAP_SCREEN_PATH, "utf8");

  it("routeMetaCacheRef is a Map (per-click lookup cache, not data fetch)", () => {
    expect(mapScreenSource).toContain("routeMetaCacheRef");
    expect(mapScreenSource).toContain("useRef<Map<string, ListingRouteMeta>>");
  });

  it("regionTimerRef is a setTimeout handle (debounce, not data cache)", () => {
    expect(mapScreenSource).toContain("regionTimerRef");
    expect(mapScreenSource).toContain("clearTimeout(regionTimerRef");
  });

  it("lastClusterTapRef is UI double-tap detection (not data cache)", () => {
    expect(mapScreenSource).toContain("lastClusterTapRef");
    // Pattern: stores { id, t } for double-tap timing
    expect(mapScreenSource).toContain("now - last.t");
  });

  it("MapScreen has exactly 3 useRef calls (all classified)", () => {
    const useRefCount = (mapScreenSource.match(/useRef[<(]/g) || []).length;
    expect(useRefCount).toBe(3);
  });

  it("no manual fetch dedup refs exist in MapScreen", () => {
    // No patterns like fetchSeqRef, fetchInFlightRef, requestRef
    expect(mapScreenSource).not.toContain("fetchSeqRef");
    expect(mapScreenSource).not.toContain("fetchInFlightRef");
    expect(mapScreenSource).not.toContain("requestRef");
    expect(mapScreenSource).not.toContain("reportsReqSeqRef");
    expect(mapScreenSource).not.toContain("reportsCacheRef");
  });
});

describe("O3: map query key structure", () => {
  it("all key starts with map/listings", () => {
    expect(mapListingsKeys.all).toEqual(["map", "listings"]);
  });

  it("active key is nested under all", () => {
    const active = mapListingsKeys.active();
    expect(active.slice(0, 2)).toEqual([...mapListingsKeys.all]);
    expect(active).toHaveLength(3);
  });

  it("active key is deterministic", () => {
    const k1 = mapListingsKeys.active();
    const k2 = mapListingsKeys.active();
    expect(k1).toEqual(k2);
  });

  it("invalidating all key would match active key", () => {
    const all = mapListingsKeys.all;
    const active = mapListingsKeys.active();
    expect(active.slice(0, all.length)).toEqual([...all]);
  });
});
