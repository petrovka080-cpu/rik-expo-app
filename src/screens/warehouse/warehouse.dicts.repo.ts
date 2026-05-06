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
import { loadPagedRowsWithCeiling, type PagedQuery } from "../../lib/api/_core";
import { queryClient } from "../../lib/query/queryClient";

type QueryResult = {
  data: unknown[] | null;
  error: { message?: string | null } | null;
};

const WAREHOUSE_DICTS_TTL_MS = 5 * 60 * 1000;
const WAREHOUSE_DICT_PAGE_DEFAULTS = { pageSize: 100, maxPageSize: 100, maxRows: 5000 };

type QueryFactory = () => PagedQuery<unknown>;

async function loadPagedWarehouseRows(queryFactory: QueryFactory): Promise<QueryResult> {
  const result = await loadPagedRowsWithCeiling(queryFactory, WAREHOUSE_DICT_PAGE_DEFAULTS);
  if (result.error) {
    return {
      data: null,
      error: { message: String((result.error as { message?: unknown })?.message ?? result.error) },
    };
  }
  return { data: result.data ?? [], error: null };
}

const resolveWarehouseDictOrderColumn = (columns: string[]): string => {
  if (columns.includes("id")) return "id";
  if (columns.includes("uuid")) return "uuid";
  return columns[0] || "id";
};

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
      const orderColumn = resolveWarehouseDictOrderColumn(columns);
      return loadPagedWarehouseRows(() =>
        supabase
          .from(table)
          .select(select)
          .order(orderColumn, { ascending: true }),
      );
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
      return loadPagedWarehouseRows(() => {
        let q = supabase
          .from(table)
          .select("code,display_name,name_human_ru,name_ru,name");

        if (order) {
          q = q.order(order, { ascending: true });
        }
        if (order !== "code") {
          q = q.order("code", { ascending: true });
        }

        return q;
      });
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
