import { supabase } from "../../lib/supabaseClient";

export type CalcWorkKitRpcPayload = {
  p_work_type_code: string;
  p_inputs: Record<string, number>;
};

export async function runCalcWorkKitRpc(payload: CalcWorkKitRpcPayload) {
  return await supabase.rpc("rpc_calc_work_kit", payload);
}
