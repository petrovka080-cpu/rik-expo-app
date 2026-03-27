import { useCallback, useState } from "react";
import type { IncomingRow } from "../warehouse.types";
import { useWarehouseUiStore } from "../warehouseUi.store";

export function useWarehouseIncomingItemsModal() {
  const itemsModal = useWarehouseUiStore((state) => state.itemsModal);
  const setItemsModal = useWarehouseUiStore((state) => state.setItemsModal);
  const [receivingHeadId, setReceivingHeadId] = useState<string | null>(null);

  const openItemsModal = useCallback((head: Partial<IncomingRow> | null | undefined) => {
    const incomingId = String(head?.incoming_id ?? "").trim();
    if (!incomingId) return;

    setItemsModal({
      incomingId,
      purchaseId: String(head?.purchase_id ?? ""),
      poNo: head?.po_no ?? null,
      status: String(head?.incoming_status ?? ""),
    });
  }, [setItemsModal]);

  return {
    itemsModal,
    setItemsModal,
    openItemsModal,
    receivingHeadId,
    setReceivingHeadId,
  };
}
