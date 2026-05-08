import type { SupabaseClient } from "@supabase/supabase-js";
import type { PagedQuery } from "../../lib/api/_core";

export type WarehouseNameMapUiRow = Record<string, unknown>;
export type WarehouseRefreshNameMapUiRpcArgs = {
  p_code_list: string[] | null;
  p_refresh_mode: "incremental" | "full";
};

export function createWarehouseNameMapUiQuery(
  supabase: SupabaseClient,
  codes: string[],
): PagedQuery<WarehouseNameMapUiRow> {
  return supabase.from("warehouse_name_map_ui" as never)
    .select("code, display_name")
    .in("code", codes)
    .order("code", { ascending: true }) as unknown as PagedQuery<WarehouseNameMapUiRow>;
}

export const callWarehouseRefreshNameMapUiRpc = (
  supabase: SupabaseClient,
  payload: WarehouseRefreshNameMapUiRpcArgs,
) => supabase.rpc("warehouse_refresh_name_map_ui" as never, payload as never);
