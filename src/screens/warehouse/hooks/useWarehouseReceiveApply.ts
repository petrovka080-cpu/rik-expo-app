import type { SupabaseClient } from "@supabase/supabase-js";

import {
  isRpcNumberLike,
  isRpcOptionalBoolean,
  isRpcOptionalString,
  isRpcRecord,
  RpcValidationError,
  validateRpcResponse,
} from "../../../lib/api/queryBoundary";
import type { RpcReceiveApplyResult } from "../warehouse.types";

const isWarehouseReceiveApplyResult = (value: unknown): value is RpcReceiveApplyResult =>
  isRpcRecord(value) &&
  isRpcNumberLike(value.ok) &&
  isRpcNumberLike(value.fail) &&
  isRpcNumberLike(value.left_after) &&
  isRpcOptionalString(value.client_mutation_id) &&
  isRpcOptionalBoolean(value.idempotent_replay);

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

  if (error) return { data: null, error };

  try {
    return {
      data: validateRpcResponse(data, isWarehouseReceiveApplyResult, {
        rpcName: "wh_receive_apply_ui",
        caller: "src/screens/warehouse/hooks/useWarehouseReceiveApply.applyWarehouseReceive",
        domain: "warehouse",
      }),
      error: null,
    };
  } catch (validationError) {
    return {
      data: null,
      error:
        validationError instanceof RpcValidationError
          ? validationError
          : new RpcValidationError({
              rpcName: "wh_receive_apply_ui",
              caller: "src/screens/warehouse/hooks/useWarehouseReceiveApply.applyWarehouseReceive",
              domain: "warehouse",
            }),
    };
  }
}
