import type { SupabaseClient } from "@supabase/supabase-js";
import { JOB_QUEUE_ENABLED, enqueueSubmitJob } from "../../lib/infra/jobQueue";

type UnknownRow = Record<string, unknown>;

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

const normalizeCode = (value: unknown): string =>
  String(value ?? "").trim().toUpperCase();

const fromWarehouseNameMapUi = (supabase: SupabaseClient) =>
  supabase.from("warehouse_name_map_ui" as never);

const rpcWarehouseRefreshNameMapUi = (
  supabase: SupabaseClient,
  payload: {
    p_code_list: string[] | null;
    p_refresh_mode: WarehouseNameMapRefreshMode;
  },
) => supabase.rpc("warehouse_refresh_name_map_ui" as never, payload as never);

export function normalizeWarehouseCodeList(values: unknown[]): string[] {
  return Array.from(new Set(values.map(normalizeCode).filter(Boolean)));
}

export async function fetchWarehouseNameMapUi(
  supabase: SupabaseClient,
  codeList: string[],
): Promise<WarehouseNameMapUiFetchResult> {
  const codes = normalizeWarehouseCodeList(codeList);
  if (!codes.length) return { available: true, map: {} };

  const q = await fromWarehouseNameMapUi(supabase)
    .select("code, display_name")
    .in("code", codes.slice(0, 5000));

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

  const out: Record<string, string> = {};
  for (const row of (Array.isArray(q.data) ? q.data : []) as UnknownRow[]) {
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

  const q = await rpcWarehouseRefreshNameMapUi(supabase, {
    p_code_list: codeList,
    p_refresh_mode: refreshMode,
  });

  if (q.error) throw q.error;
  return Number(q.data ?? 0) || 0;
}

export async function scheduleWarehouseNameMapRefresh(params: {
  supabase: SupabaseClient;
  codeList?: string[];
  refreshMode?: WarehouseNameMapRefreshMode;
}): Promise<WarehouseNameMapScheduleResult> {
  const refreshMode = params.refreshMode === "full" ? "full" : "incremental";
  const codeList = normalizeWarehouseCodeList(params.codeList ?? []);
  if (refreshMode !== "full" && !codeList.length) return "noop";

  if (JOB_QUEUE_ENABLED) {
    await enqueueSubmitJob({
      jobType: "warehouse_refresh_name_map_ui",
      entityType: "warehouse_name_map_ui",
      entityId: refreshMode === "full" ? "full" : codeList[0] ?? null,
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
