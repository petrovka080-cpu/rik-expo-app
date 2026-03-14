import type { SupabaseClient } from "@supabase/supabase-js";
import type { SubmitJobRow } from "../lib/infra/jobQueue";
import {
  type WarehouseNameMapRefreshMode,
  normalizeWarehouseCodeList,
  refreshWarehouseNameMapUiProjection,
} from "../screens/warehouse/warehouse.nameMap.ui";

function parseRefreshPayload(payload: Record<string, unknown> | null | undefined): {
  codeList?: string[];
  refreshMode: WarehouseNameMapRefreshMode;
} {
  const rawMode = String(payload?.refresh_mode ?? "incremental").trim().toLowerCase();
  const refreshMode: WarehouseNameMapRefreshMode = rawMode === "full" ? "full" : "incremental";
  const rawCodes = Array.isArray(payload?.code_list) ? payload?.code_list : [];
  const codeList = normalizeWarehouseCodeList(rawCodes);
  return { codeList, refreshMode };
}

export async function processWarehouseNameMapRefreshJob(
  job: SubmitJobRow,
  deps: { supabase: SupabaseClient },
): Promise<void> {
  const parsed = parseRefreshPayload(job.payload);
  await refreshWarehouseNameMapUiProjection(deps.supabase, parsed);
}
