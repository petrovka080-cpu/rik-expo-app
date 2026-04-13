/**
 * Warehouse dictionary repository — refactored to use TanStack Query cache.
 *
 * Wave G pilot: replaces manual dictCache + readCached + TTL/dedup logic
 * with queryClient.fetchQuery, preserving exact same API surface.
 *
 * Before: manual Map<string, CacheEntry> with TTL + in-flight dedup
 * After:  queryClient.fetchQuery with staleTime (same TTL semantics)
 *
 * Consumer code (warehouse.dicts.ts) requires zero changes.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { queryClient } from "../../lib/query/queryClient";

type QueryResult = {
  data: unknown[] | null;
  error: { message?: string | null } | null;
};

const WAREHOUSE_DICTS_TTL_MS = 5 * 60 * 1000;

export async function fetchWarehouseDictRows(
  supabase: SupabaseClient,
  table: string,
  columns: string[],
): Promise<QueryResult> {
  const select = columns.join(",");
  const queryKey = ["warehouse", "dict", table, select] as const;

  return queryClient.fetchQuery({
    queryKey,
    queryFn: async (): Promise<QueryResult> => {
      const result = await supabase.from(table).select(select).limit(1000);
      return {
        data: Array.isArray(result.data) ? result.data : null,
        error: result.error ? { message: result.error.message } : null,
      };
    },
    staleTime: WAREHOUSE_DICTS_TTL_MS,
  });
}

export async function fetchWarehouseRefRows(
  supabase: SupabaseClient,
  table: string,
  opts?: { order?: string },
): Promise<QueryResult> {
  const order = String(opts?.order ?? "").trim();
  const queryKey = ["warehouse", "ref", table, order || "-"] as const;

  return queryClient.fetchQuery({
    queryKey,
    queryFn: async (): Promise<QueryResult> => {
      let q = supabase
        .from(table)
        .select("code,display_name,name_human_ru,name_ru,name")
        .limit(2000);

      if (order) {
        q = q.order(order, { ascending: true });
      }

      const result = await q;
      return {
        data: Array.isArray(result.data) ? result.data : null,
        error: result.error ? { message: result.error.message } : null,
      };
    },
    staleTime: WAREHOUSE_DICTS_TTL_MS,
  });
}

export async function probeWarehouseObjectTypes(
  supabase: SupabaseClient,
): Promise<QueryResult> {
  return queryClient.fetchQuery({
    queryKey: ["warehouse", "probe", "ref_object_types"] as const,
    queryFn: async (): Promise<QueryResult> => {
      const result = await supabase
        .from("ref_object_types")
        .select("code")
        .limit(1);
      return {
        data: Array.isArray(result.data) ? result.data : null,
        error: result.error ? { message: result.error.message } : null,
      };
    },
    staleTime: WAREHOUSE_DICTS_TTL_MS,
  });
}
