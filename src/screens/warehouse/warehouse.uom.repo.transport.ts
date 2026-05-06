import { supabase } from "../../lib/supabaseClient";

type SingleResult = {
  data: Record<string, unknown> | null;
  error: { message?: string | null } | null;
};

export async function callWarehouseUomSupabaseMaterialUnitId(
  matCode: string,
): Promise<SingleResult> {
  const result = await supabase
    .from("rik_materials")
    .select("unit_id")
    .eq("mat_code", matCode)
    .maybeSingle();
  return {
    data: result.data && typeof result.data === "object" ? (result.data as Record<string, unknown>) : null,
    error: result.error ? { message: result.error.message } : null,
  };
}

export async function callWarehouseUomSupabaseUomCode(
  unitId: string,
): Promise<SingleResult> {
  const result = (await supabase
    .from("rik_uoms" as never)
    .select("uom_code")
    .eq("id", unitId)
    .maybeSingle()) as { data: Record<string, unknown> | null; error: { message?: string | null } | null };
  return {
    data: result.data && typeof result.data === "object" ? (result.data as Record<string, unknown>) : null,
    error: result.error ? { message: result.error.message } : null,
  };
}
