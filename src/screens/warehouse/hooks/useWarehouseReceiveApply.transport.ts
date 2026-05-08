import type { SupabaseClient } from "@supabase/supabase-js";

export type WarehouseReceiveApplyItem = {
  purchase_item_id: string;
  qty: number;
};

export type WarehouseReceiveApplyRpcPayload = {
  p_incoming_id: string;
  p_items: WarehouseReceiveApplyItem[];
  p_client_mutation_id: string;
  p_warehouseman_fio: string;
  p_note: string | null;
};

export function callWarehouseReceiveApplyRpc(
  supabase: SupabaseClient,
  payload: WarehouseReceiveApplyRpcPayload,
) {
  return supabase.rpc("wh_receive_apply_ui", payload);
}
