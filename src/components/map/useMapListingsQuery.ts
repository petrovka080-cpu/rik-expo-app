/**
 * useMapListingsQuery — React Query owner for map listings.
 *
 * B-REAL-3: replaces the manual useEffect-based fetch in MapScreen
 * with TanStack Query query ownership.
 *
 * Cache discipline:
 * - staleTime: 60s (matches app-wide convention)
 * - gcTime: 5min (matches app queryClient default)
 * - refetchOnWindowFocus: false (mobile-first)
 *
 * Replaces:
 * - manual useEffect(() => { load(); }, []) in MapScreen
 * - no dedup, no abort, no TTL
 *
 * Preserves:
 * - same data shape (MarketListing[])
 * - same Supabase query (market_listings_map, status=active, limit=2000)
 * - same normalization via normalizeMarketListingRow
 */

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../lib/supabaseClient";
import { normalizeMarketListingRow, type MarketListing } from "./mapContracts";

/** Query key factory */
export const mapListingsKeys = {
  all: ["map", "listings"] as const,
  active: () => ["map", "listings", "active"] as const,
} as const;

const MAP_LISTINGS_STALE_TIME = 60_000; // 60s

/**
 * Fetch function — exact same Supabase query that was inside MapScreen.
 */
async function fetchMapListings(
  signal?: AbortSignal,
): Promise<MarketListing[]> {
  const { data, error } = await supabase
    .from("market_listings_map")
    .select(
      "id,title,price,city,lat,lng,kind,items_json,side,status,catalog_item_ids",
    )
    .eq("status", "active")
    .limit(2000)
    .abortSignal(signal!);

  if (error) {
    throw error;
  }

  return (data || [])
    .map((row) => normalizeMarketListingRow(row))
    .filter((row): row is MarketListing => Boolean(row));
}

/**
 * React Query hook for map listings.
 */
export function useMapListingsQuery(params?: { enabled?: boolean }) {
  const enabled = params?.enabled ?? true;
  const queryClient = useQueryClient();

  const query = useQuery<MarketListing[]>({
    queryKey: mapListingsKeys.active(),
    queryFn: ({ signal }) => fetchMapListings(signal),
    staleTime: MAP_LISTINGS_STALE_TIME,
    enabled,
    refetchOnWindowFocus: false,
  });

  return {
    /** Same shape: MarketListing[] (was setListings(normalized)) */
    listings: query.data ?? [],

    /** Query metadata */
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,

    /** Refetch — replaces the missing manual refresh */
    refetch: query.refetch,

    /** Imperative invalidation */
    invalidate: () =>
      queryClient.invalidateQueries({
        queryKey: mapListingsKeys.active(),
      }),
  };
}
