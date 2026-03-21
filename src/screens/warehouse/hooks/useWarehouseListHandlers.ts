import { useCallback } from "react";

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

  const onIncomingEndReached = useCallback(() => {
    if (toReceiveHasMore && !toReceiveIsFetching) {
      void fetchToReceivePage(toReceivePage + 1);
    }
  }, [toReceiveHasMore, toReceiveIsFetching, toReceivePage, fetchToReceivePage]);

  const closeItemsModal = useCallback(() => {
    setItemsModal(null);
  }, [setItemsModal]);

  const onPickRecipient = useCallback((name: string) => {
    void commitRecipient(name);
  }, [commitRecipient]);

  const closeIncomingDetails = useCallback(() => {
    closeIncomingDetailsRaw();
  }, [closeIncomingDetailsRaw]);

  const onIncomingItemsSubmit = useCallback((incomingId: string) => {
    if (!incomingId) return;
    void receiveSelectedForHead(incomingId);
  }, [receiveSelectedForHead]);

  return {
    onIncomingEndReached,
    closeItemsModal,
    onPickRecipient,
    closeIncomingDetails,
    onIncomingItemsSubmit,
  };
}
