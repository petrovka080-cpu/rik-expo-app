import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createGuardedPagedQuery,
  isRecordRow,
  type PagedQuery,
} from "../../lib/api/_core";
import { callRateLimitedSupabaseRpc } from "../../lib/api/supabaseRpcAdapter";

export type WarehouseNameMapUiRow = Record<string, unknown>;
export type WarehouseRefreshNameMapUiRpcArgs = {
  p_code_list: string[] | null;
  p_refresh_mode: "incremental" | "full";
};

export function createWarehouseNameMapUiQuery(
  supabase: SupabaseClient,
  codes: string[],
): PagedQuery<WarehouseNameMapUiRow> {
  return createGuardedPagedQuery(
    supabase.from("warehouse_name_map_ui" as never)
      .select("code, display_name")
      .in("code", codes)
      .order("code", { ascending: true }),
    isRecordRow,
    "warehouse.nameMapUi.warehouse_name_map_ui",
  );
}

export const callWarehouseRefreshNameMapUiRpc = (
  supabase: SupabaseClient,
  payload: WarehouseRefreshNameMapUiRpcArgs,
) => callRateLimitedSupabaseRpc(supabase, "warehouse_refresh_name_map_ui", payload);
