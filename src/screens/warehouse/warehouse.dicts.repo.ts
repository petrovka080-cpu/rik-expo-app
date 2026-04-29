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
import { normalizePage } from "../../lib/api/_core";
import { queryClient } from "../../lib/query/queryClient";

type QueryResult = {
  data: unknown[] | null;
  error: { message?: string | null } | null;
};

const WAREHOUSE_DICTS_TTL_MS = 5 * 60 * 1000;
const WAREHOUSE_DICT_PAGE_DEFAULTS = { pageSize: 100, maxPageSize: 100 };

type QueryFactory = () => {
  range: (from: number, to: number) => any;
};

async function loadPagedWarehouseRows(queryFactory: QueryFactory): Promise<QueryResult> {
  const rows: unknown[] = [];
  let pageIndex = 0;

  while (true) {
    const page = normalizePage({ page: pageIndex }, WAREHOUSE_DICT_PAGE_DEFAULTS);
    const result = await queryFactory().range(page.from, page.to);

    if (result.error) {
      return {
        data: null,
        error: { message: String((result.error as { message?: unknown })?.message ?? result.error) },
      };
    }

    const pageRows = Array.isArray(result.data) ? result.data : [];
    rows.push(...pageRows);
    if (pageRows.length < page.pageSize) {
      return { data: rows, error: null };
    }
    pageIndex += 1;
  }
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
