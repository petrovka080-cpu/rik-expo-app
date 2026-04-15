import { supabase } from "../../lib/supabaseClient";

import { trimMapSize } from "../../lib/cache/boundedCacheUtils";

type SingleResult = {
  data: Record<string, unknown> | null;
  error: { message?: string | null } | null;
};

type CacheEntry = {
  value: SingleResult | null;
  expiresAt: number;
  promise: Promise<SingleResult> | null;
};

const WAREHOUSE_UOM_TTL_MS = 5 * 60 * 1000;
const MAX_UOM_CACHE_SIZE = 500;
const materialUnitCache = new Map<string, CacheEntry>();
const uomCodeCache = new Map<string, CacheEntry>();

const now = () => Date.now();

const getEntry = (store: Map<string, CacheEntry>, key: string): CacheEntry => {
  let entry = store.get(key);
  if (!entry) {
    entry = { value: null, expiresAt: 0, promise: null };
    store.set(key, entry);
    trimMapSize(store, MAX_UOM_CACHE_SIZE);
  }
  return entry;
};

const cloneSingle = (result: SingleResult): SingleResult => ({
  data: result.data ? { ...result.data } : null,
  error: result.error ? { ...result.error } : null,
});

const readCached = async (
  store: Map<string, CacheEntry>,
  key: string,
  loader: () => Promise<SingleResult>,
): Promise<SingleResult> => {
  const entry = getEntry(store, key);
  if (entry.value && entry.expiresAt > now()) return cloneSingle(entry.value);
  if (entry.promise) return cloneSingle(await entry.promise);

  entry.promise = (async () => {
    const result = await loader();
    if (!result.error) {
      entry.value = cloneSingle(result);
      entry.expiresAt = now() + WAREHOUSE_UOM_TTL_MS;
    }
    return result;
  })();

  try {
    return cloneSingle(await entry.promise);
  } finally {
    entry.promise = null;
  }
};

export async function fetchWarehouseMaterialUnitId(matCode: string) {
  const key = String(matCode ?? "").trim();
  return await readCached(materialUnitCache, key, async () => {
    const result = await supabase
      .from("rik_materials")
      .select("unit_id")
      .eq("mat_code", key)
      .maybeSingle();
    return {
      data: result.data && typeof result.data === "object" ? (result.data as Record<string, unknown>) : null,
      error: result.error ? { message: result.error.message } : null,
    };
  });
}

export async function fetchWarehouseUomCode(unitId: string) {
  const key = String(unitId ?? "").trim();
  return await readCached(uomCodeCache, key, async () => {
    const result = (await supabase
      .from("rik_uoms" as never)
      .select("uom_code")
      .eq("id", key)
      .maybeSingle()) as { data: Record<string, unknown> | null; error: { message?: string | null } | null };
    return {
      data: result.data && typeof result.data === "object" ? (result.data as Record<string, unknown>) : null,
      error: result.error ? { message: result.error.message } : null,
    };
  });
}
