import { useCallback, useState, type SetStateAction } from "react";
import type { IncomingRow } from "../warehouse.types";
import { useWarehouseUiStore } from "../warehouseUi.store";
import {
  isWarehouseScreenActive,
  useWarehouseFallbackActiveRef,
  type WarehouseScreenActiveRef,
} from "./useWarehouseScreenActivity";

export function useWarehouseIncomingItemsModal(params?: {
  screenActiveRef?: WarehouseScreenActiveRef;
}) {
  const screenActiveRef = useWarehouseFallbackActiveRef(
    params?.screenActiveRef,
  );
  const itemsModal = useWarehouseUiStore((state) => state.itemsModal);
  const setItemsModalRaw = useWarehouseUiStore((state) => state.setItemsModal);
  const [receivingHeadId, setReceivingHeadIdRaw] = useState<string | null>(
    null,
  );
  const setItemsModal = useCallback(
    (value: Parameters<typeof setItemsModalRaw>[0]) => {
      if (isWarehouseScreenActive(screenActiveRef)) setItemsModalRaw(value);
    },
    [screenActiveRef, setItemsModalRaw],
  );
  const setReceivingHeadId = useCallback(
    (value: SetStateAction<string | null>) => {
      if (isWarehouseScreenActive(screenActiveRef))
        setReceivingHeadIdRaw(value);
    },
    [screenActiveRef],
  );

  const openItemsModal = useCallback(
    (head: Partial<IncomingRow> | null | undefined) => {
      if (!isWarehouseScreenActive(screenActiveRef)) return;
      const incomingId = String(head?.incoming_id ?? "").trim();
      if (!incomingId) return;

      setItemsModal({
        incomingId,
        purchaseId: String(head?.purchase_id ?? ""),
        poNo: head?.po_no ?? null,
        status: String(head?.incoming_status ?? ""),
      });
    },
    [screenActiveRef, setItemsModal],
  );

  return {
    itemsModal,
    setItemsModal,
    openItemsModal,
    receivingHeadId,
    setReceivingHeadId,
  };
}
