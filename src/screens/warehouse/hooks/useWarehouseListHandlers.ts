import { useCallback } from "react";
import {
  isWarehouseScreenActive,
  useWarehouseFallbackActiveRef,
  type WarehouseScreenActiveRef,
} from "./useWarehouseScreenActivity";

export function useWarehouseListHandlers(params: {
  toReceiveHasMore: boolean;
  toReceiveIsFetching: boolean;
  toReceivePage: number;
  fetchToReceivePage: (page: number) => Promise<void>;
  setItemsModal: React.Dispatch<
    React.SetStateAction<{
      incomingId: string;
      purchaseId: string;
      poNo: string | null;
      status: string;
    } | null>
  >;
  commitRecipient: (name: string) => Promise<void>;
  closeIncomingDetailsRaw: () => void;
  receiveSelectedForHead: (incomingId: string) => Promise<void>;
  screenActiveRef?: WarehouseScreenActiveRef;
}) {
  const {
    toReceiveHasMore,
    toReceiveIsFetching,
    toReceivePage,
    fetchToReceivePage,
    setItemsModal,
    commitRecipient,
    closeIncomingDetailsRaw,
    receiveSelectedForHead,
  } = params;
  const screenActiveRef = useWarehouseFallbackActiveRef(params.screenActiveRef);

  const onIncomingEndReached = useCallback(() => {
    if (!isWarehouseScreenActive(screenActiveRef)) return;
    if (toReceiveHasMore && !toReceiveIsFetching) {
      void fetchToReceivePage(toReceivePage + 1);
    }
  }, [
    toReceiveHasMore,
    toReceiveIsFetching,
    toReceivePage,
    fetchToReceivePage,
    screenActiveRef,
  ]);

  const closeItemsModal = useCallback(() => {
    if (!isWarehouseScreenActive(screenActiveRef)) return;
    setItemsModal(null);
  }, [screenActiveRef, setItemsModal]);

  const onPickRecipient = useCallback(
    (name: string) => {
      if (!isWarehouseScreenActive(screenActiveRef)) return;
      void commitRecipient(name);
    },
    [commitRecipient, screenActiveRef],
  );

  const closeIncomingDetails = useCallback(() => {
    if (!isWarehouseScreenActive(screenActiveRef)) return;
    closeIncomingDetailsRaw();
  }, [closeIncomingDetailsRaw, screenActiveRef]);

  const onIncomingItemsSubmit = useCallback(
    (incomingId: string) => {
      if (!isWarehouseScreenActive(screenActiveRef)) return;
      if (!incomingId) return;
      void receiveSelectedForHead(incomingId);
    },
    [receiveSelectedForHead, screenActiveRef],
  );

  return {
    onIncomingEndReached,
    closeItemsModal,
    onPickRecipient,
    closeIncomingDetails,
    onIncomingItemsSubmit,
  };
}
