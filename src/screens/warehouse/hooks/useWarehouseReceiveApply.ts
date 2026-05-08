import type { SupabaseClient } from "@supabase/supabase-js";

import {
  isRpcNumberLike,
  isRpcOptionalBoolean,
  isRpcOptionalString,
  isRpcRecord,
  RpcValidationError,
  validateRpcResponse,
} from "../../../lib/api/queryBoundary";
import { traceAsync } from "../../../lib/observability/sentry";
import type { RpcReceiveApplyResult } from "../warehouse.types";
import {
  callWarehouseReceiveApplyRpc,
  type WarehouseReceiveApplyItem,
} from "./useWarehouseReceiveApply.transport";

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
  items: WarehouseReceiveApplyItem[];
  warehousemanFio: string;
  clientMutationId: string;
}) {
  return await traceAsync(
    "warehouse.receive.apply",
    {
      flow: "warehouse_receive_apply",
      role: "warehouse",
      offline_queue_used: false,
    },
    async () => {
      const { supabase, incomingId, items, warehousemanFio, clientMutationId } = params;

      const { data, error } = await callWarehouseReceiveApplyRpc(supabase, {
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
    },
  );
}
