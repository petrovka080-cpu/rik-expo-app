import type { SupabaseClient } from "@supabase/supabase-js";

import type { RpcReceiveApplyResult } from "../warehouse.types";

export async function applyWarehouseReceive(params: {
  supabase: SupabaseClient;
  incomingId: string;
  items: { purchase_item_id: string; qty: number }[];
  warehousemanFio: string;
  clientMutationId: string;
}) {
  const { supabase, incomingId, items, warehousemanFio, clientMutationId } = params;

  const { data, error } = await supabase.rpc("wh_receive_apply_ui", {
    p_incoming_id: incomingId,
    p_items: items,
    p_client_mutation_id: clientMutationId,
    p_warehouseman_fio: warehousemanFio.trim(),
    p_note: null,
  });

  return {
    data: (data as RpcReceiveApplyResult | null) ?? null,
    error,
  };
}
