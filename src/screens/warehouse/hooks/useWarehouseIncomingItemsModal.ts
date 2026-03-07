import { useCallback, useState } from "react";
import type { IncomingRow } from "../warehouse.types";

type ItemsModalState = {
  incomingId: string;
  purchaseId: string;
  poNo: string | null;
  status: string;
} | null;

export function useWarehouseIncomingItemsModal() {
  const [itemsModal, setItemsModal] = useState<ItemsModalState>(null);
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
  }, []);

  return {
    itemsModal,
    setItemsModal,
    openItemsModal,
    receivingHeadId,
    setReceivingHeadId,
  };
}

