import type { SupabaseClient } from "@supabase/supabase-js";
import { callRateLimitedSupabaseRpc } from "../../../lib/api/supabaseRpcAdapter";

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
type WarehouseReceiveApplyRpcResult = {
  data: unknown;
  error: { message?: string | null } | null;
};

export function callWarehouseReceiveApplyRpc(
  supabase: SupabaseClient,
  payload: WarehouseReceiveApplyRpcPayload,
) {
  return callRateLimitedSupabaseRpc<WarehouseReceiveApplyRpcResult>(
    supabase,
    "wh_receive_apply_ui",
    payload,
  );
}
