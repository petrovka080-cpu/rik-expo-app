import { useCallback } from "react";

export function useWarehouseListHandlers(params: {
  reqRefs: React.MutableRefObject<{ page: number; hasMore: boolean; fetching: boolean }>;
  fetchReqHeads: (page?: number, force?: boolean) => Promise<void>;
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
    reqRefs,
    fetchReqHeads,
    toReceiveHasMore,
    toReceiveIsFetching,
    toReceivePage,
    fetchToReceivePage,
    setItemsModal,
    commitRecipient,
    closeIncomingDetailsRaw,
    receiveSelectedForHead,
  } = params;

  const onReqEndReached = useCallback(() => {
    if (reqRefs.current.hasMore && !reqRefs.current.fetching) {
      void fetchReqHeads(reqRefs.current.page + 1);
    }
  }, [reqRefs, fetchReqHeads]);

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
    onReqEndReached,
    onIncomingEndReached,
    closeItemsModal,
    onPickRecipient,
    closeIncomingDetails,
    onIncomingItemsSubmit,
  };
}
