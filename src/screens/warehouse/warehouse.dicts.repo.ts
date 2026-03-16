import type { SupabaseClient } from "@supabase/supabase-js";

type QueryResult = {
  data: unknown[] | null;
  error: { message?: string | null } | null;
};

type CacheEntry = {
  value: QueryResult | null;
  expiresAt: number;
  promise: Promise<QueryResult> | null;
};

const WAREHOUSE_DICTS_TTL_MS = 5 * 60 * 1000;
const dictCache = new Map<string, CacheEntry>();

const now = () => Date.now();

const getEntry = (key: string): CacheEntry => {
  let entry = dictCache.get(key);
  if (!entry) {
    entry = { value: null, expiresAt: 0, promise: null };
    dictCache.set(key, entry);
  }
  return entry;
};

const cloneResult = (result: QueryResult): QueryResult => ({
  data: Array.isArray(result.data) ? [...result.data] : result.data,
  error: result.error ? { ...result.error } : result.error,
});

const readCached = async (key: string, loader: () => Promise<QueryResult>): Promise<QueryResult> => {
  const entry = getEntry(key);
  if (entry.value && entry.expiresAt > now()) return cloneResult(entry.value);
  if (entry.promise) return cloneResult(await entry.promise);

  entry.promise = (async () => {
    const result = await loader();
    if (!result.error) {
      entry.value = cloneResult(result);
      entry.expiresAt = now() + WAREHOUSE_DICTS_TTL_MS;
    }
    return result;
  })();

  try {
    return cloneResult(await entry.promise);
  } finally {
    entry.promise = null;
  }
};

export async function fetchWarehouseDictRows(
  supabase: SupabaseClient,
  table: string,
  columns: string[],
) {
  const select = columns.join(",");
  const key = `dict:${table}:${select}`;
  return await readCached(key, async () => {
    const result = await supabase.from(table).select(select).limit(1000);
    return {
      data: Array.isArray(result.data) ? result.data : null,
      error: result.error ? { message: result.error.message } : null,
    };
  });
}

export async function fetchWarehouseRefRows(
  supabase: SupabaseClient,
  table: string,
  opts?: { order?: string },
) {
  const order = String(opts?.order ?? "").trim();
  const key = `ref:${table}:${order || "-"}`;
  return await readCached(key, async () => {
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
  });
}

export async function probeWarehouseObjectTypes(supabase: SupabaseClient) {
  return await readCached("probe:ref_object_types", async () => {
    const result = await supabase.from("ref_object_types").select("code").limit(1);
    return {
      data: Array.isArray(result.data) ? result.data : null,
      error: result.error ? { message: result.error.message } : null,
    };
  });
}
