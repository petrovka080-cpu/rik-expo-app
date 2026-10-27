import type {
  PlatformLocalRecoveryCleanupResult,
  PlatformLocalRecoveryCleanupTarget,
} from "../../lib/offline/platformTerminalRecovery";
import { clearWarehouseReceiveDraftForIncoming } from "./warehouse.receiveDraft.store";
import { clearWarehouseReceiveQueueForIncoming } from "./warehouseReceiveQueue";

const trim = (value: unknown) => String(value ?? "").trim();

export const clearWarehouseReceiveLocalRecovery = async (
  incomingId: string,
): Promise<PlatformLocalRecoveryCleanupResult> => {
  const entityId = trim(incomingId);
  if (!entityId) {
    return {
      kind: "warehouse_receive",
      entityId: "",
      cleared: false,
      clearedOwners: [],
    };
  }

  await clearWarehouseReceiveQueueForIncoming(entityId);
  await clearWarehouseReceiveDraftForIncoming(entityId);

  return {
    kind: "warehouse_receive",
    entityId,
    cleared: true,
    clearedOwners: ["warehouse_receive_queue_v1", "warehouse_receive_draft_store_v1"],
  };
};

export const warehouseReceiveRecoveryCleanupAdapter = {
  clearLocalRecoveryState: async (
    target: PlatformLocalRecoveryCleanupTarget,
  ): Promise<PlatformLocalRecoveryCleanupResult> => {
    if (target.kind !== "warehouse_receive") {
      return {
        ...target,
        cleared: false,
        clearedOwners: [],
      };
    }
    return await clearWarehouseReceiveLocalRecovery(target.entityId);
  },
};
