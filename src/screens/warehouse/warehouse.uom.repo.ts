import { trimMapSize } from "../../lib/cache/boundedCacheUtils";
import { callWarehouseApiBffRead } from "./warehouse.api.bff.client";
import type {
  WarehouseApiBffReadErrorDto,
  WarehouseApiBffRequestDto,
} from "./warehouse.api.bff.contract";
import {
  callWarehouseUomSupabaseMaterialUnitId,
  callWarehouseUomSupabaseUomCode,
} from "./warehouse.uom.repo.transport";

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

const bffErrorToSingleError = (
  error: WarehouseApiBffReadErrorDto | { message?: string | null },
): { message?: string | null } => ({
  message: error.message,
});

const callWarehouseUomBffSingle = async (
  request: WarehouseApiBffRequestDto,
  fallback: () => Promise<SingleResult>,
): Promise<SingleResult> => {
  const bffResult = await callWarehouseApiBffRead(request);
  if (bffResult.status === "ok") {
    const payload = bffResult.response.payload;
    if (payload.kind !== "single") {
      return {
        data: null,
        error: { message: "Warehouse API read failed" },
      };
    }
    if (payload.result.error) {
      return {
        data: null,
        error: bffErrorToSingleError(payload.result.error),
      };
    }
    const first = payload.result.data?.[0];
    return {
      data: first && typeof first === "object" ? { ...first } : null,
      error: null,
    };
  }
  if (bffResult.status === "error") {
    return {
      data: null,
      error: bffErrorToSingleError(bffResult.error),
    };
  }
  return await fallback();
};

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
    return await callWarehouseUomBffSingle(
      {
        operation: "warehouse.api.uom.material_unit",
        args: { matCode: key },
      },
      () => callWarehouseUomSupabaseMaterialUnitId(key),
    );
  });
}

export async function fetchWarehouseUomCode(unitId: string) {
  const key = String(unitId ?? "").trim();
  return await readCached(uomCodeCache, key, async () => {
    return await callWarehouseUomBffSingle(
      {
        operation: "warehouse.api.uom.code",
        args: { unitId: key },
      },
      () => callWarehouseUomSupabaseUomCode(key),
    );
  });
}
