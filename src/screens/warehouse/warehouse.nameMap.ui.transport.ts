import type { SupabaseClient } from "@supabase/supabase-js";
import type { PagedQuery } from "../../lib/api/_core";

export type WarehouseNameMapUiRow = Record<string, unknown>;

export function createWarehouseNameMapUiQuery(
  supabase: SupabaseClient,
  codes: string[],
): PagedQuery<WarehouseNameMapUiRow> {
  return supabase.from("warehouse_name_map_ui" as never)
    .select("code, display_name")
    .in("code", codes)
    .order("code", { ascending: true }) as unknown as PagedQuery<WarehouseNameMapUiRow>;
}
