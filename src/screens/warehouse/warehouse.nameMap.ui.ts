import type { SupabaseClient } from "@supabase/supabase-js";
import { loadPagedRowsWithCeiling } from "../../lib/api/_core";
import {
  isRpcNumberLikeResponse,
  validateRpcResponse,
} from "../../lib/api/queryBoundary";
import { isUuid } from "./warehouse.utils";
import {
  callWarehouseRefreshNameMapUiRpc,
  createWarehouseNameMapUiQuery,
  type WarehouseNameMapUiRow,
} from "./warehouse.nameMap.ui.transport";

export type WarehouseNameMapRefreshMode = "incremental" | "full";
export type WarehouseNameMapScheduleResult = "queued" | "direct" | "noop";
export type WarehouseNameMapUiFetchResult = {
  available: boolean;
  map: Record<string, string>;
};

export type WarehouseNameMapRefreshPayload = {
  code_list?: string[];
  refresh_mode?: WarehouseNameMapRefreshMode;
};

export const isWarehouseRefreshNameMapUiRpcResponse = isRpcNumberLikeResponse;

const normalizeCode = (value: unknown): string =>
  String(value ?? "").trim().toUpperCase();

const WAREHOUSE_NAME_MAP_PAGE_DEFAULTS = { pageSize: 100, maxPageSize: 100, maxRows: 5000, maxPages: 51 };

const loadWarehouseNameMapQueueBoundary = async () => {
  try {
    const queue = await import("../../lib/infra/jobQueue");
    return {
      JOB_QUEUE_ENABLED: queue.JOB_QUEUE_ENABLED,
      enqueueSubmitJob: queue.enqueueSubmitJob,
    };
  } catch {
    return {
      JOB_QUEUE_ENABLED: false,
      enqueueSubmitJob: null,
    };
  }
};

export function normalizeWarehouseCodeList(values: unknown[]): string[] {
  return Array.from(new Set(values.map(normalizeCode).filter(Boolean)));
}

export async function fetchWarehouseNameMapUi(
  supabase: SupabaseClient,
  codeList: string[],
): Promise<WarehouseNameMapUiFetchResult> {
  const codes = normalizeWarehouseCodeList(codeList);
  if (!codes.length) return { available: true, map: {} };

  const q = await loadPagedRowsWithCeiling<WarehouseNameMapUiRow>(
    () => createWarehouseNameMapUiQuery(supabase, codes),
    WAREHOUSE_NAME_MAP_PAGE_DEFAULTS,
  );

  if (q.error) {
    const msg = String((q.error as { message?: string } | null)?.message ?? q.error ?? "");
    const unavailable =
      msg.includes("warehouse_name_map_ui") &&
      (msg.includes("schema cache") ||
        msg.includes("does not exist") ||
        msg.includes("relation"));
    if (unavailable) return { available: false, map: {} };
    return { available: true, map: {} };
  }

  const rows = Array.isArray(q.data) ? q.data : [];
  const out: Record<string, string> = {};
  for (const row of rows) {
    const code = normalizeCode(row.code);
    const displayName = String(row.display_name ?? "").trim();
    if (code && displayName && !out[code]) out[code] = displayName;
  }
  return { available: true, map: out };
}

export async function refreshWarehouseNameMapUiProjection(
  supabase: SupabaseClient,
  input: { codeList?: string[]; refreshMode?: WarehouseNameMapRefreshMode },
): Promise<number> {
  const refreshMode = input.refreshMode === "full" ? "full" : "incremental";
  const codeList =
    refreshMode === "full" ? null : normalizeWarehouseCodeList(input.codeList ?? []);

  const q = await callWarehouseRefreshNameMapUiRpc(supabase, {
    p_code_list: codeList,
    p_refresh_mode: refreshMode,
  });

  if (q.error) throw q.error;
  const validated = validateRpcResponse(q.data, isWarehouseRefreshNameMapUiRpcResponse, {
    rpcName: "warehouse_refresh_name_map_ui",
    caller: "src/screens/warehouse/warehouse.nameMap.ui.refreshWarehouseNameMapUiProjection",
    domain: "warehouse",
  });
  return Number(validated ?? 0) || 0;
}

export async function scheduleWarehouseNameMapRefresh(params: {
  supabase: SupabaseClient;
  codeList?: string[];
  refreshMode?: WarehouseNameMapRefreshMode;
}): Promise<WarehouseNameMapScheduleResult> {
  const refreshMode = params.refreshMode === "full" ? "full" : "incremental";
  const codeList = normalizeWarehouseCodeList(params.codeList ?? []);
  if (refreshMode !== "full" && !codeList.length) return "noop";

  const queueBoundary = await loadWarehouseNameMapQueueBoundary();

  if (queueBoundary.JOB_QUEUE_ENABLED && queueBoundary.enqueueSubmitJob) {
    const entityIdCandidate =
      refreshMode === "full" ? null : String(codeList[0] ?? "").trim() || null;
    await queueBoundary.enqueueSubmitJob({
      jobType: "warehouse_refresh_name_map_ui",
      entityType: "warehouse_name_map_ui",
      entityId: entityIdCandidate && isUuid(entityIdCandidate) ? entityIdCandidate : null,
      entityKey:
        refreshMode === "full"
          ? "warehouse_name_map_ui:full"
          : `warehouse_name_map_ui:${codeList.join(",")}`,
      payload: {
        code_list: codeList,
        refresh_mode: refreshMode,
      },
    });
    return "queued";
  }

  if (__DEV__) {
    console.info("[warehouse.nameMap] direct refresh fallback", {
      refreshMode,
      codeCount: codeList.length,
    });
  }

  await refreshWarehouseNameMapUiProjection(params.supabase, {
    codeList,
    refreshMode,
  });
  return "direct";
}
