/**
 * Shared QueryClient boundary for the application.
 * 
 * Wave G: Introduces @tanstack/react-query as the canonical
 * data-fetching layer. All new read-paths should use useQuery
 * with this shared client, rather than manual caching + abort + dedup.
 *
 * Existing hooks are NOT migrated by this wave.
 * This file provides the infrastructure for incremental adoption.
 */
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const DEFAULT_STALE_TIME = 60_000; // 1 min — matches existing TTL convention
const DEFAULT_GC_TIME = 5 * 60_000; // 5 min garbage collection

/**
 * Singleton QueryClient.
 * Configured with conservative defaults matching existing cache discipline:
 * - staleTime: 60s (same as manual REPORTS_CACHE_TTL_MS, etc.)
 * - gcTime: 5min (same as director_reports.cache TTL)
 * - retry: 1 (production-safe, avoids silent retry floods)
 * - refetchOnWindowFocus: false (mobile-first, no browser tabs)
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: DEFAULT_STALE_TIME,
      gcTime: DEFAULT_GC_TIME,
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  },
});

/**
 * Provider component. Wrap the app root (or a subtree) with this.
 * Safe to mount multiple times — uses the same singleton client.
 */
export function AppQueryProvider({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

/**
 * Reset the query cache. Call on logout or session change
 * to ensure no stale data leaks across auth boundaries.
 */
export function resetQueryCache() {
  queryClient.clear();
}
