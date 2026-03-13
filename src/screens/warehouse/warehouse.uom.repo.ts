import { supabase } from "../../lib/supabaseClient";

export async function fetchWarehouseMaterialUnitId(matCode: string) {
  return await supabase
    .from("rik_materials")
    .select("unit_id")
    .eq("mat_code", matCode)
    .maybeSingle();
}

export async function fetchWarehouseUomCode(unitId: string) {
  return await supabase
    .from("rik_uoms" as never)
    .select("uom_code")
    .eq("id", unitId)
    .maybeSingle();
}
