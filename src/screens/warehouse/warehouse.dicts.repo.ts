import type { SupabaseClient } from "@supabase/supabase-js";

export async function fetchWarehouseDictRows(
  supabase: SupabaseClient,
  table: string,
  columns: string[],
) {
  return await supabase.from(table).select(columns.join(",")).limit(1000);
}

export async function fetchWarehouseRefRows(
  supabase: SupabaseClient,
  table: string,
  opts?: { order?: string },
) {
  let q = supabase
    .from(table)
    .select("code,display_name,name_human_ru,name_ru,name")
    .limit(2000);

  if (opts?.order) {
    q = q.order(opts.order, { ascending: true });
  }

  return await q;
}

export async function probeWarehouseObjectTypes(supabase: SupabaseClient) {
  return await supabase.from("ref_object_types").select("code").limit(1);
}
